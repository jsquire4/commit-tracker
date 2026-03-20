package com.compass.platform.domain.commit;

import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "commitments")
public class Commitment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id")
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rally_cry_id")
    private RallyCry rallyCry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "defining_objective_id")
    private DefiningObjective definingObjective;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "outcome_id")
    private Outcome outcome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chess_category_id")
    private ChessCategory chessCategory;

    @Column(name = "priority_rank", nullable = false)
    private int priorityRank = 0;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "completion_horizon", nullable = false)
    private CompletionHorizon completionHorizon;

    @Enumerated(EnumType.STRING)
    @Column(name = "completion_day")
    private CompletionDay completionDay;

    @Enumerated(EnumType.STRING)
    @Column(name = "completion_time_block")
    private CompletionTimeBlock completionTimeBlock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private AppUser assignedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carried_from_id")
    private Commitment carriedFrom;

    @Column(name = "is_unplanned", nullable = false)
    private boolean isUnplanned = false;

    @Column(name = "estimated_hours")
    private BigDecimal estimatedHours;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "commitment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<TaskBullet> taskBullets = new ArrayList<>();

    protected Commitment() {}

    public Commitment(Org org, AppUser user, Cycle cycle, String title, CompletionHorizon completionHorizon) {
        this.org = org;
        this.user = user;
        this.cycle = cycle;
        this.title = title;
        this.completionHorizon = completionHorizon;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public Cycle getCycle() { return cycle; }
    public void setCycle(Cycle cycle) { this.cycle = cycle; }

    public RallyCry getRallyCry() { return rallyCry; }
    public void setRallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; }

    public DefiningObjective getDefiningObjective() { return definingObjective; }
    public void setDefiningObjective(DefiningObjective definingObjective) { this.definingObjective = definingObjective; }

    public Outcome getOutcome() { return outcome; }
    public void setOutcome(Outcome outcome) { this.outcome = outcome; }

    public ChessCategory getChessCategory() { return chessCategory; }
    public void setChessCategory(ChessCategory chessCategory) { this.chessCategory = chessCategory; }

    public int getPriorityRank() { return priorityRank; }
    public void setPriorityRank(int priorityRank) { this.priorityRank = priorityRank; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public CompletionHorizon getCompletionHorizon() { return completionHorizon; }
    public void setCompletionHorizon(CompletionHorizon completionHorizon) { this.completionHorizon = completionHorizon; }

    public CompletionDay getCompletionDay() { return completionDay; }
    public void setCompletionDay(CompletionDay completionDay) { this.completionDay = completionDay; }

    public CompletionTimeBlock getCompletionTimeBlock() { return completionTimeBlock; }
    public void setCompletionTimeBlock(CompletionTimeBlock completionTimeBlock) { this.completionTimeBlock = completionTimeBlock; }

    public AppUser getAssignedBy() { return assignedBy; }
    public void setAssignedBy(AppUser assignedBy) { this.assignedBy = assignedBy; }

    public Commitment getCarriedFrom() { return carriedFrom; }
    public void setCarriedFrom(Commitment carriedFrom) { this.carriedFrom = carriedFrom; }

    public boolean isUnplanned() { return isUnplanned; }
    public void setUnplanned(boolean unplanned) { isUnplanned = unplanned; }

    public BigDecimal getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(BigDecimal estimatedHours) { this.estimatedHours = estimatedHours; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<TaskBullet> getTaskBullets() { return taskBullets; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Commitment)) return false;
        Commitment that = (Commitment) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Commitment{id=" + id + ", title='" + title + "', priorityRank=" + priorityRank + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private AppUser user;
        private Cycle cycle;
        private RallyCry rallyCry;
        private DefiningObjective definingObjective;
        private Outcome outcome;
        private ChessCategory chessCategory;
        private int priorityRank = 0;
        private String title;
        private String description;
        private CompletionHorizon completionHorizon;
        private CompletionDay completionDay;
        private CompletionTimeBlock completionTimeBlock;
        private AppUser assignedBy;
        private Commitment carriedFrom;
        private boolean isUnplanned = false;
        private BigDecimal estimatedHours;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder user(AppUser user) { this.user = user; return this; }
        public Builder cycle(Cycle cycle) { this.cycle = cycle; return this; }
        public Builder rallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; return this; }
        public Builder definingObjective(DefiningObjective definingObjective) { this.definingObjective = definingObjective; return this; }
        public Builder outcome(Outcome outcome) { this.outcome = outcome; return this; }
        public Builder chessCategory(ChessCategory chessCategory) { this.chessCategory = chessCategory; return this; }
        public Builder priorityRank(int priorityRank) { this.priorityRank = priorityRank; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder completionHorizon(CompletionHorizon completionHorizon) { this.completionHorizon = completionHorizon; return this; }
        public Builder completionDay(CompletionDay completionDay) { this.completionDay = completionDay; return this; }
        public Builder completionTimeBlock(CompletionTimeBlock completionTimeBlock) { this.completionTimeBlock = completionTimeBlock; return this; }
        public Builder assignedBy(AppUser assignedBy) { this.assignedBy = assignedBy; return this; }
        public Builder carriedFrom(Commitment carriedFrom) { this.carriedFrom = carriedFrom; return this; }
        public Builder isUnplanned(boolean isUnplanned) { this.isUnplanned = isUnplanned; return this; }
        public Builder estimatedHours(BigDecimal estimatedHours) { this.estimatedHours = estimatedHours; return this; }

        public Commitment build() {
            Commitment c = new Commitment(org, user, cycle, title, completionHorizon);
            c.rallyCry = rallyCry;
            c.definingObjective = definingObjective;
            c.outcome = outcome;
            c.chessCategory = chessCategory;
            c.priorityRank = priorityRank;
            c.description = description;
            c.completionDay = completionDay;
            c.completionTimeBlock = completionTimeBlock;
            c.assignedBy = assignedBy;
            c.carriedFrom = carriedFrom;
            c.isUnplanned = isUnplanned;
            c.estimatedHours = estimatedHours;
            return c;
        }
    }
}
