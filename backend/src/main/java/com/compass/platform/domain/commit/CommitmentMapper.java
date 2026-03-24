package com.compass.platform.domain.commit;

import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.dto.CommitmentLineageNode;
import com.compass.platform.domain.commit.dto.CommitmentResponse;
import com.compass.platform.domain.growth.GrowthArea;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class CommitmentMapper {

    /**
     * Maps a Commitment entity and its eagerly-loaded bullets to a CommitmentResponse DTO.
     * Reconciliation status fields are not available at the commitment level; callers that
     * need them must build the response differently (e.g., ReconciliationController).
     */
    public CommitmentResponse toResponse(Commitment entity, List<TaskBullet> bullets, ReconciliationStatus reconStatus) {
        CommitmentResponse.RcdoLinkResponse rcdoLink = new CommitmentResponse.RcdoLinkResponse(
            entity.getRallyCry() != null ? entity.getRallyCry().getId() : null,
            entity.getRallyCry() != null ? entity.getRallyCry().getTitle() : null,
            entity.getDefiningObjective() != null ? entity.getDefiningObjective().getId() : null,
            entity.getDefiningObjective() != null ? entity.getDefiningObjective().getTitle() : null,
            entity.getOutcome() != null ? entity.getOutcome().getId() : null,
            entity.getOutcome() != null ? entity.getOutcome().getTitle() : null
        );

        CommitmentResponse.AssignmentAttributionResponse attribution = null;
        if (entity.getAssignedBy() != null) {
            attribution = new CommitmentResponse.AssignmentAttributionResponse(
                "ASSIGNED_BY",
                entity.getAssignedBy().getId(),
                entity.getAssignedBy().getDisplayName()
            );
        } else {
            attribution = new CommitmentResponse.AssignmentAttributionResponse(
                "SELF_DIRECTED", null, null
            );
        }

        List<CommitmentResponse.TaskBulletResponse> bulletResponses = bullets == null
            ? List.of()
            : bullets.stream()
                .map(b -> new CommitmentResponse.TaskBulletResponse(
                    b.getId(), b.getBody(), b.getSortOrder(), b.isCompleted()))
                .toList();

        List<UUID> growthAreaIds = entity.getGrowthAreas() != null
            ? entity.getGrowthAreas().stream().map(GrowthArea::getId).toList()
            : List.of();

        return new CommitmentResponse(
            entity.getId(),
            entity.getCycle().getId(),
            entity.getUser().getId(),
            entity.getUser().getDisplayName(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getCompletionHorizon(),
            entity.getCompletionDay(),
            entity.getCompletionTimeBlock(),
            entity.getPriorityRank(),
            entity.getChessCategory() != null ? entity.getChessCategory().getId() : null,
            entity.getChessCategory() != null ? entity.getChessCategory().getName() : null,
            rcdoLink,
            attribution,
            bulletResponses,
            entity.getCarriedFrom() != null ? entity.getCarriedFrom().getId() : null,
            entity.isUnplanned(),
            entity.getEstimatedHours(),
            reconStatus,
            null,   // reconciliationNote — loaded separately when needed
            growthAreaIds,
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    /**
     * Convenience overload: uses the entity's own taskBullets collection.
     * Only safe after the collection has been initialized (i.e., within a transaction
     * or when fetched eagerly).
     */
    /** Overload without reconciliation status — backwards compatible. */
    public CommitmentResponse toResponse(Commitment entity, List<TaskBullet> bullets) {
        return toResponse(entity, bullets, null);
    }

    public CommitmentResponse toResponse(Commitment entity) {
        return toResponse(entity, entity.getTaskBullets(), null);
    }

    public List<CommitmentResponse> toResponseList(List<Commitment> entities) {
        return entities.stream().map(this::toResponse).toList();
    }

    /**
     * Snapshot for commitment history / lineage (one row per cycle in the chain).
     */
    public CommitmentLineageNode toLineageNode(
            Commitment entity,
            List<TaskBullet> bullets,
            ReconciliationStatus reconciliationStatus,
            String reconciliationNote) {
        List<CommitmentResponse.TaskBulletResponse> bulletResponses = bullets == null
                ? List.of()
                : bullets.stream()
                .map(b -> new CommitmentResponse.TaskBulletResponse(
                        b.getId(), b.getBody(), b.getSortOrder(), b.isCompleted()))
                .toList();

        return new CommitmentLineageNode(
                entity.getId(),
                entity.getCycle().getId(),
                entity.getCycle().getLabel(),
                entity.getCycle().getStartsAt(),
                entity.getCycle().getEndsAt(),
                entity.getTitle(),
                entity.getDescription(),
                bulletResponses,
                entity.getUser().getId(),
                entity.getUser().getDisplayName(),
                reconciliationStatus,
                reconciliationNote
        );
    }
}
