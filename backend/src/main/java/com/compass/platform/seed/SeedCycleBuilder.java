package com.compass.platform.seed;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.DisplacementCategory;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Builds 12 weeks of cycles, commitments, reconciliation records,
 * and carry-forward chains for a single org.
 */
public class SeedCycleBuilder {

    private static final Logger log = LoggerFactory.getLogger(SeedCycleBuilder.class);

    private static final int NUM_WEEKS = 12;
    private static final int MAX_CARRY_DEPTH = 8;
    private static final int CARRY_CONTINUE_PCT = 30; // 30% chance to keep carrying

    private static final CompletionHorizon[] HORIZONS = CompletionHorizon.values();
    private static final DisplacementCategory[] DISPLACEMENT_CATS = DisplacementCategory.values();

    /** Anchor date: week 1 starts Jan 6, 2026 (Monday) */
    private static final LocalDate WEEK1_START = LocalDate.of(2026, 1, 5);

    private final EntityManager em;
    private final Random random;

    public SeedCycleBuilder(EntityManager em) {
        this.em = em;
        this.random = new Random(42);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public void buildCycles(SeedOrgBuilder.OrgContext ctx) {
        Org org = ctx.org();
        int orgIndex = ctx.orgIndex();
        double[] narrativeArc = SeedTemplates.ORG_NARRATIVES[orgIndex];

        // Build cycles first
        List<Cycle> cycles = new ArrayList<>();
        for (int w = 0; w < NUM_WEEKS; w++) {
            LocalDate weekStart = WEEK1_START.plusWeeks(w);
            boolean isLastWeek = (w == NUM_WEEKS - 1);
            CycleState state = isLastWeek ? CycleState.DRAFT : CycleState.RECONCILED;
            boolean isActive = isLastWeek;
            String label = "Week of " + weekStart.getMonth().name().substring(0, 3) + " " + weekStart.getDayOfMonth() + ", " + weekStart.getYear();
            Cycle cycle = Cycle.builder()
                .org(org).label(label).state(state)
                .startsAt(toInstant(weekStart))
                .endsAt(toInstant(weekStart.plusDays(7)))
                .isActive(isActive)
                .build();
            em.persist(cycle);
            cycles.add(cycle);
        }
        em.flush();

        // Track commitments per cycle for carry-forward processing
        List<List<Commitment>> commitmentsByCycle = new ArrayList<>();
        for (int w = 0; w < NUM_WEEKS; w++) {
            commitmentsByCycle.add(new ArrayList<>());
        }

        // Generate commitments for all workers in all weeks
        List<AppUser> workers = ctx.commitmentWorkers();
        int totalCommitments = 0;

        for (int w = 0; w < NUM_WEEKS; w++) {
            Cycle cycle = cycles.get(w);
            double targetStrategicPct = narrativeArc[w] / 100.0;
            double assignedByManagerPct = computeAssignedByPct(orgIndex, w);

            for (AppUser worker : workers) {
                int count = 3 + random.nextInt(3); // 3-5 commitments
                for (int c = 0; c < count; c++) {
                    ChessCategory category = pickChessCategory(ctx, targetStrategicPct);
                    String title = pickTitle(category.getName(), c + 1, w);
                    CompletionHorizon horizon = HORIZONS[random.nextInt(HORIZONS.length)];

                    Commitment.Builder builder = Commitment.builder()
                        .org(org).user(worker).cycle(cycle)
                        .chessCategory(category)
                        .priorityRank(c + 1)
                        .title(title)
                        .completionHorizon(horizon);

                    // RCDO link (~80% of commitments)
                    if (random.nextInt(100) >= 20) {
                        attachRcdo(builder, ctx);
                    }

                    // assignedBy (varies by org narrative)
                    if (random.nextInt(100) < (int) (assignedByManagerPct * 100)) {
                        AppUser manager = findManager(worker, ctx);
                        if (manager != null) builder.assignedBy(manager);
                    }

                    Commitment commitment = builder.build();
                    em.persist(commitment);
                    commitmentsByCycle.get(w).add(commitment);
                    totalCommitments++;
                }
            }
            em.flush();
        }

        // Generate reconciliation records for weeks 0-10 (RECONCILED)
        int totalRecords = 0;
        // Track carry-forward commitments: (originalCommitment, targetWeekIndex, depth)
        record CarryTask(Commitment original, int targetWeek, int depth) {}
        List<CarryTask> carryQueue = new ArrayList<>();

        for (int w = 0; w < NUM_WEEKS - 1; w++) {
            Cycle cycle = cycles.get(w);
            Instant reconciledAt = toInstant(WEEK1_START.plusWeeks(w).plusDays(7));
            List<AppUser> workers2 = ctx.commitmentWorkers();

            for (Commitment commitment : commitmentsByCycle.get(w)) {
                ReconciliationStatus status = pickStatus(orgIndex, w);
                AppUser reconciledBy = commitment.getUser();

                ReconciliationRecord.Builder rrBuilder = ReconciliationRecord.builder()
                    .org(org).commitment(commitment).cycle(cycle)
                    .status(status)
                    .plannedHorizon(commitment.getCompletionHorizon())
                    .reconciledAt(reconciledAt)
                    .reconciledBy(reconciledBy)
                    .notes(pickNote());

                if (status != ReconciliationStatus.COMPLETED) {
                    attachDisplacement(rrBuilder, orgIndex);
                }

                em.persist(rrBuilder.build());
                totalRecords++;

                if (status == ReconciliationStatus.CARRIED_FORWARD && w + 1 < NUM_WEEKS) {
                    carryQueue.add(new CarryTask(commitment, w + 1, 1));
                }
            }
            em.flush();
        }

        // Process carry-forward chains
        int totalCarried = 0;
        while (!carryQueue.isEmpty()) {
            List<CarryTask> nextQueue = new ArrayList<>();
            for (CarryTask task : carryQueue) {
                if (task.targetWeek() >= NUM_WEEKS || task.depth() > MAX_CARRY_DEPTH) continue;

                Cycle targetCycle = cycles.get(task.targetWeek());
                Commitment clone = Commitment.builder()
                    .org(org)
                    .user(task.original().getUser())
                    .cycle(targetCycle)
                    .chessCategory(task.original().getChessCategory())
                    .title(task.original().getTitle())
                    .completionHorizon(task.original().getCompletionHorizon())
                    .priorityRank(task.original().getPriorityRank())
                    .carriedFrom(task.original())
                    .assignedBy(task.original().getAssignedBy())
                    .rallyCry(task.original().getRallyCry())
                    .definingObjective(task.original().getDefiningObjective())
                    .outcome(task.original().getOutcome())
                    .build();
                em.persist(clone);
                commitmentsByCycle.get(task.targetWeek()).add(clone);
                totalCarried++;

                // For RECONCILED weeks, add a reconciliation record for the clone
                if (task.targetWeek() < NUM_WEEKS - 1) {
                    Cycle targetCycleFinal = targetCycle;
                    Instant reconciledAt = toInstant(WEEK1_START.plusWeeks(task.targetWeek()).plusDays(7));
                    ReconciliationStatus status = pickStatus(orgIndex, task.targetWeek());

                    ReconciliationRecord.Builder rrb = ReconciliationRecord.builder()
                        .org(org).commitment(clone).cycle(targetCycleFinal)
                        .status(status)
                        .plannedHorizon(clone.getCompletionHorizon())
                        .reconciledAt(reconciledAt)
                        .reconciledBy(clone.getUser())
                        .notes(pickNote());

                    if (status != ReconciliationStatus.COMPLETED) {
                        attachDisplacement(rrb, orgIndex);
                    }

                    em.persist(rrb.build());
                    totalRecords++;

                    // 30% chance to carry forward again
                    if (status == ReconciliationStatus.CARRIED_FORWARD
                            && random.nextInt(100) < CARRY_CONTINUE_PCT
                            && task.targetWeek() + 1 < NUM_WEEKS) {
                        nextQueue.add(new CarryTask(clone, task.targetWeek() + 1, task.depth() + 1));
                    }
                }
            }
            carryQueue = nextQueue;
            if (!carryQueue.isEmpty()) em.flush();
        }

        em.flush();
        log.info("event=seed_cycles_complete org={} cycles={} commitments={} reconciliation_records={} carried={}",
            org.getSlug(), NUM_WEEKS, totalCommitments, totalRecords, totalCarried);
    }

    // ── Chess category selection ──────────────────────────────────────────────

    private ChessCategory pickChessCategory(SeedOrgBuilder.OrgContext ctx, double strategicPct) {
        double roll = random.nextDouble();
        if (roll < strategicPct)                    return ctx.strategicCategory();
        if (roll < strategicPct + 0.25)             return ctx.operationalCategory();
        if (roll < strategicPct + 0.40)             return ctx.defensiveCategory();
        return ctx.capabilityBuildingCategory();
    }

    // ── Reconciliation status selection ──────────────────────────────────────

    private ReconciliationStatus pickStatus(int orgIndex, int weekIndex) {
        int roll = random.nextInt(100);
        return switch (orgIndex) {
            case 0 -> pickStatusMeridian(roll, weekIndex);
            case 1 -> pickStatusPinnacle(roll);
            default -> pickStatusAtlas(roll);
        };
    }

    private ReconciliationStatus pickStatusMeridian(int roll, int weekIndex) {
        // Early weeks: 70% complete, 15% partial, 5% not_started, 10% carry
        // Weeks 7+: 50% complete, 20% partial, 10% not_started, 20% carry
        if (weekIndex >= 7) {
            if (roll < 50)  return ReconciliationStatus.COMPLETED;
            if (roll < 70)  return ReconciliationStatus.PARTIALLY_COMPLETED;
            if (roll < 80)  return ReconciliationStatus.NOT_STARTED;
            return ReconciliationStatus.CARRIED_FORWARD;
        } else {
            if (roll < 70)  return ReconciliationStatus.COMPLETED;
            if (roll < 85)  return ReconciliationStatus.PARTIALLY_COMPLETED;
            if (roll < 90)  return ReconciliationStatus.NOT_STARTED;
            return ReconciliationStatus.CARRIED_FORWARD;
        }
    }

    private ReconciliationStatus pickStatusPinnacle(int roll) {
        // 80% complete, 10% partial, 5% not_started, 5% carry
        if (roll < 80) return ReconciliationStatus.COMPLETED;
        if (roll < 90) return ReconciliationStatus.PARTIALLY_COMPLETED;
        if (roll < 95) return ReconciliationStatus.NOT_STARTED;
        return ReconciliationStatus.CARRIED_FORWARD;
    }

    private ReconciliationStatus pickStatusAtlas(int roll) {
        // 45% complete, 20% partial, 15% not_started, 20% carry
        if (roll < 45)  return ReconciliationStatus.COMPLETED;
        if (roll < 65)  return ReconciliationStatus.PARTIALLY_COMPLETED;
        if (roll < 80)  return ReconciliationStatus.NOT_STARTED;
        return ReconciliationStatus.CARRIED_FORWARD;
    }

    // ── Displacement ──────────────────────────────────────────────────────────

    private void attachDisplacement(ReconciliationRecord.Builder builder, int orgIndex) {
        DisplacementCategory cat = pickDisplacementCategory(orgIndex);
        String[] templates = SeedTemplates.DISPLACEMENT_TEMPLATES.get(cat);
        String detail = templates[random.nextInt(templates.length)];
        builder.displacementCategory(cat).displacementDetail(detail);
    }

    private DisplacementCategory pickDisplacementCategory(int orgIndex) {
        int roll = random.nextInt(100);
        return switch (orgIndex) {
            // Atlas (struggling): heavily weighted toward MANAGER_REASSIGNED + PRODUCTION_EMERGENCY
            case 2 -> {
                if (roll < 35) yield DisplacementCategory.MANAGER_REASSIGNED;
                if (roll < 60) yield DisplacementCategory.PRODUCTION_EMERGENCY;
                if (roll < 70) yield DisplacementCategory.RESOURCE_BLOCKED;
                if (roll < 80) yield DisplacementCategory.DEPRIORITIZED;
                if (roll < 88) yield DisplacementCategory.SCOPE_CHANGE;
                if (roll < 94) yield DisplacementCategory.EXTERNAL_DEPENDENCY;
                yield DisplacementCategory.OTHER;
            }
            // Meridian (drifting): increasing manager-assigned over time — use moderate weighting
            case 0 -> {
                if (roll < 25) yield DisplacementCategory.MANAGER_REASSIGNED;
                if (roll < 40) yield DisplacementCategory.DEPRIORITIZED;
                if (roll < 55) yield DisplacementCategory.PRODUCTION_EMERGENCY;
                if (roll < 68) yield DisplacementCategory.RESOURCE_BLOCKED;
                if (roll < 80) yield DisplacementCategory.SCOPE_CHANGE;
                if (roll < 90) yield DisplacementCategory.EXTERNAL_DEPENDENCY;
                yield DisplacementCategory.OTHER;
            }
            // Pinnacle (steady): more balanced
            default -> {
                if (roll < 20) yield DisplacementCategory.RESOURCE_BLOCKED;
                if (roll < 38) yield DisplacementCategory.EXTERNAL_DEPENDENCY;
                if (roll < 54) yield DisplacementCategory.SCOPE_CHANGE;
                if (roll < 68) yield DisplacementCategory.DEPRIORITIZED;
                if (roll < 80) yield DisplacementCategory.MANAGER_REASSIGNED;
                if (roll < 90) yield DisplacementCategory.PRODUCTION_EMERGENCY;
                yield DisplacementCategory.OTHER;
            }
        };
    }

    // ── RCDO attachment ───────────────────────────────────────────────────────

    private void attachRcdo(Commitment.Builder builder, SeedOrgBuilder.OrgContext ctx) {
        List<RallyCry> rcs = ctx.rallyCries();
        List<DefiningObjective> dos = ctx.definingObjectives();
        List<Outcome> outcomes = ctx.outcomes();
        if (rcs.isEmpty()) return;

        RallyCry rc = rcs.get(random.nextInt(rcs.size()));
        builder.rallyCry(rc);

        // Filter DOs that belong to this RC
        List<DefiningObjective> rcDos = dos.stream()
            .filter(d -> d.getRallyCry().equals(rc))
            .toList();
        if (rcDos.isEmpty()) return;
        DefiningObjective doObj = rcDos.get(random.nextInt(rcDos.size()));
        builder.definingObjective(doObj);

        // 60% chance to also attach an outcome
        if (!outcomes.isEmpty() && random.nextInt(100) < 60) {
            List<Outcome> doOutcomes = outcomes.stream()
                .filter(o -> o.getDefiningObjective().equals(doObj))
                .toList();
            if (!doOutcomes.isEmpty()) {
                builder.outcome(doOutcomes.get(random.nextInt(doOutcomes.size())));
            }
        }
    }

    // ── Assignment attribution ────────────────────────────────────────────────

    /**
     * Returns the probability (0.0-1.0) that a commitment is manager-assigned,
     * based on org narrative and week index.
     */
    private double computeAssignedByPct(int orgIndex, int weekIndex) {
        return switch (orgIndex) {
            case 2 -> 0.62; // Atlas: 60%+ manager-assigned
            case 1 -> 0.20; // Pinnacle: ~20%
            default -> 0.25 + (weekIndex * 0.021); // Meridian: starts 25%, drifts to ~50% by week 12
        };
    }

    private AppUser findManager(AppUser worker, SeedOrgBuilder.OrgContext ctx) {
        if (!ctx.managers().isEmpty()) {
            return ctx.managers().get(random.nextInt(ctx.managers().size()));
        }
        return null;
    }

    // ── Title generation ──────────────────────────────────────────────────────

    private String pickTitle(String categoryName, int commitmentNum, int weekIndex) {
        String[] templates = SeedTemplates.COMMITMENT_TITLE_TEMPLATES.get(categoryName);
        if (templates == null) return "Commitment " + commitmentNum;
        String template = templates[random.nextInt(templates.length)];
        String topic = SeedTemplates.TOPIC_FILLERS[random.nextInt(SeedTemplates.TOPIC_FILLERS.length)];
        // Fill in format specifiers
        try {
            if (template.contains("%d") && template.contains("%s")) {
                return String.format(template, weekIndex + 1, topic);
            } else if (template.contains("%d")) {
                return String.format(template, weekIndex + 1);
            } else if (template.contains("%s")) {
                return String.format(template, topic);
            }
        } catch (Exception ignored) {
            // fall through
        }
        return template;
    }

    // ── Note & template helpers ───────────────────────────────────────────────

    private String pickNote() {
        String[] notes = SeedTemplates.RECONCILIATION_NOTE_TEMPLATES;
        return notes[random.nextInt(notes.length)];
    }

    // ── Date helpers ──────────────────────────────────────────────────────────

    private Instant toInstant(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
