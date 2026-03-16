package com.st6.committracker.domain.cycle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CycleRepository extends JpaRepository<Cycle, UUID> {
    Optional<Cycle> findByOrgIdAndIsActiveTrue(UUID orgId);
    List<Cycle> findByOrgIdOrderByStartsAtDesc(UUID orgId);
}
