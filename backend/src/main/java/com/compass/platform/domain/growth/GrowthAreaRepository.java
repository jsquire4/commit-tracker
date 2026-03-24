package com.compass.platform.domain.growth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GrowthAreaRepository extends JpaRepository<GrowthArea, UUID> {

    List<GrowthArea> findByUserIdAndIsActiveTrueOrderBySortOrderAsc(UUID userId);

    /** Returns ALL growth areas for a user (active and inactive), ordered by sort_order. */
    List<GrowthArea> findByUserIdOrderBySortOrderAsc(UUID userId);

    long countByUserIdAndIsActiveTrue(UUID userId);

    Optional<GrowthArea> findByUserIdAndLabelIgnoreCaseAndIsActiveTrue(UUID userId, String label);
}
