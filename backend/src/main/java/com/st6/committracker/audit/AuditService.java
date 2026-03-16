package com.st6.committracker.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEntryRepository auditEntryRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEntryRepository auditEntryRepository, ObjectMapper objectMapper) {
        this.auditEntryRepository = auditEntryRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Append-only write. Never updates or deletes.
     * Logs at INFO level with structured fields.
     */
    public AuditEntry log(AuditEntry entry) {
        AuditEntry saved = auditEntryRepository.save(entry);
        log.info("audit action={} entityType={} entityId={} actorId={} actorRole={}",
                saved.getAction(),
                saved.getEntityType(),
                saved.getEntityId(),
                saved.getActor() != null ? saved.getActor().getId() : null,
                saved.getActorRole());
        return saved;
    }

    /**
     * Convenience builder method.
     */
    public AuditEntry log(UUID orgId, String entityType, UUID entityId,
                          String action, AppUser actor, Map<String, Object> details) {
        String detailsJson = null;
        if (details != null) {
            try {
                detailsJson = objectMapper.writeValueAsString(details);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize audit details to JSON for action={} entityType={} entityId={}",
                        action, entityType, entityId, e);
                detailsJson = "{}";
            }
        }

        Org org = Org.builder().id(orgId).build();

        AuditEntry entry = AuditEntry.builder()
                .org(org)
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .actor(actor)
                .actorRole(actor != null && actor.getRole() != null ? actor.getRole().name() : null)
                .details(detailsJson)
                .build();

        return log(entry);
    }
}
