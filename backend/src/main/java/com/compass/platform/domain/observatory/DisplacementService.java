package com.compass.platform.domain.observatory;

import com.compass.platform.domain.DisplacementCategory;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.CategoryCount;
import com.compass.platform.domain.observatory.dto.DisplacementSummary;
import com.compass.platform.domain.observatory.dto.ManagerDisplacementReport;
import com.compass.platform.domain.observatory.dto.NoteCluster;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DisplacementService {

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "a", "an", "and", "or", "but", "in", "on",
            "at", "to", "for", "of", "with", "by", "from",
            "is", "was", "were", "been", "be", "have", "has", "had",
            "do", "does", "did", "will", "would", "could", "should",
            "may", "might", "shall", "can",
            "i", "we", "my", "our", "this", "that",
            "it", "its", "not", "no", "so", "if", "up", "out", "as", "are",
            "he", "she", "they", "their", "you", "your", "me"
    );

    private final CycleRepository cycleRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final AppUserRepository appUserRepository;

    public DisplacementService(CycleRepository cycleRepository,
                               ReconciliationRecordRepository reconciliationRecordRepository,
                               AppUserRepository appUserRepository) {
        this.cycleRepository = cycleRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.appUserRepository = appUserRepository;
    }

    /**
     * Aggregate displacements across the last N cycles for the entire org.
     * Groups by displacement category, computes percentages, identifies top teams,
     * and builds a week-over-week trend map.
     */
    public DisplacementSummary aggregateDisplacements(UUID orgId, int weekCount) {
        List<Cycle> cycles = resolveRecentCycles(orgId, weekCount);
        if (cycles.isEmpty()) {
            return new DisplacementSummary(0, List.of(), Map.of());
        }

        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();
        List<ReconciliationRecord> records = reconciliationRecordRepository
                .findByOrgIdAndCycleIdIn(orgId, cycleIds);

        List<ReconciliationRecord> displaced = records.stream()
                .filter(r -> r.getDisplacementCategory() != null)
                .toList();

        int total = displaced.size();
        if (total == 0) {
            return new DisplacementSummary(0, List.of(), Map.of());
        }

        // Group by category
        Map<DisplacementCategory, List<ReconciliationRecord>> byCategory =
                displaced.stream().collect(Collectors.groupingBy(ReconciliationRecord::getDisplacementCategory));

        // Build manager id → display name lookup for team labeling
        Map<UUID, String> managerNames = buildManagerNameLookup(displaced);

        // Build category counts with top teams
        List<CategoryCount> categoryCounts = buildCategoryCounts(displaced, total, managerNames, byCategory);

        // Build week-over-week trend (cycle index → displacement count, oldest first)
        Map<Integer, Integer> weeklyTrend = buildWeeklyTrend(cycles, records);

        return new DisplacementSummary(total, categoryCounts, weeklyTrend);
    }

    /**
     * Aggregate displacements scoped to a specific manager's team (direct reports and
     * their subtree). Also clusters displacement notes for the manager's team.
     */
    public ManagerDisplacementReport getDisplacementsByManager(UUID orgId, UUID managerId, int weekCount) {
        AppUser manager = appUserRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));

        // Collect all user IDs in the subtree
        List<UUID> subtreeIds = appUserRepository.findSubtreeUserIds(managerId);
        Set<UUID> teamIds = new HashSet<>(subtreeIds);

        List<Cycle> cycles = resolveRecentCycles(orgId, weekCount);
        if (cycles.isEmpty() || teamIds.isEmpty()) {
            return new ManagerDisplacementReport(managerId, manager.getDisplayName(), 0, List.of(), List.of());
        }

        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();
        List<ReconciliationRecord> records = reconciliationRecordRepository
                .findByOrgIdAndCycleIdIn(orgId, cycleIds);

        // Filter to the manager's team
        List<ReconciliationRecord> teamRecords = records.stream()
                .filter(r -> teamIds.contains(r.getCommitment().getUser().getId()))
                .toList();

        List<ReconciliationRecord> displaced = teamRecords.stream()
                .filter(r -> r.getDisplacementCategory() != null)
                .toList();

        int total = displaced.size();

        Map<UUID, String> managerNames = buildManagerNameLookup(displaced);

        Map<DisplacementCategory, List<ReconciliationRecord>> byCategory =
                displaced.stream().collect(Collectors.groupingBy(ReconciliationRecord::getDisplacementCategory));

        List<CategoryCount> categoryCounts = buildCategoryCounts(displaced, total, managerNames, byCategory);

        // Cluster notes for the team's displaced records
        List<NoteCluster> clusters = clusterRecords(displaced, managerNames);

        return new ManagerDisplacementReport(managerId, manager.getDisplayName(), total, categoryCounts, clusters);
    }

    /**
     * Cluster free-text displacement notes across the org using n-gram extraction.
     * Groups by displacement category first, then surfaces recurring 2- and 3-gram phrases.
     */
    public Map<DisplacementCategory, List<NoteCluster>> clusterDisplacementNotes(UUID orgId, int weekCount) {
        List<Cycle> cycles = resolveRecentCycles(orgId, weekCount);
        if (cycles.isEmpty()) {
            return Map.of();
        }

        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();
        List<ReconciliationRecord> records = reconciliationRecordRepository
                .findByOrgIdAndCycleIdIn(orgId, cycleIds);

        List<ReconciliationRecord> withDetail = records.stream()
                .filter(r -> r.getDisplacementCategory() != null && r.getDisplacementDetail() != null
                        && !r.getDisplacementDetail().isBlank())
                .toList();

        if (withDetail.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> managerNames = buildManagerNameLookup(withDetail);

        // Group by category
        Map<DisplacementCategory, List<ReconciliationRecord>> byCategory =
                withDetail.stream().collect(Collectors.groupingBy(ReconciliationRecord::getDisplacementCategory));

        Map<DisplacementCategory, List<NoteCluster>> result = new EnumMap<>(DisplacementCategory.class);
        for (Map.Entry<DisplacementCategory, List<ReconciliationRecord>> entry : byCategory.entrySet()) {
            List<NoteCluster> clusters = clusterRecords(entry.getValue(), managerNames);
            if (!clusters.isEmpty()) {
                result.put(entry.getKey(), clusters);
            }
        }

        return Collections.unmodifiableMap(result);
    }

    // ===== Internal helpers =====

    /**
     * Builds a sorted list of {@link CategoryCount} from the given displacement records.
     * Iterates over every {@link DisplacementCategory} value, skips categories with no records,
     * computes per-category percentage against {@code totalDisplacements}, and collects top teams.
     * The result is sorted by count descending.
     *
     * @param records             all displaced records (filtered subset)
     * @param totalDisplacements  denominator for percentage calculation
     * @param managerNames        pre-built manager id → display name lookup
     * @param byCategory          records already grouped by DisplacementCategory
     */
    private List<CategoryCount> buildCategoryCounts(List<ReconciliationRecord> records,
                                                     int totalDisplacements,
                                                     Map<UUID, String> managerNames,
                                                     Map<DisplacementCategory, List<ReconciliationRecord>> byCategory) {
        List<CategoryCount> categoryCounts = new ArrayList<>();
        for (DisplacementCategory cat : DisplacementCategory.values()) {
            List<ReconciliationRecord> catRecords = byCategory.getOrDefault(cat, List.of());
            if (catRecords.isEmpty()) {
                continue;
            }
            int count = catRecords.size();
            double pct = totalDisplacements == 0 ? 0.0 : (double) count / totalDisplacements * 100.0;
            List<String> topTeams = extractTopTeams(catRecords, managerNames);
            categoryCounts.add(new CategoryCount(cat, count, pct, topTeams));
        }
        categoryCounts.sort(Comparator.comparingInt(CategoryCount::count).reversed());
        return categoryCounts;
    }

    /**
     * Returns the most recent N cycles for the org, ordered newest first.
     */
    private List<Cycle> resolveRecentCycles(UUID orgId, int weekCount) {
        List<Cycle> all = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);
        return all.stream().limit(weekCount).toList();
    }

    /**
     * Builds a manager display-name lookup from the commitment's user → reportsTo chain.
     * For each displaced record, the "manager" is the reportsTo of the committing user.
     */
    private Map<UUID, String> buildManagerNameLookup(List<ReconciliationRecord> records) {
        Map<UUID, String> names = new HashMap<>();
        for (ReconciliationRecord r : records) {
            AppUser user = r.getCommitment().getUser();
            AppUser manager = user.getReportsTo();
            if (manager != null) {
                names.put(manager.getId(), manager.getDisplayName());
            }
        }
        return names;
    }

    /**
     * Extracts the top 3 teams (manager names) most represented in the given records,
     * ordered by frequency.
     */
    private List<String> extractTopTeams(List<ReconciliationRecord> records, Map<UUID, String> managerNames) {
        Map<String, Long> teamCounts = new HashMap<>();
        for (ReconciliationRecord r : records) {
            AppUser user = r.getCommitment().getUser();
            AppUser manager = user.getReportsTo();
            if (manager != null) {
                String name = managerNames.getOrDefault(manager.getId(), manager.getDisplayName());
                teamCounts.merge(name, 1L, Long::sum);
            }
        }
        return teamCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();
    }

    /**
     * Builds a map of cycle index (0 = oldest, N-1 = newest) to displacement count
     * across all cycles provided (cycles list is ordered newest-first).
     */
    private Map<Integer, Integer> buildWeeklyTrend(List<Cycle> cycles, List<ReconciliationRecord> allRecords) {
        // Map cycleId → displacement count
        Map<UUID, Long> countByCycle = allRecords.stream()
                .filter(r -> r.getDisplacementCategory() != null)
                .collect(Collectors.groupingBy(r -> r.getCycle().getId(), Collectors.counting()));

        // cycles is newest-first; reverse for oldest-first index ordering
        List<Cycle> chronological = new ArrayList<>(cycles);
        Collections.reverse(chronological);

        Map<Integer, Integer> trend = new LinkedHashMap<>();
        for (int i = 0; i < chronological.size(); i++) {
            UUID cycleId = chronological.get(i).getId();
            trend.put(i, countByCycle.getOrDefault(cycleId, 0L).intValue());
        }
        return Collections.unmodifiableMap(trend);
    }

    /**
     * Clusters displacement detail notes from the given records using 2-gram and 3-gram
     * phrase extraction. N-grams appearing 2+ times each become a NoteCluster.
     *
     * Algorithm:
     * 1. Lowercase, strip punctuation, collapse whitespace
     * 2. Remove stop words
     * 3. Generate all 2-word and 3-word consecutive sequences
     * 4. Count frequency across all notes; keep those appearing 2+ times
     * 5. For each frequent n-gram, collect up to 3 representative original notes
     *    plus distinct teams and users
     */
    private List<NoteCluster> clusterRecords(List<ReconciliationRecord> records,
                                              Map<UUID, String> managerNames) {
        // Only records with non-blank detail text
        List<ReconciliationRecord> withDetail = records.stream()
                .filter(r -> r.getDisplacementDetail() != null && !r.getDisplacementDetail().isBlank())
                .toList();

        if (withDetail.isEmpty()) {
            return List.of();
        }

        // Pre-process each note to its token list
        List<String[]> tokenizedNotes = withDetail.stream()
                .map(r -> tokenize(r.getDisplacementDetail()))
                .toList();

        // Count n-gram frequency across all notes
        Map<String, Integer> ngramFrequency = new HashMap<>();
        for (String[] tokens : tokenizedNotes) {
            // Collect unique n-grams per note (count each n-gram once per note)
            Set<String> seenInNote = new HashSet<>();
            generateNgrams(tokens, seenInNote);
            for (String ngram : seenInNote) {
                ngramFrequency.merge(ngram, 1, Integer::sum);
            }
        }

        // Keep n-grams with frequency >= 2
        List<String> frequentNgrams = ngramFrequency.entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .toList();

        if (frequentNgrams.isEmpty()) {
            return List.of();
        }

        // Build NoteCluster for each frequent n-gram
        List<NoteCluster> clusters = new ArrayList<>();
        for (String ngram : frequentNgrams) {
            List<String> representative = new ArrayList<>();
            Set<String> teams = new HashSet<>();
            Set<String> users = new HashSet<>();
            int count = 0;

            for (int i = 0; i < withDetail.size(); i++) {
                ReconciliationRecord r = withDetail.get(i);
                String[] tokens = tokenizedNotes.get(i);
                if (containsNgram(tokens, ngram)) {
                    count++;
                    if (representative.size() < 3) {
                        representative.add(r.getDisplacementDetail());
                    }
                    // Collect team (manager) and user info
                    AppUser user = r.getCommitment().getUser();
                    users.add(user.getDisplayName());
                    AppUser manager = user.getReportsTo();
                    if (manager != null) {
                        teams.add(managerNames.getOrDefault(manager.getId(), manager.getDisplayName()));
                    }
                }
            }

            clusters.add(new NoteCluster(
                    ngram,
                    Collections.unmodifiableList(representative),
                    count,
                    List.copyOf(teams),
                    List.copyOf(users)
            ));
        }

        return Collections.unmodifiableList(clusters);
    }

    /**
     * Lowercases, strips punctuation, collapses whitespace, and removes stop words.
     * Returns the resulting token array.
     */
    private String[] tokenize(String text) {
        String cleaned = text.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.isEmpty()) {
            return new String[0];
        }
        return Arrays.stream(cleaned.split(" "))
                .filter(w -> !w.isEmpty() && !STOP_WORDS.contains(w))
                .toArray(String[]::new);
    }

    /**
     * Generates all 2-gram and 3-gram strings from the token array and adds them
     * to the provided set (deduplication within one note).
     */
    private void generateNgrams(String[] tokens, Set<String> collector) {
        // 2-grams
        for (int i = 0; i + 1 < tokens.length; i++) {
            collector.add(tokens[i] + " " + tokens[i + 1]);
        }
        // 3-grams
        for (int i = 0; i + 2 < tokens.length; i++) {
            collector.add(tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2]);
        }
    }

    /**
     * Returns true if the given token array contains the specified n-gram
     * (n-gram is a space-separated string of 2 or 3 tokens).
     */
    private boolean containsNgram(String[] tokens, String ngram) {
        String[] ngramTokens = ngram.split(" ");
        int n = ngramTokens.length;
        for (int i = 0; i + n <= tokens.length; i++) {
            boolean match = true;
            for (int j = 0; j < n; j++) {
                if (!tokens[i + j].equals(ngramTokens[j])) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        return false;
    }
}
