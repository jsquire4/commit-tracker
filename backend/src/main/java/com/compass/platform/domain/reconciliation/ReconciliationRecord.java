package com.compass.platform.domain.reconciliation;

import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;
import com.compass.platform.domain.DisplacementCategory;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "reconciliation_records",
        uniqueConstraints = @UniqueConstraint(columnNames = {"commitment_id", "cycle_id"}))
public class ReconciliationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commitment_id", nullable = false)
    private Commitment commitment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private Cycle cycle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReconciliationStatus status;

    @Column
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "planned_horizon")
    private CompletionHorizon plannedHorizon;

    @Enumerated(EnumType.STRING)
    @Column(name = "planned_day")
    private CompletionDay plannedDay;

    @Enumerated(EnumType.STRING)
    @Column(name = "planned_time_block")
    private CompletionTimeBlock plannedTimeBlock;

    @Column(name = "reconciled_at", nullable = false)
    private Instant reconciledAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciled_by")
    private AppUser reconciledBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "displacement_category")
    private DisplacementCategory displacementCategory;

    @Column(name = "displacement_detail")
    private String displacementDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "displacing_commitment_id")
    private Commitment displacingCommitment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ReconciliationRecord() {}

    public ReconciliationRecord(Org org, Commitment commitment, Cycle cycle,
                                ReconciliationStatus status, Instant reconciledAt, AppUser reconciledBy) {
        this.org = org;
        this.commitment = commitment;
        this.cycle = cycle;
        this.status = status;
        this.reconciledAt = reconciledAt;
        this.reconciledBy = reconciledBy;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public Commitment getCommitment() { return commitment; }
    public void setCommitment(Commitment commitment) { this.commitment = commitment; }

    public Cycle getCycle() { return cycle; }
    public void setCycle(Cycle cycle) { this.cycle = cycle; }

    public ReconciliationStatus getStatus() { return status; }
    public void setStatus(ReconciliationStatus status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public CompletionHorizon getPlannedHorizon() { return plannedHorizon; }
    public void setPlannedHorizon(CompletionHorizon plannedHorizon) { this.plannedHorizon = plannedHorizon; }

    public CompletionDay getPlannedDay() { return plannedDay; }
    public void setPlannedDay(CompletionDay plannedDay) { this.plannedDay = plannedDay; }

    public CompletionTimeBlock getPlannedTimeBlock() { return plannedTimeBlock; }
    public void setPlannedTimeBlock(CompletionTimeBlock plannedTimeBlock) { this.plannedTimeBlock = plannedTimeBlock; }

    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }

    public AppUser getReconciledBy() { return reconciledBy; }
    public void setReconciledBy(AppUser reconciledBy) { this.reconciledBy = reconciledBy; }

    public DisplacementCategory getDisplacementCategory() { return displacementCategory; }
    public void setDisplacementCategory(DisplacementCategory displacementCategory) { this.displacementCategory = displacementCategory; }

    public String getDisplacementDetail() { return displacementDetail; }
    public void setDisplacementDetail(String displacementDetail) { this.displacementDetail = displacementDetail; }

    public Commitment getDisplacingCommitment() { return displacingCommitment; }
    public void setDisplacingCommitment(Commitment displacingCommitment) { this.displacingCommitment = displacingCommitment; }

    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ReconciliationRecord)) return false;
        ReconciliationRecord that = (ReconciliationRecord) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "ReconciliationRecord{id=" + id + ", status=" + status + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private Commitment commitment;
        private Cycle cycle;
        private ReconciliationStatus status;
        private String notes;
        private CompletionHorizon plannedHorizon;
        private CompletionDay plannedDay;
        private CompletionTimeBlock plannedTimeBlock;
        private Instant reconciledAt;
        private AppUser reconciledBy;
        private DisplacementCategory displacementCategory;
        private String displacementDetail;
        private Commitment displacingCommitment;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder commitment(Commitment commitment) { this.commitment = commitment; return this; }
        public Builder cycle(Cycle cycle) { this.cycle = cycle; return this; }
        public Builder status(ReconciliationStatus status) { this.status = status; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder plannedHorizon(CompletionHorizon plannedHorizon) { this.plannedHorizon = plannedHorizon; return this; }
        public Builder plannedDay(CompletionDay plannedDay) { this.plannedDay = plannedDay; return this; }
        public Builder plannedTimeBlock(CompletionTimeBlock plannedTimeBlock) { this.plannedTimeBlock = plannedTimeBlock; return this; }
        public Builder reconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; return this; }
        public Builder reconciledBy(AppUser reconciledBy) { this.reconciledBy = reconciledBy; return this; }
        public Builder displacementCategory(DisplacementCategory displacementCategory) { this.displacementCategory = displacementCategory; return this; }
        public Builder displacementDetail(String displacementDetail) { this.displacementDetail = displacementDetail; return this; }
        public Builder displacingCommitment(Commitment displacingCommitment) { this.displacingCommitment = displacingCommitment; return this; }

        public ReconciliationRecord build() {
            ReconciliationRecord r = new ReconciliationRecord(org, commitment, cycle, status, reconciledAt, reconciledBy);
            r.notes = notes;
            r.plannedHorizon = plannedHorizon;
            r.plannedDay = plannedDay;
            r.plannedTimeBlock = plannedTimeBlock;
            r.displacementCategory = displacementCategory;
            r.displacementDetail = displacementDetail;
            r.displacingCommitment = displacingCommitment;
            return r;
        }
    }
}
