package com.compass.platform.domain.reconciliation.dto;

public record ReconciliationSummary(
    int totalCommitments,
    int reconciledCount,
    int completedCount,
    int partiallyCompletedCount,
    int notStartedCount,
    int carriedForwardCount,
    double completionRate,
    double bulletCompletionRate
) {}
