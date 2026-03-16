package com.st6.committracker.domain.rcdo.dto;

import java.time.Instant;
import java.util.UUID;

public record RallyCryResponse(
    UUID id,
    String title,
    String description,
    int sortOrder,
    Instant createdAt
) {}
