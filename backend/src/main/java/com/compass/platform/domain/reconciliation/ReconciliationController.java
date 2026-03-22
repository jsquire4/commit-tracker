package com.compass.platform.domain.reconciliation;

import com.compass.platform.domain.commit.CommitmentMapper;
import com.compass.platform.domain.commit.dto.CommitmentResponse;
import com.compass.platform.domain.commit.TaskBullet;
import com.compass.platform.domain.commit.TaskBulletRepository;
import com.compass.platform.domain.commit.dto.CommitmentResponse.TaskBulletResponse;
import com.compass.platform.domain.cycle.CycleMapper;
import com.compass.platform.domain.cycle.CycleService;
import com.compass.platform.domain.cycle.dto.CycleResponse;
import com.compass.platform.domain.cycle.dto.TransitionRequest;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.reconciliation.ReconciliationService.CommitmentReconciliationDetail;
import com.compass.platform.domain.reconciliation.ReconciliationService.ReconciliationView;
import com.compass.platform.domain.reconciliation.dto.ReconcileRequest;
import com.compass.platform.domain.reconciliation.dto.ReconciliationResponse;
import com.compass.platform.domain.reconciliation.dto.ReconciliationViewResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reconciliation")
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class ReconciliationController {

    private final ReconciliationService reconciliationService;
    private final CycleService cycleService;
    private final CycleMapper cycleMapper;
    private final CommitmentMapper commitmentMapper;
    private final CommitmentRepository commitmentRepository;
    private final TaskBulletRepository taskBulletRepository;

    public ReconciliationController(ReconciliationService reconciliationService,
                                    CycleService cycleService,
                                    CycleMapper cycleMapper,
                                    CommitmentMapper commitmentMapper,
                                    CommitmentRepository commitmentRepository,
                                    TaskBulletRepository taskBulletRepository) {
        this.reconciliationService = reconciliationService;
        this.cycleService = cycleService;
        this.cycleMapper = cycleMapper;
        this.commitmentMapper = commitmentMapper;
        this.commitmentRepository = commitmentRepository;
        this.taskBulletRepository = taskBulletRepository;
    }

    @GetMapping("/cycles/{cycleId}")
    public ResponseEntity<ApiResponse<ReconciliationViewResponse>> getReconciliationView(
            @PathVariable UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ReconciliationView view = reconciliationService.getReconciliationView(cycleId, actor);

        int commitmentCount = commitmentRepository
                .findByOrgIdAndCycleIdOrderByPriorityRankAsc(actor.getOrg().getId(), cycleId).size();
        CycleResponse cycleResponse = cycleMapper.toResponse(view.cycle(), commitmentCount);

        List<ReconciliationViewResponse.CommitmentReconciliationDetail> details =
                view.commitments().stream()
                        .map(detail -> {
                            List<TaskBullet> bullets = detail.bullets();
                            CommitmentResponse commitmentResponse = commitmentMapper.toResponse(detail.commitment(), bullets);

                            ReconciliationResponse reconciliationResponse = null;
                            if (detail.reconciliationRecord() != null) {
                                ReconciliationRecord rec = detail.reconciliationRecord();
                                List<TaskBulletResponse> bulletStatuses = bullets.stream()
                                        .map(b -> new TaskBulletResponse(b.getId(), b.getBody(), b.getSortOrder(), b.isCompleted()))
                                        .toList();
                                reconciliationResponse = toReconciliationResponse(rec, bulletStatuses);
                            }

                            return new ReconciliationViewResponse.CommitmentReconciliationDetail(
                                    commitmentResponse, reconciliationResponse);
                        })
                        .toList();

        ReconciliationViewResponse response = new ReconciliationViewResponse(
                cycleResponse, details, view.summary(), view.allReconciled());
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PutMapping("/commitments/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<ReconciliationResponse>> reconcileCommitment(
            @PathVariable UUID id,
            @Valid @RequestBody ReconcileRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ReconciliationRecord record = reconciliationService.reconcileCommitment(id, request, actor);

        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(id);
        List<TaskBulletResponse> bulletStatuses = bullets.stream()
                .map(b -> new TaskBulletResponse(b.getId(), b.getBody(), b.getSortOrder(), b.isCompleted()))
                .toList();

        ReconciliationResponse response = toReconciliationResponse(record, bulletStatuses);

        return ResponseEntity.ok(ApiResponse.of(response));
    }

    private ReconciliationResponse toReconciliationResponse(ReconciliationRecord rec,
                                                              List<TaskBulletResponse> bulletStatuses) {
        return new ReconciliationResponse(
                rec.getId(),
                rec.getCommitment().getId(),
                rec.getCycle().getId(),
                rec.getStatus(),
                rec.getNotes(),
                rec.getPlannedHorizon(),
                rec.getReconciledAt(),
                rec.getReconciledBy().getId(),
                bulletStatuses,
                rec.getDisplacementCategory() != null ? rec.getDisplacementCategory().name() : null,
                rec.getDisplacementDetail(),
                rec.getDisplacingCommitment() != null ? rec.getDisplacingCommitment().getId() : null,
                rec.getDisplacingCommitment() != null ? rec.getDisplacingCommitment().getTitle() : null
        );
    }

    @PostMapping("/cycles/{cycleId}/complete")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<CycleResponse>> completeReconciliation(
            @PathVariable UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        // Transition to RECONCILED state
        TransitionRequest transitionRequest = new TransitionRequest(CycleState.RECONCILED, "Reconciliation complete");
        var cycle = cycleService.transition(cycleId, transitionRequest, actor);
        int commitmentCount = commitmentRepository
                .findByOrgIdAndCycleIdOrderByPriorityRankAsc(actor.getOrg().getId(), cycleId).size();
        return ResponseEntity.ok(ApiResponse.of(cycleMapper.toResponse(cycle, commitmentCount)));
    }
}
