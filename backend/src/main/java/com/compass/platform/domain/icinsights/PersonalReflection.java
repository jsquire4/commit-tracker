package com.compass.platform.domain.icinsights;

import com.compass.platform.domain.cycle.Cycle;
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
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "personal_reflections",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "cycle_id"})
)
public class PersonalReflection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private Cycle cycle;

    /** CLOSER | SAME | FURTHER */
    @Column(name = "alignment_signal", nullable = false, length = 10)
    private String alignmentSignal;

    @Column(name = "learning_note", columnDefinition = "TEXT")
    private String learningNote;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PersonalReflection() {}

    public PersonalReflection(AppUser user, Org org, Cycle cycle,
                              String alignmentSignal, String learningNote) {
        this.user = user;
        this.org = org;
        this.cycle = cycle;
        this.alignmentSignal = alignmentSignal;
        this.learningNote = learningNote;
    }

    // ── Getters / Setters ────────────────────────────────────────────────

    public UUID getId() { return id; }

    public AppUser getUser() { return user; }

    public Org getOrg() { return org; }

    public Cycle getCycle() { return cycle; }

    public String getAlignmentSignal() { return alignmentSignal; }
    public void setAlignmentSignal(String alignmentSignal) {
        this.alignmentSignal = alignmentSignal;
    }

    public String getLearningNote() { return learningNote; }
    public void setLearningNote(String learningNote) {
        this.learningNote = learningNote;
    }

    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PersonalReflection)) return false;
        PersonalReflection that = (PersonalReflection) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() { return Objects.hash(id); }

    @Override
    public String toString() {
        return "PersonalReflection{id=" + id + ", signal=" + alignmentSignal + "}";
    }
}
