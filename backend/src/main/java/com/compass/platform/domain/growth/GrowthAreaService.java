package com.compass.platform.domain.growth;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.growth.dto.CreateGrowthAreaRequest;
import com.compass.platform.domain.growth.dto.GrowthAreaDto;
import com.compass.platform.domain.growth.dto.UpdateGrowthAreaRequest;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class GrowthAreaService {

    private static final Logger log = LoggerFactory.getLogger(GrowthAreaService.class);
    private static final int MAX_ACTIVE_GROWTH_AREAS = 5;

    private final GrowthAreaRepository growthAreaRepository;

    public GrowthAreaService(GrowthAreaRepository growthAreaRepository) {
        this.growthAreaRepository = growthAreaRepository;
    }

    public GrowthAreaDto create(CreateGrowthAreaRequest request, AppUser actor) {
        requireNotAnalyst(actor);

        long activeCount = growthAreaRepository.countByUserIdAndIsActiveTrue(actor.getId());
        if (activeCount >= MAX_ACTIVE_GROWTH_AREAS) {
            throw new ConflictException("Maximum " + MAX_ACTIVE_GROWTH_AREAS + " active growth areas");
        }

        growthAreaRepository.findByUserIdAndLabelIgnoreCaseAndIsActiveTrue(actor.getId(), request.label())
                .ifPresent(existing -> {
                    throw new ConflictException("Growth area with this label already exists");
                });

        GrowthArea growthArea = GrowthArea.builder()
                .user(actor)
                .org(actor.getOrg())
                .label(request.label())
                .description(request.description())
                .build();

        GrowthArea saved = growthAreaRepository.save(growthArea);
        log.debug("Created growth area {} for user {}", saved.getId(), actor.getId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<GrowthAreaDto> listForCurrentUser(AppUser actor) {
        return growthAreaRepository
                .findByUserIdAndIsActiveTrueOrderBySortOrderAsc(actor.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public GrowthAreaDto update(UUID id, UpdateGrowthAreaRequest request, AppUser actor) {
        requireNotAnalyst(actor);

        GrowthArea growthArea = growthAreaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("GrowthArea", id));

        if (!growthArea.getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Not owner of this growth area");
        }

        if (request.label() != null && !request.label().isBlank()) {
            boolean labelConflict = growthAreaRepository
                    .findByUserIdAndLabelIgnoreCaseAndIsActiveTrue(actor.getId(), request.label())
                    .map(existing -> !existing.getId().equals(id))
                    .orElse(false);
            if (labelConflict) {
                throw new ConflictException("Growth area with this label already exists");
            }
            growthArea.setLabel(request.label());
        }

        if (request.description() != null) {
            growthArea.setDescription(request.description());
        }

        if (request.sortOrder() != null) {
            growthArea.setSortOrder(request.sortOrder());
        }

        GrowthArea saved = growthAreaRepository.save(growthArea);
        log.debug("Updated growth area {} for user {}", saved.getId(), actor.getId());
        return toDto(saved);
    }

    public void delete(UUID id, AppUser actor) {
        requireNotAnalyst(actor);

        GrowthArea growthArea = growthAreaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("GrowthArea", id));

        if (!growthArea.getUser().getId().equals(actor.getId())) {
            throw new AccessDeniedException("Not owner of this growth area");
        }

        growthArea.setActive(false);
        growthAreaRepository.save(growthArea);
        log.debug("Soft-deleted growth area {} for user {}", id, actor.getId());
    }

    private void requireNotAnalyst(AppUser actor) {
        if (actor.getRole() == UserRole.ANALYST) {
            throw new AccessDeniedException("Analysts cannot manage growth areas");
        }
    }

    private GrowthAreaDto toDto(GrowthArea entity) {
        return new GrowthAreaDto(
                entity.getId(),
                entity.getLabel(),
                entity.getDescription(),
                entity.isActive(),
                entity.getSortOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
