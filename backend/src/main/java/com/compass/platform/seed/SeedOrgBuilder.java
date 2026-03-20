package com.compass.platform.seed;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.observatory.CostBand;
import com.compass.platform.domain.observatory.ObservatoryConfig;
import com.compass.platform.domain.observatory.Portfolio;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Builds the org structure for observatory seed data:
 * 1 Portfolio, 3 Orgs, ~50 users each, cost bands, RCDO hierarchy,
 * chess categories, and observatory config per org.
 */
public class SeedOrgBuilder {

    private static final Logger log = LoggerFactory.getLogger(SeedOrgBuilder.class);

    private final EntityManager em;
    private final Random random;

    /** Tracks used emails per org slug to detect collisions */
    private final Map<String, Set<String>> usedEmails = new HashMap<>();

    public SeedOrgBuilder(EntityManager em) {
        this.em = em;
        this.random = new Random(42);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public List<OrgContext> buildAll() {
        Portfolio portfolio = buildPortfolio();

        String[][] orgDefs = {
            {"Meridian Manufacturing", "meridian-mfg", "America/Chicago"},
            {"Pinnacle Logistics",     "pinnacle-log",  "America/New_York"},
            {"Atlas Industrial",       "atlas-ind",     "America/Denver"}
        };

        List<OrgContext> contexts = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            OrgContext ctx = buildOrg(i, orgDefs[i][0], orgDefs[i][1], orgDefs[i][2], portfolio);
            contexts.add(ctx);
        }

        log.info("event=seed_orgs_complete orgs=3 portfolio=Apex_Capital_Partners");
        return contexts;
    }

    // ── OrgContext record ─────────────────────────────────────────────────────

    public record OrgContext(
        int orgIndex,
        Org org,
        List<AppUser> employees,
        List<AppUser> managers,
        List<AppUser> directors,
        List<AppUser> vps,
        AppUser executive,
        List<AppUser> analysts,
        List<RallyCry> rallyCries,
        List<DefiningObjective> definingObjectives,
        List<Outcome> outcomes,
        ChessCategory strategicCategory,
        ChessCategory operationalCategory,
        ChessCategory defensiveCategory,
        ChessCategory capabilityBuildingCategory,
        CostBand l1, CostBand l2, CostBand l3, CostBand l4, CostBand l5
    ) {
        public List<AppUser> commitmentWorkers() {
            List<AppUser> workers = new ArrayList<>(employees);
            workers.addAll(managers);
            return workers;
        }
    }

    // ── Portfolio ─────────────────────────────────────────────────────────────

    private Portfolio buildPortfolio() {
        Portfolio p = Portfolio.builder()
            .name("Apex Capital Partners")
            .slug("apex-capital")
            .description("Mid-market industrial and logistics portfolio.")
            .build();
        em.persist(p);
        return p;
    }

    // ── Org ───────────────────────────────────────────────────────────────────

