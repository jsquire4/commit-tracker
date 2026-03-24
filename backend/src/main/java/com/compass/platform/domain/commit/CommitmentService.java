package com.compass.platform.domain.commit;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.dto.CommitmentFilters;
import com.compass.platform.domain.commit.dto.CreateCommitmentRequest;
import com.compass.platform.domain.commit.dto.CreateUnplannedCommitmentRequest;
import com.compass.platform.domain.commit.dto.UpdateCommitmentRequest;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.TeamActivationService;
import com.compass.platform.security.VisibilityEnforcer;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class CommitmentService {

    private static final Logger log = LoggerFactory.getLogger(CommitmentService.class);

    private final CommitmentRepository commitmentRepository;
    private final TaskBulletRepository taskBulletRepository;
    private final CycleRepository cycleRepository;
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final TeamActivationService teamActivationService;
    private final RcdoValidator rcdoValidator;

    public CommitmentService(CommitmentRepository commitmentRepository,
                             TaskBulletRepository taskBulletRepository,
                             CycleRepository cycleRepository,
                             RallyCryRepository rallyCryRepository,
                             DefiningObjectiveRepository definingObjectiveRepository,
                             OutcomeRepository outcomeRepository,
                             ChessCategoryRepository chessCategoryRepository,
                             AppUserRepository userRepository,
                             VisibilityEnforcer visibilityEnforcer,
                             AuditService auditService,
                             ReconciliationRecordRepository reconciliationRecordRepository,
                             TeamActivationService teamActivationService,
                             RcdoValidator rcdoValidator) {
        this.commitmentRepository = commitmentRepository;
        this.taskBulletRepository = taskBulletRepository;
        this.cycleRepository = cycleRepository;
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
        this.chessCategoryRepository = chessCategoryRepository;
        this.userRepository = userRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.auditService = auditService;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.teamActivationService = teamActivationService;
        this.rcdoValidator = rcdoValidator;
    }

    /**
     * Create a new commitment.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403
     * 1. Cycle must be in DRAFT state — throw 409 Conflict otherwise
     * 2. RCDO link consistency: if outcomeId set, definingObjectiveId required;
     *    if definingObjectiveId set, rallyCryId required
     * 3. All referenced RCDO entities must exist and not be archived
     * 4. Chess category must exist and be active
     * 5. assignedBy user (if set) must exist and be in same org
     * 6. Bullets: 2-5 items required
     * 7. Auto-set priority_rank to max(existing ranks in cycle for user) + 1
     */
    public Commitment create(CreateCommitmentRequest request, AppUser actor) {
        requireNotAnalyst(actor);

        if (!teamActivationService.isUserActivated(actor)) {
            throw new AccessDeniedException("Commit module not yet enabled for your team");
        }

        Cycle cycle = cycleRepository.findById(request.cycleId())
                .orElseThrow(() -> new EntityNotFoundException("Cycle", request.cycleId()));

        if (cycle.getState() != CycleState.DRAFT) {
            throw new ConflictException("Cycle must be in DRAFT state to create a commitment");
        }

        AppUser assignedBy = null;
        if (request.assignedBy() != null) {
            assignedBy = userRepository.findById(request.assignedBy())
                    .orElseThrow(() -> new EntityNotFoundException("AppUser", request.assignedBy()));
            if (!assignedBy.getOrg().getId().equals(actor.getOrg().getId())) {
                throw new IllegalArgumentException("assignedBy user must be in the same org");
            }
        }

        // If forUserId is provided, create the commitment on behalf of that user
        // (manager assigning work to a direct report). The actor must be the target
        // user's direct manager.
        AppUser targetUser = actor;
        if (request.forUserId() != null) {
            AppUser forUser = userRepository.findById(request.forUserId())
                    .orElseThrow(() -> new EntityNotFoundException("AppUser", request.forUserId()));
            if (!forUser.getOrg().getId().equals(actor.getOrg().getId())) {
                throw new IllegalArgumentException("forUserId must be in the same org");
            }
            AppUser forUserManager = forUser.getReportsTo();
            if (forUserManager == null || !forUserManager.getId().equals(actor.getId())) {
                throw new AccessDeniedException("You can only assign work to your direct reports");
            }
            targetUser = forUser;
            // If assignedBy was not explicitly set, default to the actor (the assigning manager)
            if (assignedBy == null) {
                assignedBy = actor;
            }
        }

        Commitment saved = buildAndSaveCommitment(request, targetUser, cycle, assignedBy, false);

        String rcdoLink = buildRcdoLinkDescription(request.rallyCryId(), request.definingObjectiveId(), request.outcomeId());
        String categoryName = saved.getChessCategory() != null ? saved.getChessCategory().getName() : "none";

        auditService.log(actor.getOrg().getId(), "Commitment", saved.getId(), "COMMITMENT_CREATED", actor,
                Map.of("cycleId", cycle.getId(),
                       "rcdoLink", rcdoLink,
                       "category", categoryName));

        log.info("Created commitment id={} userId={} assignedBy={} cycleId={} rcdoLink={} category={}",
                saved.getId(), targetUser.getId(), actor.getId(), cycle.getId(), rcdoLink, categoryName);

        return saved;
    }

    /**
     * Create an unplanned work commitment during reconciliation.
     * Cycle must be RECONCILING. Sets isUnplanned=true and creates a reconciliation record.
     */
    public Commitment createUnplanned(CreateUnplannedCommitmentRequest request, AppUser actor) {
        requireNotAnalyst(actor);

        Cycle cycle = cycleRepository.findById(request.cycleId())
                .orElseThrow(() -> new EntityNotFoundException("Cycle", request.cycleId()));

        if (cycle.getState() != CycleState.RECONCILING) {
            throw new ConflictException("Cycle must be in RECONCILING state to create an unplanned commitment");
        }

        Commitment saved = buildAndSaveCommitment(request, actor, cycle, null, true);

        // Create reconciliation record automatically
        ReconciliationRecord reconciliationRecord = ReconciliationRecord.builder()
                .org(actor.getOrg())
                .commitment(saved)
                .cycle(cycle)
                .status(request.reconciliationStatus())
                .notes(request.reconciliationNotes())
                .reconciledAt(Instant.now())
                .reconciledBy(actor)
                .build();
        reconciliationRecordRepository.save(reconciliationRecord);

        auditService.log(actor.getOrg().getId(), "Commitment", saved.getId(), "COMMITMENT_CREATED", actor,
                Map.of("cycleId", cycle.getId(), "isUnplanned", true));

        log.info("Created unplanned commitment id={} userId={} cycleId={}", saved.getId(), actor.getId(), cycle.getId());

        return saved;
    }

    /**
     * Update an existing commitment.
     */
    public Commitment update(UUID commitmentId, UpdateCommitmentRequest request, AppUser actor) {
        requireNotAnalyst(actor);

        Commitment commitment = commitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment", commitmentId));

        if (!commitment.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("Access denied: commitment belongs to a different org");
        }
        if (!commitment.getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the commitment owner can update it");
        }

        if (commitment.getCycle().getState() != CycleState.DRAFT) {
            throw new ConflictException("Cycle must be in DRAFT state to update a commitment");
        }

        validateBulletCount(request.bullets());
        rcdoValidator.validateRcdoConsistencyAndExistence(request.rallyCryId(), request.definingObjectiveId(), request.outcomeId());

        ChessCategory chessCategory = resolveChessCategory(request.chessCategoryId());

        AppUser assignedBy = null;
        if (request.assignedBy() != null) {
            assignedBy = userRepository.findById(request.assignedBy())
                    .orElseThrow(() -> new EntityNotFoundException("AppUser", request.assignedBy()));
            if (!assignedBy.getOrg().getId().equals(actor.getOrg().getId())) {
                throw new IllegalArgumentException("assignedBy user must be in the same org");
            }
        }

        String oldTitle = commitment.getTitle();
        String oldDescription = commitment.getDescription();

        commitment.setTitle(request.title());
        commitment.setDescription(request.description());

        // Dual-write: sync day+timeBlock <-> legacy horizon
        if (request.completionDay() != null || request.completionTimeBlock() != null) {
            commitment.setCompletionDay(request.completionDay());
            commitment.setCompletionTimeBlock(request.completionTimeBlock());
            commitment.setCompletionHorizon(CompletionHorizonConverter.computeLegacyHorizon(request.completionDay(), request.completionTimeBlock()));
        } else {
            commitment.setCompletionHorizon(request.completionHorizon());
            commitment.setCompletionDay(CompletionHorizonConverter.computeDayFromHorizon(request.completionHorizon()));
            commitment.setCompletionTimeBlock(CompletionHorizonConverter.computeTimeBlockFromHorizon(request.completionHorizon()));
        }

        commitment.setChessCategory(chessCategory);
        commitment.setRallyCry(request.rallyCryId() != null ? rallyCryRepository.getReferenceById(request.rallyCryId()) : null);
        commitment.setDefiningObjective(request.definingObjectiveId() != null ? definingObjectiveRepository.getReferenceById(request.definingObjectiveId()) : null);
        commitment.setOutcome(request.outcomeId() != null ? outcomeRepository.getReferenceById(request.outcomeId()) : null);
        commitment.setAssignedBy(assignedBy);
        commitment.setEstimatedHours(request.estimatedHours());

        // Replace task bullets
        taskBulletRepository.deleteAll(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitmentId));
        saveBullets(commitment, request.bullets());

        Commitment saved = commitmentRepository.save(commitment);

        auditService.log(actor.getOrg().getId(), "Commitment", commitmentId, "COMMITMENT_UPDATED", actor,
                Map.of("oldTitle", oldTitle != null ? oldTitle : "",
                       "newTitle", request.title(),
                       "oldDescription", oldDescription != null ? oldDescription : "",
                       "newDescription", request.description() != null ? request.description() : ""));

        return saved;
    }

    /**
     * Delete a commitment (hard delete, DRAFT only).
     */
    public void delete(UUID commitmentId, AppUser actor) {
        requireNotAnalyst(actor);

        Commitment commitment = commitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment", commitmentId));

        if (!commitment.getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Only the commitment owner can delete it");
        }

        if (commitment.getCycle().getState() != CycleState.DRAFT) {
            throw new ConflictException("Cycle must be in DRAFT state to delete a commitment");
        }

        commitmentRepository.delete(commitment);

        auditService.log(actor.getOrg().getId(), "Commitment", commitmentId, "COMMITMENT_DELETED", actor, null);

        log.info("Deleted commitment id={} userId={}", commitmentId, actor.getId());
    }

    /**
     * Reorder commitments within a cycle.
     */
    public void reorder(UUID cycleId, List<UUID> orderedIds, AppUser actor) {
        requireNotAnalyst(actor);

        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        if (cycle.getState() != CycleState.DRAFT) {
            throw new ConflictException("Cycle must be in DRAFT state to reorder commitments");
        }

        List<Commitment> fetched = commitmentRepository.findAllById(orderedIds);
        Map<UUID, Commitment> byId = fetched.stream()
                .collect(Collectors.toMap(Commitment::getId, c -> c));
        List<Commitment> commitments = new ArrayList<>();
        for (UUID id : orderedIds) {
            Commitment c = byId.get(id);
            if (c == null) {
                throw new EntityNotFoundException("Commitment", id);
            }
            commitments.add(c);
        }

        // Validate all belong to same cycle and same user (actor)
        for (Commitment c : commitments) {
            if (!c.getCycle().getId().equals(cycleId)) {
                throw new IllegalArgumentException("All commitments must belong to cycle " + cycleId);
            }
            if (!c.getUser().getId().equals(actor.getId())) {
                throw new AccessDeniedException("Only the commitment owner can reorder commitments");
            }
        }

        for (int i = 0; i < commitments.size(); i++) {
            commitments.get(i).setPriorityRank(i);
        }
        commitmentRepository.saveAll(commitments);

        auditService.log(actor.getOrg().getId(), "Commitment", cycleId, "COMMITMENTS_REORDERED", actor,
                Map.of("cycleId", cycleId, "count", orderedIds.size()));
    }

    /**
     * Get commitments for a cycle with filters and pagination.
     * Pushes userId and rallyCryId filters to the DB when set; remaining filters
     * (chessCategoryId, assignedBy) are applied in-memory after visibility enforcement.
     */
    @Transactional(readOnly = true)
    public Page<Commitment> getForCycle(UUID cycleId, CommitmentFilters filters, Pageable pageable, AppUser actor) {
        List<Commitment> allCommitments;

        if (filters != null && filters.userId() != null) {
            allCommitments = commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(filters.userId(), cycleId);
        } else if (filters != null && filters.rallyCryId() != null) {
            allCommitments = commitmentRepository.findByRallyCryIdAndCycleId(filters.rallyCryId(), cycleId);
        } else {
            allCommitments = commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(actor.getOrg().getId(), cycleId);
        }

        // Apply visibility filter
        List<Commitment> visible = visibilityEnforcer.filterVisible(actor, allCommitments);

        // Apply remaining in-memory filters (no dedicated repo method)
        if (filters != null) {
            if (filters.chessCategoryId() != null) {
                UUID catId = filters.chessCategoryId();
                visible = visible.stream()
                        .filter(c -> c.getChessCategory() != null && c.getChessCategory().getId().equals(catId))
                        .collect(Collectors.toList());
            }
            if (filters.assignedBy() != null) {
                UUID assignedById = filters.assignedBy();
                visible = visible.stream()
                        .filter(c -> c.getAssignedBy() != null && c.getAssignedBy().getId().equals(assignedById))
                        .collect(Collectors.toList());
            }
        }

        int total = visible.size();
        int offset = (int) pageable.getOffset();
        int end = Math.min(offset + pageable.getPageSize(), total);
        List<Commitment> page = (offset < total) ? visible.subList(offset, end) : List.of();

        return new PageImpl<>(page, pageable, total);
    }

    /**
     * Get single commitment by ID. Visibility-scoped.
     */
    @Transactional(readOnly = true)
    public Commitment getById(UUID commitmentId, AppUser actor) {
        Commitment commitment = commitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment", commitmentId));

        if (!visibilityEnforcer.canViewCommitment(actor, commitment)) {
            throw new AccessDeniedException("Access denied to commitment " + commitmentId);
        }

        return commitment;
    }

    /**
     * Internal method: clone a commitment for carry-forward.
     * Called by CycleService.completeCycle.
     */
    public Commitment cloneForCarryForward(Commitment source, Cycle targetCycle) {
        Commitment clone = Commitment.builder()
                .org(source.getOrg())
                .user(source.getUser())
                .cycle(targetCycle)
                .title(source.getTitle())
                .description(source.getDescription())
                .completionHorizon(source.getCompletionHorizon())
                .completionDay(source.getCompletionDay())
                .completionTimeBlock(source.getCompletionTimeBlock())
                .chessCategory(source.getChessCategory())
                .rallyCry(source.getRallyCry())
                .definingObjective(source.getDefiningObjective())
                .outcome(source.getOutcome())
                .assignedBy(source.getAssignedBy())
                .carriedFrom(source)
                .priorityRank(0)
                .isUnplanned(false)
                .estimatedHours(source.getEstimatedHours())
                .build();

        Commitment saved = commitmentRepository.save(clone);

        // Clone task bullets
        List<TaskBullet> sourceBullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(source.getId());
        List<TaskBullet> clonedBullets = sourceBullets.stream()
                .map(sb -> new TaskBullet(saved, saved.getOrg(), sb.getBody(), sb.getSortOrder()))
                .toList();
        taskBulletRepository.saveAll(clonedBullets);

        log.info("Cloned commitment id={} to new commitment id={} in targetCycle={}",
                source.getId(), saved.getId(), targetCycle.getId());

        return saved;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Shared core logic for create() and createUnplanned().
     * Handles RCDO validation, chess category resolution, Commitment building, bullet persistence.
     *
     * @param assignedBy pre-resolved assignedBy user (may be null); callers are responsible for
     *                   resolving and validating this before calling
     * @param isUnplanned true for unplanned commitments (createUnplanned path)
     */
    private Commitment buildAndSaveCommitment(
            CreateCommitmentRequest request,
            AppUser actor,
            Cycle cycle,
            AppUser assignedBy,
            boolean isUnplanned) {
        return buildAndSaveCommitmentCore(
                request.title(), request.description(), request.completionHorizon(),
                request.completionDay(), request.completionTimeBlock(),
                request.chessCategoryId(), request.rallyCryId(), request.definingObjectiveId(),
                request.outcomeId(), request.bullets(), request.estimatedHours(),
                actor, cycle, assignedBy, isUnplanned);
    }

    /**
     * Overload for unplanned commitments: day and timeBlock are intentionally null
     * because unplanned work is captured during reconciliation and does not carry
     * the granular day/timeBlock scheduling that planned commitments have.
     */
    private Commitment buildAndSaveCommitment(
            CreateUnplannedCommitmentRequest request,
            AppUser actor,
            Cycle cycle,
            AppUser assignedBy,
            boolean isUnplanned) {
        return buildAndSaveCommitmentCore(
                request.title(), request.description(), request.completionHorizon(),
                null, null,
                request.chessCategoryId(), request.rallyCryId(), request.definingObjectiveId(),
                request.outcomeId(), request.bullets(), request.estimatedHours(),
                actor, cycle, assignedBy, isUnplanned);
    }

    private Commitment buildAndSaveCommitmentCore(
            String title,
            String description,
            CompletionHorizon completionHorizon,
            CompletionDay completionDay,
            CompletionTimeBlock completionTimeBlock,
            UUID chessCategoryId,
            UUID rallyCryId,
            UUID definingObjectiveId,
            UUID outcomeId,
            List<String> bullets,
            BigDecimal estimatedHours,
            AppUser actor,
            Cycle cycle,
            AppUser assignedBy,
            boolean isUnplanned) {

        validateBulletCount(bullets);
        rcdoValidator.validateRcdoConsistencyAndExistence(rallyCryId, definingObjectiveId, outcomeId);

        ChessCategory chessCategory = resolveChessCategory(chessCategoryId);

        int rank = computeNextRank(actor.getOrg().getId(), cycle.getId());

        // Dual-write: sync day+timeBlock <-> legacy horizon
        CompletionHorizon resolvedHorizon = completionHorizon;
        CompletionDay resolvedDay = completionDay;
        CompletionTimeBlock resolvedTimeBlock = completionTimeBlock;

        if (completionDay != null || completionTimeBlock != null) {
            resolvedHorizon = CompletionHorizonConverter.computeLegacyHorizon(completionDay, completionTimeBlock);
        } else {
            resolvedDay = CompletionHorizonConverter.computeDayFromHorizon(completionHorizon);
            resolvedTimeBlock = CompletionHorizonConverter.computeTimeBlockFromHorizon(completionHorizon);
        }

        Commitment commitment = Commitment.builder()
                .org(actor.getOrg())
                .user(actor)
                .cycle(cycle)
                .title(title)
                .description(description)
                .completionHorizon(resolvedHorizon)
                .completionDay(resolvedDay)
                .completionTimeBlock(resolvedTimeBlock)
                .chessCategory(chessCategory)
                .rallyCry(rallyCryId != null ? rallyCryRepository.getReferenceById(rallyCryId) : null)
                .definingObjective(definingObjectiveId != null ? definingObjectiveRepository.getReferenceById(definingObjectiveId) : null)
                .outcome(outcomeId != null ? outcomeRepository.getReferenceById(outcomeId) : null)
                .assignedBy(assignedBy)
                .priorityRank(rank)
                .isUnplanned(isUnplanned)
                .estimatedHours(estimatedHours)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        saveBullets(saved, bullets);
        return saved;
    }

    private void requireNotAnalyst(AppUser actor) {
        if (actor.getRole() == UserRole.ANALYST) {
            throw new AccessDeniedException("Analysts are read-only and cannot modify commitments");
        }
    }

    private void validateBulletCount(List<String> bullets) {
        if (bullets == null || bullets.size() < 2 || bullets.size() > 5) {
            throw new IllegalArgumentException("Between 2 and 5 task bullets are required");
        }
    }

    private ChessCategory resolveChessCategory(UUID chessCategoryId) {
        if (chessCategoryId == null) {
            return null;
        }
        ChessCategory chessCategory = chessCategoryRepository.findById(chessCategoryId)
                .orElseThrow(() -> new EntityNotFoundException("ChessCategory", chessCategoryId));
        if (!chessCategory.isActive()) {
            throw new IllegalArgumentException("ChessCategory is not active: " + chessCategoryId);
        }
        return chessCategory;
    }

    private int computeNextRank(UUID orgId, UUID cycleId) {
        return commitmentRepository.findMaxPriorityRank(orgId, cycleId) + 1;
    }

    private void saveBullets(Commitment commitment, List<String> bulletTexts) {
        List<TaskBullet> bullets = new ArrayList<>();
        for (int i = 0; i < bulletTexts.size(); i++) {
            bullets.add(new TaskBullet(commitment, commitment.getOrg(), bulletTexts.get(i), i));
        }
        taskBulletRepository.saveAll(bullets);
    }

    private String buildRcdoLinkDescription(UUID rallyCryId, UUID definingObjectiveId, UUID outcomeId) {
        if (outcomeId != null) return "outcome:" + outcomeId;
        if (definingObjectiveId != null) return "do:" + definingObjectiveId;
        if (rallyCryId != null) return "rc:" + rallyCryId;
        return "none";
    }

}
