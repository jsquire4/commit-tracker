package com.st6.committracker.domain.rcdo;

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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "outcomes")
public class Outcome {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "defining_objective_id", nullable = false)
    private DefiningObjective definingObjective;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Outcome() {}

    public Outcome(Org org, DefiningObjective definingObjective, String title, String description, AppUser owner, int sortOrder) {
        this.org = org;
        this.definingObjective = definingObjective;
        this.title = title;
        this.description = description;
        this.owner = owner;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public DefiningObjective getDefiningObjective() { return definingObjective; }
    public void setDefiningObjective(DefiningObjective definingObjective) { this.definingObjective = definingObjective; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public AppUser getOwner() { return owner; }
    public void setOwner(AppUser owner) { this.owner = owner; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public boolean isArchived() { return archivedAt != null; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Outcome)) return false;
        Outcome that = (Outcome) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Outcome{id=" + id + ", title='" + title + "', sortOrder=" + sortOrder + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private DefiningObjective definingObjective;
        private String title;
        private String description;
        private AppUser owner;
        private int sortOrder = 0;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder definingObjective(DefiningObjective definingObjective) { this.definingObjective = definingObjective; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder owner(AppUser owner) { this.owner = owner; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }

        public Outcome build() {
            return new Outcome(org, definingObjective, title, description, owner, sortOrder);
        }
    }
}
