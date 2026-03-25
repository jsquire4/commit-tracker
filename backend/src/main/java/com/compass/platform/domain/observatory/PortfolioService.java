package com.compass.platform.domain.observatory;

import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.TimeScope;
import com.compass.platform.domain.observatory.dto.ExecutiveHealthResponse;
import com.compass.platform.domain.observatory.dto.PortcoSummary;
import com.compass.platform.domain.observatory.dto.PortcoTrendLine;
import com.compass.platform.domain.observatory.dto.PortfolioComparisonResponse;
import com.compass.platform.domain.observatory.dto.PortfolioHealthResponse;
import com.compass.platform.domain.observatory.dto.RallyCrySummary;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

/**
 * Computes portfolio-level health across multiple organisations.
 *
 * <p>This is the "Superorg" view for PE managing directors: it aggregates
 * executive-level health metrics for every portco in a portfolio into a
 * single consolidated response. For the demo with 2-3 orgs, direct per-org
 * computation is used. If the portfolio grows, results can be cached or
 * materialised in a background job without changing the public API.</p>
 */
@Service
@Transactional(readOnly = true)
public class PortfolioService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioService.class);

    /** Default trailing-cycle window used when no scope is specified. */
    private static final TimeScope DEFAULT_SCOPE = TimeScope.ofWeeks(12);

    private final PortfolioRepository portfolioRepository;
    private final OrgRepository orgRepository;
    private final AppUserRepository appUserRepository;
    private final ExecutiveHealthComposer healthComposer;
    private final AnalyticsService analyticsService;
    private final RallyCryRepository rallyCryRepository;
    private final CommitmentRepository commitmentRepository;
    private final CycleRepository cycleRepository;

    public PortfolioService(PortfolioRepository portfolioRepository,
                            OrgRepository orgRepository,
                            AppUserRepository appUserRepository,
                            ExecutiveHealthComposer healthComposer,
                            AnalyticsService analyticsService,
                            RallyCryRepository rallyCryRepository,
                            CommitmentRepository commitmentRepository,
                            CycleRepository cycleRepository) {
        this.portfolioRepository = portfolioRepository;
        this.orgRepository = orgRepository;
        this.appUserRepository = appUserRepository;
        this.healthComposer = healthComposer;
        this.analyticsService = analyticsService;
        this.rallyCryRepository = rallyCryRepository;
        this.commitmentRepository = commitmentRepository;
        this.cycleRepository = cycleRepository;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Compute portfolio-level health by aggregating the executive health summary
     * of every portco that belongs to the given portfolio.
     *
     * <p>For each org the method calls {@link ExecutiveHealthComposer#computeHealth}
     * with the default 12-week window and converts the result to a
     * {@link PortcoSummary}. Headcount is sourced from the user table so
     * that the response stays consistent with the rest of the system.</p>
     *
     * @param portfolioId ID of the portfolio to aggregate
     * @return a {@link PortfolioHealthResponse} containing one {@link PortcoSummary}
     *         per active portco, ordered by org name
     * @throws jakarta.persistence.EntityNotFoundException if the portfolio does not exist
     */
    public PortfolioHealthResponse getPortfolioHealth(UUID portfolioId) {
        Portfolio portfolio = loadPortfolio(portfolioId);
        List<Org> orgs = orgRepository.findByPortfolioId(portfolioId);

        List<PortcoSummary> portcos = orgs.stream()
                .map(org -> buildPortcoSummary(org, DEFAULT_SCOPE))
                .toList();

        log.debug("getPortfolioHealth portfolioId={} orgCount={}", portfolioId, portcos.size());

        return new PortfolioHealthResponse(
                portfolio.getId(),
                portfolio.getName(),
                portcos,
                Instant.now()
        );
    }

    /**
     * Compare alignment trends across all portcos in the portfolio.
     *
     * <p>For each org, the alignment trend (strategic %) is fetched via
     * {@link AnalyticsService#computeAlignmentTrend} for the requested number
     * of trailing cycles. The caller receives sparkline-ready data for every
     * portco so the PE MD can see at a glance which portcos are improving or
     * declining.</p>
     *
     * @param portfolioId ID of the portfolio to compare
     * @param weekCount   number of trailing cycles to include in each trend line
     * @return a {@link PortfolioComparisonResponse} with one trend line per portco
     * @throws jakarta.persistence.EntityNotFoundException if the portfolio does not exist
     */
    public PortfolioComparisonResponse getPortfolioComparison(UUID portfolioId, TimeScope scope) {
        Portfolio portfolio = loadPortfolio(portfolioId);
        List<Org> orgs = orgRepository.findByPortfolioId(portfolioId);

        List<PortcoTrendLine> trends = orgs.stream()
                .map(org -> buildPortcoTrendLine(org, scope))
                .toList();

        log.debug("getPortfolioComparison portfolioId={} weekCount={} orgCount={}",
                portfolioId, scope, trends.size());

        return new PortfolioComparisonResponse(
                portfolio.getId(),
                portfolio.getName(),
                trends
        );
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Load a portfolio by ID, throwing a clear exception if it does not exist.
     */
    private Portfolio loadPortfolio(UUID portfolioId) {
        return portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Portfolio not found: " + portfolioId));
    }

    /**
     * Build a {@link PortcoSummary} for a single org by calling
     * {@link ExecutiveHealthComposer#computeHealth} and overlaying the live
     * headcount from the user table.
     */
    private PortcoSummary buildPortcoSummary(Org org, TimeScope scope) {
        ExecutiveHealthResponse health = healthComposer.computeHealth(org.getId(), scope);
        long headcount = appUserRepository.countByOrgIdAndIsActiveTrue(org.getId());
        List<RallyCrySummary> rallyCries = buildRallyCrySummaries(org.getId());

        return new PortcoSummary(
                org.getId(),
                org.getName(),
                health.overallGrade(),
                health.strategicAlignmentPct(),
                health.rallyCoveragePct(),
                health.completionRate(),
                health.carryForwardRate(),
                health.activeDriftSignals(),
                headcount,
                rallyCries
        );
    }

    /**
     * Build a list of {@link RallyCrySummary} items for a single org, using the
     * most recent active cycle to count commitments per rally cry.
     */
    private List<RallyCrySummary> buildRallyCrySummaries(UUID orgId) {
        // Get active rally cries for this org
        var rallyCries = rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);
        if (rallyCries.isEmpty()) {
            return List.of();
        }

        // Get the most recent active cycle for this org
        var latestCycle = cycleRepository.findByOrgIdAndIsActiveTrue(orgId);
        if (latestCycle.isEmpty()) {
            // No active cycle — all RCs show as "stable" with 0 commitments
            return rallyCries.stream()
                    .map(rc -> new RallyCrySummary(rc.getTitle(), 0, "stable"))
                    .toList();
        }

        UUID cycleId = latestCycle.get().getId();

        // Batch count commitments per rally cry
        var counts = commitmentRepository.countCommitmentsByRallyCryForOrgAndCycle(orgId, cycleId);
        var countMap = new HashMap<UUID, Long>();
        for (Object[] row : counts) {
            countMap.put((UUID) row[0], ((Number) row[1]).longValue());
        }

        return rallyCries.stream()
                .map(rc -> {
                    long count = countMap.getOrDefault(rc.getId(), 0L);
                    String status;
                    if (count == 0) {
                        status = "coverage-gap";
                    } else {
                        // Neutral: we don't judge good/bad, just report coverage exists
                        status = "stable";
                    }
                    return new RallyCrySummary(rc.getTitle(), (int) count, status);
                })
                .toList();
    }

    /**
     * Build a {@link PortcoTrendLine} for a single org by fetching its
     * alignment trend for the requested number of trailing cycles.
     */
    private PortcoTrendLine buildPortcoTrendLine(Org org, TimeScope scope) {
        List<AlignmentDataPoint> dataPoints =
                analyticsService.computeAlignmentTrend(org.getId(), scope);

        return new PortcoTrendLine(
                org.getId(),
                org.getName(),
                dataPoints
        );
    }
}
