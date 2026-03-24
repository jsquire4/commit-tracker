package com.compass.platform.domain.growth;

import com.compass.platform.domain.growth.dto.CreateGrowthAreaRequest;
import com.compass.platform.domain.growth.dto.GrowthAreaDto;
import com.compass.platform.domain.growth.dto.UpdateGrowthAreaRequest;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/growth-areas")
@Transactional(readOnly = true)
public class GrowthAreaController {

    private final GrowthAreaService growthAreaService;

    public GrowthAreaController(GrowthAreaService growthAreaService) {
        this.growthAreaService = growthAreaService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<GrowthAreaDto>> create(
            @Valid @RequestBody CreateGrowthAreaRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        GrowthAreaDto created = growthAreaService.create(request, actor);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(created));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<GrowthAreaDto>>> listMine() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        List<GrowthAreaDto> areas = growthAreaService.listForCurrentUser(actor);
        return ResponseEntity.ok(ApiResponse.of(areas));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<GrowthAreaDto>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGrowthAreaRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        GrowthAreaDto updated = growthAreaService.update(id, request, actor);
        return ResponseEntity.ok(ApiResponse.of(updated));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        growthAreaService.delete(id, actor);
        return ResponseEntity.noContent().build();
    }
}
