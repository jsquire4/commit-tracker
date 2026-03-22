package com.compass.platform.domain.briefing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface GeneratedNarrativeRepository extends JpaRepository<GeneratedNarrative, UUID> {

    Optional<GeneratedNarrative> findByOrgIdAndCycleIdAndNarrativeTypeAndScopeKey(
            UUID orgId, UUID cycleId, String narrativeType, String scopeKey);

    /** Invalidate all range-based narratives for an org (e.g., after new cycle reconciliation). */
    @Modifying
    @Query("DELETE FROM GeneratedNarrative n WHERE n.org.id = :orgId AND n.narrativeType = :narrativeType")
    void deleteByOrgIdAndNarrativeType(UUID orgId, String narrativeType);

    /** Invalidate a specific cycle's narratives (e.g., if data is corrected). */
    @Modifying
    @Query("DELETE FROM GeneratedNarrative n WHERE n.org.id = :orgId AND n.cycle.id = :cycleId")
    void deleteByOrgIdAndCycleId(UUID orgId, UUID cycleId);
}
