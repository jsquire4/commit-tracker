package com.compass.platform.domain.icinsights;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PersonalReflectionRepository extends JpaRepository<PersonalReflection, UUID> {

    Optional<PersonalReflection> findByUserIdAndCycleId(UUID userId, UUID cycleId);
}
