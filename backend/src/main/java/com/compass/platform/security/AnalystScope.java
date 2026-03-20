package com.compass.platform.security;

import com.compass.platform.domain.rcdo.RallyCry;
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

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Defines the data scope visible to an analyst user.
 * DB-level constraint {@code at_least_one_scope} ensures that at least one of
 * {@code rallyCry} or {@code orgUnitRoot} is non-null.
 */
@Entity
@Table(name = "analyst_scopes")
public class AnalystScope {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analyst_user_id", nullable = false)
    private AppUser analyst;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rally_cry_id")
    private RallyCry rallyCry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_unit_root_user_id")
    private AppUser orgUnitRoot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AnalystScope() {}

    public AnalystScope(Org org, AppUser analyst) {
        this.org = org;
        this.analyst = analyst;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public AppUser getAnalyst() { return analyst; }
    public void setAnalyst(AppUser analyst) { this.analyst = analyst; }

    public RallyCry getRallyCry() { return rallyCry; }
    public void setRallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; }

    public AppUser getOrgUnitRoot() { return orgUnitRoot; }
    public void setOrgUnitRoot(AppUser orgUnitRoot) { this.orgUnitRoot = orgUnitRoot; }

    public Instant getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnalystScope)) return false;
        AnalystScope that = (AnalystScope) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "AnalystScope{id=" + id + "}";
    }

    // --------------- static builder ---------------

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Org org;
        private AppUser analyst;
        private RallyCry rallyCry;
        private AppUser orgUnitRoot;

        public Builder org(Org org) { this.org = org; return this; }
        public Builder analyst(AppUser analyst) { this.analyst = analyst; return this; }
        public Builder rallyCry(RallyCry rallyCry) { this.rallyCry = rallyCry; return this; }
        public Builder orgUnitRoot(AppUser orgUnitRoot) { this.orgUnitRoot = orgUnitRoot; return this; }

        public AnalystScope build() {
            AnalystScope s = new AnalystScope(org, analyst);
            s.rallyCry = rallyCry;
            s.orgUnitRoot = orgUnitRoot;
            return s;
        }
    }
}
