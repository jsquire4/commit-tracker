package com.st6.committracker.domain.cycle;

import com.st6.committracker.domain.CycleState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CycleRepository extends JpaRepository<Cycle, UUID> {
    Optional<Cycle> findByOrgIdAndIsActiveTrue(UUID orgId);
    List<Cycle> findByOrgIdOrderByStartsAtDesc(UUID orgId);
    List<Cycle> findByOrgIdAndStateOrderByStartsAtDesc(UUID orgId, CycleState state);
    Optional<Cycle> findByOrgIdAndStartsAt(UUID orgId, Instant startsAt);
}
