package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /**
     * Load user with org eagerly to avoid LazyInitializationException
     * when the entity is accessed outside of the loading session.
     */
    @EntityGraph(attributePaths = {"org"})
    Optional<AppUser> findWithOrgById(UUID id);

    Optional<AppUser> findByOrgIdAndEmail(UUID orgId, String email);

    List<AppUser> findByOrgIdAndIsActiveTrue(UUID orgId);

    List<AppUser> findByReportsToId(UUID managerId);

    @Query("SELECT u FROM AppUser u WHERE u.org.id = :orgId AND u.reportsTo.id = :managerId AND u.isActive = true")
    List<AppUser> findDirectReports(@Param("orgId") UUID orgId, @Param("managerId") UUID managerId);

    List<AppUser> findByOrgIdAndCommitModuleEnabledTrue(UUID orgId);

    /**
     * Count active users in the given org — used by PortfolioService for headcount.
     */
    long countByOrgIdAndIsActiveTrue(UUID orgId);

    /**
     * Find active users in the given org whose role is one of the supplied roles.
     * Used by ExecutiveHealthComposer to load VP/Director leaders for unit health breakdown.
     */
    List<AppUser> findByOrgIdAndRoleIn(UUID orgId, Collection<UserRole> roles);

    @Query(value = """
        WITH RECURSIVE subtree AS (
            SELECT id, org_id, email, display_name, role, reports_to, is_active
            FROM users WHERE id = :rootUserId
            UNION ALL
            SELECT u.id, u.org_id, u.email, u.display_name, u.role, u.reports_to, u.is_active
            FROM users u INNER JOIN subtree s ON u.reports_to = s.id
        )
        SELECT id FROM subtree WHERE is_active = true AND id != :rootUserId
        """, nativeQuery = true)
    List<UUID> findSubtreeUserIds(@Param("rootUserId") UUID rootUserId);
}
