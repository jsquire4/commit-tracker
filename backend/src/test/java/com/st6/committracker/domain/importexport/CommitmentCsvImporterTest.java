package com.st6.committracker.domain.importexport;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.ChessCategoryRepository;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.commit.TaskBulletRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
import com.st6.committracker.domain.rcdo.Outcome;
import com.st6.committracker.domain.rcdo.OutcomeRepository;
import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommitmentCsvImporterTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private AuditService auditService;
    @Mock private OrgRepository orgRepository;
    @Mock private TaskBulletRepository taskBulletRepository;
    @InjectMocks private CommitmentCsvImporter importer;

    private final UUID orgId = UUID.randomUUID();
    private final Org org = new Org(orgId, "Test Org", "test-org", "UTC", true);
    private final Cycle activeCycle = Cycle.builder()
            .org(org).label("Week 1").state(CycleState.DRAFT)
            .startsAt(Instant.now()).endsAt(Instant.now().plusSeconds(604800))
            .isActive(true).build();

    @Test
    void importCommitments_validCsv_createsCommitmentsWithBullets() {
        String csv = "user_email,title,bullets,completion_horizon,chess_category,rally_cry,defining_objective,outcome,assigned_by_email\n" +
                     "user@example.com,Finish Feature,Deploy to staging|Write tests,EOD,,,,,\n";

        MockMultipartFile file = new MockMultipartFile("file", "commitments.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        AppUser user = new AppUser(org, "user@example.com", "User", UserRole.EMPLOYEE, null);

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(Optional.of(activeCycle));
        when(userRepository.findByOrgIdAndEmail(orgId, "user@example.com")).thenReturn(Optional.of(user));

        Commitment savedCommitment = Commitment.builder()
                .org(org).user(user).cycle(activeCycle)
                .title("Finish Feature").completionHorizon(CompletionHorizon.EOD)
                .build();
        when(commitmentRepository.save(any(Commitment.class))).thenReturn(savedCommitment);
        when(taskBulletRepository.save(any(TaskBullet.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importCommitments(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.importedRows()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();

        verify(commitmentRepository).save(any(Commitment.class));
        // Two bullets: "Deploy to staging" and "Write tests"
        verify(taskBulletRepository, times(2)).save(any(TaskBullet.class));
    }

    @Test
    void importCommitments_resolvesRcdoAndCategory() {
        String csv = "user_email,title,bullets,completion_horizon,chess_category,rally_cry,defining_objective,outcome,assigned_by_email\n" +
                     "user@example.com,Ship It,,EOW,Bishop,Grow Revenue,Launch Product,Enterprise Sales,\n";

        MockMultipartFile file = new MockMultipartFile("file", "commitments.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        AppUser user = new AppUser(org, "user@example.com", "User", UserRole.EMPLOYEE, null);
        ChessCategory bishop = new ChessCategory(org, "Bishop", null, "#0000FF", 0, true);
        RallyCry rc = RallyCry.builder().org(org).title("Grow Revenue").sortOrder(0).build();
        DefiningObjective doObj = DefiningObjective.builder().org(org).rallyCry(rc).title("Launch Product").sortOrder(0).build();
        Outcome outcome = Outcome.builder().org(org).definingObjective(doObj).title("Enterprise Sales").sortOrder(0).build();

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(Optional.of(activeCycle));
        when(userRepository.findByOrgIdAndEmail(orgId, "user@example.com")).thenReturn(Optional.of(user));
        when(chessCategoryRepository.findByOrgIdAndName(orgId, "Bishop")).thenReturn(Optional.of(bishop));
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId)).thenReturn(List.of(rc));
        when(definingObjectiveRepository.findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(any()))
                .thenReturn(List.of(doObj));
        when(outcomeRepository.findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(any()))
                .thenReturn(List.of(outcome));
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importCommitments(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.importedRows()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();

        ArgumentCaptor<Commitment> captor = ArgumentCaptor.forClass(Commitment.class);
        verify(commitmentRepository).save(captor.capture());
        assertThat(captor.getValue().getChessCategory()).isEqualTo(bishop);
        assertThat(captor.getValue().getRallyCry()).isEqualTo(rc);
        assertThat(captor.getValue().getDefiningObjective()).isEqualTo(doObj);
        assertThat(captor.getValue().getOutcome()).isEqualTo(outcome);
    }

    @Test
    void importCommitments_invalidUserEmail_reportsError() {
        String csv = "user_email,title,bullets,completion_horizon,chess_category,rally_cry,defining_objective,outcome,assigned_by_email\n" +
                     "ghost@example.com,Some Task,,EOD,,,,,\n";

        MockMultipartFile file = new MockMultipartFile("file", "commitments.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(Optional.of(activeCycle));
        when(userRepository.findByOrgIdAndEmail(orgId, "ghost@example.com")).thenReturn(Optional.empty());

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importCommitments(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.errorRows()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0).field()).isEqualTo("user_email");
    }

    @Test
    void importCommitments_exceedsFileSizeLimit_throwsValidation() {
        // Create a byte array larger than 10MB
        byte[] largeContent = new byte[11 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("file", "commitments.csv", "text/csv", largeContent);

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        assertThatThrownBy(() -> importer.importCommitments(file, orgId, actor))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("10MB");
    }
}
