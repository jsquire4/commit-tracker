package com.compass.platform.domain.user.dto;

import com.compass.platform.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateUserRequest(
    @NotBlank @Size(max = 200) String displayName,
    @NotBlank @Email @Size(max = 500) String email,
    @NotNull UserRole role,
    UUID reportsToId,
    UUID costBandId,
    BigDecimal weeklyCapacityHours
) {}
