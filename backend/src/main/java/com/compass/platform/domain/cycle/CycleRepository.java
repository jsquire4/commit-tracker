package com.compass.platform.domain.cycle;

import com.compass.platform.domain.CycleState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CycleRepository extends JpaRepository<Cycle, UUID> {
    Optional<Cycle> findByOrgIdAndIsActiveTrue(UUID orgId);
    List<Cycle> findByOrgIdOrderByStartsAtDesc(UUID orgId);
    List<Cycle> findTop12ByOrgIdOrderByStartsAtDesc(UUID orgId);
    List<Cycle> findByOrgIdAndStateOrderByStartsAtDesc(UUID orgId, CycleState state);
    Optional<Cycle> findByOrgIdAndStartsAt(UUID orgId, Instant startsAt);

    @Query("SELECT c FROM Cycle c WHERE c.org.id = :orgId"
         + " AND (:state IS NULL OR c.state = :state)"
         + " AND (CAST(:dateFrom AS timestamp) IS NULL OR c.startsAt >= :dateFrom)"
         + " AND (CAST(:dateTo AS timestamp) IS NULL OR c.startsAt <= :dateTo)"
         + " ORDER BY c.startsAt DESC")
    Page<Cycle> findByOrgIdWithFilters(@Param("orgId") UUID orgId,
                                       @Param("state") CycleState state,
                                       @Param("dateFrom") Instant dateFrom,
                                       @Param("dateTo") Instant dateTo,
                                       Pageable pageable);
}
