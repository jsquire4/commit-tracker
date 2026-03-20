package com.compass.platform.seed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.observatory.CostBand;
import com.compass.platform.domain.observatory.ObservatoryConfig;
import com.compass.platform.domain.observatory.Portfolio;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.security.AnalystScope;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Creates structural data for the simulation harness.
 * Only active when spring.profiles.active=simulation.
 * Reads configuration from the file specified by compass.simulation.setup-file.
 *
 * Creates: portfolio, orgs, cost bands, users (with hierarchy and cost bands),
 * RCDO hierarchy, chess categories, observatory config, analyst scopes, and
 * 26 weekly cycles per org.
 */
@Component
@Profile("simulation")
@Order(1)
public class SimulationSetupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SimulationSetupRunner.class);

    @PersistenceContext
    private EntityManager em;

    @Value("${compass.simulation.setup-file:classpath:simulation-setup.json}")
    private Resource setupFile;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        log.info("event=simulation_setup_started");

        Long orgCount = em.createQuery("SELECT COUNT(o) FROM Org o", Long.class).getSingleResult();
        if (orgCount > 0) {
            log.info("event=simulation_setup_skipped reason=orgs_already_exist count={}", orgCount);
            return;
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(setupFile.getInputStream());

        JsonNode portfolioNode = root.get("portfolio");
        if (portfolioNode == null || portfolioNode.isMissingNode()) {
            throw new IllegalStateException("simulation-setup.json must contain a 'portfolio' object");
        }
        Portfolio portfolio = createPortfolio(portfolioNode);

        JsonNode companies = root.get("companies");
        if (companies == null || !companies.isArray()) {
            throw new IllegalStateException("simulation-setup.json must contain a 'companies' array");
        }
        int totalUsers = 0;
        int totalCycles = 0;

        for (JsonNode company : companies) {
            Org org = createOrg(company, portfolio);
            Map<String, CostBand> costBands = createCostBands(org, company.path("costBands"));
            Map<String, AppUser> users = createUsers(org, company.path("users"), costBands);
            wireReportsTo(users, company.path("users"));
            createRcdoHierarchy(org, company.path("rallyCries"), users);
            createChessCategories(org, company.path("chessCategories"));
            createObservatoryConfig(org, company.path("observatoryConfig"));
            createAnalystScopes(org, company.path("analystScopes"), users);

            if (!company.has("cycleStartDate")) {
                throw new IllegalStateException("Company '" + company.path("name").asText() + "' must specify cycleStartDate");
            }
            String cycleStartDate = company.get("cycleStartDate").asText();
            int cycleCount = company.has("cycleCount") ? company.get("cycleCount").asInt() : 26;
            String timezone = company.has("timezone") ? company.get("timezone").asText() : "UTC";
            createCycles(org, cycleStartDate, cycleCount, timezone);

            totalUsers += users.size();
            totalCycles += cycleCount;
        }

        em.flush();
        log.info("event=simulation_setup_complete companies={} users={} cycles={}",
                companies.size(), totalUsers, totalCycles);
    }

    private Portfolio createPortfolio(JsonNode node) {
        Portfolio portfolio = Portfolio.builder()
                .name(node.get("name").asText())
                .slug(node.get("slug").asText())
                .description(node.has("description") ? node.get("description").asText() : null)
                .build();
        em.persist(portfolio);
        em.flush();
        log.info("Created portfolio: {}", portfolio.getName());
        return portfolio;
    }

    private Org createOrg(JsonNode node, Portfolio portfolio) {
        Org org = Org.builder()
                .name(node.get("name").asText())
                .slug(node.get("slug").asText())
                .timezone(node.has("timezone") ? node.get("timezone").asText() : "UTC")
                .build();
        org.setPortfolio(portfolio);
        em.persist(org);
        em.flush();
        log.info("Created org: {}", org.getName());
        return org;
    }

    private Map<String, CostBand> createCostBands(Org org, JsonNode bandsNode) {
        Map<String, CostBand> bands = new HashMap<>();
        if (bandsNode == null || bandsNode.isMissingNode() || !bandsNode.isArray()) return bands;

        for (JsonNode bandNode : bandsNode) {
            CostBand band = CostBand.builder()
                    .org(org)
                    .name(bandNode.get("name").asText())
                    .tier(bandNode.get("tier").asInt())
                    .annualCost(bandNode.has("annualCost") && !bandNode.get("annualCost").isNull() ? new BigDecimal(bandNode.get("annualCost").asText()) : null)
                    .hourlyRate(bandNode.has("hourlyRate") && !bandNode.get("hourlyRate").isNull() ? new BigDecimal(bandNode.get("hourlyRate").asText()) : null)
                    .build();
            em.persist(band);
            bands.put(band.getName(), band);
        }
        em.flush();
        return bands;
    }

    private Map<String, AppUser> createUsers(Org org, JsonNode usersNode, Map<String, CostBand> costBands) {
        Map<String, AppUser> users = new HashMap<>();
        if (usersNode == null || usersNode.isMissingNode() || !usersNode.isArray()) return users;

        // Pass 1: create all users without reportsTo
        for (JsonNode userNode : usersNode) {
            String email = userNode.get("email").asText();
            String displayName = userNode.get("displayName").asText();
            UserRole role = UserRole.valueOf(userNode.get("role").asText().toUpperCase());

            AppUser user = new AppUser(org, email, displayName, role, null);

            if (userNode.has("costBand")) {
                CostBand band = costBands.get(userNode.get("costBand").asText());
                if (band != null) {
                    user.setCostBand(band);
                }
            }

            if (userNode.has("weeklyCapacityHours") && !userNode.get("weeklyCapacityHours").isNull()) {
                user.setWeeklyCapacityHours(new BigDecimal(userNode.get("weeklyCapacityHours").asText()));
            }

            em.persist(user);
            users.put(email, user);
        }
        em.flush();
        return users;
    }

    private void wireReportsTo(Map<String, AppUser> users, JsonNode usersNode) {
        if (usersNode == null || usersNode.isMissingNode()) return;

        for (JsonNode userNode : usersNode) {
            if (userNode.has("reportsTo") && !userNode.get("reportsTo").isNull()) {
                String email = userNode.get("email").asText();
                String reportsToEmail = userNode.get("reportsTo").asText();
                AppUser user = users.get(email);
                AppUser manager = users.get(reportsToEmail);
                if (user != null && manager != null) {
                    user.setReportsTo(manager);
                    em.merge(user);
                }
            }
        }
        em.flush();
    }

    private void createRcdoHierarchy(Org org, JsonNode rallyCriesNode, Map<String, AppUser> users) {
        if (rallyCriesNode == null || rallyCriesNode.isMissingNode()) return;

        int rcSort = 0;
        for (JsonNode rcNode : rallyCriesNode) {
            RallyCry rc = new RallyCry(org, rcNode.get("title").asText(),
                    rcNode.has("description") ? rcNode.get("description").asText() : null, rcSort++);
            em.persist(rc);

            if (rcNode.has("definingObjectives")) {
                int doSort = 0;
                for (JsonNode doNode : rcNode.get("definingObjectives")) {
                    AppUser owner = doNode.has("ownerEmail") ?
                            users.get(doNode.get("ownerEmail").asText()) : null;
                    DefiningObjective doObj = new DefiningObjective(org, rc,
                            doNode.get("title").asText(),
                            doNode.has("description") ? doNode.get("description").asText() : null,
                            owner, doSort++);
                    em.persist(doObj);

                    if (doNode.has("outcomes")) {
                        int outSort = 0;
                        for (JsonNode outNode : doNode.get("outcomes")) {
                            AppUser outOwner = outNode.has("ownerEmail") ?
                                    users.get(outNode.get("ownerEmail").asText()) : owner;
                            Outcome outcome = new Outcome(org, doObj,
                                    outNode.get("title").asText(),
                                    outNode.has("description") ? outNode.get("description").asText() : null,
                                    outOwner, outSort++);
                            em.persist(outcome);
                        }
                    }
                }
            }
        }
        em.flush();
    }

    private void createChessCategories(Org org, JsonNode categoriesNode) {
        if (categoriesNode == null || categoriesNode.isMissingNode()) return;

        int sort = 0;
        for (JsonNode catNode : categoriesNode) {
            ChessCategory cat = ChessCategory.builder()
                    .org(org)
                    .name(catNode.get("name").asText())
                    .description(catNode.has("description") ? catNode.get("description").asText() : null)
                    .colorHex(catNode.has("colorHex") ? catNode.get("colorHex").asText() : null)
                    .sortOrder(sort++)
                    .isActive(true)
                    .build();
            em.persist(cat);
        }
        em.flush();
    }

    private void createObservatoryConfig(Org org, JsonNode configNode) {
        ObservatoryConfig config;
        if (configNode == null || configNode.isMissingNode() || configNode.isNull()) {
            config = new ObservatoryConfig(org);
        } else {
            config = ObservatoryConfig.builder()
                    .org(org)
                    .driftEmergingWeeks(configNode.has("driftEmergingWeeks") ? configNode.get("driftEmergingWeeks").asInt() : 3)
                    .driftSustainedWeeks(configNode.has("driftSustainedWeeks") ? configNode.get("driftSustainedWeeks").asInt() : 6)
                    .driftStructuralWeeks(configNode.has("driftStructuralWeeks") ? configNode.get("driftStructuralWeeks").asInt() : 12)
                    .strategicAlignmentTarget(configNode.has("strategicAlignmentTarget") ? new BigDecimal(configNode.get("strategicAlignmentTarget").asText()) : new BigDecimal("60.0"))
                    .misalignmentWarningPct(configNode.has("misalignmentWarningPct") ? new BigDecimal(configNode.get("misalignmentWarningPct").asText()) : new BigDecimal("40.0"))
                    .darkWorkWarningPct(configNode.has("darkWorkWarningPct") ? new BigDecimal(configNode.get("darkWorkWarningPct").asText()) : new BigDecimal("60.0"))
                    .concentrationRiskPct(configNode.has("concentrationRiskPct") ? new BigDecimal(configNode.get("concentrationRiskPct").asText()) : new BigDecimal("50.0"))
                    .uniformityThreshold(configNode.has("uniformityThreshold") ? new BigDecimal(configNode.get("uniformityThreshold").asText()) : new BigDecimal("90.0"))
                    .build();
        }
        em.persist(config);
        em.flush();
    }

    private void createAnalystScopes(Org org, JsonNode scopesNode, Map<String, AppUser> users) {
        if (scopesNode == null || scopesNode.isMissingNode() || !scopesNode.isArray()) return;

        for (JsonNode scopeNode : scopesNode) {
            String analystEmail = scopeNode.path("analystEmail").asText("");
            AppUser analyst = users.get(analystEmail);
            if (analyst == null) {
                log.warn("Analyst scope skipped: user not found for email '{}'", analystEmail);
                continue;
            }

            AnalystScope scope = new AnalystScope(org, analyst);

            // DB constraint requires at least one of rallyCry or orgUnitRoot
            boolean hasScope = false;
            if (scopeNode.has("orgUnitRootEmail")) {
                AppUser root = users.get(scopeNode.get("orgUnitRootEmail").asText());
                if (root != null) {
                    scope.setOrgUnitRoot(root);
                    hasScope = true;
                }
            }

            if (!hasScope) {
                log.warn("Analyst scope skipped for '{}': no orgUnitRootEmail specified (DB requires at least one scope)", analystEmail);
                continue;
            }

            em.persist(scope);
        }
        em.flush();
    }

    private void createCycles(Org org, String startDateStr, int count, String timezone) {
        LocalDate start = LocalDate.parse(startDateStr);
        ZoneId zone = ZoneId.of(timezone);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);

        for (int i = 0; i < count; i++) {
            LocalDate weekStart = start.plusWeeks(i);
            ZonedDateTime weekStartZdt = weekStart.atStartOfDay(zone);
            ZonedDateTime weekEndZdt = weekStartZdt.plusDays(6).withHour(23).withMinute(59).withSecond(59);

            Instant startsAt = weekStartZdt.toInstant();
            Instant endsAt = weekEndZdt.toInstant();
            String label = "Week of " + weekStartZdt.format(fmt);

            // Only the first cycle is active
            boolean active = (i == 0);

            Cycle cycle = Cycle.builder()
                    .org(org)
                    .label(label)
                    .state(CycleState.DRAFT)
                    .startsAt(startsAt)
                    .endsAt(endsAt)
                    .isActive(active)
                    .build();
            em.persist(cycle);
        }
        em.flush();
        log.info("Created {} cycles for org {} starting {}", count, org.getName(), startDateStr);
    }
}
