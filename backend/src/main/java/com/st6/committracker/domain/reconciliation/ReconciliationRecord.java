package com.st6.committracker.domain.reconciliation;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
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

    @Column(name = "reconciled_at", nullable = false)
    private Instant reconciledAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciled_by")
    private AppUser reconciledBy;

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

    public Instant getReconciledAt() { return reconciledAt; }
    public void setReconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; }

    public AppUser getReconciledBy() { return reconciledBy; }
    public void setReconciledBy(AppUser reconciledBy) { this.reconciledBy = reconciledBy; }

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
        private Instant reconciledAt;
        private AppUser reconciledBy;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder commitment(Commitment commitment) { this.commitment = commitment; return this; }
        public Builder cycle(Cycle cycle) { this.cycle = cycle; return this; }
        public Builder status(ReconciliationStatus status) { this.status = status; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder plannedHorizon(CompletionHorizon plannedHorizon) { this.plannedHorizon = plannedHorizon; return this; }
        public Builder reconciledAt(Instant reconciledAt) { this.reconciledAt = reconciledAt; return this; }
        public Builder reconciledBy(AppUser reconciledBy) { this.reconciledBy = reconciledBy; return this; }

        public ReconciliationRecord build() {
            ReconciliationRecord r = new ReconciliationRecord(org, commitment, cycle, status, reconciledAt, reconciledBy);
            r.notes = notes;
            r.plannedHorizon = plannedHorizon;
            return r;
        }
    }
}
