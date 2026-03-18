package com.st6.committracker.domain.observatory.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PortfolioHealthResponse(
        UUID portfolioId,
        String portfolioName,
        List<PortcoSummary> portcos,
        Instant computedAt
) {}
