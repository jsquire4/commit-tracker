package com.st6.committracker.domain.rcdo.dto;

import java.util.List;
import java.util.UUID;

public record RcdoTreeResponse(
    List<RallyCryNode> rallyCries
) {
    public record RallyCryNode(UUID id, String title, String description, int sortOrder,
        List<DefiningObjectiveNode> definingObjectives) {}
    public record DefiningObjectiveNode(UUID id, String title, String description,
        UUID ownerUserId, String ownerDisplayName, int sortOrder,
        List<OutcomeNode> outcomes) {}
    public record OutcomeNode(UUID id, String title, String description,
        UUID ownerUserId, String ownerDisplayName, int sortOrder) {}
}
