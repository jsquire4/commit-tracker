package com.compass.platform.domain.importexport;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.importexport.ImportResult.ImportError;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Import RCDO hierarchy from CSV.
 * Format: rally_cry, defining_objective, outcome, owner_email, rc_description, do_description, outcome_description, outcome_owner_email
 * Deduplicates by title within each level. Idempotent.
 * Validates: file size <= 5MB, row count <= 10,000.
 */
@Service
public class RcdoCsvImporter {

    private static final Logger log = LoggerFactory.getLogger(RcdoCsvImporter.class);

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final int MAX_ROWS = 10_000;

    // Column indices
    private static final int COL_RALLY_CRY = 0;
    private static final int COL_DEFINING_OBJECTIVE = 1;
    private static final int COL_OUTCOME = 2;
    private static final int COL_OWNER_EMAIL = 3;
    private static final int COL_RC_DESCRIPTION = 4;
    private static final int COL_DO_DESCRIPTION = 5;
    private static final int COL_OUTCOME_DESCRIPTION = 6;
    private static final int COL_OUTCOME_OWNER_EMAIL = 7;

    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final AppUserRepository userRepository;
    private final AuditService auditService;
    private final OrgRepository orgRepository;

    public RcdoCsvImporter(RallyCryRepository rallyCryRepository,
                           DefiningObjectiveRepository definingObjectiveRepository,
                           OutcomeRepository outcomeRepository,
                           AppUserRepository userRepository,
                           AuditService auditService,
                           OrgRepository orgRepository) {
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.orgRepository = orgRepository;
    }

    @Transactional
    public ImportResult importRcdo(MultipartFile file, UUID orgId, AppUser actor) {
        List<ImportError> errors = new ArrayList<>();

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }

        List<String[]> rows = parseRows(file, errors);
        if (!errors.isEmpty()) {
            return new ImportResult(0, 0, 0, errors.size(), errors);
        }

        if (rows.size() > MAX_ROWS) {
            throw new IllegalArgumentException("Row count exceeds " + MAX_ROWS + " limit");
        }

        if (rows.isEmpty()) {
            return new ImportResult(0, 0, 0, 0, errors);
        }

        Org org = orgRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        // Load existing rally cries for this org to deduplicate by title
        List<RallyCry> existingRcs = rallyCryRepository.findByOrgIdOrderBySortOrderAsc(orgId);
        Map<String, RallyCry> rcByTitle = new LinkedHashMap<>();
        for (RallyCry rc : existingRcs) {
            rcByTitle.put(rc.getTitle(), rc);
        }

        // Load existing DOs
        List<DefiningObjective> existingDos = definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(orgId);
        // Key: rallyCryTitle + "||" + doTitle
        Map<String, DefiningObjective> doByKey = new LinkedHashMap<>();
        for (DefiningObjective doObj : existingDos) {
            String key = doObj.getRallyCry().getTitle() + "||" + doObj.getTitle();
            doByKey.put(key, doObj);
        }

        int importedRows = 0;
        int rowNum = 1;

