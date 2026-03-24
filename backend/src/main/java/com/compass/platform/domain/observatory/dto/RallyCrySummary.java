package com.compass.platform.domain.observatory.dto;

/**
 * Summary of a single rally cry within a portco, including commitment count
 * and coverage trend direction.
 *
 * <p>Status values are neutral trend descriptors, not value judgments:
 * {@code increasing}, {@code decreasing}, {@code stable}, or {@code coverage-gap}.</p>
 */
public record RallyCrySummary(
        String name,
        int commitmentCount,
        String status
) {}
