package com.compass.platform.domain.observatory.dto;

import com.compass.platform.domain.DisplacementCategory;

import java.util.List;

public record CategoryCount(
        DisplacementCategory category,
        int count,
        double percentage,
        List<String> topTeams
) {}
