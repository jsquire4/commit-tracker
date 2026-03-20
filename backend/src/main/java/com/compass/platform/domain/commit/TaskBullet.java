package com.compass.platform.domain.commit;

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
@Table(name = "task_bullets")
public class TaskBullet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commitment_id")
    private Commitment commitment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id")
    private Org org;

    @Column(nullable = false)
    private String body;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_completed", nullable = false)
    private boolean isCompleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TaskBullet() {}

    public TaskBullet(Commitment commitment, Org org, String body, int sortOrder) {
        this.commitment = commitment;
        this.org = org;
        this.body = body;
        this.sortOrder = sortOrder;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Commitment getCommitment() { return commitment; }
    public void setCommitment(Commitment commitment) { this.commitment = commitment; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public boolean isCompleted() { return isCompleted; }
    public void setCompleted(boolean completed) { isCompleted = completed; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TaskBullet)) return false;
        TaskBullet that = (TaskBullet) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "TaskBullet{id=" + id + ", body='" + body + "', sortOrder=" + sortOrder + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Commitment commitment;
        private Org org;
        private String body;
        private int sortOrder;
        private boolean isCompleted = false;

        public Builder commitment(Commitment commitment) { this.commitment = commitment; return this; }
        public Builder org(Org org) { this.org = org; return this; }
        public Builder body(String body) { this.body = body; return this; }
        public Builder sortOrder(int sortOrder) { this.sortOrder = sortOrder; return this; }
        public Builder isCompleted(boolean isCompleted) { this.isCompleted = isCompleted; return this; }

        public TaskBullet build() {
            TaskBullet tb = new TaskBullet(commitment, org, body, sortOrder);
            tb.isCompleted = isCompleted;
            return tb;
        }
    }
}
