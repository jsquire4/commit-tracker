package com.st6.committracker.audit;

import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "audit_entries")
public class AuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id")
    private Org org;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(nullable = false)
    private String action;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id")
    private AppUser actor;

    @Column(name = "actor_role", nullable = false)
    private String actorRole;

    @Column(columnDefinition = "jsonb")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditEntry() {}

    private AuditEntry(Builder builder) {
        this.id = builder.id;
        this.org = builder.org;
        this.entityType = builder.entityType;
        this.entityId = builder.entityId;
        this.action = builder.action;
        this.actor = builder.actor;
        this.actorRole = builder.actorRole;
        this.details = builder.details;
        this.createdAt = builder.createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public AppUser getActor() { return actor; }
    public void setActor(AppUser actor) { this.actor = actor; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuditEntry)) return false;
        AuditEntry that = (AuditEntry) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "AuditEntry{id=" + id + ", entityType='" + entityType + "', action='" + action + "'}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private Org org;
        private String entityType;
        private UUID entityId;
        private String action;
        private AppUser actor;
        private String actorRole;
        private String details;
        private Instant createdAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder org(Org org) { this.org = org; return this; }
        public Builder entityType(String entityType) { this.entityType = entityType; return this; }
        public Builder entityId(UUID entityId) { this.entityId = entityId; return this; }
        public Builder action(String action) { this.action = action; return this; }
        public Builder actor(AppUser actor) { this.actor = actor; return this; }
        public Builder actorRole(String actorRole) { this.actorRole = actorRole; return this; }
        public Builder details(String details) { this.details = details; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public AuditEntry build() {
            return new AuditEntry(this);
        }
    }
}
