package com.st6.committracker.domain.importexport;

import java.util.List;

public record ImportResult(
    int totalRows,
    int importedRows,
    int skippedRows,
    int errorRows,
    List<ImportError> errors
) {

    public record ImportError(int row, String field, String message) {}
}
