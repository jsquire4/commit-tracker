package com.compass.platform.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CommitmentRepository extends JpaRepository<Commitment, UUID> {

    List<Commitment> findByUserIdAndCycleIdOrderByPriorityRankAsc(UUID userId, UUID cycleId);

    List<Commitment> findByOrgIdAndCycleIdOrderByPriorityRankAsc(UUID orgId, UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.rallyCry.id = :rallyCryId AND c.cycle.id = :cycleId")
    List<Commitment> findByRallyCryIdAndCycleId(@Param("rallyCryId") UUID rallyCryId, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.definingObjective.id = :doId AND c.cycle.id = :cycleId")
    List<Commitment> findByDefiningObjectiveIdAndCycleId(@Param("doId") UUID doId, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.outcome.id = :outcomeId AND c.cycle.id = :cycleId")
    List<Commitment> findByOutcomeIdAndCycleId(@Param("outcomeId") UUID outcomeId, @Param("cycleId") UUID cycleId);

    long countByOrgIdAndCycleIdAndChessCategoryId(UUID orgId, UUID cycleId, UUID chessCategoryId);

    List<Commitment> findByAssignedByIdAndCycleId(UUID assignedById, UUID cycleId);

    long countByUserIdAndCycleId(UUID userId, UUID cycleId);

    List<Commitment> findByCarriedFromId(UUID carriedFromId);

    long countByRallyCryId(UUID rallyCryId);

    long countByDefiningObjectiveId(UUID definingObjectiveId);

    long countByOutcomeId(UUID outcomeId);

    @Query("SELECT c FROM Commitment c WHERE c.user.id IN :userIds AND c.cycle.id = :cycleId ORDER BY c.user.id, c.priorityRank")
    List<Commitment> findByUserIdInAndCycleId(@Param("userIds") Collection<UUID> userIds, @Param("cycleId") UUID cycleId);
}
