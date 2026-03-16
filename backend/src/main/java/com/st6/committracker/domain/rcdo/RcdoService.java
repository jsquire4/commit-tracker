package com.st6.committracker.domain.rcdo;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.rcdo.dto.RcdoTreeResponse;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class RcdoService {

    private static final Logger log = LoggerFactory.getLogger(RcdoService.class);

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final CommitmentRepository commitmentRepository;
    private final AuditService auditService;
    private final AppUserRepository appUserRepository;

    public RcdoService(RallyCryRepository rallyCryRepository,
                       DefiningObjectiveRepository definingObjectiveRepository,
                       OutcomeRepository outcomeRepository,
                       CommitmentRepository commitmentRepository,
                       AuditService auditService,
                       AppUserRepository appUserRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
        this.commitmentRepository = commitmentRepository;
        this.auditService = auditService;
        this.appUserRepository = appUserRepository;
    }

    // === Rally Cry CRUD ===

    /**
     * Create rally cry. Validates: title not blank. Logs: RCDO_CREATED.
     */
    public RallyCry createRallyCry(UUID orgId, String title, String description, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Rally cry title must not be blank");
        }
        Org org = Org.builder().id(orgId).build();
        RallyCry rallyCry = new RallyCry(org, title, description, 0);
        RallyCry saved = rallyCryRepository.save(rallyCry);
        auditService.log(orgId, "RallyCry", saved.getId(), "RCDO_CREATED", actor,
                Map.of("title", title));
        log.info("Created RallyCry id={} orgId={}", saved.getId(), orgId);
        return saved;
    }

    /**
     * Update rally cry. Validates: exists, not archived. Logs: RCDO_UPDATED.
     */
    public RallyCry updateRallyCry(UUID id, String title, String description, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Rally cry title must not be blank");
        }
        RallyCry rallyCry = rallyCryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RallyCry", id));
        if (rallyCry.isArchived()) {
            throw new IllegalStateException("Cannot update archived RallyCry: " + id);
        }
        rallyCry.setTitle(title);
        rallyCry.setDescription(description);
        RallyCry saved = rallyCryRepository.save(rallyCry);
        auditService.log(rallyCry.getOrg().getId(), "RallyCry", id, "RCDO_UPDATED", actor,
                Map.of("title", title));
        return saved;
    }

    /**
     * Soft-delete (set archived_at). Warns if commitments reference it.
     * Returns warning count. Logs: RCDO_ARCHIVED.
     */
    public int archiveRallyCry(UUID id, AppUser actor) {
        RallyCry rallyCry = rallyCryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RallyCry", id));
        rallyCry.setArchivedAt(Instant.now());
        rallyCryRepository.save(rallyCry);
        int warningCount = countReferencingCommitments("RallyCry", id);
        auditService.log(rallyCry.getOrg().getId(), "RallyCry", id, "RCDO_ARCHIVED", actor,
                Map.of("warningCount", warningCount));
        if (warningCount > 0) {
            log.warn("Archived RallyCry id={} still referenced by {} commitments", id, warningCount);
        }
        return warningCount;
    }

    // === Defining Objective CRUD ===

    public DefiningObjective createDefiningObjective(UUID orgId, UUID rallyCryId,
                                                     String title, String description,
                                                     UUID ownerUserId, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Defining objective title must not be blank");
        }
        RallyCry rallyCry = rallyCryRepository.findById(rallyCryId)
                .orElseThrow(() -> new EntityNotFoundException("RallyCry", rallyCryId));
        if (rallyCry.isArchived()) {
            throw new IllegalStateException("Cannot create DefiningObjective under archived RallyCry: " + rallyCryId);
        }
        Org org = Org.builder().id(orgId).build();
        AppUser owner = ownerUserId != null ? buildUserRef(ownerUserId) : null;
        DefiningObjective definingObjective = new DefiningObjective(org, rallyCry, title, description, owner, 0);
        DefiningObjective saved = definingObjectiveRepository.save(definingObjective);
        auditService.log(orgId, "DefiningObjective", saved.getId(), "RCDO_CREATED", actor,
                Map.of("title", title, "rallyCryId", rallyCryId));
        log.info("Created DefiningObjective id={} orgId={} rallyCryId={}", saved.getId(), orgId, rallyCryId);
        return saved;
    }

    public DefiningObjective updateDefiningObjective(UUID id, String title, String description,
                                                     UUID ownerUserId, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Defining objective title must not be blank");
        }
        DefiningObjective definingObjective = definingObjectiveRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", id));
        if (definingObjective.isArchived()) {
            throw new IllegalStateException("Cannot update archived DefiningObjective: " + id);
        }
        definingObjective.setTitle(title);
        definingObjective.setDescription(description);
        definingObjective.setOwner(ownerUserId != null ? buildUserRef(ownerUserId) : null);
        DefiningObjective saved = definingObjectiveRepository.save(definingObjective);
        auditService.log(definingObjective.getOrg().getId(), "DefiningObjective", id, "RCDO_UPDATED", actor,
                Map.of("title", title));
        return saved;
    }

    public int archiveDefiningObjective(UUID id, AppUser actor) {
        DefiningObjective definingObjective = definingObjectiveRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", id));
        definingObjective.setArchivedAt(Instant.now());
        definingObjectiveRepository.save(definingObjective);
        int warningCount = countReferencingCommitments("DefiningObjective", id);
        auditService.log(definingObjective.getOrg().getId(), "DefiningObjective", id, "RCDO_ARCHIVED", actor,
                Map.of("warningCount", warningCount));
        if (warningCount > 0) {
            log.warn("Archived DefiningObjective id={} still referenced by {} commitments", id, warningCount);
        }
        return warningCount;
    }

    // === Outcome CRUD ===

    public Outcome createOutcome(UUID orgId, UUID definingObjectiveId,
                                 String title, String description,
                                 UUID ownerUserId, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Outcome title must not be blank");
        }
        DefiningObjective definingObjective = definingObjectiveRepository.findById(definingObjectiveId)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", definingObjectiveId));
        if (definingObjective.isArchived()) {
            throw new IllegalStateException("Cannot create Outcome under archived DefiningObjective: " + definingObjectiveId);
        }
        Org org = Org.builder().id(orgId).build();
        AppUser owner = ownerUserId != null ? buildUserRef(ownerUserId) : null;
        Outcome outcome = new Outcome(org, definingObjective, title, description, owner, 0);
        Outcome saved = outcomeRepository.save(outcome);
        auditService.log(orgId, "Outcome", saved.getId(), "RCDO_CREATED", actor,
                Map.of("title", title, "definingObjectiveId", definingObjectiveId));
        log.info("Created Outcome id={} orgId={} definingObjectiveId={}", saved.getId(), orgId, definingObjectiveId);
        return saved;
    }

    public Outcome updateOutcome(UUID id, String title, String description,
                                 UUID ownerUserId, AppUser actor) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Outcome title must not be blank");
        }
        Outcome outcome = outcomeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Outcome", id));
        if (outcome.isArchived()) {
            throw new IllegalStateException("Cannot update archived Outcome: " + id);
        }
        outcome.setTitle(title);
        outcome.setDescription(description);
        outcome.setOwner(ownerUserId != null ? buildUserRef(ownerUserId) : null);
        Outcome saved = outcomeRepository.save(outcome);
        auditService.log(outcome.getOrg().getId(), "Outcome", id, "RCDO_UPDATED", actor,
                Map.of("title", title));
        return saved;
    }

    public int archiveOutcome(UUID id, AppUser actor) {
        Outcome outcome = outcomeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Outcome", id));
        outcome.setArchivedAt(Instant.now());
        outcomeRepository.save(outcome);
        int warningCount = countReferencingCommitments("Outcome", id);
        auditService.log(outcome.getOrg().getId(), "Outcome", id, "RCDO_ARCHIVED", actor,
                Map.of("warningCount", warningCount));
        if (warningCount > 0) {
            log.warn("Archived Outcome id={} still referenced by {} commitments", id, warningCount);
        }
        return warningCount;
    }

    // === Tree query ===

    /**
     * Returns full RCDO hierarchy for an org, excluding archived.
     * Structure: List<RallyCry> each with nested List<DefiningObjective>
     * each with nested List<Outcome>.
     * Used by frontend dropdowns and import validation.
     */
    @Transactional(readOnly = true)
    public RcdoTreeResponse getTree(UUID orgId) {
        List<RallyCry> rallyCries = rallyCryRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        List<RcdoTreeResponse.RallyCryNode> rallyCryNodes = rallyCries.stream()
                .map(rc -> {
                    List<DefiningObjective> definingObjectives = definingObjectiveRepository
                            .findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(rc.getId());

                    List<RcdoTreeResponse.DefiningObjectiveNode> doNodes = definingObjectives.stream()
                            .map(doObj -> {
                                List<Outcome> outcomes = outcomeRepository
                                        .findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(doObj.getId());

                                List<RcdoTreeResponse.OutcomeNode> outcomeNodes = outcomes.stream()
                                        .map(o -> new RcdoTreeResponse.OutcomeNode(
                                                o.getId(),
                                                o.getTitle(),
                                                o.getDescription(),
                                                o.getOwner() != null ? o.getOwner().getId() : null,
                                                o.getOwner() != null ? o.getOwner().getDisplayName() : null,
                                                o.getSortOrder()
                                        ))
                                        .toList();

                                return new RcdoTreeResponse.DefiningObjectiveNode(
                                        doObj.getId(),
                                        doObj.getTitle(),
                                        doObj.getDescription(),
                                        doObj.getOwner() != null ? doObj.getOwner().getId() : null,
                                        doObj.getOwner() != null ? doObj.getOwner().getDisplayName() : null,
                                        doObj.getSortOrder(),
                                        outcomeNodes
                                );
                            })
                            .toList();

                    return new RcdoTreeResponse.RallyCryNode(
                            rc.getId(),
                            rc.getTitle(),
                            rc.getDescription(),
                            rc.getSortOrder(),
                            doNodes
                    );
                })
                .toList();

        return new RcdoTreeResponse(rallyCryNodes);
    }

    // === Internal helpers ===

    /**
     * Count commitments referencing this RCDO entity. Used for archive warnings.
     */
    int countReferencingCommitments(String rcdoType, UUID rcdoId) {
        return switch (rcdoType) {
            case "RallyCry" -> (int) commitmentRepository.countByRallyCryId(rcdoId);
            case "DefiningObjective" -> (int) commitmentRepository.countByDefiningObjectiveId(rcdoId);
            case "Outcome" -> (int) commitmentRepository.countByOutcomeId(rcdoId);
            default -> {
                log.warn("Unknown rcdoType '{}' in countReferencingCommitments", rcdoType);
                yield 0;
            }
        };
    }

    private AppUser buildUserRef(UUID userId) {
        return appUserRepository.getReferenceById(userId);
    }
}
