package com.compass.platform.domain.briefing.dto;

import java.util.List;

public record ChatRequest(
        List<ChatMessage> messages
) {
    public record ChatMessage(
            String role,
            String content
    ) {}
}
