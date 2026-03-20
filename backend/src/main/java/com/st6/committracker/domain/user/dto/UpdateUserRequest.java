package com.st6.committracker.domain.user.dto;

import com.st6.committracker.domain.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateUserRequest(
    @NotBlank @Size(max = 200) String displayName,
    @NotNull UserRole role,
    UUID reportsToId,
    UUID costBandId,
    BigDecimal weeklyCapacityHours
) {}
