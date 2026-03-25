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

    /** Find cycle whose startsAt falls within a date range (handles midnight UTC vs actual start time). */
    @Query("SELECT c FROM Cycle c WHERE c.org.id = :orgId AND c.startsAt >= :from AND c.startsAt < :to ORDER BY c.startsAt DESC")
    List<Cycle> findByOrgIdAndStartsAtBetween(@Param("orgId") UUID orgId, @Param("from") Instant from, @Param("to") Instant to);

    @Query(value = "SELECT * FROM cycles WHERE org_id = :orgId"
         + " AND (CAST(:state AS text) IS NULL OR state = :state)"
         + " AND (:dateFrom IS NULL OR starts_at >= :dateFrom)"
         + " AND (:dateTo IS NULL OR starts_at <= :dateTo)"
         + " ORDER BY starts_at DESC",
         countQuery = "SELECT COUNT(*) FROM cycles WHERE org_id = :orgId"
         + " AND (CAST(:state AS text) IS NULL OR state = :state)"
         + " AND (:dateFrom IS NULL OR starts_at >= :dateFrom)"
         + " AND (:dateTo IS NULL OR starts_at <= :dateTo)",
         nativeQuery = true)
    Page<Cycle> findByOrgIdWithFilters(@Param("orgId") UUID orgId,
                                       @Param("state") String state,
                                       @Param("dateFrom") Instant dateFrom,
                                       @Param("dateTo") Instant dateTo,
                                       Pageable pageable);
}
