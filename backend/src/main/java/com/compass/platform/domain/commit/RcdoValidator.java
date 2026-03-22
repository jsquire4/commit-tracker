package com.compass.platform.domain.commit;

import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.shared.EntityNotFoundException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class RcdoValidator {

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;

    public RcdoValidator(RallyCryRepository rallyCryRepository,
                         DefiningObjectiveRepository definingObjectiveRepository,
                         OutcomeRepository outcomeRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
    }

    public void validateRcdoConsistencyAndExistence(UUID rallyCryId, UUID definingObjectiveId, UUID outcomeId) {
        // Hierarchy consistency: outcome requires DO, DO requires RC
        if (outcomeId != null && definingObjectiveId == null) {
            throw new IllegalArgumentException("definingObjectiveId is required when outcomeId is set");
        }
        if (definingObjectiveId != null && rallyCryId == null) {
            throw new IllegalArgumentException("rallyCryId is required when definingObjectiveId is set");
        }

        // Existence and archive checks
        if (rallyCryId != null) {
            RallyCry rc = rallyCryRepository.findById(rallyCryId)
                    .orElseThrow(() -> new EntityNotFoundException("RallyCry", rallyCryId));
            if (rc.isArchived()) {
                throw new IllegalArgumentException("RallyCry is archived: " + rallyCryId);
            }
        }

        if (definingObjectiveId != null) {
            DefiningObjective doEntity = definingObjectiveRepository.findById(definingObjectiveId)
                    .orElseThrow(() -> new EntityNotFoundException("DefiningObjective", definingObjectiveId));
            if (doEntity.isArchived()) {
                throw new IllegalArgumentException("DefiningObjective is archived: " + definingObjectiveId);
            }
        }

        if (outcomeId != null) {
            Outcome outcome = outcomeRepository.findById(outcomeId)
                    .orElseThrow(() -> new EntityNotFoundException("Outcome", outcomeId));
            if (outcome.isArchived()) {
                throw new IllegalArgumentException("Outcome is archived: " + outcomeId);
            }
        }
    }
}
