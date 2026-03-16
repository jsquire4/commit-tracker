package com.st6.committracker.domain.rcdo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateRcdoRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    UUID ownerUserId
) {}
