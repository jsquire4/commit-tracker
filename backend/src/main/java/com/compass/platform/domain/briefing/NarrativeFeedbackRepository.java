package com.compass.platform.domain.briefing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NarrativeFeedbackRepository extends JpaRepository<NarrativeFeedback, UUID> {

    Optional<NarrativeFeedback> findByOrgIdAndUserIdAndScopeAndCycleId(
            UUID orgId, UUID userId, String scope, UUID cycleId);

    long countByOrgIdAndScopeAndVote(UUID orgId, String scope, String vote);
}
