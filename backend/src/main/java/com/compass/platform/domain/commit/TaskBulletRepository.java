package com.compass.platform.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TaskBulletRepository extends JpaRepository<TaskBullet, UUID> {
    List<TaskBullet> findByCommitmentIdOrderBySortOrderAsc(UUID commitmentId);

    @Query("SELECT t FROM TaskBullet t WHERE t.commitment.id IN :commitmentIds ORDER BY t.commitment.id, t.sortOrder")
    List<TaskBullet> findByCommitmentIdIn(@Param("commitmentIds") Collection<UUID> commitmentIds);
}
