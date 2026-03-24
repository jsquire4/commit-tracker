package com.compass.platform.domain.growth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateGrowthAreaRequest(
        @NotBlank @Size(max = 100) String label,
        @Size(max = 500) String description
) {}
