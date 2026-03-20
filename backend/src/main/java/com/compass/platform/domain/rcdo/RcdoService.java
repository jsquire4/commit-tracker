package com.compass.platform.domain.rcdo;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.rcdo.dto.RcdoTreeResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
        validateTitleNotBlank(title, "Rally cry");
        Org org = Org.builder().id(orgId).build();
        RallyCry rallyCry = new RallyCry(org, title, description, 0);
        RallyCry saved = rallyCryRepository.save(rallyCry);
        auditRcdoAction(orgId, "RallyCry", saved.getId(), "RCDO_CREATED", actor, Map.of("title", title));
        log.info("Created RallyCry id={} orgId={}", saved.getId(), orgId);
        return saved;
    }

    /**
     * Update rally cry. Validates: exists, not archived. Logs: RCDO_UPDATED.
     */
    public RallyCry updateRallyCry(UUID id, String title, String description, AppUser actor) {
        validateTitleNotBlank(title, "Rally cry");
        RallyCry rallyCry = rallyCryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RallyCry", id));
        if (rallyCry.isArchived()) {
            throw new ConflictException("Cannot update archived RallyCry: " + id);
        }
        rallyCry.setTitle(title);
        rallyCry.setDescription(description);
        RallyCry saved = rallyCryRepository.save(rallyCry);
        auditRcdoAction(rallyCry.getOrg().getId(), "RallyCry", id, "RCDO_UPDATED", actor, Map.of("title", title));
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
        auditRcdoAction(rallyCry.getOrg().getId(), "RallyCry", id, "RCDO_ARCHIVED", actor,
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
        validateTitleNotBlank(title, "Defining objective");
        RallyCry rallyCry = rallyCryRepository.findById(rallyCryId)
                .orElseThrow(() -> new EntityNotFoundException("RallyCry", rallyCryId));
        if (rallyCry.isArchived()) {
            throw new ConflictException("Cannot create DefiningObjective under archived RallyCry: " + rallyCryId);
        }
        Org org = Org.builder().id(orgId).build();
        AppUser owner = ownerUserId != null ? buildUserRef(ownerUserId) : null;
        DefiningObjective definingObjective = new DefiningObjective(org, rallyCry, title, description, owner, 0);
        DefiningObjective saved = definingObjectiveRepository.save(definingObjective);
        auditRcdoAction(orgId, "DefiningObjective", saved.getId(), "RCDO_CREATED", actor,
                Map.of("title", title, "rallyCryId", rallyCryId));
        log.info("Created DefiningObjective id={} orgId={} rallyCryId={}", saved.getId(), orgId, rallyCryId);
        return saved;
    }

    public DefiningObjective updateDefiningObjective(UUID id, String title, String description,
                                                     UUID ownerUserId, AppUser actor) {
        validateTitleNotBlank(title, "Defining objective");
        DefiningObjective definingObjective = definingObjectiveRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", id));
        if (definingObjective.isArchived()) {
            throw new ConflictException("Cannot update archived DefiningObjective: " + id);
        }
        definingObjective.setTitle(title);
        definingObjective.setDescription(description);
        definingObjective.setOwner(ownerUserId != null ? buildUserRef(ownerUserId) : null);
        DefiningObjective saved = definingObjectiveRepository.save(definingObjective);
        auditRcdoAction(definingObjective.getOrg().getId(), "DefiningObjective", id, "RCDO_UPDATED", actor,
                Map.of("title", title));
        return saved;
    }

    public int archiveDefiningObjective(UUID id, AppUser actor) {
        DefiningObjective definingObjective = definingObjectiveRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", id));
        definingObjective.setArchivedAt(Instant.now());
        definingObjectiveRepository.save(definingObjective);
        int warningCount = countReferencingCommitments("DefiningObjective", id);
        auditRcdoAction(definingObjective.getOrg().getId(), "DefiningObjective", id, "RCDO_ARCHIVED", actor,
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
        validateTitleNotBlank(title, "Outcome");
        DefiningObjective definingObjective = definingObjectiveRepository.findById(definingObjectiveId)
                .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", definingObjectiveId));
        if (definingObjective.isArchived()) {
            throw new ConflictException("Cannot create Outcome under archived DefiningObjective: " + definingObjectiveId);
        }
        Org org = Org.builder().id(orgId).build();
        AppUser owner = ownerUserId != null ? buildUserRef(ownerUserId) : null;
        Outcome outcome = new Outcome(org, definingObjective, title, description, owner, 0);
        Outcome saved = outcomeRepository.save(outcome);
        auditRcdoAction(orgId, "Outcome", saved.getId(), "RCDO_CREATED", actor,
                Map.of("title", title, "definingObjectiveId", definingObjectiveId));
        log.info("Created Outcome id={} orgId={} definingObjectiveId={}", saved.getId(), orgId, definingObjectiveId);
        return saved;
    }

    public Outcome updateOutcome(UUID id, String title, String description,
                                 UUID ownerUserId, AppUser actor) {
        validateTitleNotBlank(title, "Outcome");
        Outcome outcome = outcomeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Outcome", id));
        if (outcome.isArchived()) {
            throw new ConflictException("Cannot update archived Outcome: " + id);
        }
        outcome.setTitle(title);
        outcome.setDescription(description);
        outcome.setOwner(ownerUserId != null ? buildUserRef(ownerUserId) : null);
        Outcome saved = outcomeRepository.save(outcome);
        auditRcdoAction(outcome.getOrg().getId(), "Outcome", id, "RCDO_UPDATED", actor, Map.of("title", title));
        return saved;
    }

    public int archiveOutcome(UUID id, AppUser actor) {
        Outcome outcome = outcomeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Outcome", id));
        outcome.setArchivedAt(Instant.now());
        outcomeRepository.save(outcome);
        int warningCount = countReferencingCommitments("Outcome", id);
        auditRcdoAction(outcome.getOrg().getId(), "Outcome", id, "RCDO_ARCHIVED", actor,
                Map.of("warningCount", warningCount));
        if (warningCount > 0) {
            log.warn("Archived Outcome id={} still referenced by {} commitments", id, warningCount);
        }
        return warningCount;
    }

    // === Tree query ===

    /**
     * Returns full RCDO hierarchy for an org, excluding archived.
     * Structure: List&lt;RallyCry&gt; each with nested List&lt;DefiningObjective&gt;
     * each with nested List&lt;Outcome&gt;.
     * Uses 3 bulk queries and builds the tree in memory to avoid N+1 queries.
     * Used by frontend dropdowns and import validation.
     */
    @Transactional(readOnly = true)
    public RcdoTreeResponse getTree(UUID orgId) {
        // Load all 3 levels in bulk — no N+1
        List<RallyCry> rallyCries = rallyCryRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        List<DefiningObjective> allDos = definingObjectiveRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        List<Outcome> allOutcomes = outcomeRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        // Group DOs and Outcomes by their parent IDs
        Map<UUID, List<DefiningObjective>> dosByRallyCryId = allDos.stream()
                .collect(Collectors.groupingBy(d -> d.getRallyCry().getId()));

        Map<UUID, List<Outcome>> outcomesByDoId = allOutcomes.stream()
                .collect(Collectors.groupingBy(o -> o.getDefiningObjective().getId()));

        // Build tree in memory
        List<RcdoTreeResponse.RallyCryNode> rallyCryNodes = rallyCries.stream()
                .map(rc -> {
                    List<DefiningObjective> definingObjectives =
                            dosByRallyCryId.getOrDefault(rc.getId(), List.of());

                    List<RcdoTreeResponse.DefiningObjectiveNode> doNodes = definingObjectives.stream()
                            .map(doObj -> {
                                List<Outcome> outcomes =
                                        outcomesByDoId.getOrDefault(doObj.getId(), List.of());

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

    /**
     * Returns a filtered RCDO tree where rally cries, defining objectives, or outcomes
     * match the search query (case-insensitive title contains).
     * If an outcome matches, its parent DO and RC are included.
     * If a DO matches, its parent RC is included along with all its outcomes.
     * If an RC matches, it is included with all its children.
     */
    @Transactional(readOnly = true)
    public RcdoTreeResponse searchTree(UUID orgId, String query) {
        String lowerQuery = query.toLowerCase();

        List<RallyCry> rallyCries = rallyCryRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        List<DefiningObjective> allDos = definingObjectiveRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        List<Outcome> allOutcomes = outcomeRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        Map<UUID, List<DefiningObjective>> dosByRallyCryId = allDos.stream()
                .collect(Collectors.groupingBy(d -> d.getRallyCry().getId()));

        Map<UUID, List<Outcome>> outcomesByDoId = allOutcomes.stream()
                .collect(Collectors.groupingBy(o -> o.getDefiningObjective().getId()));

        List<RcdoTreeResponse.RallyCryNode> matchingNodes = new java.util.ArrayList<>();

        for (RallyCry rc : rallyCries) {
            boolean rcMatches = rc.getTitle().toLowerCase().contains(lowerQuery);

            List<DefiningObjective> dos = dosByRallyCryId.getOrDefault(rc.getId(), List.of());
            List<RcdoTreeResponse.DefiningObjectiveNode> matchingDoNodes = new java.util.ArrayList<>();

            for (DefiningObjective doObj : dos) {
                boolean doMatches = doObj.getTitle().toLowerCase().contains(lowerQuery);

                List<Outcome> outcomes = outcomesByDoId.getOrDefault(doObj.getId(), List.of());
                List<RcdoTreeResponse.OutcomeNode> matchingOutcomeNodes;

                if (rcMatches || doMatches) {
                    // Include all outcomes under a matching RC or DO
                    matchingOutcomeNodes = outcomes.stream()
                            .map(this::toOutcomeNode)
                            .toList();
                } else {
                    // Only include outcomes that match
                    matchingOutcomeNodes = outcomes.stream()
                            .filter(o -> o.getTitle().toLowerCase().contains(lowerQuery))
                            .map(this::toOutcomeNode)
                            .toList();
                }

                if (rcMatches || doMatches || !matchingOutcomeNodes.isEmpty()) {
                    matchingDoNodes.add(new RcdoTreeResponse.DefiningObjectiveNode(
                            doObj.getId(), doObj.getTitle(), doObj.getDescription(),
                            doObj.getOwner() != null ? doObj.getOwner().getId() : null,
                            doObj.getOwner() != null ? doObj.getOwner().getDisplayName() : null,
                            doObj.getSortOrder(), matchingOutcomeNodes));
                }
            }

            if (rcMatches || !matchingDoNodes.isEmpty()) {
                matchingNodes.add(new RcdoTreeResponse.RallyCryNode(
                        rc.getId(), rc.getTitle(), rc.getDescription(),
                        rc.getSortOrder(), matchingDoNodes));
            }
        }

        return new RcdoTreeResponse(matchingNodes);
    }

    private RcdoTreeResponse.OutcomeNode toOutcomeNode(Outcome o) {
        return new RcdoTreeResponse.OutcomeNode(
                o.getId(), o.getTitle(), o.getDescription(),
                o.getOwner() != null ? o.getOwner().getId() : null,
                o.getOwner() != null ? o.getOwner().getDisplayName() : null,
                o.getSortOrder());
    }

    // === Internal helpers ===

    /**
     * Validates that a title field is not null or blank.
     * Throws {@link IllegalArgumentException} if the check fails.
     */
    private void validateTitleNotBlank(String title, String entityLabel) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(entityLabel + " title must not be blank");
        }
    }

    /**
     * Emits an audit log entry for an RCDO entity action.
     */
    private void auditRcdoAction(UUID orgId, String entityType, UUID entityId,
                                  String action, AppUser actor, Map<String, Object> details) {
        auditService.log(orgId, entityType, entityId, action, actor, details);
    }

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
