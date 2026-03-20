package com.compass.platform.domain.rcdo;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.rcdo.dto.RcdoTreeResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RcdoServiceTest {

    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AuditService auditService;
    @Mock private AppUserRepository appUserRepository;
    @InjectMocks private RcdoService rcdoService;

    // ---- Rally Cry tests ----

    @Test
    void createRallyCry_persistsAndAudits() {
        UUID orgId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry saved = buildRallyCry(orgId, "Crush Q2");

        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(saved);

        RallyCry result = rcdoService.createRallyCry(orgId, "Crush Q2", "Description", actor);

        assertThat(result.getTitle()).isEqualTo("Crush Q2");
        verify(rallyCryRepository).save(any(RallyCry.class));
        verify(auditService).log(eq(orgId), eq("RallyCry"), any(), eq("RCDO_CREATED"), eq(actor), any());
    }

    @Test
    void createRallyCry_blankTitle_throws() {
        UUID orgId = UUID.randomUUID();
        AppUser actor = buildActor();

        assertThatThrownBy(() -> rcdoService.createRallyCry(orgId, "  ", null, actor))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blank");
    }

    @Test
    void updateRallyCry_existingAndNotArchived_updates() {
        UUID id = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry existing = buildRallyCry(orgId, "Old Title");
        RallyCry updated = buildRallyCry(orgId, "New Title");

        when(rallyCryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(updated);

        RallyCry result = rcdoService.updateRallyCry(id, "New Title", "Updated desc", actor);

        assertThat(result.getTitle()).isEqualTo("New Title");
        verify(rallyCryRepository).save(existing);
        verify(auditService).log(eq(orgId), eq("RallyCry"), eq(id), eq("RCDO_UPDATED"), eq(actor), any());
    }

    @Test
    void updateRallyCry_archived_throwsConflict() {
        UUID id = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry archived = buildArchivedRallyCry(UUID.randomUUID(), "Archived");

        when(rallyCryRepository.findById(id)).thenReturn(Optional.of(archived));

        assertThatThrownBy(() -> rcdoService.updateRallyCry(id, "New Title", null, actor))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("archived");
    }

    @Test
    void archiveRallyCry_setsArchivedAt_andWarnsIfReferenced() {
        UUID id = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry existing = buildRallyCry(orgId, "Q2 Rally");

        when(rallyCryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(existing);
        when(commitmentRepository.countByRallyCryId(id)).thenReturn(3L);

        int warnings = rcdoService.archiveRallyCry(id, actor);

        assertThat(warnings).isEqualTo(3);
        assertThat(existing.getArchivedAt()).isNotNull();
        verify(auditService).log(eq(orgId), eq("RallyCry"), eq(id), eq("RCDO_ARCHIVED"), eq(actor), any());
    }

    @Test
    void archiveRallyCry_noReferences_returnsZeroWarnings() {
        UUID id = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry existing = buildRallyCry(orgId, "Q2 Rally");

        when(rallyCryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(existing);
        when(commitmentRepository.countByRallyCryId(id)).thenReturn(0L);

        int warnings = rcdoService.archiveRallyCry(id, actor);

        assertThat(warnings).isEqualTo(0);
    }

    // ---- Defining Objective tests ----

    @Test
    void createDefiningObjective_validRallyCry_persists() {
        UUID orgId = UUID.randomUUID();
        UUID rallyCryId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry rallyCry = buildRallyCry(orgId, "RC1");
        DefiningObjective saved = buildDefiningObjective(orgId, rallyCry, "DO1");

        when(rallyCryRepository.findById(rallyCryId)).thenReturn(Optional.of(rallyCry));
        when(definingObjectiveRepository.save(any(DefiningObjective.class))).thenReturn(saved);

        DefiningObjective result = rcdoService.createDefiningObjective(
                orgId, rallyCryId, "DO1", "desc", null, actor);

        assertThat(result.getTitle()).isEqualTo("DO1");
        verify(definingObjectiveRepository).save(any(DefiningObjective.class));
        verify(auditService).log(eq(orgId), eq("DefiningObjective"), any(), eq("RCDO_CREATED"), eq(actor), any());
    }

    @Test
    void createDefiningObjective_archivedRallyCry_throwsConflict() {
        UUID orgId = UUID.randomUUID();
        UUID rallyCryId = UUID.randomUUID();
        AppUser actor = buildActor();
        RallyCry archivedRC = buildArchivedRallyCry(orgId, "Archived RC");

        when(rallyCryRepository.findById(rallyCryId)).thenReturn(Optional.of(archivedRC));

        assertThatThrownBy(() ->
                rcdoService.createDefiningObjective(orgId, rallyCryId, "DO1", null, null, actor))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("archived");
    }

    // ---- Outcome tests ----

    @Test
    void createOutcome_validDefiningObjective_persists() {
        UUID orgId = UUID.randomUUID();
        UUID doId = UUID.randomUUID();
        AppUser actor = buildActor();
        Org org = buildOrg(orgId);
        RallyCry rallyCry = buildRallyCry(orgId, "RC1");
        DefiningObjective definingObjective = buildDefiningObjective(orgId, rallyCry, "DO1");
        Outcome saved = buildOutcome(orgId, definingObjective, "Outcome1");

        when(definingObjectiveRepository.findById(doId)).thenReturn(Optional.of(definingObjective));
        when(outcomeRepository.save(any(Outcome.class))).thenReturn(saved);

        Outcome result = rcdoService.createOutcome(orgId, doId, "Outcome1", "desc", null, actor);

        assertThat(result.getTitle()).isEqualTo("Outcome1");
        verify(outcomeRepository).save(any(Outcome.class));
        verify(auditService).log(eq(orgId), eq("Outcome"), any(), eq("RCDO_CREATED"), eq(actor), any());
    }

    // ---- Tree tests ----

    @Test
    void getTree_returnsNestedHierarchy_excludingArchived() {
        UUID orgId = UUID.randomUUID();
        RallyCry rc = buildRallyCry(orgId, "RC1");
        rc.setId(UUID.randomUUID());
        DefiningObjective doObj = buildDefiningObjective(orgId, rc, "DO1");
        doObj.setId(UUID.randomUUID());
        Outcome outcome = buildOutcome(orgId, doObj, "O1");
        outcome.setId(UUID.randomUUID());

        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of(rc));
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of(doObj));
        when(outcomeRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of(outcome));

        RcdoTreeResponse tree = rcdoService.getTree(orgId);

        assertThat(tree.rallyCries()).hasSize(1);
        assertThat(tree.rallyCries().get(0).title()).isEqualTo("RC1");
        assertThat(tree.rallyCries().get(0).definingObjectives()).hasSize(1);
        assertThat(tree.rallyCries().get(0).definingObjectives().get(0).title()).isEqualTo("DO1");
        assertThat(tree.rallyCries().get(0).definingObjectives().get(0).outcomes()).hasSize(1);
        assertThat(tree.rallyCries().get(0).definingObjectives().get(0).outcomes().get(0).title()).isEqualTo("O1");
    }

    @Test
    void getTree_emptyOrg_returnsEmptyList() {
        UUID orgId = UUID.randomUUID();

        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(outcomeRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());

        RcdoTreeResponse tree = rcdoService.getTree(orgId);

        assertThat(tree.rallyCries()).isEmpty();
    }

    // ---- Helpers ----

    private AppUser buildActor() {
        Org org = buildOrg(UUID.randomUUID());
        AppUser actor = new AppUser(org, "actor@example.com", "Actor User",
                com.compass.platform.domain.UserRole.MANAGER, null);
        actor.setId(UUID.randomUUID());
        return actor;
    }

    private Org buildOrg(UUID orgId) {
        return Org.builder()
                .id(orgId)
                .name("Test Org")
                .slug("test-org")
                .build();
    }

    private RallyCry buildRallyCry(UUID orgId, String title) {
        Org org = buildOrg(orgId);
        RallyCry rc = new RallyCry(org, title, null, 0);
        rc.setId(UUID.randomUUID());
        return rc;
    }

    private RallyCry buildArchivedRallyCry(UUID orgId, String title) {
        RallyCry rc = buildRallyCry(orgId, title);
        rc.setArchivedAt(Instant.now());
        return rc;
    }

    private DefiningObjective buildDefiningObjective(UUID orgId, RallyCry rallyCry, String title) {
        Org org = buildOrg(orgId);
        DefiningObjective doObj = new DefiningObjective(org, rallyCry, title, null, null, 0);
        doObj.setId(UUID.randomUUID());
        return doObj;
    }

    private Outcome buildOutcome(UUID orgId, DefiningObjective definingObjective, String title) {
        Org org = buildOrg(orgId);
        Outcome outcome = new Outcome(org, definingObjective, title, null, null, 0);
        outcome.setId(UUID.randomUUID());
        return outcome;
    }
}
