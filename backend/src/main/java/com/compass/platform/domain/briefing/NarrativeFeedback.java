package com.compass.platform.domain.briefing;

import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "narrative_feedback",
        uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "user_id", "scope", "cycle_id"}))
public class NarrativeFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    /** Narrative scope: BRIEFING, TEAM_SUMMARY, PROGRAM_SUMMARY, WEEK_NARRATIVE */
    @Column(nullable = false, length = 50)
    private String scope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;

    /** "up" or "down" */
    @Column(nullable = false, length = 10)
    private String vote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected NarrativeFeedback() {}

    public NarrativeFeedback(Org org, AppUser user, String scope, Cycle cycle, String vote) {
        this.org = org;
        this.user = user;
        this.scope = scope;
        this.cycle = cycle;
        this.vote = vote;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public Org getOrg() { return org; }
    public AppUser getUser() { return user; }
    public String getScope() { return scope; }
    public Cycle getCycle() { return cycle; }
    public String getVote() { return vote; }
    public void setVote(String vote) { this.vote = vote; this.createdAt = Instant.now(); }
    public Instant getCreatedAt() { return createdAt; }
}
