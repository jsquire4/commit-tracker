package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
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
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = {"org_id", "email"}))
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false)
    private Org org;

    @Column(name = "external_id")
    private String externalId;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reports_to")
    private AppUser reportsTo;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "commit_module_enabled")
    private Boolean commitModuleEnabled; // null = inherit from org

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "reportsTo", fetch = FetchType.LAZY)
    private List<AppUser> directReports = new ArrayList<>();

    protected AppUser() {}

    public AppUser(Org org, String email, String displayName, UserRole role, AppUser reportsTo) {
        this.org = org;
        this.email = email;
        this.displayName = displayName;
        this.role = role;
        this.reportsTo = reportsTo;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Org getOrg() { return org; }
    public void setOrg(Org org) { this.org = org; }

    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public AppUser getReportsTo() { return reportsTo; }
    public void setReportsTo(AppUser reportsTo) { this.reportsTo = reportsTo; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Boolean getCommitModuleEnabled() { return commitModuleEnabled; }
    public void setCommitModuleEnabled(Boolean commitModuleEnabled) { this.commitModuleEnabled = commitModuleEnabled; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<AppUser> getDirectReports() { return directReports; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AppUser)) return false;
        AppUser appUser = (AppUser) o;
        return Objects.equals(id, appUser.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "AppUser{id=" + id + ", email='" + email + "', displayName='" + displayName + "', role=" + role + "}";
    }
}
