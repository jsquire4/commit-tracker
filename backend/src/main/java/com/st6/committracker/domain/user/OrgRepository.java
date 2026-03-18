package com.st6.committracker.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrgRepository extends JpaRepository<Org, UUID> {
    Optional<Org> findBySlug(String slug);
    boolean existsBySlug(String slug);

    /**
     * Find all orgs that belong to the given portfolio.
     * Used by PortfolioService to iterate over portcos.
     */
    List<Org> findByPortfolioId(UUID portfolioId);
}
