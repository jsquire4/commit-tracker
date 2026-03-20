package com.compass.platform.domain.reconciliation;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.DisplacementCategory;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.commit.TaskBullet;
import com.compass.platform.domain.commit.TaskBulletRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.reconciliation.dto.ReconcileRequest;
import com.compass.platform.domain.reconciliation.dto.ReconciliationSummary;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.VisibilityEnforcer;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);

    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final CommitmentRepository commitmentRepository;
    private final TaskBulletRepository taskBulletRepository;
    private final CycleRepository cycleRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;

    public ReconciliationService(ReconciliationRecordRepository reconciliationRecordRepository,
                                 CommitmentRepository commitmentRepository,
                                 TaskBulletRepository taskBulletRepository,
                                 CycleRepository cycleRepository,
                                 VisibilityEnforcer visibilityEnforcer,
                                 AuditService auditService) {
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.commitmentRepository = commitmentRepository;
        this.taskBulletRepository = taskBulletRepository;
        this.cycleRepository = cycleRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.auditService = auditService;
    }

    /**
     * Record reconciliation for a single commitment.
     * Validations:
     * 0. Actor must NOT be ANALYST — throw 403 (analysts are read-only)
     * 1. Commitment must exist — 404
     * 2. Cycle must be in RECONCILING state — 409
     * 3. Actor must be the commitment owner — 403
     * 4. No existing reconciliation record for this commitment+cycle — 409 (idempotent: update if exists)
     * 5. If status != COMPLETED, completionNotes must be non-blank — 400 ("Notes required when status is not COMPLETED")
     * Actions:
     * - Create ReconciliationRecord with status, notes, planned_horizon
     * - Update task bullet completion statuses from bulletStatuses in request
     * - If carryForward == true: set reconciliation_status to CARRIED_FORWARD
     * - Audit log: COMMITMENT_RECONCILED
     * - Log at INFO: commitmentId, cycleId, status, carryForward, bulletProgress
     */
    public ReconciliationRecord reconcileCommitment(UUID commitmentId,
                                                     ReconcileRequest request,
                                                     AppUser actor) {
        // 0. ANALYST guard
        if (actor.getRole() == UserRole.ANALYST) {
            throw new AccessDeniedException("Analysts are read-only and cannot reconcile commitments");
        }

        // 1. Commitment must exist
        Commitment commitment = commitmentRepository.findById(commitmentId)
                .orElseThrow(() -> new EntityNotFoundException("Commitment", commitmentId));

        // 2. Cycle must be in RECONCILING state
        Cycle cycle = commitment.getCycle();
        if (cycle.getState() != CycleState.RECONCILING) {
            throw new ConflictException("Cycle must be in RECONCILING state to reconcile a commitment");
        }

        // 3. Actor must be the commitment owner OR have visibility (manager+ can reconcile reports)
        if (!commitment.getUser().getId().equals(actor.getId())
                && !visibilityEnforcer.canViewCommitment(actor, commitment)) {
            throw new AccessDeniedException("Only the commitment owner or their manager can reconcile it");
        }

        // 5. Notes required when status != COMPLETED
        ReconciliationStatus effectiveStatus = request.carryForward()
                ? ReconciliationStatus.CARRIED_FORWARD
                : request.status();

        if (request.status() != ReconciliationStatus.COMPLETED) {
            if (request.completionNotes() == null || request.completionNotes().isBlank()) {
                throw new IllegalArgumentException("Notes required when status is not COMPLETED");
            }
        }

        // 4. Create or update reconciliation record (idempotent: update if exists)
        Optional<ReconciliationRecord> existing =
                reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycle.getId());

        ReconciliationRecord record;
        if (existing.isPresent()) {
            record = existing.get();
            record.setStatus(effectiveStatus);
            record.setNotes(request.completionNotes());
            record.setPlannedHorizon(commitment.getCompletionHorizon());
            record.setPlannedDay(commitment.getCompletionDay());
            record.setPlannedTimeBlock(commitment.getCompletionTimeBlock());
            record.setReconciledAt(Instant.now());
            record.setReconciledBy(actor);
        } else {
            record = ReconciliationRecord.builder()
                    .org(commitment.getOrg())
                    .commitment(commitment)
                    .cycle(cycle)
                    .status(effectiveStatus)
                    .notes(request.completionNotes())
                    .plannedHorizon(commitment.getCompletionHorizon())
                    .plannedDay(commitment.getCompletionDay())
                    .plannedTimeBlock(commitment.getCompletionTimeBlock())
                    .reconciledAt(Instant.now())
                    .reconciledBy(actor)
                    .build();
        }

        // Apply displacement fields — always set (even to null) to allow clearing
        if (request.displacementCategory() != null) {
            DisplacementCategory category = DisplacementCategory.valueOf(request.displacementCategory());
            record.setDisplacementCategory(category);
            record.setDisplacementDetail(request.displacementDetail());
            if (request.displacingCommitmentId() != null) {
                Commitment displacingCommitment = commitmentRepository
                        .findById(request.displacingCommitmentId())
                        .orElseThrow(() -> new EntityNotFoundException("Commitment", request.displacingCommitmentId()));
                record.setDisplacingCommitment(displacingCommitment);
            } else {
                record.setDisplacingCommitment(null);
            }
        } else {
            record.setDisplacementCategory(null);
            record.setDisplacementDetail(null);
            record.setDisplacingCommitment(null);
        }

        ReconciliationRecord saved = reconciliationRecordRepository.save(record);

        // Update bullet completion statuses
        int totalBullets = 0;
        int completedBullets = 0;

        if (request.bulletStatuses() != null && !request.bulletStatuses().isEmpty()) {
            List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitmentId);
            Map<UUID, TaskBullet> bulletMap = bullets.stream()
                    .collect(Collectors.toMap(TaskBullet::getId, b -> b));

            List<TaskBullet> modified = new ArrayList<>();
            for (ReconcileRequest.BulletStatusUpdate update : request.bulletStatuses()) {
                TaskBullet bullet = bulletMap.get(update.bulletId());
                if (bullet != null) {
                    bullet.setCompleted(update.done());
                    modified.add(bullet);
                }
            }
            if (!modified.isEmpty()) {
                taskBulletRepository.saveAll(modified);
            }

            totalBullets = bullets.size();
            completedBullets = (int) bullets.stream().filter(TaskBullet::isCompleted).count();
        }

        // Audit log
        Map<String, Object> auditDetails = new java.util.HashMap<>();
        auditDetails.put("cycleId", cycle.getId());
        auditDetails.put("status", effectiveStatus.name());
        auditDetails.put("carryForward", request.carryForward());
        if (request.displacementCategory() != null) {
            auditDetails.put("displacementCategory", request.displacementCategory());
            if (request.displacementDetail() != null) {
                auditDetails.put("displacementDetail", request.displacementDetail());
            }
            if (request.displacingCommitmentId() != null) {
                auditDetails.put("displacingCommitmentId", request.displacingCommitmentId());
            }
        }
        auditService.log(commitment.getOrg().getId(), "Commitment", commitmentId,
                "COMMITMENT_RECONCILED", actor, auditDetails);

        log.info("Reconciled commitment id={} cycleId={} status={} carryForward={} bullets={}/{}",
                commitmentId, cycle.getId(), effectiveStatus, request.carryForward(),
                completedBullets, totalBullets);

        return saved;
    }

    /**
     * Get the full reconciliation view for a cycle.
     * Returns: list of commitments with their reconciliation records,
     * bullet-level completion, and a summary.
     * Visibility-scoped: actor must be able to view the cycle.
     */
    @Transactional(readOnly = true)
    public ReconciliationView getReconciliationView(UUID cycleId, AppUser actor) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        // Visibility check: actor must be in same org
        if (!cycle.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("Access denied to cycle " + cycleId);
        }

        List<Commitment> allCommitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(actor.getOrg().getId(), cycleId);

        List<Commitment> visibleCommitments = visibilityEnforcer.filterVisible(actor, allCommitments);

        List<ReconciliationRecord> records =
                reconciliationRecordRepository.findByOrgIdAndCycleId(actor.getOrg().getId(), cycleId);

        Map<UUID, ReconciliationRecord> recordByCommitmentId = records.stream()
                .collect(Collectors.toMap(r -> r.getCommitment().getId(), r -> r));

        // Load all bullets for visible commitments in one query
        List<UUID> visibleIds = visibleCommitments.stream().map(Commitment::getId).toList();
        Map<UUID, List<TaskBullet>> bulletsByCommitmentId = visibleIds.isEmpty()
                ? Map.of()
                : taskBulletRepository.findByCommitmentIdIn(visibleIds).stream()
                        .collect(Collectors.groupingBy(t -> t.getCommitment().getId()));

        List<CommitmentReconciliationDetail> details = new ArrayList<>();
        for (Commitment commitment : visibleCommitments) {
            List<TaskBullet> bullets = bulletsByCommitmentId.getOrDefault(commitment.getId(), List.of());
            ReconciliationRecord rec = recordByCommitmentId.get(commitment.getId());
            details.add(new CommitmentReconciliationDetail(commitment, bullets, rec));
        }

        ReconciliationSummary summary = computeSummary(cycleId);

        return new ReconciliationView(cycle, details, summary);
    }

    /**
     * Check if all commitments in a cycle have reconciliation records.
     * Used by CycleStateMachine via TransitionContext.
     */
    @Transactional(readOnly = true)
    public boolean isFullyReconciled(UUID cycleId) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        List<Commitment> commitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(
                        cycle.getOrg().getId(), cycleId);

        if (commitments.isEmpty()) {
            return true;
        }

        List<ReconciliationRecord> records =
                reconciliationRecordRepository.findByOrgIdAndCycleId(cycle.getOrg().getId(), cycleId);

        return records.size() >= commitments.size();
    }

    /**
     * Compute reconciliation summary statistics for a cycle.
     * Returns: counts by status, overall completion rate, bullet completion rate.
     */
    @Transactional(readOnly = true)
    public ReconciliationSummary computeSummary(UUID cycleId) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        UUID orgId = cycle.getOrg().getId();

        List<Commitment> commitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);

        int totalCommitments = commitments.size();

        List<ReconciliationRecord> records =
                reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId);

        int reconciledCount = records.size();
        int completedCount = (int) records.stream()
                .filter(r -> r.getStatus() == ReconciliationStatus.COMPLETED)
                .count();
        int partiallyCompletedCount = (int) records.stream()
                .filter(r -> r.getStatus() == ReconciliationStatus.PARTIALLY_COMPLETED)
                .count();
        int notStartedCount = (int) records.stream()
                .filter(r -> r.getStatus() == ReconciliationStatus.NOT_STARTED)
                .count();
        int carriedForwardCount = (int) records.stream()
                .filter(r -> r.getStatus() == ReconciliationStatus.CARRIED_FORWARD)
                .count();

        double completionRate = totalCommitments == 0 ? 0.0
                : (double) completedCount / totalCommitments;

        // Compute bullet completion rate across all commitments in cycle — single bulk query
        List<UUID> commitmentIds = commitments.stream().map(Commitment::getId).toList();
        List<TaskBullet> allBullets = commitmentIds.isEmpty()
                ? List.of()
                : taskBulletRepository.findByCommitmentIdIn(commitmentIds);
        int totalBullets = allBullets.size();
        int completedBullets = (int) allBullets.stream().filter(TaskBullet::isCompleted).count();

        double bulletCompletionRate = totalBullets == 0 ? 0.0
                : (double) completedBullets / totalBullets;

        return new ReconciliationSummary(
                totalCommitments,
                reconciledCount,
                completedCount,
                partiallyCompletedCount,
                notStartedCount,
                carriedForwardCount,
                completionRate,
                bulletCompletionRate
        );
    }

    // Internal DTOs for the reconciliation view

    public record ReconciliationView(
            Cycle cycle,
            List<CommitmentReconciliationDetail> commitments,
            ReconciliationSummary summary
    ) {}

    public record CommitmentReconciliationDetail(
            Commitment commitment,
            List<TaskBullet> bullets,
            ReconciliationRecord reconciliationRecord // nullable if not yet reconciled
    ) {}
}
