package com.compass.platform.domain.commit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    long countByOrgIdAndCycleId(UUID orgId, UUID cycleId);

    @Query("SELECT c.cycle.id, COUNT(c) FROM Commitment c WHERE c.org.id = :orgId AND c.cycle.id IN :cycleIds GROUP BY c.cycle.id")
    List<Object[]> countByOrgIdAndCycleIdIn(@Param("orgId") UUID orgId, @Param("cycleIds") Collection<UUID> cycleIds);

    long countByOrgIdAndCycleIdAndChessCategoryId(UUID orgId, UUID cycleId, UUID chessCategoryId);

    List<Commitment> findByAssignedByIdAndCycleId(UUID assignedById, UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.assignedBy.id IN :assignedByIds AND c.cycle.id IN :cycleIds ORDER BY c.assignedBy.id, c.cycle.id, c.priorityRank")
    List<Commitment> findByAssignedByIdInAndCycleIdIn(@Param("assignedByIds") Collection<UUID> assignedByIds, @Param("cycleIds") Collection<UUID> cycleIds);

    long countByUserIdAndCycleId(UUID userId, UUID cycleId);

    List<Commitment> findByCarriedFromId(UUID carriedFromId);

    long countByRallyCryId(UUID rallyCryId);

    long countByDefiningObjectiveId(UUID definingObjectiveId);

    @Query(value = "SELECT c.rally_cry_id AS rallyCryId, COUNT(c.id) AS cnt " +
                   "FROM commitments c " +
                   "WHERE c.org_id = :orgId AND c.cycle_id = :cycleId AND c.rally_cry_id IS NOT NULL " +
                   "GROUP BY c.rally_cry_id", nativeQuery = true)
    List<Object[]> countCommitmentsByRallyCryForOrgAndCycle(@Param("orgId") UUID orgId, @Param("cycleId") UUID cycleId);

    long countByOutcomeId(UUID outcomeId);

    @Query("SELECT c FROM Commitment c WHERE c.user.id IN :userIds AND c.cycle.id = :cycleId ORDER BY c.user.id, c.priorityRank")
    List<Commitment> findByUserIdInAndCycleId(@Param("userIds") Collection<UUID> userIds, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.user.id IN :userIds AND c.cycle.id IN :cycleIds ORDER BY c.cycle.id, c.user.id, c.priorityRank")
    List<Commitment> findByUserIdInAndCycleIdIn(@Param("userIds") Collection<UUID> userIds, @Param("cycleIds") Collection<UUID> cycleIds);

    List<Commitment> findByOrgIdAndCycleIdIn(UUID orgId, Collection<UUID> cycleIds);

    @Query("SELECT COALESCE(MAX(c.priorityRank), -1) FROM Commitment c WHERE c.org.id = :orgId AND c.cycle.id = :cycleId")
    int findMaxPriorityRank(@Param("orgId") UUID orgId, @Param("cycleId") UUID cycleId);

    @Query("SELECT c FROM Commitment c WHERE c.cycle.id = :cycleId AND c.org.id = :orgId"
         + " AND (:userId IS NULL OR c.user.id = :userId)"
         + " AND (:rallyCryId IS NULL OR c.rallyCry.id = :rallyCryId)"
         + " AND (:definingObjectiveId IS NULL OR c.definingObjective.id = :definingObjectiveId)"
         + " AND (:outcomeId IS NULL OR c.outcome.id = :outcomeId)"
         + " AND (:chessCategoryId IS NULL OR c.chessCategory.id = :chessCategoryId)"
         + " AND (:assignedById IS NULL OR c.assignedBy.id = :assignedById)"
         + " ORDER BY c.priorityRank ASC")
    Page<Commitment> findByCycleIdWithFilters(@Param("orgId") UUID orgId,
                                              @Param("cycleId") UUID cycleId,
                                              @Param("userId") UUID userId,
                                              @Param("rallyCryId") UUID rallyCryId,
                                              @Param("definingObjectiveId") UUID definingObjectiveId,
                                              @Param("outcomeId") UUID outcomeId,
                                              @Param("chessCategoryId") UUID chessCategoryId,
                                              @Param("assignedById") UUID assignedById,
                                              Pageable pageable);

    @Query("SELECT c FROM Commitment c WHERE c.cycle.id = :cycleId AND c.org.id = :orgId"
         + " AND (:userId IS NULL OR c.user.id = :userId)"
         + " AND (:rallyCryId IS NULL OR c.rallyCry.id = :rallyCryId)"
         + " AND (:definingObjectiveId IS NULL OR c.definingObjective.id = :definingObjectiveId)"
         + " AND (:outcomeId IS NULL OR c.outcome.id = :outcomeId)"
         + " AND (:chessCategoryId IS NULL OR c.chessCategory.id = :chessCategoryId)"
         + " AND (:assignedById IS NULL OR c.assignedBy.id = :assignedById)"
         + " ORDER BY c.priorityRank ASC")
    List<Commitment> findByCycleIdWithFilters(@Param("orgId") UUID orgId,
                                              @Param("cycleId") UUID cycleId,
                                              @Param("userId") UUID userId,
                                              @Param("rallyCryId") UUID rallyCryId,
                                              @Param("definingObjectiveId") UUID definingObjectiveId,
                                              @Param("outcomeId") UUID outcomeId,
                                              @Param("chessCategoryId") UUID chessCategoryId,
                                              @Param("assignedById") UUID assignedById);
}
