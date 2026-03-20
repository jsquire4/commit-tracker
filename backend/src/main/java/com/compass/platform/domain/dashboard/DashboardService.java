package com.compass.platform.domain.dashboard;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.ChessCategoryRepository;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.dashboard.dto.AlignmentSignalResponse;
import com.compass.platform.domain.dashboard.dto.AssignmentAttributionResponse;
import com.compass.platform.domain.dashboard.dto.DashboardFilters;
import com.compass.platform.domain.dashboard.dto.RcdoCoverageResponse;
import com.compass.platform.domain.dashboard.dto.TeamRollupResponse;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.security.VisibilityEnforcer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    /** Bundles the three data loads shared by all dashboard methods. */
    private record DashboardData(
            List<AppUser> members,
            Optional<Cycle> cycle,
            Map<UUID, List<Commitment>> commitmentsByUser
    ) {}

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    // Roles allowed to view team dashboards
    private static final Set<UserRole> MANAGER_ROLES = Set.of(
            UserRole.MANAGER, UserRole.DIRECTOR, UserRole.VP, UserRole.EXECUTIVE
    );

    // Roles that can include the full reporting subtree
    private static final Set<UserRole> SUBTREE_ROLES = Set.of(
            UserRole.DIRECTOR, UserRole.VP, UserRole.EXECUTIVE
    );

    // Concentration risk threshold: flag if one person holds >50% of manager-assigned work
    private static final double CONCENTRATION_RISK_THRESHOLD = 0.5;

    private final CommitmentRepository commitmentRepository;
    private final AppUserRepository userRepository;
    private final CycleRepository cycleRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;

    public DashboardService(CommitmentRepository commitmentRepository,
                            AppUserRepository userRepository,
                            CycleRepository cycleRepository,
                            ChessCategoryRepository chessCategoryRepository,
                            ReconciliationRecordRepository reconciliationRecordRepository,
                            VisibilityEnforcer visibilityEnforcer,
                            RallyCryRepository rallyCryRepository,
                            DefiningObjectiveRepository definingObjectiveRepository) {
        this.commitmentRepository = commitmentRepository;
        this.userRepository = userRepository;
        this.cycleRepository = cycleRepository;
        this.chessCategoryRepository = chessCategoryRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
    }

    /**
     * Get team roll-up for a manager.
     * Validates: actor must be MANAGER, DIRECTOR, VP, or EXECUTIVE.
     * Returns: for each direct report, their commitment count, reconciliation status,
     * chess category breakdown, and current cycle state.
     * Filters: cycleWeekStart, teamMemberId.
     * If actor is DIRECTOR+: includeSubtree flag returns transitive reports.
     */
    public TeamRollupResponse getTeamRollup(AppUser manager, DashboardFilters filters) {
        assertManagerRole(manager);

        DashboardData data = loadDashboardData(manager, filters);

        // Fetch reconciliation records once for the whole org+cycle, not per member
        Set<UUID> reconciledCommitmentIds = data.cycle()
                .map(cycle -> reconciliationRecordRepository
                        .findByOrgIdAndCycleId(manager.getOrg().getId(), cycle.getId())
                        .stream()
                        .map(r -> r.getCommitment().getId())
                        .collect(Collectors.toSet()))
                .orElse(Set.of());

        List<TeamRollupResponse.TeamMemberSummary> summaries = data.members().stream()
                .map(member -> buildTeamMemberSummary(member, data.cycle(), data.commitmentsByUser(), reconciledCommitmentIds))
                .toList();

        log.debug("getTeamRollup managerId={} cycleId={} memberCount={}",
                manager.getId(), data.cycle().map(Cycle::getId).orElse(null), summaries.size());

        return new TeamRollupResponse(summaries);
    }

    /**
     * Get alignment gap signal.
     * Computes: percentage breakdown of commitments by chess category across the manager's team.
     * Response: team aggregate bar + per-member breakdown.
     */
    public AlignmentSignalResponse getAlignmentSignal(AppUser manager, DashboardFilters filters) {
        assertManagerRole(manager);

        DashboardData data = loadDashboardData(manager, filters);
        List<AppUser> members = data.members();
        Map<UUID, List<Commitment>> byUser = data.commitmentsByUser();

        // Team-level aggregate
        List<Commitment> allCommitments = byUser.values().stream()
                .flatMap(List::stream)
                .toList();

        int total = allCommitments.size();
        Map<String, Integer> categoryCounts = new HashMap<>();
        int teamUnlinked = 0;

        for (Commitment c : allCommitments) {
            if (c.getChessCategory() == null) {
                teamUnlinked++;
            } else {
                String name = c.getChessCategory().getName();
                categoryCounts.merge(name, 1, Integer::sum);
            }
        }

        Map<String, AlignmentSignalResponse.CategoryDistribution> teamDist = buildCategoryDistribution(categoryCounts, total);

        // Per-member breakdown
        List<AlignmentSignalResponse.MemberAlignment> memberAlignments = members.stream()
                .map(member -> {
                    List<Commitment> memberCommitments = byUser.getOrDefault(member.getId(), List.of());
                    int memberTotal = memberCommitments.size();
                    Map<String, Integer> memberCounts = new HashMap<>();
                    int memberUnlinked = 0;
                    for (Commitment c : memberCommitments) {
                        if (c.getChessCategory() == null) {
                            memberUnlinked++;
                        } else {
                            memberCounts.merge(c.getChessCategory().getName(), 1, Integer::sum);
                        }
                    }
                    Map<String, AlignmentSignalResponse.CategoryDistribution> dist =
                            buildCategoryDistribution(memberCounts, memberTotal);
                    return new AlignmentSignalResponse.MemberAlignment(
                            member.getId(), member.getDisplayName(), dist, memberUnlinked);
                })
                .toList();

        return new AlignmentSignalResponse(members.size(), teamDist, teamUnlinked, memberAlignments);
    }

    /**
     * Get assignment attribution stats.
     * Computes:
     * - % of team work that is manager-assigned vs self-directed
     * - Distribution of assignments per team member (dependency risk signal)
     * - Per-manager assignment patterns
     */
    public AssignmentAttributionResponse getAssignmentAttribution(AppUser manager, DashboardFilters filters) {
        assertManagerRole(manager);

        DashboardData data = loadDashboardData(manager, filters);
        List<AppUser> members = data.members();
        Map<UUID, List<Commitment>> byUser = data.commitmentsByUser();

        List<Commitment> allCommitments = byUser.values().stream()
                .flatMap(List::stream)
                .toList();

        int total = allCommitments.size();
        int managerAssigned = (int) allCommitments.stream()
                .filter(c -> c.getAssignedBy() != null)
                .count();
        int selfDirected = total - managerAssigned;

        double selfPct = total == 0 ? 0.0 : (double) selfDirected / total * 100.0;
        double managerPct = total == 0 ? 0.0 : (double) managerAssigned / total * 100.0;

        // Concentration risks: members where manager-assigned count exceeds threshold
        List<AssignmentAttributionResponse.AssignmentConcentration> risks = new ArrayList<>();
        for (AppUser member : members) {
            List<Commitment> memberCommitments = byUser.getOrDefault(member.getId(), List.of());
            int assignedCount = (int) memberCommitments.stream()
                    .filter(c -> c.getAssignedBy() != null)
                    .count();
            if (total > 0) {
                double pct = (double) assignedCount / total;
                if (pct >= CONCENTRATION_RISK_THRESHOLD) {
                    risks.add(new AssignmentAttributionResponse.AssignmentConcentration(
                            member.getId(), member.getDisplayName(), assignedCount, pct * 100.0));
                }
            }
        }

        return new AssignmentAttributionResponse(total, selfDirected, selfPct, managerAssigned, managerPct, risks);
    }

    /**
     * Get RCDO coverage analysis.
     * Computes:
     * - % of commitments linked to each Rally Cry
     * - % of commitments unlinked (operational/escape hatch)
     * - Which Defining Objectives have no commitments (coverage gaps)
     */
    public RcdoCoverageResponse getRcdoCoverage(AppUser actor, DashboardFilters filters) {
        assertManagerRole(actor);

        DashboardData data = loadDashboardData(actor, filters);
        Map<UUID, List<Commitment>> byUser = data.commitmentsByUser();

        List<Commitment> allCommitments = byUser.values().stream()
                .flatMap(List::stream)
                .toList();

        int total = allCommitments.size();
        int unlinked = (int) allCommitments.stream()
                .filter(c -> c.getRallyCry() == null)
                .count();
        int linked = total - unlinked;
        double linkedPct = total == 0 ? 0.0 : (double) linked / total * 100.0;

        // Per-rally-cry coverage
        Map<UUID, Long> rallyCryCounts = allCommitments.stream()
                .filter(c -> c.getRallyCry() != null)
                .collect(Collectors.groupingBy(c -> c.getRallyCry().getId(), Collectors.counting()));

        // Build rally cry coverage list from the commitments (preserving titles)
        Map<UUID, RallyCry> rallyCryById = allCommitments.stream()
                .filter(c -> c.getRallyCry() != null)
                .collect(Collectors.toMap(
                        c -> c.getRallyCry().getId(),
                        Commitment::getRallyCry,
                        (a, b) -> a));

        List<RcdoCoverageResponse.RallyCryCoverage> byRallyCry = rallyCryById.values().stream()
                .map(rc -> {
                    int count = rallyCryCounts.getOrDefault(rc.getId(), 0L).intValue();
                    double pct = total == 0 ? 0.0 : (double) count / total * 100.0;
                    return new RcdoCoverageResponse.RallyCryCoverage(rc.getId(), rc.getTitle(), count, pct);
                })
                .toList();

        // Uncovered defining objectives: DOs linked to rally cries that appear in our commitments, but have 0 commitments
        Set<UUID> coveredDoIds = allCommitments.stream()
                .filter(c -> c.getDefiningObjective() != null)
                .map(c -> c.getDefiningObjective().getId())
                .collect(Collectors.toSet());

        // Batch-fetch all DOs for the org once, then filter in memory (avoids N+1 per rally cry)
        List<DefiningObjective> allOrgDos = definingObjectiveRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(actor.getOrg().getId());

        Map<UUID, List<DefiningObjective>> dosByRcId = allOrgDos.stream()
                .collect(Collectors.groupingBy(d -> d.getRallyCry().getId()));

        List<RcdoCoverageResponse.UncoveredObjective> uncoveredObjectives = new ArrayList<>();
        for (RallyCry rc : rallyCryById.values()) {
            List<DefiningObjective> dos = dosByRcId.getOrDefault(rc.getId(), List.of());
            for (DefiningObjective doObj : dos) {
                if (!coveredDoIds.contains(doObj.getId())) {
                    uncoveredObjectives.add(new RcdoCoverageResponse.UncoveredObjective(
                            doObj.getId(), doObj.getTitle(), rc.getTitle()));
                }
            }
        }

        return new RcdoCoverageResponse(total, linked, unlinked, linkedPct, byRallyCry, uncoveredObjectives);
    }

    // === Internal helpers ===

    /**
     * Loads the three shared data pieces used by every dashboard method:
     * visible team members, resolved cycle, and commitments grouped by user.
     */
    private DashboardData loadDashboardData(AppUser manager, DashboardFilters filters) {
        List<AppUser> members = getVisibleTeamMembers(manager, filters);
        Optional<Cycle> cycleOpt = resolveCycle(manager.getOrg().getId(), filters);
        List<UUID> userIds = members.stream().map(AppUser::getId).toList();
        Map<UUID, List<Commitment>> byUser = groupCommitmentsByUser(userIds, cycleOpt.map(Cycle::getId).orElse(null));
        return new DashboardData(members, cycleOpt, byUser);
    }

    /**
     * Returns the visible team members for the given manager, applying filters.
     * DIRECTOR+ with includeSubtree=true returns transitive reports.
     * Optionally filters to a single teamMemberId.
     */
    List<AppUser> getVisibleTeamMembers(AppUser manager, DashboardFilters filters) {
        List<AppUser> members;

        if (filters.includeSubtree() && SUBTREE_ROLES.contains(manager.getRole())) {
            List<UUID> subtreeIds = userRepository.findSubtreeUserIds(manager.getId());
            members = subtreeIds.isEmpty()
                    ? List.of()
                    : userRepository.findAllById(subtreeIds);
        } else {
            members = userRepository.findDirectReports(manager.getOrg().getId(), manager.getId());
        }

        // Apply single-member filter if specified
        if (filters.teamMemberId() != null) {
            members = members.stream()
                    .filter(u -> u.getId().equals(filters.teamMemberId()))
                    .toList();
        }

        return members;
    }

    /**
     * Groups commitments by user ID for the given list of user IDs and cycle.
     * Returns an empty list per user if no commitments found.
     * When cycleId is null, returns an empty map (no cycle context).
     */
    Map<UUID, List<Commitment>> groupCommitmentsByUser(List<UUID> userIds, UUID cycleId) {
        if (userIds.isEmpty() || cycleId == null) {
            Map<UUID, List<Commitment>> empty = new HashMap<>();
            userIds.forEach(id -> empty.put(id, List.of()));
            return empty;
        }

        List<Commitment> all = commitmentRepository.findByUserIdInAndCycleId(userIds, cycleId);
        Map<UUID, List<Commitment>> grouped = all.stream()
                .collect(Collectors.groupingBy(c -> c.getUser().getId()));

        // Ensure every requested user has an entry (even if empty)
        Map<UUID, List<Commitment>> result = new HashMap<>(grouped);
        userIds.forEach(id -> result.putIfAbsent(id, List.of()));
        return result;
    }

    // === Private helpers ===

    private void assertManagerRole(AppUser user) {
        if (!MANAGER_ROLES.contains(user.getRole())) {
            throw new AccessDeniedException(
                    "Dashboard access requires MANAGER or above. User role: " + user.getRole());
        }
    }

    /**
     * Resolves the active cycle for the org, or the cycle matching cycleWeekStart if provided.
     */
    private Optional<Cycle> resolveCycle(UUID orgId, DashboardFilters filters) {
        if (filters.cycleWeekStart() != null) {
            // Find cycle whose startsAt matches the requested week
            return cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId).stream()
                    .filter(c -> c.getStartsAt().equals(filters.cycleWeekStart()))
                    .findFirst();
        }
        return cycleRepository.findByOrgIdAndIsActiveTrue(orgId);
    }

    private TeamRollupResponse.TeamMemberSummary buildTeamMemberSummary(AppUser member, Optional<Cycle> cycleOpt,
                                                                         Map<UUID, List<Commitment>> commitmentsByUser,
                                                                         Set<UUID> reconciledCommitmentIds) {
        if (cycleOpt.isEmpty()) {
            return new TeamRollupResponse.TeamMemberSummary(
                    member.getId(), member.getDisplayName(), member.getRole().name(),
                    0, null, 0, Map.of());
        }

        Cycle cycle = cycleOpt.get();
        List<Commitment> commitments = commitmentsByUser.getOrDefault(member.getId(), List.of());

        int total = commitments.size();

        // Category breakdown
        Map<String, Integer> breakdown = new HashMap<>();
        for (Commitment c : commitments) {
            if (c.getChessCategory() != null) {
                breakdown.merge(c.getChessCategory().getName(), 1, Integer::sum);
            }
        }

        // Reconciliation count: use pre-fetched set (queried once per org+cycle, not per member)
        int reconciledCount = (int) commitments.stream()
                .filter(c -> reconciledCommitmentIds.contains(c.getId()))
                .count();

        return new TeamRollupResponse.TeamMemberSummary(
                member.getId(), member.getDisplayName(), member.getRole().name(),
                total, cycle.getState(), reconciledCount, breakdown);
    }

    private Map<String, AlignmentSignalResponse.CategoryDistribution> buildCategoryDistribution(
            Map<String, Integer> categoryCounts, int total) {
        Map<String, AlignmentSignalResponse.CategoryDistribution> result = new HashMap<>();
        for (Map.Entry<String, Integer> entry : categoryCounts.entrySet()) {
            int count = entry.getValue();
            double pct = total == 0 ? 0.0 : (double) count / total * 100.0;
            result.put(entry.getKey(), new AlignmentSignalResponse.CategoryDistribution(count, pct));
        }
        return result;
    }
}
