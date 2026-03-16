package com.st6.committracker.domain.importexport;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.importexport.ImportResult.ImportError;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.OrgRepository;
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
import java.util.regex.Pattern;

/**
 * Import users from CSV.
 * Format: email, display_name, role, reports_to_email, external_id
 * Two-pass: Pass 1 creates/updates users (upsert by org_id + email).
 * Pass 2 resolves reports_to references.
 * Idempotent. Validates: email format, valid role enum, reports_to email exists.
 * Validates: file size <= 5MB, row count <= 10,000.
 */
@Service
public class UserCsvImporter {

    private static final Logger log = LoggerFactory.getLogger(UserCsvImporter.class);

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final int MAX_ROWS = 10_000;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    // Column indices
    private static final int COL_EMAIL = 0;
    private static final int COL_DISPLAY_NAME = 1;
    private static final int COL_ROLE = 2;
    private static final int COL_REPORTS_TO_EMAIL = 3;
    private static final int COL_EXTERNAL_ID = 4;

    private final AppUserRepository userRepository;
    private final OrgRepository orgRepository;
    private final AuditService auditService;

    public UserCsvImporter(AppUserRepository userRepository,
                           OrgRepository orgRepository,
                           AuditService auditService) {
        this.userRepository = userRepository;
        this.orgRepository = orgRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ImportResult importUsers(MultipartFile file, UUID orgId, AppUser actor) {
        List<ImportError> errors = new ArrayList<>();

        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }

        // Parse all rows first
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

        // Pass 1: create or update users (without resolving reports_to)
        int rowNum = 1; // 1-based, header was row 1
        // Track emails processed in this import for deduplication
        Map<String, AppUser> importedByEmail = new LinkedHashMap<>();

        for (String[] row : rows) {
            rowNum++;

            if (row.length < 3) {
                errors.add(new ImportError(rowNum, "row", "Too few columns, expected at least: email, display_name, role"));
                continue;
            }

            String email = trim(row, COL_EMAIL);
            String displayName = trim(row, COL_DISPLAY_NAME);
            String roleStr = trim(row, COL_ROLE);

            // Validate email
            if (email.isEmpty()) {
                errors.add(new ImportError(rowNum, "email", "Email is required"));
                continue;
            }
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                errors.add(new ImportError(rowNum, "email", "Invalid email format: " + email));
                continue;
            }

            // Validate display_name
            if (displayName.isEmpty()) {
                errors.add(new ImportError(rowNum, "display_name", "Display name is required"));
                continue;
            }

            // Validate role
            UserRole role;
            try {
                role = UserRole.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add(new ImportError(rowNum, "role", "Invalid role: " + roleStr));
                continue;
            }

            String externalId = trim(row, COL_EXTERNAL_ID);

            AppUser user = userRepository.findByOrgIdAndEmail(orgId, email)
                    .orElseGet(() -> new AppUser(org, email, displayName, role, null));

            user.setDisplayName(displayName);
            user.setRole(role);
            user.setOrg(org);
            if (!externalId.isEmpty()) {
                user.setExternalId(externalId);
            }

            user = userRepository.save(user);
            importedByEmail.put(email, user);
        }

        // Pass 2: resolve reports_to references
        rowNum = 1;
        int reportsToErrors = 0;
        for (String[] row : rows) {
            rowNum++;

            if (row.length < 3) continue;

            String email = trim(row, COL_EMAIL);
            String reportsToEmail = trim(row, COL_REPORTS_TO_EMAIL);

            if (reportsToEmail.isEmpty()) continue;
            if (!importedByEmail.containsKey(email)) continue; // already had an error, skip

            AppUser user = importedByEmail.get(email);
            if (user == null) {
                user = userRepository.findByOrgIdAndEmail(orgId, email).orElse(null);
            }
            if (user == null) continue;

            // Try to find manager in this import batch or existing users
            AppUser manager = importedByEmail.get(reportsToEmail);
            if (manager == null) {
                manager = userRepository.findByOrgIdAndEmail(orgId, reportsToEmail).orElse(null);
            }

            if (manager == null) {
                errors.add(new ImportError(rowNum, "reports_to_email",
                        "reports_to_email not found: " + reportsToEmail));
                reportsToErrors++;
                continue;
            }

            user.setReportsTo(manager);
            userRepository.save(user);
        }

        int totalRows = rows.size();
        int errorRows = errors.size();
        int importedRows = importedByEmail.size() - reportsToErrors;
        int skippedRows = totalRows - importedByEmail.size();

        auditService.log(orgId, "AppUser", null, "CSV_IMPORT", actor,
                Map.of("importedRows", importedRows, "errorRows", errorRows, "totalRows", totalRows));

        return new ImportResult(totalRows, importedRows, skippedRows, errorRows, errors);
    }

    private List<String[]> parseRows(MultipartFile file, List<ImportError> errors) {
        List<String[]> rows = new ArrayList<>();
        try (CSVReader reader = new CSVReaderBuilder(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))
                .withCSVParser(new CSVParserBuilder().build())
                .build()) {

            String[] header = reader.readNext(); // skip header
            if (header == null) {
                return rows; // empty file
            }

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
