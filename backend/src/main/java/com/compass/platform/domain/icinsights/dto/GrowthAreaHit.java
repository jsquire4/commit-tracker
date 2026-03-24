package com.compass.platform.domain.icinsights.dto;

import java.util.UUID;

public record GrowthAreaHit(UUID growthAreaId, String label, int commitmentCount) {}
