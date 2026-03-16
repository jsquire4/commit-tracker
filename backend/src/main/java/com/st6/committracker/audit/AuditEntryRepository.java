package com.st6.committracker.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditEntryRepository extends JpaRepository<AuditEntry, UUID> {
    List<AuditEntry> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    List<AuditEntry> findByEntityTypeAndEntityIdOrderByCreatedAtAsc(String entityType, UUID entityId);
    List<AuditEntry> findByActorIdOrderByCreatedAtDesc(UUID actorId);
}
