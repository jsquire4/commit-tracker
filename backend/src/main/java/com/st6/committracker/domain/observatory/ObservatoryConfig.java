package com.st6.committracker.domain.observatory;

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
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "observatory_config", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id"}))
public class ObservatoryConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(name = "drift_emerging_weeks", nullable = false)
    private int driftEmergingWeeks = 3;

    @Column(name = "drift_sustained_weeks", nullable = false)
    private int driftSustainedWeeks = 6;

    @Column(name = "drift_structural_weeks", nullable = false)
    private int driftStructuralWeeks = 12;

    @Column(name = "strategic_alignment_target", nullable = false)
    private BigDecimal strategicAlignmentTarget = new BigDecimal("60.0");

    @Column(name = "misalignment_warning_pct", nullable = false)
    private BigDecimal misalignmentWarningPct = new BigDecimal("40.0");

    @Column(name = "dark_work_warning_pct", nullable = false)
    private BigDecimal darkWorkWarningPct = new BigDecimal("60.0");

    @Column(name = "concentration_risk_pct", nullable = false)
    private BigDecimal concentrationRiskPct = new BigDecimal("50.0");

    @Column(name = "uniformity_threshold", nullable = false)
    private BigDecimal uniformityThreshold = new BigDecimal("90.0");

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ObservatoryConfig() {}

    public ObservatoryConfig(Org org) {
        this.org = org;
    }

    public ObservatoryConfig(Org org, int driftEmergingWeeks, int driftSustainedWeeks, int driftStructuralWeeks,
                             BigDecimal strategicAlignmentTarget, BigDecimal misalignmentWarningPct,
                             BigDecimal darkWorkWarningPct, BigDecimal concentrationRiskPct,
                             BigDecimal uniformityThreshold) {
        this.org = org;
        this.driftEmergingWeeks = driftEmergingWeeks;
        this.driftSustainedWeeks = driftSustainedWeeks;
        this.driftStructuralWeeks = driftStructuralWeeks;
        this.strategicAlignmentTarget = strategicAlignmentTarget;
        this.misalignmentWarningPct = misalignmentWarningPct;
        this.darkWorkWarningPct = darkWorkWarningPct;
        this.concentrationRiskPct = concentrationRiskPct;
        this.uniformityThreshold = uniformityThreshold;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public int getDriftEmergingWeeks() { return driftEmergingWeeks; }
    public void setDriftEmergingWeeks(int driftEmergingWeeks) { this.driftEmergingWeeks = driftEmergingWeeks; }

    public int getDriftSustainedWeeks() { return driftSustainedWeeks; }
    public void setDriftSustainedWeeks(int driftSustainedWeeks) { this.driftSustainedWeeks = driftSustainedWeeks; }

    public int getDriftStructuralWeeks() { return driftStructuralWeeks; }
    public void setDriftStructuralWeeks(int driftStructuralWeeks) { this.driftStructuralWeeks = driftStructuralWeeks; }

    public BigDecimal getStrategicAlignmentTarget() { return strategicAlignmentTarget; }
    public void setStrategicAlignmentTarget(BigDecimal strategicAlignmentTarget) { this.strategicAlignmentTarget = strategicAlignmentTarget; }

    public BigDecimal getMisalignmentWarningPct() { return misalignmentWarningPct; }
    public void setMisalignmentWarningPct(BigDecimal misalignmentWarningPct) { this.misalignmentWarningPct = misalignmentWarningPct; }

    public BigDecimal getDarkWorkWarningPct() { return darkWorkWarningPct; }
    public void setDarkWorkWarningPct(BigDecimal darkWorkWarningPct) { this.darkWorkWarningPct = darkWorkWarningPct; }

    public BigDecimal getConcentrationRiskPct() { return concentrationRiskPct; }
    public void setConcentrationRiskPct(BigDecimal concentrationRiskPct) { this.concentrationRiskPct = concentrationRiskPct; }

    public BigDecimal getUniformityThreshold() { return uniformityThreshold; }
    public void setUniformityThreshold(BigDecimal uniformityThreshold) { this.uniformityThreshold = uniformityThreshold; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ObservatoryConfig)) return false;
        ObservatoryConfig that = (ObservatoryConfig) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "ObservatoryConfig{id=" + id + ", org=" + (org != null ? org.getId() : null) + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private int driftEmergingWeeks = 3;
        private int driftSustainedWeeks = 6;
        private int driftStructuralWeeks = 12;
        private BigDecimal strategicAlignmentTarget = new BigDecimal("60.0");
        private BigDecimal misalignmentWarningPct = new BigDecimal("40.0");
        private BigDecimal darkWorkWarningPct = new BigDecimal("60.0");
        private BigDecimal concentrationRiskPct = new BigDecimal("50.0");
        private BigDecimal uniformityThreshold = new BigDecimal("90.0");

        public Builder org(Org org) { this.org = org; return this; }
        public Builder driftEmergingWeeks(int driftEmergingWeeks) { this.driftEmergingWeeks = driftEmergingWeeks; return this; }
        public Builder driftSustainedWeeks(int driftSustainedWeeks) { this.driftSustainedWeeks = driftSustainedWeeks; return this; }
        public Builder driftStructuralWeeks(int driftStructuralWeeks) { this.driftStructuralWeeks = driftStructuralWeeks; return this; }
        public Builder strategicAlignmentTarget(BigDecimal strategicAlignmentTarget) { this.strategicAlignmentTarget = strategicAlignmentTarget; return this; }
        public Builder misalignmentWarningPct(BigDecimal misalignmentWarningPct) { this.misalignmentWarningPct = misalignmentWarningPct; return this; }
        public Builder darkWorkWarningPct(BigDecimal darkWorkWarningPct) { this.darkWorkWarningPct = darkWorkWarningPct; return this; }
        public Builder concentrationRiskPct(BigDecimal concentrationRiskPct) { this.concentrationRiskPct = concentrationRiskPct; return this; }
        public Builder uniformityThreshold(BigDecimal uniformityThreshold) { this.uniformityThreshold = uniformityThreshold; return this; }

        public ObservatoryConfig build() {
            return new ObservatoryConfig(org, driftEmergingWeeks, driftSustainedWeeks, driftStructuralWeeks,
                    strategicAlignmentTarget, misalignmentWarningPct, darkWorkWarningPct,
                    concentrationRiskPct, uniformityThreshold);
        }
    }
}