        for (String[] row : rows) {
            rowNum++;

            if (row.length < 1) {
                errors.add(new ImportError(rowNum, "row", "Too few columns"));
                continue;
            }

            String rcTitle = trim(row, COL_RALLY_CRY);
            String doTitle = trim(row, COL_DEFINING_OBJECTIVE);
            String outcomeTitle = trim(row, COL_OUTCOME);
            String ownerEmail = trim(row, COL_OWNER_EMAIL);

            if (rcTitle.isEmpty()) {
                errors.add(new ImportError(rowNum, "rally_cry", "rally_cry title is required"));
                continue;
            }

            // Resolve owner (optional)
            AppUser owner = null;
            if (!ownerEmail.isEmpty()) {
                owner = userRepository.findByOrgIdAndEmail(orgId, ownerEmail).orElse(null);
                if (owner == null) {
                    errors.add(new ImportError(rowNum, "owner_email", "User not found: " + ownerEmail));
                    continue;
                }
            }

            String rcDescription = trim(row, COL_RC_DESCRIPTION);
            String doDescription = trim(row, COL_DO_DESCRIPTION);
            String outcomeDescription = trim(row, COL_OUTCOME_DESCRIPTION);
            String outcomeOwnerEmail = trim(row, COL_OUTCOME_OWNER_EMAIL);

            // Upsert RallyCry
            RallyCry rc = rcByTitle.computeIfAbsent(rcTitle, title -> {
                RallyCry newRc = new RallyCry(org, title, rcDescription.isEmpty() ? null : rcDescription, rcByTitle.size());
                return rallyCryRepository.save(newRc);
            });
            // Update description if provided and RC already existed
            if (!rcDescription.isEmpty() && (rc.getDescription() == null || !rc.getDescription().equals(rcDescription))) {
                rc.setDescription(rcDescription);
                rallyCryRepository.save(rc);
            }

            if (doTitle.isEmpty()) {
                importedRows++;
                continue;
            }

            // Upsert DefiningObjective
            String doKey = rcTitle + "||" + doTitle;
            AppUser finalOwner = owner;
            RallyCry finalRc = rc;
            String finalDoDescription = doDescription;
            DefiningObjective doObj = doByKey.computeIfAbsent(doKey, key -> {
                DefiningObjective newDo = new DefiningObjective(org, finalRc, doTitle,
                        finalDoDescription.isEmpty() ? null : finalDoDescription, finalOwner, doByKey.size());
                return definingObjectiveRepository.save(newDo);
            });
            // Update owner and description if changed
            boolean doUpdated = false;
            if (owner != null && !owner.equals(doObj.getOwner())) {
                doObj.setOwner(owner);
                doUpdated = true;
            }
            if (!doDescription.isEmpty() && (doObj.getDescription() == null || !doObj.getDescription().equals(doDescription))) {
                doObj.setDescription(doDescription);
                doUpdated = true;
            }
            if (doUpdated) {
                definingObjectiveRepository.save(doObj);
            }

            if (outcomeTitle.isEmpty()) {
                importedRows++;
                continue;
            }

            // Resolve outcome owner (separate from DO owner) — only needed when outcome is present
            AppUser outcomeOwner = null;
            if (!outcomeOwnerEmail.isEmpty()) {
                outcomeOwner = userRepository.findByOrgIdAndEmail(orgId, outcomeOwnerEmail).orElse(null);
                if (outcomeOwner == null) {
                    errors.add(new ImportError(rowNum, "outcome_owner_email", "User not found: " + outcomeOwnerEmail));
                    importedRows++; // RC and DO were still created/updated
                    continue;
                }
            }

            // Upsert Outcome — deduplicate by (doId + outcomeTitle)
            AppUser effectiveOutcomeOwner = outcomeOwner != null ? outcomeOwner : owner;
            List<Outcome> existingOutcomes = outcomeRepository
                    .findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(doObj.getId());
            Outcome existingOutcome = existingOutcomes.stream()
                    .filter(o -> o.getTitle().equals(outcomeTitle))
                    .findFirst().orElse(null);

            if (existingOutcome == null) {
                Outcome newOutcome = new Outcome(org, doObj, outcomeTitle,
                        outcomeDescription.isEmpty() ? null : outcomeDescription,
                        effectiveOutcomeOwner, existingOutcomes.size());
                outcomeRepository.save(newOutcome);
            } else {
                // Update description and owner if changed
                boolean outcomeUpdated = false;
                if (!outcomeDescription.isEmpty() && (existingOutcome.getDescription() == null || !existingOutcome.getDescription().equals(outcomeDescription))) {
                    existingOutcome.setDescription(outcomeDescription);
                    outcomeUpdated = true;
                }
                if (effectiveOutcomeOwner != null && !effectiveOutcomeOwner.equals(existingOutcome.getOwner())) {
                    existingOutcome.setOwner(effectiveOutcomeOwner);
                    outcomeUpdated = true;
                }
                if (outcomeUpdated) {
                    outcomeRepository.save(existingOutcome);
                }
            }

            importedRows++;
        }

        int totalRows = rows.size();
        int errorRows = errors.size();
        int skippedRows = Math.max(0, totalRows - importedRows - errorRows);

        auditService.log(orgId, "RallyCry", null, "CSV_IMPORT", actor,
                Map.of("importedRows", importedRows, "errorRows", errorRows, "totalRows", totalRows));

        return new ImportResult(totalRows, importedRows, skippedRows, errorRows, errors);
    }

    private List<String[]> parseRows(MultipartFile file, List<ImportError> errors) {
        List<String[]> rows = new ArrayList<>();
        try (CSVReader reader = new CSVReaderBuilder(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().build())
                .build()) {

            String[] header = reader.readNext();
            if (header == null) return rows;

            String[] row;
            while ((row = reader.readNext()) != null) {
                rows.add(row);
            }
        } catch (Exception e) {
            log.error("Failed to parse CSV", e);
            errors.add(new ImportError(0, "file", "Failed to parse CSV: " + e.getMessage()));
        }
        return rows;
    }

    private String trim(String[] row, int index) {
        if (index >= row.length) return "";
        String val = row[index];
        return val == null ? "" : val.trim();
    }
}
