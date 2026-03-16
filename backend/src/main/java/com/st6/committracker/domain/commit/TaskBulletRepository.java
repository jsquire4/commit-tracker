package com.st6.committracker.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskBulletRepository extends JpaRepository<TaskBullet, UUID> {
    List<TaskBullet> findByCommitmentIdOrderBySortOrderAsc(UUID commitmentId);
}
