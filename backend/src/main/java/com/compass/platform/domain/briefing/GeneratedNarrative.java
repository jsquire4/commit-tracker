package com.compass.platform.domain.briefing;

import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "generated_narratives")
public class GeneratedNarrative {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;

    @Column(name = "narrative_type", nullable = false, length = 50)
    private String narrativeType;

    @Column(name = "scope_key", nullable = false)
    private String scopeKey = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "JSONB")
    private String suggestions;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "prompt_hash", nullable = false, length = 64)
    private String promptHash;

    @Column(nullable = false, columnDefinition = "JSONB")
    private String verification;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    protected GeneratedNarrative() {}

    public GeneratedNarrative(Org org, Cycle cycle, String narrativeType, String scopeKey,
                              String content, String suggestions, String model,
                              String promptHash, String verification) {
        this.org = org;
        this.cycle = cycle;
        this.narrativeType = narrativeType;
        this.scopeKey = scopeKey != null ? scopeKey : "";
        this.content = content;
        this.suggestions = suggestions;
        this.model = model;
        this.promptHash = promptHash;
        this.verification = verification;
        this.generatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Org getOrg() { return org; }
    public Cycle getCycle() { return cycle; }
    public String getNarrativeType() { return narrativeType; }
    public String getScopeKey() { return scopeKey; }
    public String getContent() { return content; }
    public String getSuggestions() { return suggestions; }
    public String getModel() { return model; }
    public String getPromptHash() { return promptHash; }
    public String getVerification() { return verification; }
    public Instant getGeneratedAt() { return generatedAt; }

    public void updateContent(String content, String suggestions, String verification, String promptHash) {
        this.content = content;
        this.suggestions = suggestions;
        this.verification = verification;
        this.promptHash = promptHash;
        this.generatedAt = Instant.now();
    }
}
