package com.compass.platform.seed;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.TaskBullet;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
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
@ConditionalOnProperty(name = "compass.seed.enabled", havingValue = "true")
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("event=seed_started");

        Long orgCount = em.createQuery("SELECT COUNT(o) FROM Org o", Long.class).getSingleResult();
        if (orgCount > 0) {
            log.info("event=seed_skipped reason=orgs_table_not_empty count={}", orgCount);
            return;
        }

        Org org = seedOrg();
        Users users = seedUsers(org);
        RcdoData rcdo = seedRcdo(org, users);
        ChessCategories chess = seedChessCategories(org);
        Cycles cycles = seedCycles(org);
        Commitments commitments = seedCommitments(org, users, rcdo, chess, cycles);
        seedReconciliation(org, users, commitments, cycles);

        log.info("event=seed_complete orgs=1 users=10 rally_cries=2 defining_objectives=4 outcomes=5 chess_categories=4 cycles=3 commitments=21 reconciliation_records=6");
    }

    // ── Records for passing seeded entities between steps ───────────────────────

    private record Users(AppUser sarah, AppUser raj, AppUser marcus, AppUser elena,
                         AppUser james, AppUser priya, AppUser david, AppUser anna,
                         AppUser tom, AppUser lisa) {}

    private record RcdoData(RallyCry opEx, RallyCry digitalTx,
                             DefiningObjective reduceScrap, DefiningObjective streamlineQA,
                             DefiningObjective erpMigration, DefiningObjective aiQuality,
                             Outcome scrapAudit, Outcome materialSpec,
                             Outcome autoTestStation, Outcome vendorShortlist,
                             Outcome cvModelTrained) {}

    private record ChessCategories(ChessCategory strategic, ChessCategory operational,
                                   ChessCategory defensive, ChessCategory capabilityBuilding) {}

    private record Cycles(Cycle week1, Cycle week2, Cycle week3) {}

    private record Commitments(Commitment c1, Commitment c2, Commitment c3, Commitment c4,
                                Commitment c5, Commitment c6) {}

    // ── Seed steps ───────────────────────────────────────────────────────────────

    private Org seedOrg() {
        Org meridian = Org.builder()
                .name("Meridian Manufacturing")
                .slug("meridian-mfg")
                .timezone("America/Chicago")
                .isActive(true)
                .build();
        em.persist(meridian);
        log.info("event=seed_orgs count=1");
        return meridian;
    }

    private Users seedUsers(Org meridian) {
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

        em.flush();
        log.info("event=seed_users count=10");
        return new Users(sarah, raj, marcus, elena, james, priya, david, anna, tom, lisa);
    }

    private RcdoData seedRcdo(Org meridian, Users u) {
        // Rally Cry 1: Operational Excellence
        RallyCry opEx = RallyCry.builder()
                .org(meridian)
                .title("Operational Excellence")
                .description("Drive manufacturing quality and process efficiency across all production lines.")
                .sortOrder(1)
                .build();
        em.persist(opEx);

        DefiningObjective reduceScrap = DefiningObjective.builder()
                .org(meridian).rallyCry(opEx)
                .title("Reduce Scrap Rate")
                .description("Reduce overall scrap rate by 30% across all production lines by end of quarter.")
                .owner(u.elena()).sortOrder(1)
                .build();
        em.persist(reduceScrap);

        Outcome scrapAudit = Outcome.builder()
                .org(meridian).definingObjective(reduceScrap)
                .title("Line 3 scrap audit complete")
                .description("Complete full audit of Line 3 scrap causes and root-cause analysis.")
                .sortOrder(1)
                .build();
        em.persist(scrapAudit);

        Outcome materialSpec = Outcome.builder()
                .org(meridian).definingObjective(reduceScrap)
                .title("New material spec approved")
                .description("Get engineering sign-off on revised material tolerance specifications.")
                .sortOrder(2)
                .build();
        em.persist(materialSpec);

        DefiningObjective streamlineQA = DefiningObjective.builder()
                .org(meridian).rallyCry(opEx)
                .title("Streamline QA Process")
                .description("Cut QA cycle time by 40% through automation and process improvements.")
                .owner(u.david()).sortOrder(2)
                .build();
        em.persist(streamlineQA);

        Outcome autoTestStation = Outcome.builder()
                .org(meridian).definingObjective(streamlineQA)
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
                .org(meridian).rallyCry(digitalTx)
                .title("ERP Migration")
                .description("Migrate from legacy ERP to SAP S/4HANA by end of fiscal year.")
                .owner(u.marcus()).sortOrder(1)
                .build();
        em.persist(erpMigration);

        Outcome vendorShortlist = Outcome.builder()
                .org(meridian).definingObjective(erpMigration)
                .title("Vendor shortlist finalized")
                .description("Evaluate and rank top 3 ERP implementation partners.")
                .sortOrder(1)
                .build();
        em.persist(vendorShortlist);

        DefiningObjective aiQuality = DefiningObjective.builder()
                .org(meridian).rallyCry(digitalTx)
                .title("AI Quality Inspection")
                .description("Deploy computer-vision quality inspection on primary assembly lines.")
                .owner(u.david()).sortOrder(2)
                .build();
        em.persist(aiQuality);

        Outcome cvModelTrained = Outcome.builder()
                .org(meridian).definingObjective(aiQuality)
                .title("CV model trained on defect dataset")
                .description("Train and validate CV model achieving >95% defect detection accuracy.")
                .sortOrder(1)
                .build();
        em.persist(cvModelTrained);

        em.flush();
        log.info("event=seed_rcdo rally_cries=2 defining_objectives=4 outcomes=5");
        return new RcdoData(opEx, digitalTx, reduceScrap, streamlineQA, erpMigration, aiQuality,
                scrapAudit, materialSpec, autoTestStation, vendorShortlist, cvModelTrained);
    }

    private ChessCategories seedChessCategories(Org meridian) {
        ChessCategory strategic = ChessCategory.builder()
                .org(meridian).name("Strategic")
                .description("Moves that advance long-term position and competitive advantage.")
                .colorHex("#4F46E5").sortOrder(1).isActive(true)
                .build();
        em.persist(strategic);

        ChessCategory operational = ChessCategory.builder()
                .org(meridian).name("Operational")
                .description("Day-to-day execution work that keeps the business running.")
                .colorHex("#0891B2").sortOrder(2).isActive(true)
                .build();
        em.persist(operational);

        ChessCategory defensive = ChessCategory.builder()
                .org(meridian).name("Defensive")
                .description("Risk mitigation, compliance, and protective actions.")
                .colorHex("#DC2626").sortOrder(3).isActive(true)
                .build();
        em.persist(defensive);

        ChessCategory capabilityBuilding = ChessCategory.builder()
                .org(meridian).name("Capability Building")
                .description("Investments in skills, tools, and systems that multiply future capacity.")
                .colorHex("#16A34A").sortOrder(4).isActive(true)
                .build();
        em.persist(capabilityBuilding);

        em.flush();
        log.info("event=seed_chess_categories count=4");
        return new ChessCategories(strategic, operational, defensive, capabilityBuilding);
    }

    private Cycles seedCycles(Org meridian) {
        // Anchor dates relative to the seed reference date (2026-03-16, a Monday)
        LocalDate week1Start = LocalDate.of(2026, 3, 2);
        LocalDate week2Start = LocalDate.of(2026, 3, 9);
        LocalDate week3Start = LocalDate.of(2026, 3, 16);

        Cycle cycleWeek1 = Cycle.builder()
                .org(meridian).label("Week of Mar 2, 2026").state(CycleState.RECONCILED)
                .startsAt(toInstant(week1Start)).endsAt(toInstant(week1Start.plusDays(7)))
                .isActive(false).build();
        em.persist(cycleWeek1);

        Cycle cycleWeek2 = Cycle.builder()
                .org(meridian).label("Week of Mar 9, 2026").state(CycleState.LOCKED)
                .startsAt(toInstant(week2Start)).endsAt(toInstant(week2Start.plusDays(7)))
                .isActive(false).build();
        em.persist(cycleWeek2);

        Cycle cycleWeek3 = Cycle.builder()
                .org(meridian).label("Week of Mar 16, 2026").state(CycleState.DRAFT)
                .startsAt(toInstant(week3Start)).endsAt(toInstant(week3Start.plusDays(7)))
                .isActive(true).build();
        em.persist(cycleWeek3);

        em.flush();
        log.info("event=seed_cycles count=3");
        return new Cycles(cycleWeek1, cycleWeek2, cycleWeek3);
    }

    private Commitments seedCommitments(Org meridian, Users u, RcdoData r, ChessCategories ch, Cycles cy) {
        // ── Week 1 (RECONCILED) ──────────────────────────────────────────────────
        Commitment c1 = Commitment.builder()
                .org(meridian).user(u.elena()).cycle(cy.week1())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap()).outcome(r.scrapAudit())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Complete Line 3 scrap audit and root-cause analysis")
                .description("Run full audit of Line 3 defects over the last 90 days and identify top 3 root causes.")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c1);
        persistBullets(c1, meridian,
                "Pull defect data from MES for Line 3 (90 days)",
                "Categorize by defect type and frequency",
                "Interview shift supervisors",
                "Draft root-cause analysis report");

        Commitment c2 = Commitment.builder()
                .org(meridian).user(u.james()).cycle(cy.week1())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Run material tolerance tests on new supplier batch")
                .completionHorizon(CompletionHorizon.EOW).assignedBy(u.elena()).build();
        em.persist(c2);
        persistBullets(c2, meridian,
                "Prepare test samples from new batch",
                "Run tensile strength tests",
                "Document results in QMS");

        Commitment c3 = Commitment.builder()
                .org(meridian).user(u.priya()).cycle(cy.week1())
                .rallyCry(r.opEx()).definingObjective(r.streamlineQA())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Update QA inspection checklist for new part geometry")
                .completionHorizon(CompletionHorizon.MIDDAY).build();
        em.persist(c3);
        persistBullets(c3, meridian,
                "Review engineering change order ECO-2024-118",
                "Update checklist items in QMS",
                "Submit for QA lead review");

        Commitment c4 = Commitment.builder()
                .org(meridian).user(u.david()).cycle(cy.week1())
                .rallyCry(r.digitalTx()).definingObjective(r.aiQuality()).outcome(r.cvModelTrained())
                .chessCategory(ch.capabilityBuilding()).priorityRank(1)
                .title("Curate initial defect image dataset for CV model training")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c4);
        persistBullets(c4, meridian,
                "Export defect images from optical inspection archive",
                "Label images by defect class",
                "Split into train/val/test sets",
                "Upload to ML platform storage");

        Commitment c5 = Commitment.builder()
                .org(meridian).user(u.anna()).cycle(cy.week1())
                .rallyCry(r.digitalTx()).definingObjective(r.erpMigration())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Research ERP implementation partner shortlist criteria")
                .completionHorizon(CompletionHorizon.EOW).assignedBy(u.marcus()).build();
        em.persist(c5);
        persistBullets(c5, meridian,
                "Review Gartner ERP vendor ratings",
                "Collect references from 3 industry peers",
                "Draft scoring rubric");

        Commitment c6 = Commitment.builder()
                .org(meridian).user(u.tom()).cycle(cy.week1())
                .rallyCry(r.opEx()).definingObjective(r.streamlineQA()).outcome(r.autoTestStation())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Draft technical requirements for automated test station")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c6);
        persistBullets(c6, meridian,
                "Benchmark cycle time of current manual station",
                "Identify test steps suitable for automation",
                "Draft requirements doc and send to engineering");

        em.flush();

        // ── Week 2 (LOCKED) ───────────────────────────────────────────────────────
        Commitment c7 = Commitment.builder()
                .org(meridian).user(u.elena()).cycle(cy.week2())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap()).outcome(r.materialSpec())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Drive sign-off on revised material tolerance specification")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c7);
        persistBullets(c7, meridian,
                "Incorporate test results from James into spec doc",
                "Schedule review meeting with engineering",
                "Collect sign-off signatures",
                "Publish approved spec to shared drive");

        Commitment c8 = Commitment.builder()
                .org(meridian).user(u.james()).cycle(cy.week2())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Complete remaining material tolerance tests (carried forward)")
                .completionHorizon(CompletionHorizon.AFTERNOON).assignedBy(u.elena()).carriedFrom(c2).build();
        em.persist(c8);
        persistBullets(c8, meridian,
                "Complete impact resistance tests",
                "Finalize QMS documentation",
                "Hand off results to Elena");

        Commitment c9 = Commitment.builder()
                .org(meridian).user(u.priya()).cycle(cy.week2())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Run Line 3 scrap reduction pilot for one full shift")
                .completionHorizon(CompletionHorizon.EOD).build();
        em.persist(c9);
        persistBullets(c9, meridian,
                "Brief shift operators on new inspection protocol",
                "Monitor Line 3 for full 8-hour shift",
                "Record scrap count vs. baseline",
                "Compile pilot results memo");

        Commitment c10 = Commitment.builder()
                .org(meridian).user(u.david()).cycle(cy.week2())
                .rallyCry(r.digitalTx()).definingObjective(r.aiQuality()).outcome(r.cvModelTrained())
                .chessCategory(ch.capabilityBuilding()).priorityRank(1)
                .title("Run first training pass on defect CV model and evaluate results")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c10);
        persistBullets(c10, meridian,
                "Configure training job on GPU cluster",
                "Run 50-epoch training pass",
                "Evaluate on validation set (target: >90% recall)",
                "Log results to experiment tracker");

        Commitment c11 = Commitment.builder()
                .org(meridian).user(u.anna()).cycle(cy.week2())
                .rallyCry(r.digitalTx()).definingObjective(r.erpMigration()).outcome(r.vendorShortlist())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Finalize ERP vendor shortlist for presentation to Marcus")
                .completionHorizon(CompletionHorizon.EOW).assignedBy(u.marcus()).carriedFrom(c5).build();
        em.persist(c11);
        persistBullets(c11, meridian,
                "Score vendors against rubric",
                "Create comparison slide deck",
                "Schedule presentation with Marcus and Raj");

        Commitment c12 = Commitment.builder()
                .org(meridian).user(u.tom()).cycle(cy.week2())
                .rallyCry(r.opEx()).definingObjective(r.streamlineQA()).outcome(r.autoTestStation())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Obtain quotes from 3 test automation vendors")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c12);
        persistBullets(c12, meridian,
                "Send RFQ to National Instruments, Keysight, and Teradyne",
                "Follow up with procurement on PO process",
                "Compare quotes on cost and delivery timeline");

        Commitment c13 = Commitment.builder()
                .org(meridian).user(u.marcus()).cycle(cy.week2())
                .chessCategory(ch.defensive()).priorityRank(1)
                .title("Review ISO 9001 audit prep checklist with QA leads")
                .completionHorizon(CompletionHorizon.MIDDAY).build();
        em.persist(c13);
        persistBullets(c13, meridian,
                "Pull latest nonconformance register",
                "Walk through audit checklist with Elena and David",
                "Assign remediation owners for open items");

        em.flush();

        // ── Week 3 (DRAFT, current) ───────────────────────────────────────────────
        Commitment c14 = Commitment.builder()
                .org(meridian).user(u.elena()).cycle(cy.week3())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap()).outcome(r.materialSpec())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Communicate approved material spec to all production supervisors")
                .completionHorizon(CompletionHorizon.EOD).build();
        em.persist(c14);
        persistBullets(c14, meridian,
                "Send spec update notification to all Line supervisors",
                "Update BOM in ERP staging environment",
                "Confirm receipt from each supervisor");

        Commitment c15 = Commitment.builder()
                .org(meridian).user(u.james()).cycle(cy.week3())
                .rallyCry(r.opEx()).definingObjective(r.reduceScrap())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Establish weekly scrap tracking dashboard in PowerBI")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c15);
        persistBullets(c15, meridian,
                "Connect PowerBI to MES scrap data feed",
                "Build daily scrap rate trend chart",
                "Share with Elena for review");

        Commitment c16 = Commitment.builder()
                .org(meridian).user(u.priya()).cycle(cy.week3())
                .rallyCry(r.opEx()).definingObjective(r.streamlineQA())
                .chessCategory(ch.capabilityBuilding()).priorityRank(1)
                .title("Define acceptance criteria for automated QA station go-live")
                .completionHorizon(CompletionHorizon.EOW).assignedBy(u.david()).build();
        em.persist(c16);
        persistBullets(c16, meridian,
                "Identify critical test cases that must pass",
                "Define false positive/negative thresholds",
                "Document sign-off criteria");

        Commitment c17 = Commitment.builder()
                .org(meridian).user(u.david()).cycle(cy.week3())
                .rallyCry(r.digitalTx()).definingObjective(r.aiQuality()).outcome(r.cvModelTrained())
                .chessCategory(ch.capabilityBuilding()).priorityRank(1)
                .title("Refine CV model to achieve >95% defect recall on test set")
                .completionHorizon(CompletionHorizon.EOW).build();
        em.persist(c17);
        persistBullets(c17, meridian,
                "Analyze misclassified defect samples",
                "Augment dataset with hard negatives",
                "Retrain with adjusted hyperparameters",
                "Validate on held-out test set");

        Commitment c18 = Commitment.builder()
                .org(meridian).user(u.anna()).cycle(cy.week3())
                .rallyCry(r.digitalTx()).definingObjective(r.erpMigration())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Draft ERP RFP document for top 3 shortlisted vendors")
                .completionHorizon(CompletionHorizon.EOW).assignedBy(u.marcus()).build();
        em.persist(c18);
        persistBullets(c18, meridian,
                "Template RFP from IT procurement library",
                "Add Meridian-specific requirements from Marcus",
                "Internal review with Marcus before sending");

        Commitment c19 = Commitment.builder()
                .org(meridian).user(u.tom()).cycle(cy.week3())
                .rallyCry(r.opEx()).definingObjective(r.streamlineQA()).outcome(r.autoTestStation())
                .chessCategory(ch.strategic()).priorityRank(1)
                .title("Coordinate test station installation schedule with facilities")
                .completionHorizon(CompletionHorizon.AFTERNOON).build();
        em.persist(c19);
        persistBullets(c19, meridian,
                "Confirm preferred installation window with facilities manager",
                "Reserve QA floor space on diagram",
                "Create installation runbook");

        Commitment c20 = Commitment.builder()
                .org(meridian).user(u.sarah()).cycle(cy.week3())
                .chessCategory(ch.defensive()).priorityRank(1)
                .title("Review Q1 OKR progress with VP team")
                .completionHorizon(CompletionHorizon.MIDDAY).isUnplanned(true).build();
        em.persist(c20);
        persistBullets(c20, meridian,
                "Pull Q1 OKR status report",
                "Prep talking points on Digital Transformation progress",
                "Facilitate 90-min leadership sync");

        Commitment c21 = Commitment.builder()
                .org(meridian).user(u.lisa()).cycle(cy.week3())
                .chessCategory(ch.operational()).priorityRank(1)
                .title("Compile cross-team commitment completion rate report for March")
                .completionHorizon(CompletionHorizon.EOD).build();
        em.persist(c21);
        persistBullets(c21, meridian,
                "Export week 1 and week 2 reconciliation data",
                "Calculate completion rates by team and individual",
                "Identify carry-forward patterns",
                "Present findings to Sarah");

        em.flush();
        log.info("event=seed_commitments count=21");

        return new Commitments(c1, c2, c3, c4, c5, c6);
    }

    private void seedReconciliation(Org meridian, Users u, Commitments c, Cycles cy) {
        LocalDate week1Start = LocalDate.of(2026, 3, 2);
        Instant reconciledAt = toInstant(week1Start.plusDays(7));

        ReconciliationRecord rr1 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c1()).cycle(cy.week1())
                .status(ReconciliationStatus.COMPLETED).plannedHorizon(CompletionHorizon.EOW)
                .notes("Full scrap audit delivered. Root causes identified as tooling wear and incoming material variance.")
                .reconciledAt(reconciledAt).reconciledBy(u.elena()).build();
        em.persist(rr1);

        ReconciliationRecord rr2 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c2()).cycle(cy.week1())
                .status(ReconciliationStatus.PARTIALLY_COMPLETED).plannedHorizon(CompletionHorizon.EOW)
                .notes("Tensile and hardness tests done. Impact resistance tests moved to next week due to equipment availability.")
                .reconciledAt(reconciledAt).reconciledBy(u.elena()).build();
        em.persist(rr2);

        ReconciliationRecord rr3 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c3()).cycle(cy.week1())
                .status(ReconciliationStatus.COMPLETED).plannedHorizon(CompletionHorizon.MIDDAY)
                .notes("Checklist updated and reviewed by QA lead. Change effective next shift.")
                .reconciledAt(reconciledAt).reconciledBy(u.priya()).build();
        em.persist(rr3);

        ReconciliationRecord rr4 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c4()).cycle(cy.week1())
                .status(ReconciliationStatus.COMPLETED).plannedHorizon(CompletionHorizon.EOW)
                .notes("2,400 images labeled and split. Dataset uploaded and ready for training pipeline.")
                .reconciledAt(reconciledAt).reconciledBy(u.david()).build();
        em.persist(rr4);

        ReconciliationRecord rr5 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c5()).cycle(cy.week1())
                .status(ReconciliationStatus.CARRIED_FORWARD).plannedHorizon(CompletionHorizon.EOW)
                .notes("Partial research completed. Scoring rubric drafted but peer references not yet collected. Carrying forward to Week 2.")
                .reconciledAt(reconciledAt).reconciledBy(u.anna()).build();
        em.persist(rr5);

        ReconciliationRecord rr6 = ReconciliationRecord.builder()
                .org(meridian).commitment(c.c6()).cycle(cy.week1())
                .status(ReconciliationStatus.COMPLETED).plannedHorizon(CompletionHorizon.EOW)
                .notes("Requirements doc sent to engineering. Feedback session scheduled for Week 2.")
                .reconciledAt(reconciledAt).reconciledBy(u.tom()).build();
        em.persist(rr6);

        em.flush();
        log.info("event=seed_reconciliation_records count=6");
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
