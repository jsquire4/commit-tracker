package com.compass.platform.domain.observatory.dto;

import java.util.List;

public record NoteCluster(
        String theme,
        List<String> representativeNotes,
        int count,
        List<String> affectedTeams,
        List<String> affectedUsers
) {}
