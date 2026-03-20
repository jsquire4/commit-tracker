package com.compass.platform.domain.user;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.observatory.CostBand;
import com.compass.platform.domain.observatory.CostBandRepository;
import com.compass.platform.domain.user.dto.CreateOrgRequest;
import com.compass.platform.domain.user.dto.CreateUserRequest;
import com.compass.platform.domain.user.dto.UpdateUserRequest;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    private final AppUserRepository userRepository;
    private final OrgRepository orgRepository;
    private final CostBandRepository costBandRepository;
    private final AuditService auditService;

    public UserManagementService(AppUserRepository userRepository,
                                  OrgRepository orgRepository,
                                  CostBandRepository costBandRepository,
                                  AuditService auditService) {
        this.userRepository = userRepository;
        this.orgRepository = orgRepository;
        this.costBandRepository = costBandRepository;
        this.auditService = auditService;
    }

    // ─── Create User ──────────────────────────────────────────────────────────

    public AppUser createUser(CreateUserRequest request, AppUser actor) {
        requireManagerOrAbove(actor);

        UUID orgId = actor.getOrg().getId();

        // Validate email uniqueness within org
        if (userRepository.findByOrgIdAndEmail(orgId, request.email()).isPresent()) {
            throw new ConflictException("A user with email '" + request.email() + "' already exists in this organization");
        }

        // Resolve reportsTo
        AppUser reportsTo = null;
        if (request.reportsToId() != null) {
            reportsTo = userRepository.findWithOrgById(request.reportsToId())
                    .orElseThrow(() -> new EntityNotFoundException("AppUser", request.reportsToId()));
            if (!reportsTo.getOrg().getId().equals(orgId)) {
                throw new ConflictException("Reports-to user is not in the same organization");
            }
        }

        // Resolve costBand
        CostBand costBand = null;
        if (request.costBandId() != null) {
            costBand = costBandRepository.findById(request.costBandId())
                    .orElseThrow(() -> new EntityNotFoundException("CostBand", request.costBandId()));
        }

        AppUser user = new AppUser(actor.getOrg(), request.email(), request.displayName(), request.role(), reportsTo);
        user.setCostBand(costBand);
        if (request.weeklyCapacityHours() != null) {
            user.setWeeklyCapacityHours(request.weeklyCapacityHours());
        }

        AppUser saved = userRepository.save(user);
        auditService.log(orgId, "AppUser", saved.getId(), "USER_CREATED", actor,
                Map.of("email", request.email(), "role", request.role().name(), "displayName", request.displayName()));
        log.info("Created user id={} email={} orgId={}", saved.getId(), request.email(), orgId);

        return saved;
    }

    // ─── Update User ──────────────────────────────────────────────────────────

    public AppUser updateUser(UUID userId, UpdateUserRequest request, AppUser actor) {
        requireManagerOrAbove(actor);
        requireSubtreeAccess(actor, userId);

        UUID orgId = actor.getOrg().getId();
        AppUser user = userRepository.findWithOrgById(userId)
                .orElseThrow(() -> new EntityNotFoundException("AppUser", userId));

        if (!user.getOrg().getId().equals(orgId)) {
            throw new AccessDeniedException("User is not in your organization");
        }

        // Resolve reportsTo
        AppUser reportsTo = null;
        if (request.reportsToId() != null) {
            reportsTo = userRepository.findWithOrgById(request.reportsToId())
                    .orElseThrow(() -> new EntityNotFoundException("AppUser", request.reportsToId()));
            if (!reportsTo.getOrg().getId().equals(orgId)) {
                throw new ConflictException("Reports-to user is not in the same organization");
            }
            // Prevent circular: user can't report to themselves
            if (reportsTo.getId().equals(userId)) {
                throw new ConflictException("User cannot report to themselves");
            }
        }

        // Resolve costBand
        CostBand costBand = null;
        if (request.costBandId() != null) {
            costBand = costBandRepository.findById(request.costBandId())
                    .orElseThrow(() -> new EntityNotFoundException("CostBand", request.costBandId()));
        }

        user.setDisplayName(request.displayName());
        user.setRole(request.role());
        user.setReportsTo(reportsTo);
        user.setCostBand(costBand);
        if (request.weeklyCapacityHours() != null) {
            user.setWeeklyCapacityHours(request.weeklyCapacityHours());
        }

        AppUser saved = userRepository.save(user);
        auditService.log(orgId, "AppUser", userId, "USER_UPDATED", actor,
                Map.of("displayName", request.displayName(), "role", request.role().name()));
        log.info("Updated user id={} orgId={}", userId, orgId);

        return saved;
    }

    // ─── Archive/Restore ──────────────────────────────────────────────────────

    public void archiveUser(UUID userId, AppUser actor) {
        requireManagerOrAbove(actor);
        requireSubtreeAccess(actor, userId);

        AppUser user = userRepository.findWithOrgById(userId)
                .orElseThrow(() -> new EntityNotFoundException("AppUser", userId));

        if (!user.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("User is not in your organization");
        }

        user.setActive(false);
        userRepository.save(user);
        auditService.log(actor.getOrg().getId(), "AppUser", userId, "USER_ARCHIVED", actor,
                Map.of("email", user.getEmail()));
        log.info("Archived user id={}", userId);
    }

    public void restoreUser(UUID userId, AppUser actor) {
        requireManagerOrAbove(actor);
        requireSubtreeAccess(actor, userId);

        AppUser user = userRepository.findWithOrgById(userId)
                .orElseThrow(() -> new EntityNotFoundException("AppUser", userId));

        if (!user.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("User is not in your organization");
        }

        user.setActive(true);
        userRepository.save(user);
        auditService.log(actor.getOrg().getId(), "AppUser", userId, "USER_RESTORED", actor,
                Map.of("email", user.getEmail()));
        log.info("Restored user id={}", userId);
    }

    // ─── List Users ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AppUser> listUsers(AppUser actor) {
        requireManagerOrAbove(actor);
        UUID orgId = actor.getOrg().getId();
        UserRole role = actor.getRole();

        // VP and EXECUTIVE see the full org
        if (role == UserRole.VP || role == UserRole.EXECUTIVE) {
            return userRepository.findByOrgIdAndIsActiveTrue(orgId);
        }

        // MANAGER and DIRECTOR see their subtree
        List<UUID> subtreeIds = userRepository.findSubtreeUserIds(actor.getId());
        if (subtreeIds.isEmpty()) {
            return List.of();
        }
        return userRepository.findAllById(subtreeIds).stream()
                .filter(AppUser::isActive)
                .toList();
    }

    // ─── Create Org ───────────────────────────────────────────────────────────

    public Org createOrg(CreateOrgRequest request, AppUser actor) {
        if (actor.getRole() != UserRole.EXECUTIVE) {
            throw new AccessDeniedException("Only EXECUTIVE role can create organizations");
        }

        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = request.name().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        }

        if (orgRepository.existsBySlug(slug)) {
            throw new ConflictException("An organization with slug '" + slug + "' already exists");
        }

        String timezone = request.timezone();
        if (timezone == null || timezone.isBlank()) {
            timezone = "UTC";
        }

        Org org = Org.builder()
                .name(request.name())
                .slug(slug)
                .timezone(timezone)
                .isActive(true)
                .build();

        Org saved = orgRepository.save(org);
        auditService.log(saved.getId(), "Org", saved.getId(), "ORG_CREATED", actor,
                Map.of("name", request.name(), "slug", slug));
        log.info("Created org id={} name={}", saved.getId(), request.name());

        return saved;
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    private void requireManagerOrAbove(AppUser actor) {
        UserRole role = actor.getRole();
        if (role == UserRole.EMPLOYEE || role == UserRole.ANALYST) {
            throw new AccessDeniedException("MANAGER or above required");
        }
    }

    private void requireSubtreeAccess(AppUser actor, UUID targetUserId) {
        UserRole role = actor.getRole();
        // VP and EXECUTIVE can manage anyone in the org
        if (role == UserRole.VP || role == UserRole.EXECUTIVE) return;
        // MANAGER and DIRECTOR can manage their subtree
        if (role == UserRole.MANAGER || role == UserRole.DIRECTOR) {
            List<UUID> subtreeIds = userRepository.findSubtreeUserIds(actor.getId());
            if (!subtreeIds.contains(targetUserId)) {
                throw new AccessDeniedException("User is not in your reporting subtree");
            }
            return;
        }
        throw new AccessDeniedException("MANAGER or above required");
    }
}
