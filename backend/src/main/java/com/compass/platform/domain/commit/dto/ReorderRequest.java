package com.compass.platform.domain.commit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record ReorderRequest(
    @NotNull @Size(min = 1) List<UUID> orderedIds
) {}
