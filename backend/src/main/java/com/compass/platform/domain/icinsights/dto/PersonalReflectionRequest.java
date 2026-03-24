package com.compass.platform.domain.icinsights.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record PersonalReflectionRequest(
        @NotNull UUID cycleId,
        @NotBlank @Pattern(regexp = "CLOSER|SAME|FURTHER") String alignmentSignal,
        @Size(max = 500) String learningNote
) {}
