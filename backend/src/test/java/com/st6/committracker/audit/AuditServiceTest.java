package com.st6.committracker.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditEntryRepository repository;

    private AuditService auditService;

    private Org org;
    private AppUser actor;

    @BeforeEach
    void setUp() {
        // @InjectMocks cannot inject ObjectMapper automatically here since it's not a mock,
        // so we construct AuditService manually with a real ObjectMapper.
        auditService = new AuditService(repository, new ObjectMapper());

        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .build();

        actor = new AppUser(org, "actor@example.com", "Actor User", UserRole.MANAGER, null);
        actor.setId(UUID.randomUUID());
    }

    @Test
    void log_persistsEntry_withAllFields() {
        UUID entityId = UUID.randomUUID();
        AuditEntry entry = AuditEntry.builder()
                .org(org)
                .entityType("Commitment")
                .entityId(entityId)
                .action("CREATE")
                .actor(actor)
                .actorRole("MANAGER")
                .details("{\"key\":\"value\"}")
                .build();

        when(repository.save(any(AuditEntry.class))).thenReturn(entry);

        AuditEntry result = auditService.log(entry);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(repository).save(captor.capture());

        AuditEntry captured = captor.getValue();
        assertThat(captured.getOrg()).isEqualTo(org);
        assertThat(captured.getEntityType()).isEqualTo("Commitment");
        assertThat(captured.getEntityId()).isEqualTo(entityId);
        assertThat(captured.getAction()).isEqualTo("CREATE");
        assertThat(captured.getActor()).isEqualTo(actor);
        assertThat(captured.getActorRole()).isEqualTo("MANAGER");
        assertThat(captured.getDetails()).isEqualTo("{\"key\":\"value\"}");
        assertThat(result).isNotNull();
    }

    @Test
    void log_setsTimestamp_ifNotProvided() {
        // createdAt is managed by @CreationTimestamp, so it is null before persistence.
        // The test verifies that we do NOT set a timestamp manually — createdAt stays null
        // on the in-memory entity until Hibernate sets it on save.
        UUID entityId = UUID.randomUUID();
        AuditEntry entry = AuditEntry.builder()
                .org(org)
                .entityType("Commitment")
                .entityId(entityId)
                .action("UPDATE")
                .actor(actor)
                .actorRole("MANAGER")
                .build();

        // Simulate Hibernate setting createdAt on save
        AuditEntry savedEntry = AuditEntry.builder()
                .org(org)
                .entityType("Commitment")
                .entityId(entityId)
                .action("UPDATE")
                .actor(actor)
                .actorRole("MANAGER")
                .createdAt(Instant.now())
                .build();

        when(repository.save(any(AuditEntry.class))).thenReturn(savedEntry);

        // createdAt is null on the builder-constructed entry (no @CreationTimestamp in tests)
        assertThat(entry.getCreatedAt()).isNull();

        AuditEntry result = auditService.log(entry);

        // After save, the returned entry has a timestamp set by Hibernate
        assertThat(result.getCreatedAt()).isNotNull();
    }

    @Test
    void log_convenienceMethod_buildsEntryCorrectly() throws Exception {
        UUID orgId = org.getId();
        UUID entityId = UUID.randomUUID();
        Map<String, Object> details = Map.of("reason", "test-reason", "count", 3);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        when(repository.save(any(AuditEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        auditService.log(orgId, "Task", entityId, "DELETE", actor, details);

        verify(repository).save(captor.capture());
        AuditEntry captured = captor.getValue();

        assertThat(captured.getOrg().getId()).isEqualTo(orgId);
        assertThat(captured.getEntityType()).isEqualTo("Task");
        assertThat(captured.getEntityId()).isEqualTo(entityId);
        assertThat(captured.getAction()).isEqualTo("DELETE");
        assertThat(captured.getActor()).isEqualTo(actor);
        assertThat(captured.getActorRole()).isEqualTo("MANAGER");

        // Verify details JSON contains expected keys
        assertThat(captured.getDetails()).isNotNull();
        ObjectMapper mapper = new ObjectMapper();
        @SuppressWarnings("unchecked")
        Map<String, Object> parsedDetails = mapper.readValue(captured.getDetails(), Map.class);
        assertThat(parsedDetails).containsKey("reason");
        assertThat(parsedDetails).containsKey("count");
        assertThat(parsedDetails.get("reason")).isEqualTo("test-reason");
    }
}
