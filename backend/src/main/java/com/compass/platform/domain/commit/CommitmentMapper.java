package com.compass.platform.domain.commit;

import com.compass.platform.domain.commit.dto.CommitmentResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CommitmentMapper {

    /**
     * Maps a Commitment entity and its eagerly-loaded bullets to a CommitmentResponse DTO.
     * Reconciliation status fields are not available at the commitment level; callers that
     * need them must build the response differently (e.g., ReconciliationController).
     */
    public CommitmentResponse toResponse(Commitment entity, List<TaskBullet> bullets) {
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
                "MANAGER_ASSIGNED",
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

        return new CommitmentResponse(
            entity.getId(),
            entity.getCycle().getId(),
            entity.getUser().getId(),
            entity.getUser().getDisplayName(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getCompletionHorizon(),
            entity.getPriorityRank(),
            entity.getChessCategory() != null ? entity.getChessCategory().getId() : null,
            entity.getChessCategory() != null ? entity.getChessCategory().getName() : null,
            rcdoLink,
            attribution,
            bulletResponses,
            entity.getCarriedFrom() != null ? entity.getCarriedFrom().getId() : null,
            entity.isUnplanned(),
            entity.getEstimatedHours(),
            null,   // reconciliationStatus — not available from entity alone
            null,   // reconciliationNote — not available from entity alone
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    /**
     * Convenience overload: uses the entity's own taskBullets collection.
     * Only safe after the collection has been initialized (i.e., within a transaction
     * or when fetched eagerly).
     */
    public CommitmentResponse toResponse(Commitment entity) {
        return toResponse(entity, entity.getTaskBullets());
    }

    public List<CommitmentResponse> toResponseList(List<Commitment> entities) {
        return entities.stream().map(this::toResponse).toList();
    }
}
