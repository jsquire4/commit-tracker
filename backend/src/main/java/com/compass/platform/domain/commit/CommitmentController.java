package com.compass.platform.domain.commit;

import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.dto.CommitmentFilters;
import com.compass.platform.domain.commit.dto.CommitmentResponse;
import com.compass.platform.domain.commit.dto.CreateCommitmentRequest;
import com.compass.platform.domain.commit.dto.CreateUnplannedCommitmentRequest;
import com.compass.platform.domain.commit.dto.ReorderRequest;
import com.compass.platform.domain.commit.dto.UpdateCommitmentRequest;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import com.compass.platform.shared.PagedResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commitments")
@Transactional(readOnly = true)
public class CommitmentController {

    private final CommitmentService commitmentService;
    private final CommitmentMapper commitmentMapper;
    private final TaskBulletRepository taskBulletRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;

    public CommitmentController(CommitmentService commitmentService,
                                CommitmentMapper commitmentMapper,
                                TaskBulletRepository taskBulletRepository,
                                ReconciliationRecordRepository reconciliationRecordRepository) {
        this.commitmentService = commitmentService;
        this.commitmentMapper = commitmentMapper;
        this.taskBulletRepository = taskBulletRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<CommitmentResponse>> create(
            @Valid @RequestBody CreateCommitmentRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Commitment saved = commitmentService.create(request, actor);
        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(saved.getId());
        CommitmentResponse response = commitmentMapper.toResponse(saved, bullets);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CommitmentResponse>> getById(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Commitment commitment = commitmentService.getById(id, actor);
        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(id);
        return ResponseEntity.ok(ApiResponse.of(commitmentMapper.toResponse(commitment, bullets)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<CommitmentResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCommitmentRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Commitment updated = commitmentService.update(id, request, actor);
        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(id);
        return ResponseEntity.ok(ApiResponse.of(commitmentMapper.toResponse(updated, bullets)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        commitmentService.delete(id, actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CommitmentResponse>>> list(
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID rallyCryId,
            @RequestParam(required = false) UUID definingObjectiveId,
            @RequestParam(required = false) UUID outcomeId,
            @RequestParam(required = false) UUID chessCategoryId,
            @RequestParam(required = false) UUID assignedBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "priorityRank,asc") String sort) {
        AppUser actor = SecurityContextHelper.getCurrentUser();

        CommitmentFilters filters = new CommitmentFilters(
                userId, rallyCryId, definingObjectiveId, outcomeId, chessCategoryId, assignedBy);

        // Parse sort parameter "field,direction"
        String[] sortParts = sort.split(",");
        String sortField = sortParts[0].trim();
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].trim().equalsIgnoreCase("desc")
                ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        // If no cycleId provided, use the actor's current active cycle if available
        UUID effectiveCycleId = cycleId;
        if (effectiveCycleId == null) {
            // Return empty page when no cycleId is specified
            PagedResponse<CommitmentResponse> empty = new PagedResponse<>(List.of(), page, size, 0, 0);
            return ResponseEntity.ok(ApiResponse.of(empty));
        }

        Page<Commitment> commitmentPage = commitmentService.getForCycle(effectiveCycleId, filters, pageable, actor);
        List<UUID> commitmentIds = commitmentPage.getContent().stream()
                .map(Commitment::getId).toList();
        Map<UUID, List<TaskBullet>> bulletsByCommitmentId = commitmentIds.isEmpty()
                ? Map.of()
                : taskBulletRepository.findByCommitmentIdIn(commitmentIds).stream()
                        .collect(java.util.stream.Collectors.groupingBy(t -> t.getCommitment().getId()));

        // Load reconciliation status for each commitment (if reconciled)
        List<ReconciliationRecord> reconRecords = reconciliationRecordRepository
                .findByOrgIdAndCycleId(actor.getOrg().getId(), effectiveCycleId);
        Map<UUID, ReconciliationStatus> reconStatusByCommitmentId = reconRecords.stream()
                .collect(java.util.stream.Collectors.toMap(
                        r -> r.getCommitment().getId(),
                        ReconciliationRecord::getStatus,
                        (a, b) -> a));

        List<CommitmentResponse> responses = commitmentPage.getContent().stream()
                .map(c -> commitmentMapper.toResponse(c,
                        bulletsByCommitmentId.getOrDefault(c.getId(), List.of()),
                        reconStatusByCommitmentId.get(c.getId())))
                .toList();

        PagedResponse<CommitmentResponse> pagedResponse = new PagedResponse<>(
                responses,
                commitmentPage.getNumber(),
                commitmentPage.getSize(),
                commitmentPage.getTotalElements(),
                commitmentPage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.of(pagedResponse));
    }

    @PutMapping("/reorder")
    @Transactional
    public ResponseEntity<Void> reorder(
            @RequestParam UUID cycleId,
            @Valid @RequestBody ReorderRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        commitmentService.reorder(cycleId, request.orderedIds(), actor);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unplanned")
    @Transactional
    public ResponseEntity<ApiResponse<CommitmentResponse>> createUnplanned(
            @Valid @RequestBody CreateUnplannedCommitmentRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Commitment saved = commitmentService.createUnplanned(request, actor);
        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(saved.getId());
        CommitmentResponse response = commitmentMapper.toResponse(saved, bullets);

        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/commitments/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(response));
    }
}
