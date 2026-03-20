package com.compass.platform.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnalystScopeRepository extends JpaRepository<AnalystScope, UUID> {
    List<AnalystScope> findByAnalystId(UUID analystUserId);
}
