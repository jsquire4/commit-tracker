package com.compass.platform.domain.user;

import com.compass.platform.domain.observatory.Portfolio;
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
@Table(name = "orgs")
public class Org {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String timezone = "UTC";

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id")
    private Portfolio portfolio;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Org() {}

    public Org(UUID id, String name, String slug, String timezone, boolean isActive) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.timezone = timezone;
        this.isActive = isActive;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Portfolio getPortfolio() { return portfolio; }
    public void setPortfolio(Portfolio portfolio) { this.portfolio = portfolio; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Org)) return false;
        Org org = (Org) o;
        return Objects.equals(id, org.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Org{id=" + id + ", name='" + name + "', slug='" + slug + "'}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private String name;
        private String slug;
        private String timezone = "UTC";
        private boolean isActive = true;
        private Portfolio portfolio;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder slug(String slug) { this.slug = slug; return this; }
        public Builder timezone(String timezone) { this.timezone = timezone; return this; }
        public Builder isActive(boolean isActive) { this.isActive = isActive; return this; }
        public Builder portfolio(Portfolio portfolio) { this.portfolio = portfolio; return this; }

        public Org build() {
            Org org = new Org(id, name, slug, timezone, isActive);
            org.setPortfolio(portfolio);
            return org;
        }
    }
}
