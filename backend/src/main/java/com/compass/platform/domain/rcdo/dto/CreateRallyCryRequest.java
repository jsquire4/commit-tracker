package com.compass.platform.domain.rcdo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRallyCryRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description
) {}
