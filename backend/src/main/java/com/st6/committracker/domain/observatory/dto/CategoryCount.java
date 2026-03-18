package com.st6.committracker.domain.observatory.dto;

import com.st6.committracker.domain.DisplacementCategory;

import java.util.List;

public record CategoryCount(
        DisplacementCategory category,
        int count,
        double percentage,
        List<String> topTeams
) {}
