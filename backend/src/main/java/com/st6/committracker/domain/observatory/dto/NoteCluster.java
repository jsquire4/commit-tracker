package com.st6.committracker.domain.observatory.dto;

import java.util.List;

public record NoteCluster(
        String theme,
        List<String> representativeNotes,
        int count,
        List<String> affectedTeams,
        List<String> affectedUsers
) {}
