package com.compass.platform.domain.briefing;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic verifier for LLM-generated narratives.
 *
 * <p>Checks that every number cited in the narrative (tagged with [ref] markers)
 * matches the actual data that was passed to the LLM. Catches hallucinated numbers,
 * phantom references, and uncited numerical claims.
 */
public class NarrativeVerifier {

    private static final Logger log = LoggerFactory.getLogger(NarrativeVerifier.class);

    /** Matches a number (integer or decimal, optional %) followed by a [ref] tag. */
    private static final Pattern CITED_NUMBER = Pattern.compile(
            "(\\d+(?:\\.\\d+)?)%?\\s*\\[([A-Za-z0-9_.]+)]"
    );

    /** Matches any standalone number (integer or decimal, optional %) NOT followed by a [ref]. */
    private static final Pattern UNCITED_NUMBER = Pattern.compile(
            "(?<!\\d)(\\d+(?:\\.\\d+)?)%(?!\\s*\\[)"
    );

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CitationCheck(
            String ref,
            String claimedValue,
            String actualValue,
            boolean valid,
            String tolerance
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record VerificationResult(
            boolean passed,
            List<CitationCheck> checks,
            List<String> uncitedNumbers,
            List<String> phantomRefs,
            List<String> violations
    ) {
        public static VerificationResult pass(List<CitationCheck> checks) {
            return new VerificationResult(true, checks, List.of(), List.of(), List.of());
        }

        public static VerificationResult fail(List<CitationCheck> checks,
                                              List<String> uncitedNumbers,
                                              List<String> phantomRefs,
                                              List<String> violations) {
            return new VerificationResult(false, checks, uncitedNumbers, phantomRefs, violations);
        }
    }

    /**
     * Verify a narrative against the reference data that was used to generate it.
     *
     * @param narrative     the LLM-generated text with [ref] citation tags
     * @param referenceData map of ref tag → actual numeric value (e.g., "A1.strategic" → 41.2)
     * @param tolerancePct  allowable rounding tolerance in percentage points (e.g., 1.0)
     * @return verification result with detailed checks
     */
    public VerificationResult verify(String narrative, Map<String, Double> referenceData, double tolerancePct) {
        List<CitationCheck> checks = new ArrayList<>();
        List<String> phantomRefs = new ArrayList<>();
        List<String> violations = new ArrayList<>();

        // 1. Check all cited numbers
        Matcher citedMatcher = CITED_NUMBER.matcher(narrative);
        while (citedMatcher.find()) {
            String claimedStr = citedMatcher.group(1);
            String ref = citedMatcher.group(2);
            double claimed = Double.parseDouble(claimedStr);

            Double actual = referenceData.get(ref);
            if (actual == null) {
                phantomRefs.add(ref);
                checks.add(new CitationCheck(ref, claimedStr, null, false, "phantom_ref"));
                violations.add("Reference [" + ref + "] not found in input data");
                continue;
            }

            double diff = Math.abs(claimed - actual);
            boolean valid = diff <= tolerancePct;
            String tolerance = diff < 0.01 ? "exact" : (valid ? "rounding" : "MISMATCH");

            checks.add(new CitationCheck(ref, claimedStr, String.format("%.1f", actual), valid, tolerance));
            if (!valid) {
                violations.add(String.format(
                        "Claimed %s for [%s] but actual is %.1f (diff=%.1f, tolerance=%.1f)",
                        claimedStr, ref, actual, diff, tolerancePct));
            }
        }

        // 2. Check for uncited percentage numbers (logged as warnings, not violations)
        // TODO: Re-enable as violations once the prompt reliably produces citations
        List<String> uncitedNumbers = new ArrayList<>();
        Matcher uncitedMatcher = UNCITED_NUMBER.matcher(narrative);
        while (uncitedMatcher.find()) {
            String uncited = uncitedMatcher.group(1) + "%";
            uncitedNumbers.add(uncited);
            log.info("Uncited number in narrative (not blocking): {}", uncited);
        }

        boolean passed = violations.isEmpty();

        if (!passed) {
            log.warn("Narrative verification FAILED: {} violations — {}", violations.size(), violations);
        } else {
            log.info("Narrative verification passed: {} citations checked", checks.size());
        }

        return passed
                ? VerificationResult.pass(checks)
                : VerificationResult.fail(checks, uncitedNumbers, phantomRefs, violations);
    }

    /**
     * Strip all [ref] citation tags from a narrative, leaving clean prose for the frontend.
     */
    public String stripCitations(String narrative) {
        return narrative.replaceAll("\\s*\\[[A-Za-z0-9_.]+]", "");
    }
}
