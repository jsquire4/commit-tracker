package com.compass.platform.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * LLM provider configuration with OpenAI primary and Anthropic fallback.
 *
 * <p>Reads {@code OPENAI_API_KEY} and {@code ANTHROPIC_API_KEY} from environment.
 * Uses OpenAI when available, falls back to Anthropic if OpenAI key is missing.
 */
@Configuration
@ConfigurationProperties(prefix = "compass.llm")
public class LlmConfig {

    private static final Logger log = LoggerFactory.getLogger(LlmConfig.class);

    private String openaiApiKey = "";
    private String anthropicApiKey = "";
    private String model = "gpt-4.1-nano";
    private String baseUrl = "https://api.openai.com/v1";
    private double temperature = 0.3;
    private int maxTokens = 1024;

    // ── Resolved at runtime ──

    /** Returns the active API key — OpenAI primary, Anthropic fallback. */
    public String getApiKey() {
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            return openaiApiKey;
        }
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) {
            return anthropicApiKey;
        }
        return "";
    }

    /** Returns the active base URL — switches to Anthropic endpoint when falling back. */
    public String getResolvedBaseUrl() {
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            return baseUrl;
        }
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) {
            return "https://api.anthropic.com/v1";
        }
        return baseUrl;
    }

    /** Returns the active model — keeps configured model for OpenAI, switches for Anthropic fallback. */
    public String getResolvedModel() {
        if (openaiApiKey != null && !openaiApiKey.isBlank()) {
            return model;
        }
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) {
            // Anthropic fallback — use a capable model
            return "claude-sonnet-4-20250514";
        }
        return model;
    }

    /** Which provider is active. */
    public String getActiveProvider() {
        if (openaiApiKey != null && !openaiApiKey.isBlank()) return "openai";
        if (anthropicApiKey != null && !anthropicApiKey.isBlank()) return "anthropic";
        return "none";
    }

    public boolean isConfigured() {
        return !getApiKey().isBlank();
    }

    // ── Setters for Spring binding ──

    public String getOpenaiApiKey() { return openaiApiKey; }
    public void setOpenaiApiKey(String openaiApiKey) { this.openaiApiKey = openaiApiKey; }

    public String getAnthropicApiKey() { return anthropicApiKey; }
    public void setAnthropicApiKey(String anthropicApiKey) { this.anthropicApiKey = anthropicApiKey; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public double getTemperature() { return temperature; }
    public void setTemperature(double temperature) { this.temperature = temperature; }

    public int getMaxTokens() { return maxTokens; }
    public void setMaxTokens(int maxTokens) { this.maxTokens = maxTokens; }
}
