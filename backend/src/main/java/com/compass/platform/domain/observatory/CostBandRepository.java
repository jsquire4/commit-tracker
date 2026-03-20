package com.compass.platform.domain.observatory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CostBandRepository extends JpaRepository<CostBand, UUID> {
    List<CostBand> findByOrgIdOrderByTierAsc(UUID orgId);
    Optional<CostBand> findByOrgIdAndName(UUID orgId, String name);
}
