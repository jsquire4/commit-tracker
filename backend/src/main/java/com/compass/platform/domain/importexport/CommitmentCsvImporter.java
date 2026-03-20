package com.compass.platform.domain.importexport;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.ChessCategoryRepository;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.commit.TaskBullet;
import com.compass.platform.domain.commit.TaskBulletRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Import commitments from CSV. SYNCHRONOUS.
 * Format: user_email, title, bullets (pipe-separated), completion_horizon,
 *         chess_category, rally_cry, defining_objective, outcome, assigned_by_email
 * Validates: user exists, cycle exists, RCDO exists, category exists.
 * Validates: file size <= 10MB, row count <= 50,000.
 */
@Service
public class CommitmentCsvImporter {

    private static final Logger log = LoggerFactory.getLogger(CommitmentCsvImporter.class);

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024; // 10MB
    private static final int MAX_ROWS = 50_000;

    // Column indices
    private static final int COL_USER_EMAIL = 0;
    private static final int COL_TITLE = 1;
    private static final int COL_BULLETS = 2;
    private static final int COL_COMPLETION_HORIZON = 3;
    private static final int COL_CHESS_CATEGORY = 4;
    private static final int COL_RALLY_CRY = 5;
    private static final int COL_DEFINING_OBJECTIVE = 6;
    private static final int COL_OUTCOME = 7;
    private static final int COL_ASSIGNED_BY_EMAIL = 8;

    private final CommitmentRepository commitmentRepository;
    private final AppUserRepository userRepository;
    private final CycleRepository cycleRepository;
    private final RallyCryRepository rallyCryRepository;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;
    private final ChessCategoryRepository chessCategoryRepository;
    private final AuditService auditService;
    private final OrgRepository orgRepository;
    private final TaskBulletRepository taskBulletRepository;

    public CommitmentCsvImporter(CommitmentRepository commitmentRepository,
                                  AppUserRepository userRepository,
                                  CycleRepository cycleRepository,
                                  RallyCryRepository rallyCryRepository,
                                  DefiningObjectiveRepository definingObjectiveRepository,
                                  OutcomeRepository outcomeRepository,
                                  ChessCategoryRepository chessCategoryRepository,
                                  AuditService auditService,
                                  OrgRepository orgRepository,
                                  TaskBulletRepository taskBulletRepository) {
        this.commitmentRepository = commitmentRepository;
        this.userRepository = userRepository;
        this.cycleRepository = cycleRepository;
        this.rallyCryRepository = rallyCryRepository;
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
        this.chessCategoryRepository = chessCategoryRepository;
        this.auditService = auditService;
        this.orgRepository = orgRepository;
        this.taskBulletRepository = taskBulletRepository;
    }

