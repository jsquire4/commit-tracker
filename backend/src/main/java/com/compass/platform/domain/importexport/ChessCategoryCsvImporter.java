package com.compass.platform.domain.importexport;

import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.ChessCategoryRepository;
import com.compass.platform.domain.importexport.ImportResult.ImportError;
import com.compass.platform.domain.user.AppUser;
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
 * Import chess categories from CSV.
 * Format: name, description, color_hex
 * Upserts by (org_id, name). Idempotent.
 * Validates: file size <= 1MB, row count <= 100.
 */
@Service
public class ChessCategoryCsvImporter {

    private static final Logger log = LoggerFactory.getLogger(ChessCategoryCsvImporter.class);

    private static final long MAX_FILE_SIZE = 1L * 1024 * 1024; // 1MB
    private static final int MAX_ROWS = 100;

    // Column indices
    private static final int COL_NAME = 0;
    private static final int COL_DESCRIPTION = 1;
    private static final int COL_COLOR_HEX = 2;

    private final ChessCategoryRepository chessCategoryRepository;
    private final AuditService auditService;
    private final OrgRepository orgRepository;

    public ChessCategoryCsvImporter(ChessCategoryRepository chessCategoryRepository,
                                    AuditService auditService,
                                    OrgRepository orgRepository) {
        this.chessCategoryRepository = chessCategoryRepository;
        this.auditService = auditService;
        this.orgRepository = orgRepository;
    }

    @Transactional
    public ImportResult importChessCategories(MultipartFile file, UUID orgId, AppUser actor) {
        List<ImportError> errors = new ArrayList<>();

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 1MB limit");
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

        int importedRows = 0;
        int rowNum = 1;

        // Track sort order based on existing categories
        List<ChessCategory> existing = chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(orgId);
        int nextSortOrder = existing.size();

        for (String[] row : rows) {
            rowNum++;

            if (row.length < 1) {
                errors.add(new ImportError(rowNum, "row", "Too few columns"));
                continue;
            }

            String name = trim(row, COL_NAME);
            String description = trim(row, COL_DESCRIPTION);
            String colorHex = trim(row, COL_COLOR_HEX);

            if (name.isEmpty()) {
                errors.add(new ImportError(rowNum, "name", "Category name is required"));
                continue;
            }

            final int sortOrderForLambda = nextSortOrder;
            ChessCategory category = chessCategoryRepository.findByOrgIdAndName(orgId, name)
                    .orElseGet(() -> new ChessCategory(org, name, null, null, sortOrderForLambda, true));

            if (!description.isEmpty()) {
                category.setDescription(description);
            }
            if (!colorHex.isEmpty()) {
                category.setColorHex(colorHex);
            }
            category.setActive(true);

            chessCategoryRepository.save(category);
            importedRows++;
            nextSortOrder++;
        }

        int totalRows = rows.size();
        int errorRows = errors.size();
        int skippedRows = totalRows - importedRows - errorRows;

        auditService.log(orgId, "ChessCategory", null, "CSV_IMPORT", actor,
                Map.of("importedRows", importedRows, "errorRows", errorRows, "totalRows", totalRows));

        return new ImportResult(totalRows, importedRows, skippedRows < 0 ? 0 : skippedRows, errorRows, errors);
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
