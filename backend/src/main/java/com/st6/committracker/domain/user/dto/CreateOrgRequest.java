package com.st6.committracker.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrgRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 100) String slug,
    String timezone
) {}
