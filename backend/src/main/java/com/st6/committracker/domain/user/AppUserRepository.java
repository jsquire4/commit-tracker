package com.st6.committracker.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByOrgIdAndEmail(UUID orgId, String email);

    List<AppUser> findByOrgIdAndIsActiveTrue(UUID orgId);

    List<AppUser> findByReportsToId(UUID managerId);

    @Query("SELECT u FROM AppUser u WHERE u.org.id = :orgId AND u.reportsTo.id = :managerId AND u.isActive = true")
    List<AppUser> findDirectReports(@Param("orgId") UUID orgId, @Param("managerId") UUID managerId);

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
