package com.st6.committracker.domain.cycle;

import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.cycle.dto.CycleFilters;
import com.st6.committracker.domain.cycle.dto.CycleResponse;
import com.st6.committracker.domain.cycle.dto.TransitionRequest;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.security.SecurityContextHelper;
import com.st6.committracker.shared.ApiResponse;
import com.st6.committracker.shared.PagedResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cycles")
@Transactional(readOnly = true)
public class CycleController {

    private final CycleService cycleService;
    private final CycleMapper cycleMapper;

    public CycleController(CycleService cycleService, CycleMapper cycleMapper) {
        this.cycleService = cycleService;
        this.cycleMapper = cycleMapper;
    }

    @GetMapping("/current")
    @Transactional
    public ResponseEntity<ApiResponse<CycleResponse>> getCurrentCycle() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Cycle cycle = cycleService.getCurrentCycle(actor);
        int count = cycleService.getCommitmentCount(actor.getOrg().getId(), cycle.getId());
        return ResponseEntity.ok(ApiResponse.of(cycleMapper.toResponse(cycle, count)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CycleResponse>> getCycle(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Cycle cycle = cycleService.getCycle(id, actor);
        int count = cycleService.getCommitmentCount(actor.getOrg().getId(), id);
        return ResponseEntity.ok(ApiResponse.of(cycleMapper.toResponse(cycle, count)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<CycleResponse>>> listCycles(
            @RequestParam(required = false) CycleState state,
            @RequestParam(required = false) Instant dateFrom,
            @RequestParam(required = false) Instant dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        CycleFilters filters = new CycleFilters(state, dateFrom, dateTo);
        Page<Cycle> cyclePage = cycleService.listCycles(
                actor.getOrg().getId(), filters, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "startsAt")));

        List<CycleResponse> responses = cyclePage.getContent().stream()
                .map(c -> cycleMapper.toResponse(c, cycleService.getCommitmentCount(actor.getOrg().getId(), c.getId())))
                .toList();

        PagedResponse<CycleResponse> pagedResponse = new PagedResponse<>(
                responses,
                cyclePage.getNumber(),
                cyclePage.getSize(),
                cyclePage.getTotalElements(),
                cyclePage.getTotalPages()
        );

        return ResponseEntity.ok(ApiResponse.of(pagedResponse));
    }

    @PostMapping("/{id}/transition")
    @Transactional
    public ResponseEntity<ApiResponse<CycleResponse>> transition(
            @PathVariable UUID id,
            @Valid @RequestBody TransitionRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Cycle updated = cycleService.transition(id, request, actor);
        int count = cycleService.getCommitmentCount(actor.getOrg().getId(), id);
        return ResponseEntity.ok(ApiResponse.of(cycleMapper.toResponse(updated, count)));
    }
}
