package com.st6.committracker.domain.reconciliation.dto;

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
