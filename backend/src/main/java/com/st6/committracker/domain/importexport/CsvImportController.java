package com.st6.committracker.domain.importexport;

import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.security.SecurityContextHelper;
import com.st6.committracker.shared.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/import")
public class CsvImportController {

    private final UserCsvImporter userCsvImporter;
    private final RcdoCsvImporter rcdoCsvImporter;
    private final ChessCategoryCsvImporter chessCategoryCsvImporter;
    private final CommitmentCsvImporter commitmentCsvImporter;

    public CsvImportController(UserCsvImporter userCsvImporter,
                               RcdoCsvImporter rcdoCsvImporter,
                               ChessCategoryCsvImporter chessCategoryCsvImporter,
                               CommitmentCsvImporter commitmentCsvImporter) {
        this.userCsvImporter = userCsvImporter;
        this.rcdoCsvImporter = rcdoCsvImporter;
        this.chessCategoryCsvImporter = chessCategoryCsvImporter;
        this.commitmentCsvImporter = commitmentCsvImporter;
    }

    /**
     * Validates that the uploaded file has an acceptable CSV MIME type.
     * Rejects other types with 415 Unsupported Media Type.
     */
    private void validateCsvContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null
                && !contentType.equals("text/csv")
                && !contentType.equals("application/octet-stream")
                && !contentType.equals("application/vnd.ms-excel")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "File must be CSV (text/csv). Received: " + contentType);
        }
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<ImportResult>> importUsers(
            @RequestParam("file") MultipartFile file) {
        validateCsvContentType(file);
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ImportResult result = userCsvImporter.importUsers(file, actor.getOrg().getId(), actor);
        return ResponseEntity.ok(ApiResponse.of(result));
    }

    @PostMapping("/rcdo")
    public ResponseEntity<ApiResponse<ImportResult>> importRcdo(
            @RequestParam("file") MultipartFile file) {
        validateCsvContentType(file);
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ImportResult result = rcdoCsvImporter.importRcdo(file, actor.getOrg().getId(), actor);
        return ResponseEntity.ok(ApiResponse.of(result));
    }

    @PostMapping("/chess-categories")
    public ResponseEntity<ApiResponse<ImportResult>> importChessCategories(
            @RequestParam("file") MultipartFile file) {
        validateCsvContentType(file);
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ImportResult result = chessCategoryCsvImporter.importChessCategories(file, actor.getOrg().getId(), actor);
        return ResponseEntity.ok(ApiResponse.of(result));
    }

    @PostMapping("/commitments")
    public ResponseEntity<ApiResponse<ImportResult>> importCommitments(
            @RequestParam("file") MultipartFile file) {
        validateCsvContentType(file);
        AppUser actor = SecurityContextHelper.getCurrentUser();
        ImportResult result = commitmentCsvImporter.importCommitments(file, actor.getOrg().getId(), actor);
        return ResponseEntity.ok(ApiResponse.of(result));
    }
}