    private OrgContext buildOrg(int orgIndex, String name, String slug, String timezone, Portfolio portfolio) {
        Org org = Org.builder()
            .name(name).slug(slug).timezone(timezone).isActive(true).portfolio(portfolio)
            .build();
        em.persist(org);
        usedEmails.put(slug, new HashSet<>());

        // Cost bands
        CostBand l1 = new CostBand(org, "L1 - Entry",       1, null, new BigDecimal("35.00"));
        CostBand l2 = new CostBand(org, "L2 - Intermediate", 2, null, new BigDecimal("55.00"));
        CostBand l3 = new CostBand(org, "L3 - Senior",       3, null, new BigDecimal("80.00"));
        CostBand l4 = new CostBand(org, "L4 - Lead",         4, null, new BigDecimal("110.00"));
        CostBand l5 = new CostBand(org, "L5 - Director+",    5, null, new BigDecimal("160.00"));
        for (CostBand cb : List.of(l1, l2, l3, l4, l5)) em.persist(cb);

        // Chess categories
        ChessCategory strategic = ChessCategory.builder()
            .org(org).name("Strategic")
            .description("Moves that advance long-term position and competitive advantage.")
            .colorHex("#4F46E5").sortOrder(1).isActive(true).build();
        ChessCategory operational = ChessCategory.builder()
            .org(org).name("Operational")
            .description("Day-to-day execution work that keeps the business running.")
            .colorHex("#0891B2").sortOrder(2).isActive(true).build();
        ChessCategory defensive = ChessCategory.builder()
            .org(org).name("Defensive")
            .description("Risk mitigation, compliance, and protective actions.")
            .colorHex("#DC2626").sortOrder(3).isActive(true).build();
        ChessCategory capabilityBuilding = ChessCategory.builder()
            .org(org).name("Capability Building")
            .description("Investments in skills, tools, and systems that multiply future capacity.")
            .colorHex("#16A34A").sortOrder(4).isActive(true).build();
        for (ChessCategory cc : List.of(strategic, operational, defensive, capabilityBuilding)) em.persist(cc);

        // Users
        AppUser exec = createUser(org, UserRole.EXECUTIVE, null, l5, slug);
        em.persist(exec);

        List<AppUser> vps = new ArrayList<>();
        List<AppUser> directors = new ArrayList<>();
        List<AppUser> managers = new ArrayList<>();
        List<AppUser> employees = new ArrayList<>();
        List<AppUser> analysts = new ArrayList<>();

        // 2 VPs, each with 2 directors, each with 2-3 managers, each with 3-5 employees + 1 analyst per director
        for (int vIdx = 0; vIdx < 2; vIdx++) {
            AppUser vp = createUser(org, UserRole.VP, exec, l5, slug);
            em.persist(vp);
            vps.add(vp);

            int numDirs = 2 + (vIdx % 2); // 2 or 3
            for (int dIdx = 0; dIdx < numDirs; dIdx++) {
                AppUser dir = createUser(org, UserRole.DIRECTOR, vp, l4, slug);
                em.persist(dir);
                directors.add(dir);

                // analyst per director subtree
                AppUser analyst = createUser(org, UserRole.ANALYST, dir, l2, slug);
                em.persist(analyst);
                analysts.add(analyst);

                int numMgrs = 2 + (dIdx % 2); // 2 or 3
                for (int mIdx = 0; mIdx < numMgrs; mIdx++) {
                    AppUser mgr = createUser(org, UserRole.MANAGER, dir, l3, slug);
                    em.persist(mgr);
                    managers.add(mgr);

                    int numEmps = 3 + (mIdx % 3); // 3, 4, or 5
                    for (int eIdx = 0; eIdx < numEmps; eIdx++) {
                        AppUser emp = createUser(org, UserRole.EMPLOYEE, mgr, random.nextBoolean() ? l1 : l2, slug);
                        em.persist(emp);
                        employees.add(emp);
                    }
                }
            }
        }

        em.flush();
        log.info("event=seed_users org={} exec=1 vps={} directors={} managers={} employees={} analysts={}",
            slug, vps.size(), directors.size(), managers.size(), employees.size(), analysts.size());

        // RCDO
        List<RallyCry> rallyCries = new ArrayList<>();
        List<DefiningObjective> definingObjectives = new ArrayList<>();
        List<Outcome> outcomes = new ArrayList<>();

        AppUser doOwner1 = managers.isEmpty() ? exec : managers.get(0);
        AppUser doOwner2 = managers.size() > 1 ? managers.get(1) : exec;

        String[] rcTitles = SeedTemplates.RALLY_CRY_TITLES[orgIndex];
        String[] rcDescs  = SeedTemplates.RALLY_CRY_DESCRIPTIONS[orgIndex];
        String[][] doTitles = SeedTemplates.DO_TITLES[orgIndex];
        String[][][] outTitles = SeedTemplates.OUTCOME_TITLES[orgIndex];

        for (int rcIdx = 0; rcIdx < rcTitles.length; rcIdx++) {
            RallyCry rc = RallyCry.builder()
                .org(org).title(rcTitles[rcIdx]).description(rcDescs[rcIdx]).sortOrder(rcIdx + 1)
                .build();
            em.persist(rc);
            rallyCries.add(rc);

            AppUser[] doOwners = {doOwner1, doOwner2, (managers.size() > 2 ? managers.get(2) : doOwner1)};
            String[] doTitlesForRc = doTitles[rcIdx];

            for (int doIdx = 0; doIdx < doTitlesForRc.length; doIdx++) {
                DefiningObjective doObj = DefiningObjective.builder()
                    .org(org).rallyCry(rc)
                    .title(doTitlesForRc[doIdx])
                    .description("Key objective for " + rcTitles[rcIdx])
                    .owner(doOwners[doIdx % doOwners.length])
                    .sortOrder(doIdx + 1)
                    .build();
                em.persist(doObj);
                definingObjectives.add(doObj);

                String[] outTitlesForDo = outTitles[rcIdx][doIdx];
                for (int oIdx = 0; oIdx < outTitlesForDo.length; oIdx++) {
                    Outcome outcome = Outcome.builder()
                        .org(org).definingObjective(doObj)
                        .title(outTitlesForDo[oIdx])
                        .description("Measurable outcome for " + doTitlesForRc[doIdx])
                        .sortOrder(oIdx + 1)
                        .build();
                    em.persist(outcome);
                    outcomes.add(outcome);
                }
            }
        }

        em.flush();
        log.info("event=seed_rcdo org={} rally_cries={} defining_objectives={} outcomes={}",
            slug, rallyCries.size(), definingObjectives.size(), outcomes.size());

        // Observatory config (defaults)
        ObservatoryConfig config = new ObservatoryConfig(org);
        em.persist(config);

        return new OrgContext(
            orgIndex, org, employees, managers, directors, vps, exec, analysts,
            rallyCries, definingObjectives, outcomes,
            strategic, operational, defensive, capabilityBuilding,
            l1, l2, l3, l4, l5
        );
    }

    // ── User creation helpers ─────────────────────────────────────────────────

    private AppUser createUser(Org org, UserRole role, AppUser reportsTo, CostBand costBand, String slug) {
        String first = pickRandom(SeedTemplates.FIRST_NAMES);
        String last  = pickRandom(SeedTemplates.LAST_NAMES);
        String email = resolveEmail(first, last, slug);
        String displayName = first + " " + last;

        AppUser user = new AppUser(org, email, displayName, role, reportsTo);
        user.setCostBand(costBand);
        return user;
    }

    private String resolveEmail(String first, String last, String slug) {
        Set<String> used = usedEmails.get(slug);
        String base = (first + "." + last).toLowerCase().replace(" ", "");
        String candidate = base + "@" + slug + ".com";
        if (!used.contains(candidate)) {
            used.add(candidate);
            return candidate;
        }
        int i = 2;
        while (true) {
            candidate = base + i + "@" + slug + ".com";
            if (!used.contains(candidate)) {
                used.add(candidate);
                return candidate;
            }
            i++;
        }
    }

    private String pickRandom(String[] arr) {
        return arr[random.nextInt(arr.length)];
    }
}
