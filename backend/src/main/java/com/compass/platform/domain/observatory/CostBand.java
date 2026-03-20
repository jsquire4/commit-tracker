package com.compass.platform.domain.observatory;

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
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "cost_bands", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "name"}))
public class CostBand {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int tier;

    @Column(name = "annual_cost")
    private BigDecimal annualCost;

    @Column(name = "hourly_rate")
    private BigDecimal hourlyRate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CostBand() {}

    public CostBand(Org org, String name, int tier, BigDecimal annualCost, BigDecimal hourlyRate) {
        this.org = org;
        this.name = name;
        this.tier = tier;
        this.annualCost = annualCost;
        this.hourlyRate = hourlyRate;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getTier() { return tier; }
    public void setTier(int tier) { this.tier = tier; }

    public BigDecimal getAnnualCost() { return annualCost; }
    public void setAnnualCost(BigDecimal annualCost) { this.annualCost = annualCost; }

    public BigDecimal getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CostBand)) return false;
        CostBand that = (CostBand) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "CostBand{id=" + id + ", name='" + name + "', tier=" + tier + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private String name;
        private int tier;
        private BigDecimal annualCost;
        private BigDecimal hourlyRate;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder tier(int tier) { this.tier = tier; return this; }
        public Builder annualCost(BigDecimal annualCost) { this.annualCost = annualCost; return this; }
        public Builder hourlyRate(BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; return this; }

        public CostBand build() {
            return new CostBand(org, name, tier, annualCost, hourlyRate);
        }
    }
}
