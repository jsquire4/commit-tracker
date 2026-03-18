package com.st6.committracker.domain.observatory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ObservatoryConfigRepository extends JpaRepository<ObservatoryConfig, UUID> {
    Optional<ObservatoryConfig> findByOrgId(UUID orgId);
}
