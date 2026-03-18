package com.st6.committracker.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record PortfolioComparisonResponse(
        UUID portfolioId,
        String portfolioName,
        List<PortcoTrendLine> trends
) {}
