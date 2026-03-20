package com.compass.platform.domain.cycle;

import com.compass.platform.domain.cycle.dto.CycleResponse;
import org.springframework.stereotype.Component;

@Component
public class CycleMapper {

    public CycleResponse toResponse(Cycle entity, int commitmentCount) {
        return new CycleResponse(
            entity.getId(),
            entity.getOrg().getId(),
            entity.getLabel(),
            entity.getState(),
            entity.getStartsAt(),
            entity.getEndsAt(),
            entity.isActive(),
            commitmentCount,
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