    @Transactional
    public ImportResult importCommitments(MultipartFile file, UUID orgId, AppUser actor) {
        List<ImportError> errors = new ArrayList<>();

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
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

        // Resolve active cycle
        Cycle activeCycle = cycleRepository.findByOrgIdAndIsActiveTrue(orgId)
                .orElseThrow(() -> new IllegalArgumentException("No active cycle found for org: " + orgId));

        int importedRows = 0;
        int rowNum = 1;

        for (String[] row : rows) {
            rowNum++;

            if (row.length < 4) {
                errors.add(new ImportError(rowNum, "row", "Too few columns; need at least: user_email, title, bullets, completion_horizon"));
                continue;
            }

            String userEmail = trim(row, COL_USER_EMAIL);
            String title = trim(row, COL_TITLE);
            String bulletsRaw = trim(row, COL_BULLETS);
            String horizonStr = trim(row, COL_COMPLETION_HORIZON);
            String categoryName = trim(row, COL_CHESS_CATEGORY);
            String assignedByEmail = trim(row, COL_ASSIGNED_BY_EMAIL);

            // Validate user
            if (userEmail.isEmpty()) {
                errors.add(new ImportError(rowNum, "user_email", "user_email is required"));
                continue;
            }
            AppUser user = userRepository.findByOrgIdAndEmail(orgId, userEmail).orElse(null);
            if (user == null) {
                errors.add(new ImportError(rowNum, "user_email", "User not found: " + userEmail));
                continue;
            }

            // Validate title
            if (title.isEmpty()) {
                errors.add(new ImportError(rowNum, "title", "title is required"));
                continue;
            }

            // Validate completion_horizon
            CompletionHorizon horizon;
            try {
                horizon = CompletionHorizon.valueOf(horizonStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add(new ImportError(rowNum, "completion_horizon", "Invalid completion_horizon: " + horizonStr));
                continue;
            }

            // Resolve chess category (optional)
            ChessCategory chessCategory = null;
            if (!categoryName.isEmpty()) {
                chessCategory = chessCategoryRepository.findByOrgIdAndName(orgId, categoryName).orElse(null);
                if (chessCategory == null) {
                    errors.add(new ImportError(rowNum, "chess_category", "Chess category not found: " + categoryName));
                    continue;
                }
            }

            // Resolve RCDO (optional, hierarchical)
            RcdoRefs rcdo = resolveRcdoReferences(row, orgId, rowNum, errors);
            if (rcdo == null) {
                continue; // error already added
            }
            RallyCry rallyCry = rcdo.rallyCry();
            DefiningObjective definingObjective = rcdo.definingObjective();
            Outcome outcome = rcdo.outcome();

            // Resolve assigned_by (optional)
            AppUser assignedBy = null;
            if (!assignedByEmail.isEmpty()) {
                assignedBy = userRepository.findByOrgIdAndEmail(orgId, assignedByEmail).orElse(null);
                if (assignedBy == null) {
                    errors.add(new ImportError(rowNum, "assigned_by_email", "Assigned-by user not found: " + assignedByEmail));
                    continue;
                }
            }

            // Build and save commitment
            Commitment commitment = Commitment.builder()
                    .org(org)
                    .user(user)
                    .cycle(activeCycle)
                    .title(title)
                    .completionHorizon(horizon)
                    .chessCategory(chessCategory)
                    .rallyCry(rallyCry)
                    .definingObjective(definingObjective)
                    .outcome(outcome)
                    .assignedBy(assignedBy)
                    .build();

            commitment = commitmentRepository.save(commitment);

            // Create task bullets from pipe-separated bullets
            if (!bulletsRaw.isEmpty()) {
                String[] bulletParts = bulletsRaw.split("\\|");
                for (int i = 0; i < bulletParts.length; i++) {
                    String bulletBody = bulletParts[i].trim();
                    if (!bulletBody.isEmpty()) {
                        TaskBullet bullet = new TaskBullet(commitment, org, bulletBody, i);
                        taskBulletRepository.save(bullet);
                    }
                }
            }

            importedRows++;
        }

        int totalRows = rows.size();
        int errorRows = errors.size();
        int skippedRows = totalRows - importedRows - errorRows;

        auditService.log(orgId, "Commitment", null, "CSV_IMPORT", actor,
                Map.of("importedRows", importedRows, "errorRows", errorRows, "totalRows", totalRows));

        return new ImportResult(totalRows, importedRows, skippedRows < 0 ? 0 : skippedRows, errorRows, errors);
    }

    /**
     * Holds resolved RCDO references for a single CSV row.
     * Any field may be null if not provided or not applicable.
     */
    private record RcdoRefs(RallyCry rallyCry, DefiningObjective definingObjective, Outcome outcome) {}

    /**
     * Resolves the rally_cry, defining_objective, and outcome columns for one CSV row.
     * Returns a {@link RcdoRefs} with the resolved entities (null if not supplied),
     * or {@code null} if a validation error was found (error is added to {@code errors}).
     */
    private RcdoRefs resolveRcdoReferences(String[] row, UUID orgId, int rowNum, List<ImportError> errors) {
        String rcTitle = trim(row, COL_RALLY_CRY);
        String doTitle = trim(row, COL_DEFINING_OBJECTIVE);
        String outcomeTitle = trim(row, COL_OUTCOME);

        if (rcTitle.isEmpty()) {
            return new RcdoRefs(null, null, null);
        }

        List<RallyCry> rcs = rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);
        RallyCry rallyCry = rcs.stream().filter(rc -> rc.getTitle().equals(rcTitle)).findFirst().orElse(null);
        if (rallyCry == null) {
            errors.add(new ImportError(rowNum, "rally_cry", "RallyCry not found: " + rcTitle));
            return null;
        }

        if (doTitle.isEmpty()) {
            return new RcdoRefs(rallyCry, null, null);
        }

        List<DefiningObjective> dos = definingObjectiveRepository
                .findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(rallyCry.getId());
        DefiningObjective definingObjective = dos.stream()
                .filter(d -> d.getTitle().equals(doTitle)).findFirst().orElse(null);
        if (definingObjective == null) {
            errors.add(new ImportError(rowNum, "defining_objective", "DefiningObjective not found: " + doTitle));
            return null;
        }

        if (outcomeTitle.isEmpty()) {
            return new RcdoRefs(rallyCry, definingObjective, null);
        }

        List<Outcome> outcomes = outcomeRepository
                .findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(definingObjective.getId());
        Outcome outcome = outcomes.stream()
                .filter(o -> o.getTitle().equals(outcomeTitle)).findFirst().orElse(null);
        if (outcome == null) {
            errors.add(new ImportError(rowNum, "outcome", "Outcome not found: " + outcomeTitle));
            return null;
        }

        return new RcdoRefs(rallyCry, definingObjective, outcome);
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
