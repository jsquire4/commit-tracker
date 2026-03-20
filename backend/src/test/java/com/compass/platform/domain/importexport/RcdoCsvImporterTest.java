package com.compass.platform.domain.importexport;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RcdoCsvImporterTest {

    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private OrgRepository orgRepository;
    @InjectMocks private RcdoCsvImporter importer;

    private final UUID orgId = UUID.randomUUID();
    private final Org org = new Org(orgId, "Test Org", "test-org", "UTC", true);

    @Test
    void importRcdo_validCsv_buildsHierarchy() {
        String csv = "rally_cry,defining_objective,outcome,owner_email\n" +
                     "Dominate Market,Grow Revenue,Increase Enterprise Sales,\n";

        MockMultipartFile file = new MockMultipartFile("file", "rcdo.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(rallyCryRepository.findByOrgIdOrderBySortOrderAsc(orgId)).thenReturn(Collections.emptyList());
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(orgId)).thenReturn(Collections.emptyList());
        when(outcomeRepository.findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(any()))
                .thenReturn(Collections.emptyList());

        RallyCry savedRc = RallyCry.builder().org(org).title("Dominate Market").sortOrder(0).build();
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(savedRc);

        DefiningObjective savedDo = DefiningObjective.builder()
                .org(org).rallyCry(savedRc).title("Grow Revenue").sortOrder(0).build();
        when(definingObjectiveRepository.save(any(DefiningObjective.class))).thenReturn(savedDo);
        when(outcomeRepository.save(any(Outcome.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importRcdo(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();
        verify(rallyCryRepository, atLeastOnce()).save(any(RallyCry.class));
        verify(definingObjectiveRepository, atLeastOnce()).save(any(DefiningObjective.class));
        verify(outcomeRepository, atLeastOnce()).save(any(Outcome.class));
    }

    @Test
    void importRcdo_deduplicatesByTitle() {
        String csv = "rally_cry,defining_objective,outcome,owner_email\n" +
                     "Win Together,Build Platform,\n" +
                     "Win Together,Build Platform,\n";

        MockMultipartFile file = new MockMultipartFile("file", "rcdo.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(rallyCryRepository.findByOrgIdOrderBySortOrderAsc(orgId)).thenReturn(Collections.emptyList());
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(orgId)).thenReturn(Collections.emptyList());

        RallyCry savedRc = RallyCry.builder().org(org).title("Win Together").sortOrder(0).build();
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(savedRc);

        DefiningObjective savedDo = DefiningObjective.builder()
                .org(org).rallyCry(savedRc).title("Build Platform").sortOrder(0).build();
        when(definingObjectiveRepository.save(any(DefiningObjective.class))).thenReturn(savedDo);

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importRcdo(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
        // RallyCry should be saved once (deduplicated), DO should be saved once
        verify(rallyCryRepository, times(1)).save(any(RallyCry.class));
        verify(definingObjectiveRepository, times(1)).save(any(DefiningObjective.class));
    }

    @Test
    void importRcdo_resolvesOwnerEmail() {
        String csv = "rally_cry,defining_objective,outcome,owner_email\n" +
                     "Scale Up,Launch Product,,owner@example.com\n";

        MockMultipartFile file = new MockMultipartFile("file", "rcdo.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        AppUser owner = new AppUser(org, "owner@example.com", "Owner", UserRole.DIRECTOR, null);

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(rallyCryRepository.findByOrgIdOrderBySortOrderAsc(orgId)).thenReturn(Collections.emptyList());
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(orgId)).thenReturn(Collections.emptyList());
        when(userRepository.findByOrgIdAndEmail(orgId, "owner@example.com")).thenReturn(Optional.of(owner));

        RallyCry savedRc = RallyCry.builder().org(org).title("Scale Up").sortOrder(0).build();
        when(rallyCryRepository.save(any(RallyCry.class))).thenReturn(savedRc);

        when(definingObjectiveRepository.save(any(DefiningObjective.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importRcdo(file, orgId, actor);

        assertThat(result.errors()).isEmpty();
        ArgumentCaptor<DefiningObjective> doCaptor = ArgumentCaptor.forClass(DefiningObjective.class);
        verify(definingObjectiveRepository, atLeastOnce()).save(doCaptor.capture());
        assertThat(doCaptor.getValue().getOwner()).isEqualTo(owner);
    }

    @Test
    void importRcdo_invalidOwnerEmail_reportsError() {
        String csv = "rally_cry,defining_objective,outcome,owner_email\n" +
                     "Win Big,Deploy Service,,ghost@example.com\n";

        MockMultipartFile file = new MockMultipartFile("file", "rcdo.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(rallyCryRepository.findByOrgIdOrderBySortOrderAsc(orgId)).thenReturn(Collections.emptyList());
        when(definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(orgId)).thenReturn(Collections.emptyList());
        when(userRepository.findByOrgIdAndEmail(orgId, "ghost@example.com")).thenReturn(Optional.empty());

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importRcdo(file, orgId, actor);

        assertThat(result.errors()).isNotEmpty();
        assertThat(result.errors().get(0).field()).isEqualTo("owner_email");
    }
}
