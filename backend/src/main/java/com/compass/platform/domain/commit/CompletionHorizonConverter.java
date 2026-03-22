package com.compass.platform.domain.commit;

import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;

/**
 * Pure utility for converting between the legacy CompletionHorizon enum
 * and the newer day + timeBlock granular scheduling fields.
 */
public final class CompletionHorizonConverter {

    private CompletionHorizonConverter() {}

    /**
     * Compute legacy CompletionHorizon from day + timeBlock.
     * If day is FRIDAY and timeBlock is EOD, legacy = EOW.
     * Otherwise, legacy = the timeBlock value (MORNING/MIDDAY/AFTERNOON/EOD).
     */
    public static CompletionHorizon computeLegacyHorizon(CompletionDay day, CompletionTimeBlock timeBlock) {
        if (day == CompletionDay.FRIDAY && timeBlock == CompletionTimeBlock.EOD) {
            return CompletionHorizon.EOW;
        }
        if (timeBlock != null) {
            return CompletionHorizon.valueOf(timeBlock.name());
        }
        // Fallback: if only day provided without timeBlock, default to EOD
        return CompletionHorizon.EOD;
    }

    /**
     * Compute CompletionDay from a legacy horizon.
     * EOW -> FRIDAY, time-of-day horizons -> null (implies today / current day).
     */
    public static CompletionDay computeDayFromHorizon(CompletionHorizon horizon) {
        if (horizon == null) {
            return null;
        }
        if (horizon == CompletionHorizon.EOW) {
            return CompletionDay.FRIDAY;
        }
        return null;
    }

    /**
     * Compute CompletionTimeBlock from a legacy horizon.
     * EOW -> EOD, others map directly by name.
     */
    public static CompletionTimeBlock computeTimeBlockFromHorizon(CompletionHorizon horizon) {
        if (horizon == null) {
            return null;
        }
        if (horizon == CompletionHorizon.EOW) {
            return CompletionTimeBlock.EOD;
        }
        return CompletionTimeBlock.valueOf(horizon.name());
    }
}
