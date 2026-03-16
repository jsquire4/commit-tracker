package com.st6.committracker.seed;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.Outcome;
import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Component
@ConditionalOnProperty(name = "st6.seed.enabled", havingValue = "true")
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("event=seed_started");

        // Idempotency guard — skip entirely if orgs already exist
        Long orgCount = em.createQuery("SELECT COUNT(o) FROM Org o", Long.class).getSingleResult();
        if (orgCount > 0) {
            log.info("event=seed_skipped reason=orgs_table_not_empty count={}", orgCount);
            return;
        }

        // ── 1. Org ──────────────────────────────────────────────────────────────
        Org meridian = Org.builder()
                .name("Meridian Manufacturing")
                .slug("meridian-mfg")
                .timezone("America/Chicago")
                .isActive(true)
                .build();
        em.persist(meridian);
        log.info("event=seed_orgs count=1");

        // ── 2. Users (two-pass for reports_to hierarchy) ─────────────────────────
        // Pass 1: create all users without managers
        AppUser sarah   = new AppUser(meridian, "sarah.chen@meridian.com",   "Sarah Chen",       UserRole.EXECUTIVE, null);
        AppUser raj     = new AppUser(meridian, "raj.patel@meridian.com",     "Raj Patel",        UserRole.VP,        null);
        AppUser marcus  = new AppUser(meridian, "marcus.wright@meridian.com", "Marcus Wright",    UserRole.DIRECTOR,  null);
        AppUser elena   = new AppUser(meridian, "elena.rodriguez@meridian.com","Elena Rodriguez", UserRole.MANAGER,   null);
        AppUser james   = new AppUser(meridian, "james.okafor@meridian.com",  "James Okafor",     UserRole.EMPLOYEE,  null);
        AppUser priya   = new AppUser(meridian, "priya.sharma@meridian.com",  "Priya Sharma",     UserRole.EMPLOYEE,  null);
        AppUser david   = new AppUser(meridian, "david.kim@meridian.com",     "David Kim",        UserRole.MANAGER,   null);
        AppUser anna    = new AppUser(meridian, "anna.mueller@meridian.com",  "Anna Mueller",     UserRole.EMPLOYEE,  null);
        AppUser tom     = new AppUser(meridian, "tom.jackson@meridian.com",   "Tom Jackson",      UserRole.EMPLOYEE,  null);
        AppUser lisa    = new AppUser(meridian, "lisa.park@meridian.com",     "Lisa Park",        UserRole.ANALYST,   null);

        for (AppUser u : List.of(sarah, raj, marcus, elena, james, priya, david, anna, tom, lisa)) {
            em.persist(u);
        }
        em.flush();

        // Pass 2: wire up reports_to hierarchy
        raj.setReportsTo(sarah);
        marcus.setReportsTo(raj);
        elena.setReportsTo(marcus);
        james.setReportsTo(elena);
        priya.setReportsTo(elena);
        david.setReportsTo(marcus);
        anna.setReportsTo(david);
        tom.setReportsTo(david);
        // sarah and lisa have no manager

        em.flush();
        log.info("event=seed_users count=10");

        // ── 3. RCDO Hierarchy ────────────────────────────────────────────────────
        // Rally Cry 1: Operational Excellence
        RallyCry opEx = RallyCry.builder()
                .org(meridian)
                .title("Operational Excellence")
                .description("Drive manufacturing quality and process efficiency across all production lines.")
                .sortOrder(1)
                .build();
        em.persist(opEx);

        DefiningObjective reduceScrap = DefiningObjective.builder()
                .org(meridian)
                .rallyCry(opEx)
                .title("Reduce Scrap Rate")
                .description("Reduce overall scrap rate by 30% across all production lines by end of quarter.")
                .owner(elena)
                .sortOrder(1)
                .build();
        em.persist(reduceScrap);

        Outcome scrapAudit = Outcome.builder()
                .org(meridian)
                .definingObjective(reduceScrap)
                .title("Line 3 scrap audit complete")
                .description("Complete full audit of Line 3 scrap causes and root-cause analysis.")
                .sortOrder(1)
                .build();
        em.persist(scrapAudit);

        Outcome materialSpec = Outcome.builder()
                .org(meridian)
                .definingObjective(reduceScrap)
                .title("New material spec approved")
                .description("Get engineering sign-off on revised material tolerance specifications.")
                .sortOrder(2)
                .build();
        em.persist(materialSpec);

        DefiningObjective streamlineQA = DefiningObjective.builder()
                .org(meridian)
                .rallyCry(opEx)
                .title("Streamline QA Process")
                .description("Cut QA cycle time by 40% through automation and process improvements.")
                .owner(david)
                .sortOrder(2)
                .build();
        em.persist(streamlineQA);

        Outcome autoTestStation = Outcome.builder()
                .org(meridian)
                .definingObjective(streamlineQA)
                .title("Automated test station live")
                .description("Deploy and validate the automated functional test station on QA line.")
                .sortOrder(1)
                .build();
        em.persist(autoTestStation);

        // Rally Cry 2: Digital Transformation
        RallyCry digitalTx = RallyCry.builder()
                .org(meridian)
                .title("Digital Transformation")
                .description("Modernize core systems and embed intelligent automation into operations.")
                .sortOrder(2)
                .build();
        em.persist(digitalTx);

        DefiningObjective erpMigration = DefiningObjective.builder()
                .org(meridian)
                .rallyCry(digitalTx)
                .title("ERP Migration")
                .description("Migrate from legacy ERP to SAP S/4HANA by end of fiscal year.")
                .owner(marcus)
                .sortOrder(1)
                .build();
        em.persist(erpMigration);

        Outcome vendorShortlist = Outcome.builder()
                .org(meridian)
                .definingObjective(erpMigration)
                .title("Vendor shortlist finalized")
                .description("Evaluate and rank top 3 ERP implementation partners.")
                .sortOrder(1)
                .build();
        em.persist(vendorShortlist);

        DefiningObjective aiQuality = DefiningObjective.builder()
                .org(meridian)
                .rallyCry(digitalTx)
                .title("AI Quality Inspection")
                .description("Deploy computer-vision quality inspection on primary assembly lines.")
                .owner(david)
                .sortOrder(2)
                .build();
        em.persist(aiQuality);

        Outcome cvModelTrained = Outcome.builder()
                .org(meridian)
                .definingObjective(aiQuality)
                .title("CV model trained on defect dataset")
                .description("Train and validate CV model achieving >95% defect detection accuracy.")
                .sortOrder(1)
                .build();
        em.persist(cvModelTrained);

        em.flush();
        log.info("event=seed_rcdo rally_cries=2 defining_objectives=4 outcomes=5");

        // ── 4. Chess Categories ──────────────────────────────────────────────────
        ChessCategory strategic = ChessCategory.builder()
                .org(meridian)
                .name("Strategic")
                .description("Moves that advance long-term position and competitive advantage.")
                .colorHex("#4F46E5")
                .sortOrder(1)
                .isActive(true)
                .build();
        em.persist(strategic);

        ChessCategory operational = ChessCategory.builder()
                .org(meridian)
                .name("Operational")
                .description("Day-to-day execution work that keeps the business running.")
                .colorHex("#0891B2")
                .sortOrder(2)
                .isActive(true)
                .build();
        em.persist(operational);

        ChessCategory defensive = ChessCategory.builder()
                .org(meridian)
                .name("Defensive")
                .description("Risk mitigation, compliance, and protective actions.")
                .colorHex("#DC2626")
                .sortOrder(3)
                .isActive(true)
                .build();
        em.persist(defensive);

        ChessCategory capabilityBuilding = ChessCategory.builder()
                .org(meridian)
                .name("Capability Building")
                .description("Investments in skills, tools, and systems that multiply future capacity.")
                .colorHex("#16A34A")
                .sortOrder(4)
                .isActive(true)
                .build();
        em.persist(capabilityBuilding);

        em.flush();
        log.info("event=seed_chess_categories count=4");

        // ── 5. Cycles ────────────────────────────────────────────────────────────
        // Anchor dates relative to the seed reference date (2026-03-16, a Monday)
        // Week 1 (2 weeks ago, Mon 2026-03-02): RECONCILED
        // Week 2 (last week, Mon 2026-03-09): LOCKED
        // Week 3 (current week, Mon 2026-03-16): DRAFT (active)
        LocalDate week1Start = LocalDate.of(2026, 3, 2);
        LocalDate week2Start = LocalDate.of(2026, 3, 9);
        LocalDate week3Start = LocalDate.of(2026, 3, 16);

        Cycle cycleWeek1 = Cycle.builder()
                .org(meridian)
                .label("Week of Mar 2, 2026")
                .state(CycleState.RECONCILED)
                .startsAt(toInstant(week1Start))
                .endsAt(toInstant(week1Start.plusDays(7)))
                .isActive(false)
                .build();
        em.persist(cycleWeek1);

        Cycle cycleWeek2 = Cycle.builder()
                .org(meridian)
                .label("Week of Mar 9, 2026")
                .state(CycleState.LOCKED)
                .startsAt(toInstant(week2Start))
                .endsAt(toInstant(week2Start.plusDays(7)))
                .isActive(false)
                .build();
        em.persist(cycleWeek2);

        Cycle cycleWeek3 = Cycle.builder()
                .org(meridian)
                .label("Week of Mar 16, 2026")
                .state(CycleState.DRAFT)
                .startsAt(toInstant(week3Start))
                .endsAt(toInstant(week3Start.plusDays(7)))
                .isActive(true)
                .build();
        em.persist(cycleWeek3);

        em.flush();
        log.info("event=seed_cycles count=3");

        // ── 6. Commitments + Task Bullets ────────────────────────────────────────

        // ── Week 1 (RECONCILED) ──────────────────────────────────────────────────
        // Elena: Scrap audit — COMPLETED
        Commitment c1 = Commitment.builder()
                .org(meridian).user(elena).cycle(cycleWeek1)
                .rallyCry(opEx).definingObjective(reduceScrap).outcome(scrapAudit)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Complete Line 3 scrap audit and root-cause analysis")
                .description("Run full audit of Line 3 defects over the last 90 days and identify top 3 root causes.")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c1);
        persistBullets(c1, meridian,
                "Pull defect data from MES for Line 3 (90 days)",
                "Categorize by defect type and frequency",
                "Interview shift supervisors",
                "Draft root-cause analysis report");

        // James: Material testing — PARTIALLY_COMPLETED
        Commitment c2 = Commitment.builder()
                .org(meridian).user(james).cycle(cycleWeek1)
                .rallyCry(opEx).definingObjective(reduceScrap)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Run material tolerance tests on new supplier batch")
                .completionHorizon(CompletionHorizon.EOW)
                .assignedBy(elena)
                .build();
        em.persist(c2);
        persistBullets(c2, meridian,
                "Prepare test samples from new batch",
                "Run tensile strength tests",
                "Document results in QMS");

        // Priya: QA checklist update — COMPLETED
        Commitment c3 = Commitment.builder()
                .org(meridian).user(priya).cycle(cycleWeek1)
                .rallyCry(opEx).definingObjective(streamlineQA)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Update QA inspection checklist for new part geometry")
                .completionHorizon(CompletionHorizon.MIDDAY)
                .build();
        em.persist(c3);
        persistBullets(c3, meridian,
                "Review engineering change order ECO-2024-118",
                "Update checklist items in QMS",
                "Submit for QA lead review");

        // David: CV dataset prep — COMPLETED
        Commitment c4 = Commitment.builder()
                .org(meridian).user(david).cycle(cycleWeek1)
                .rallyCry(digitalTx).definingObjective(aiQuality).outcome(cvModelTrained)
                .chessCategory(capabilityBuilding)
                .priorityRank(1)
                .title("Curate initial defect image dataset for CV model training")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c4);
        persistBullets(c4, meridian,
                "Export defect images from optical inspection archive",
                "Label images by defect class",
                "Split into train/val/test sets",
                "Upload to ML platform storage");

        // Anna: ERP vendor research — CARRIED_FORWARD
        Commitment c5 = Commitment.builder()
                .org(meridian).user(anna).cycle(cycleWeek1)
                .rallyCry(digitalTx).definingObjective(erpMigration)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Research ERP implementation partner shortlist criteria")
                .completionHorizon(CompletionHorizon.EOW)
                .assignedBy(marcus)
                .build();
        em.persist(c5);
        persistBullets(c5, meridian,
                "Review Gartner ERP vendor ratings",
                "Collect references from 3 industry peers",
                "Draft scoring rubric");

        // Tom: Automated test station specs — COMPLETED
        Commitment c6 = Commitment.builder()
                .org(meridian).user(tom).cycle(cycleWeek1)
                .rallyCry(opEx).definingObjective(streamlineQA).outcome(autoTestStation)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Draft technical requirements for automated test station")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c6);
        persistBullets(c6, meridian,
                "Benchmark cycle time of current manual station",
                "Identify test steps suitable for automation",
                "Draft requirements doc and send to engineering");

        em.flush();

        // ── Week 2 (LOCKED) ───────────────────────────────────────────────────────
        // Elena: Material spec sign-off
        Commitment c7 = Commitment.builder()
                .org(meridian).user(elena).cycle(cycleWeek2)
                .rallyCry(opEx).definingObjective(reduceScrap).outcome(materialSpec)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Drive sign-off on revised material tolerance specification")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c7);
        persistBullets(c7, meridian,
                "Incorporate test results from James into spec doc",
                "Schedule review meeting with engineering",
                "Collect sign-off signatures",
                "Publish approved spec to shared drive");

        // James: Material tests (carried forward from c5 — note: c5 was Anna's, use c2 carry)
        // Actually: carry-forward for James's material tests
        Commitment c8 = Commitment.builder()
                .org(meridian).user(james).cycle(cycleWeek2)
                .rallyCry(opEx).definingObjective(reduceScrap)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Complete remaining material tolerance tests (carried forward)")
                .completionHorizon(CompletionHorizon.AFTERNOON)
                .assignedBy(elena)
                .carriedFrom(c2)
                .build();
        em.persist(c8);
        persistBullets(c8, meridian,
                "Complete impact resistance tests",
                "Finalize QMS documentation",
                "Hand off results to Elena");

        // Priya: Scrap reduction pilot
        Commitment c9 = Commitment.builder()
                .org(meridian).user(priya).cycle(cycleWeek2)
                .rallyCry(opEx).definingObjective(reduceScrap)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Run Line 3 scrap reduction pilot for one full shift")
                .completionHorizon(CompletionHorizon.EOD)
                .build();
        em.persist(c9);
        persistBullets(c9, meridian,
                "Brief shift operators on new inspection protocol",
                "Monitor Line 3 for full 8-hour shift",
                "Record scrap count vs. baseline",
                "Compile pilot results memo");

        // David: CV model training run
        Commitment c10 = Commitment.builder()
                .org(meridian).user(david).cycle(cycleWeek2)
                .rallyCry(digitalTx).definingObjective(aiQuality).outcome(cvModelTrained)
                .chessCategory(capabilityBuilding)
                .priorityRank(1)
                .title("Run first training pass on defect CV model and evaluate results")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c10);
        persistBullets(c10, meridian,
                "Configure training job on GPU cluster",
                "Run 50-epoch training pass",
                "Evaluate on validation set (target: >90% recall)",
                "Log results to experiment tracker");

        // Anna: ERP vendor shortlist (carried forward from c5)
        Commitment c11 = Commitment.builder()
                .org(meridian).user(anna).cycle(cycleWeek2)
                .rallyCry(digitalTx).definingObjective(erpMigration).outcome(vendorShortlist)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Finalize ERP vendor shortlist for presentation to Marcus")
                .completionHorizon(CompletionHorizon.EOW)
                .assignedBy(marcus)
                .carriedFrom(c5)
                .build();
        em.persist(c11);
        persistBullets(c11, meridian,
                "Score vendors against rubric",
                "Create comparison slide deck",
                "Schedule presentation with Marcus and Raj");

        // Tom: Test station procurement
        Commitment c12 = Commitment.builder()
                .org(meridian).user(tom).cycle(cycleWeek2)
                .rallyCry(opEx).definingObjective(streamlineQA).outcome(autoTestStation)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Obtain quotes from 3 test automation vendors")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c12);
        persistBullets(c12, meridian,
                "Send RFQ to National Instruments, Keysight, and Teradyne",
                "Follow up with procurement on PO process",
                "Compare quotes on cost and delivery timeline");

        // Marcus: Cross-team alignment — defensive/compliance
        Commitment c13 = Commitment.builder()
                .org(meridian).user(marcus).cycle(cycleWeek2)
                .chessCategory(defensive)
                .priorityRank(1)
                .title("Review ISO 9001 audit prep checklist with QA leads")
                .completionHorizon(CompletionHorizon.MIDDAY)
                .build();
        em.persist(c13);
        persistBullets(c13, meridian,
                "Pull latest nonconformance register",
                "Walk through audit checklist with Elena and David",
                "Assign remediation owners for open items");

        em.flush();

        // ── Week 3 (DRAFT, current) ───────────────────────────────────────────────
        // Elena: Material spec implementation
        Commitment c14 = Commitment.builder()
                .org(meridian).user(elena).cycle(cycleWeek3)
                .rallyCry(opEx).definingObjective(reduceScrap).outcome(materialSpec)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Communicate approved material spec to all production supervisors")
                .completionHorizon(CompletionHorizon.EOD)
                .build();
        em.persist(c14);
        persistBullets(c14, meridian,
                "Send spec update notification to all Line supervisors",
                "Update BOM in ERP staging environment",
                "Confirm receipt from each supervisor");

        // James: Baseline scrap metrics
        Commitment c15 = Commitment.builder()
                .org(meridian).user(james).cycle(cycleWeek3)
                .rallyCry(opEx).definingObjective(reduceScrap)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Establish weekly scrap tracking dashboard in PowerBI")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c15);
        persistBullets(c15, meridian,
                "Connect PowerBI to MES scrap data feed",
                "Build daily scrap rate trend chart",
                "Share with Elena for review");

        // Priya: QA automation spec
        Commitment c16 = Commitment.builder()
                .org(meridian).user(priya).cycle(cycleWeek3)
                .rallyCry(opEx).definingObjective(streamlineQA)
                .chessCategory(capabilityBuilding)
                .priorityRank(1)
                .title("Define acceptance criteria for automated QA station go-live")
                .completionHorizon(CompletionHorizon.EOW)
                .assignedBy(david)
                .build();
        em.persist(c16);
        persistBullets(c16, meridian,
                "Identify critical test cases that must pass",
                "Define false positive/negative thresholds",
                "Document sign-off criteria");

        // David: CV model refinement
        Commitment c17 = Commitment.builder()
                .org(meridian).user(david).cycle(cycleWeek3)
                .rallyCry(digitalTx).definingObjective(aiQuality).outcome(cvModelTrained)
                .chessCategory(capabilityBuilding)
                .priorityRank(1)
                .title("Refine CV model to achieve >95% defect recall on test set")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        em.persist(c17);
        persistBullets(c17, meridian,
                "Analyze misclassified defect samples",
                "Augment dataset with hard negatives",
                "Retrain with adjusted hyperparameters",
                "Validate on held-out test set");

        // Anna: ERP RFP kick-off
        Commitment c18 = Commitment.builder()
                .org(meridian).user(anna).cycle(cycleWeek3)
                .rallyCry(digitalTx).definingObjective(erpMigration)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Draft ERP RFP document for top 3 shortlisted vendors")
                .completionHorizon(CompletionHorizon.EOW)
                .assignedBy(marcus)
                .build();
        em.persist(c18);
        persistBullets(c18, meridian,
                "Template RFP from IT procurement library",
                "Add Meridian-specific requirements from Marcus",
                "Internal review with Marcus before sending");

        // Tom: Test station install prep
        Commitment c19 = Commitment.builder()
                .org(meridian).user(tom).cycle(cycleWeek3)
                .rallyCry(opEx).definingObjective(streamlineQA).outcome(autoTestStation)
                .chessCategory(strategic)
                .priorityRank(1)
                .title("Coordinate test station installation schedule with facilities")
                .completionHorizon(CompletionHorizon.AFTERNOON)
                .build();
        em.persist(c19);
        persistBullets(c19, meridian,
                "Confirm preferred installation window with facilities manager",
                "Reserve QA floor space on diagram",
                "Create installation runbook");

        // Sarah: Leadership alignment — unplanned
        Commitment c20 = Commitment.builder()
                .org(meridian).user(sarah).cycle(cycleWeek3)
                .chessCategory(defensive)
                .priorityRank(1)
                .title("Review Q1 OKR progress with VP team")
                .completionHorizon(CompletionHorizon.MIDDAY)
                .isUnplanned(true)
                .build();
        em.persist(c20);
        persistBullets(c20, meridian,
                "Pull Q1 OKR status report",
                "Prep talking points on Digital Transformation progress",
                "Facilitate 90-min leadership sync");

        // Lisa: Analyst report
        Commitment c21 = Commitment.builder()
                .org(meridian).user(lisa).cycle(cycleWeek3)
                .chessCategory(operational)
                .priorityRank(1)
                .title("Compile cross-team commitment completion rate report for March")
                .completionHorizon(CompletionHorizon.EOD)
                .build();
        em.persist(c21);
        persistBullets(c21, meridian,
                "Export week 1 and week 2 reconciliation data",
                "Calculate completion rates by team and individual",
                "Identify carry-forward patterns",
                "Present findings to Sarah");

        em.flush();
        log.info("event=seed_commitments count=21");

        // ── 7. Reconciliation Records (for Week 1 / RECONCILED cycle) ────────────
        Instant reconciledAt = toInstant(week1Start.plusDays(7)); // end-of-week reconciliation

        ReconciliationRecord rr1 = ReconciliationRecord.builder()
                .org(meridian).commitment(c1).cycle(cycleWeek1)
                .status(ReconciliationStatus.COMPLETED)
                .plannedHorizon(CompletionHorizon.EOW)
                .notes("Full scrap audit delivered. Root causes identified as tooling wear and incoming material variance.")
                .reconciledAt(reconciledAt)
                .reconciledBy(elena)
                .build();
        em.persist(rr1);

        ReconciliationRecord rr2 = ReconciliationRecord.builder()
                .org(meridian).commitment(c2).cycle(cycleWeek1)
                .status(ReconciliationStatus.PARTIALLY_COMPLETED)
                .plannedHorizon(CompletionHorizon.EOW)
                .notes("Tensile and hardness tests done. Impact resistance tests moved to next week due to equipment availability.")
                .reconciledAt(reconciledAt)
                .reconciledBy(elena)
                .build();
        em.persist(rr2);

        ReconciliationRecord rr3 = ReconciliationRecord.builder()
                .org(meridian).commitment(c3).cycle(cycleWeek1)
                .status(ReconciliationStatus.COMPLETED)
                .plannedHorizon(CompletionHorizon.MIDDAY)
                .notes("Checklist updated and reviewed by QA lead. Change effective next shift.")
                .reconciledAt(reconciledAt)
                .reconciledBy(priya)
                .build();
        em.persist(rr3);

        ReconciliationRecord rr4 = ReconciliationRecord.builder()
                .org(meridian).commitment(c4).cycle(cycleWeek1)
                .status(ReconciliationStatus.COMPLETED)
                .plannedHorizon(CompletionHorizon.EOW)
                .notes("2,400 images labeled and split. Dataset uploaded and ready for training pipeline.")
                .reconciledAt(reconciledAt)
                .reconciledBy(david)
                .build();
        em.persist(rr4);

        ReconciliationRecord rr5 = ReconciliationRecord.builder()
                .org(meridian).commitment(c5).cycle(cycleWeek1)
                .status(ReconciliationStatus.CARRIED_FORWARD)
                .plannedHorizon(CompletionHorizon.EOW)
                .notes("Partial research completed. Scoring rubric drafted but peer references not yet collected. Carrying forward to Week 2.")
                .reconciledAt(reconciledAt)
                .reconciledBy(anna)
                .build();
        em.persist(rr5);

        ReconciliationRecord rr6 = ReconciliationRecord.builder()
                .org(meridian).commitment(c6).cycle(cycleWeek1)
                .status(ReconciliationStatus.COMPLETED)
                .plannedHorizon(CompletionHorizon.EOW)
                .notes("Requirements doc sent to engineering. Feedback session scheduled for Week 2.")
                .reconciledAt(reconciledAt)
                .reconciledBy(tom)
                .build();
        em.persist(rr6);

        em.flush();
        log.info("event=seed_reconciliation_records count=6");

        log.info("event=seed_complete orgs=1 users=10 rally_cries=2 defining_objectives=4 outcomes=5 chess_categories=4 cycles=3 commitments=21 reconciliation_records=6");
    }

    // ── helpers ──────────────────────────────────────────────────────────────────

    private Instant toInstant(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private void persistBullets(Commitment commitment, Org org, String... bodies) {
        for (int i = 0; i < bodies.length; i++) {
            TaskBullet bullet = TaskBullet.builder()
                    .commitment(commitment)
                    .org(org)
                    .body(bodies[i])
                    .sortOrder(i + 1)
                    .isCompleted(false)
                    .build();
            em.persist(bullet);
        }
    }
}
