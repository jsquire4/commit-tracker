package com.compass.platform.domain.briefing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NarrativeVerifier")
class NarrativeVerifierTest {

    private NarrativeVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new NarrativeVerifier();
    }

    // =========================================================================
    // verify() — citation checks
    // =========================================================================

    @Nested
    @DisplayName("verify() — citations")
    class CitationChecks {

        @Test
        @DisplayName("exact match citation passes verification")
        void exactMatch_passes() {
            Map<String, Double> ref = Map.of("A1.strategic", 41.2);
            String narrative = "Strategic alignment is 41.2% [A1.strategic] this week.";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isTrue();
            assertThat(result.violations()).isEmpty();
            assertThat(result.phantomRefs()).isEmpty();
            assertThat(result.checks()).hasSize(1);

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.ref()).isEqualTo("A1.strategic");
            assertThat(check.claimedValue()).isEqualTo("41.2");
            assertThat(check.actualValue()).isEqualTo("41.2");
            assertThat(check.valid()).isTrue();
            assertThat(check.tolerance()).isEqualTo("exact");
        }

        @Test
        @DisplayName("rounding within tolerance passes")
        void roundingWithinTolerance_passes() {
            Map<String, Double> ref = Map.of("B2.coverage", 74.6);
            // Claimed 75% — diff is 0.4, within tolerance of 1.0
            String narrative = "Coverage reached 75% [B2.coverage].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isTrue();
            assertThat(result.violations()).isEmpty();

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.claimedValue()).isEqualTo("75");
            assertThat(check.actualValue()).isEqualTo("74.6");
            assertThat(check.valid()).isTrue();
            assertThat(check.tolerance()).isEqualTo("rounding");
        }

        @Test
        @DisplayName("mismatch beyond tolerance creates a violation")
        void mismatchBeyondTolerance_createsViolation() {
            Map<String, Double> ref = Map.of("C3.completion", 50.0);
            // Claimed 60% — diff is 10.0, well beyond tolerance of 1.0
            String narrative = "Completion rate was 60% [C3.completion].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isFalse();
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().get(0)).contains("C3.completion")
                    .contains("60")
                    .contains("50.0");

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.ref()).isEqualTo("C3.completion");
            assertThat(check.valid()).isFalse();
            assertThat(check.tolerance()).isEqualTo("MISMATCH");
        }

        @Test
        @DisplayName("phantom reference (key not in reference data) is recorded as violation")
        void phantomReference_recordedAsViolation() {
            Map<String, Double> ref = Map.of("A1.strategic", 41.2);
            String narrative = "Unknown metric is 55% [X9.unknown].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isFalse();
            assertThat(result.phantomRefs()).containsExactly("X9.unknown");
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().get(0)).contains("X9.unknown").contains("not found");

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.ref()).isEqualTo("X9.unknown");
            assertThat(check.actualValue()).isNull();
            assertThat(check.valid()).isFalse();
            assertThat(check.tolerance()).isEqualTo("phantom_ref");
        }

        @Test
        @DisplayName("uncited percentage in narrative is captured but does not fail verification")
        void uncitedPercentage_capturedButNotBlocking() {
            Map<String, Double> ref = Map.of("A1.strategic", 41.2);
            // "72%" has no [ref] tag — uncited; narrative otherwise passes (no violations)
            String narrative = "Alignment is 41.2% [A1.strategic]. Also, roughly 72% of teams responded.";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            // Uncited numbers are warnings only — verification still passes when there are no
            // citation violations. The VerificationResult.pass() factory collapses uncitedNumbers
            // to an empty list because they are non-blocking; the log carries the full detail.
            assertThat(result.passed()).isTrue();
            assertThat(result.violations()).isEmpty();

            // Confirm the cited value itself was checked correctly
            assertThat(result.checks()).hasSize(1);
            assertThat(result.checks().get(0).ref()).isEqualTo("A1.strategic");
        }

        @Test
        @DisplayName("uncited percentage alongside a citation violation is included in fail result")
        void uncitedPercentage_includedInFailResult() {
            Map<String, Double> ref = Map.of("A1.strategic", 41.2);
            // Hallucinated citation triggers a violation; 72% is also uncited
            String narrative = "Alignment is 99% [A1.strategic]. Also, roughly 72% of teams responded.";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isFalse();
            assertThat(result.violations()).hasSize(1);
            // On the fail path, uncitedNumbers are propagated into the result
            assertThat(result.uncitedNumbers()).containsExactly("72%");
        }

        @Test
        @DisplayName("empty narrative returns clean passing result with no checks")
        void emptyNarrative_returnsCleanResult() {
            NarrativeVerifier.VerificationResult result = verifier.verify("", Map.of(), 1.0);

            assertThat(result.passed()).isTrue();
            assertThat(result.checks()).isEmpty();
            assertThat(result.violations()).isEmpty();
            assertThat(result.uncitedNumbers()).isEmpty();
            assertThat(result.phantomRefs()).isEmpty();
        }

        @Test
        @DisplayName("multiple citations in one narrative are all checked independently")
        void multipleCitations_allCheckedIndependently() {
            Map<String, Double> ref = Map.of(
                    "A1.strategic", 41.2,
                    "B2.coverage",  88.0,
                    "C3.completion", 50.0
            );
            // A1 exact, B2 within rounding, C3 hallucinated mismatch
            String narrative =
                    "Strategic alignment 41.2% [A1.strategic], " +
                    "coverage 88% [B2.coverage], " +
                    "completion 65% [C3.completion].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isFalse();
            assertThat(result.checks()).hasSize(3);
            assertThat(result.violations()).hasSize(1);
            assertThat(result.violations().get(0)).contains("C3.completion");

            // Individual check assertions
            NarrativeVerifier.CitationCheck a1 = result.checks().stream()
                    .filter(c -> "A1.strategic".equals(c.ref())).findFirst().orElseThrow();
            assertThat(a1.valid()).isTrue();
            assertThat(a1.tolerance()).isEqualTo("exact");

            NarrativeVerifier.CitationCheck b2 = result.checks().stream()
                    .filter(c -> "B2.coverage".equals(c.ref())).findFirst().orElseThrow();
            assertThat(b2.valid()).isTrue();
            assertThat(b2.tolerance()).isEqualTo("exact");   // 88 vs 88.0 — diff < 0.01

            NarrativeVerifier.CitationCheck c3 = result.checks().stream()
                    .filter(c -> "C3.completion".equals(c.ref())).findFirst().orElseThrow();
            assertThat(c3.valid()).isFalse();
            assertThat(c3.tolerance()).isEqualTo("MISMATCH");
        }

        @Test
        @DisplayName("0% citation passes when reference value is 0.0 (exact match)")
        void zeroPercentValue_exactMatch_passes() {
            Map<String, Double> ref = Map.of("D4.blocked", 0.0);
            String narrative = "No blocked items: 0% [D4.blocked].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isTrue();
            assertThat(result.checks()).hasSize(1);

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.claimedValue()).isEqualTo("0");
            assertThat(check.actualValue()).isEqualTo("0.0");
            assertThat(check.valid()).isTrue();
            assertThat(check.tolerance()).isEqualTo("exact");
        }

        @Test
        @DisplayName("100% citation passes when reference value is 100.0 (exact match)")
        void hundredPercentValue_exactMatch_passes() {
            Map<String, Double> ref = Map.of("E5.fullCompletion", 100.0);
            String narrative = "Full completion achieved: 100% [E5.fullCompletion].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isTrue();
            assertThat(result.checks()).hasSize(1);

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.claimedValue()).isEqualTo("100");
            assertThat(check.actualValue()).isEqualTo("100.0");
            assertThat(check.valid()).isTrue();
            assertThat(check.tolerance()).isEqualTo("exact");
        }

        @Test
        @DisplayName("0% claim against non-zero reference fails beyond tolerance")
        void zeroPercentClaim_againstNonZeroActual_fails() {
            Map<String, Double> ref = Map.of("F6.rate", 15.0);
            String narrative = "Rate is 0% [F6.rate].";

            NarrativeVerifier.VerificationResult result = verifier.verify(narrative, ref, 1.0);

            assertThat(result.passed()).isFalse();
            assertThat(result.violations()).hasSize(1);

            NarrativeVerifier.CitationCheck check = result.checks().get(0);
            assertThat(check.valid()).isFalse();
            assertThat(check.tolerance()).isEqualTo("MISMATCH");
        }
    }

    // =========================================================================
    // stripCitations()
    // =========================================================================

    @Nested
    @DisplayName("stripCitations()")
    class StripCitations {

        @Test
        @DisplayName("removes a single [ref] tag and surrounding whitespace")
        void singleRef_removed() {
            String input = "Alignment is 41.2% [A1.strategic] this week.";
            assertThat(verifier.stripCitations(input))
                    .isEqualTo("Alignment is 41.2% this week.");
        }

        @Test
        @DisplayName("removes multiple [ref] tags in the same narrative")
        void multipleRefs_allRemoved() {
            String input = "Coverage 88% [B2.coverage] and completion 50% [C3.completion].";
            assertThat(verifier.stripCitations(input))
                    .isEqualTo("Coverage 88% and completion 50%.");
        }

        @Test
        @DisplayName("removes [ref] tag with underscores and dots in the key")
        void refWithComplexKey_removed() {
            String input = "Metric 72.3% [org.team_alpha.q1] is trending up.";
            assertThat(verifier.stripCitations(input))
                    .isEqualTo("Metric 72.3% is trending up.");
        }

        @Test
        @DisplayName("narrative with no [ref] tags is returned unchanged")
        void noRefs_narrativeUnchanged() {
            String input = "Everything looks fine this week.";
            assertThat(verifier.stripCitations(input)).isEqualTo(input);
        }

        @Test
        @DisplayName("empty string returns empty string")
        void emptyString_returnsEmpty() {
            assertThat(verifier.stripCitations("")).isEmpty();
        }
    }
}
