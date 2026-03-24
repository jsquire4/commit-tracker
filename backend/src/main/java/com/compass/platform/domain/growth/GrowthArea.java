package com.compass.platform.domain.growth;

import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
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
@Table(name = "growth_areas")
public class GrowthArea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(length = 500)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GrowthArea() {}

    public GrowthArea(AppUser user, Org org, String label) {
        this.user = user;
        this.org = org;
        this.label = label;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GrowthArea)) return false;
        GrowthArea that = (GrowthArea) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "GrowthArea{id=" + id + ", label='" + label + "', isActive=" + isActive + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private AppUser user;
        private Org org;
        private String label;
        private String description;
        private boolean isActive = true;
        private int sortOrder = 0;

        public Builder user(AppUser user) { this.user = user; return this; }
        public Builder org(Org org) { this.org = org; return this; }
        public Builder label(String label) { this.label = label; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder isActive(boolean isActive) { this.isActive = isActive; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }

        public GrowthArea build() {
            GrowthArea g = new GrowthArea(user, org, label);
            g.description = description;
            g.isActive = isActive;
            g.sortOrder = sortOrder;
            return g;
        }
    }
}
