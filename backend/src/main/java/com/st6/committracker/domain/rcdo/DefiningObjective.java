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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "defining_objectives")
public class DefiningObjective {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rally_cry_id", nullable = false)
    private RallyCry rallyCry;

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

    @OneToMany(mappedBy = "definingObjective", fetch = FetchType.LAZY)
    private List<Outcome> outcomes = new ArrayList<>();

    protected DefiningObjective() {}

    public DefiningObjective(Org org, RallyCry rallyCry, String title, String description, AppUser owner, int sortOrder) {
        this.org = org;
        this.rallyCry = rallyCry;
        this.title = title;
        this.description = description;
        this.owner = owner;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public RallyCry getRallyCry() { return rallyCry; }
    public void setRallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; }

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

    public List<Outcome> getOutcomes() { return outcomes; }

    public boolean isArchived() { return archivedAt != null; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DefiningObjective)) return false;
        DefiningObjective that = (DefiningObjective) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "DefiningObjective{id=" + id + ", title='" + title + "', sortOrder=" + sortOrder + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private RallyCry rallyCry;
        private String title;
        private String description;
        private AppUser owner;
        private int sortOrder = 0;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder rallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder owner(AppUser owner) { this.owner = owner; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }

        public DefiningObjective build() {
            return new DefiningObjective(org, rallyCry, title, description, owner, sortOrder);
        }
    }
}
