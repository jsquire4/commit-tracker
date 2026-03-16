package com.st6.committracker.domain.cycle;

import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.commit.Commitment;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "cycles", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "starts_at"}))
public class Cycle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CycleState state = CycleState.DRAFT;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "cycle", fetch = FetchType.LAZY)
    private List<Commitment> commitments = new ArrayList<>();

    protected Cycle() {}

    public Cycle(Org org, String label, CycleState state, Instant startsAt, Instant endsAt, boolean isActive) {
        this.org = org;
        this.label = label;
        this.state = state;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.isActive = isActive;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public CycleState getState() { return state; }
    public void setState(CycleState state) { this.state = state; }

    public Instant getStartsAt() { return startsAt; }
    public void setStartsAt(Instant startsAt) { this.startsAt = startsAt; }

    public Instant getEndsAt() { return endsAt; }
    public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<Commitment> getCommitments() { return commitments; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Cycle)) return false;
        Cycle that = (Cycle) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Cycle{id=" + id + ", label='" + label + "', state=" + state + ", isActive=" + isActive + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private String label;
        private CycleState state = CycleState.DRAFT;
        private Instant startsAt;
        private Instant endsAt;
        private boolean isActive = false;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder label(String label) { this.label = label; return this; }
        public Builder state(CycleState state) { this.state = state; return this; }
        public Builder startsAt(Instant startsAt) { this.startsAt = startsAt; return this; }
        public Builder endsAt(Instant endsAt) { this.endsAt = endsAt; return this; }
        public Builder isActive(boolean isActive) { this.isActive = isActive; return this; }

        public Cycle build() {
            return new Cycle(org, label, state, startsAt, endsAt, isActive);
        }
    }
}
