package com.st6.committracker.domain.observatory.dto;

import java.util.List;

public record IntegrityReport(
        List<IntegrityFlag> flags
) {}
