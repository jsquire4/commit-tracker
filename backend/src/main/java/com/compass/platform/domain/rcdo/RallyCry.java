package com.compass.platform.domain.rcdo;

import com.compass.platform.domain.user.Org;
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
@Table(name = "rally_cries")
public class RallyCry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

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

    @OneToMany(mappedBy = "rallyCry", fetch = FetchType.LAZY)
    private List<DefiningObjective> definingObjectives = new ArrayList<>();

    protected RallyCry() {}

    public RallyCry(Org org, String title, String description, int sortOrder) {
        this.org = org;
        this.title = title;
        this.description = description;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<DefiningObjective> getDefiningObjectives() { return definingObjectives; }

    public boolean isArchived() { return archivedAt != null; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RallyCry)) return false;
        RallyCry that = (RallyCry) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "RallyCry{id=" + id + ", title='" + title + "', sortOrder=" + sortOrder + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private String title;
        private String description;
        private int sortOrder = 0;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }

        public RallyCry build() {
            return new RallyCry(org, title, description, sortOrder);
        }
    }
}
