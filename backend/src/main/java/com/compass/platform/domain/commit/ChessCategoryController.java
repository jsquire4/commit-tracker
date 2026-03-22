package com.compass.platform.domain.commit;

import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chess-categories")
@Transactional(readOnly = true)
public class ChessCategoryController {

    private final ChessCategoryRepository chessCategoryRepository;

    public ChessCategoryController(ChessCategoryRepository chessCategoryRepository) {
        this.chessCategoryRepository = chessCategoryRepository;
    }

    @GetMapping
    public ApiResponse<List<ChessCategoryResponse>> list() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        UUID orgId = actor.getOrg().getId();
        List<ChessCategory> categories = chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(orgId);
        List<ChessCategoryResponse> responses = categories.stream()
                .map(c -> new ChessCategoryResponse(c.getId(), c.getOrg().getId(), c.getName(), c.getDescription(), c.getColorHex(), c.getSortOrder(), c.isActive()))
                .toList();
        return ApiResponse.of(responses);
    }

    public record ChessCategoryResponse(UUID id, UUID orgId, String name, String description, String colorHex, int sortOrder, boolean isActive) {}
}
