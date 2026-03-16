package com.st6.committracker.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrgRepository extends JpaRepository<Org, UUID> {
    Optional<Org> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
