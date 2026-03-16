package com.st6.committracker.domain.importexport;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.ChessCategoryRepository;
import com.st6.committracker.domain.user.AppUser;
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
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChessCategoryCsvImporterTest {

    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private AuditService auditService;
    @Mock private OrgRepository orgRepository;
    @InjectMocks private ChessCategoryCsvImporter importer;

    private final UUID orgId = UUID.randomUUID();
    private final Org org = new Org(orgId, "Test Org", "test-org", "UTC", true);

    @Test
    void importChessCategories_validCsv_createsCategories() {
        String csv = "name,description,color_hex\n" +
                     "Bishop,Strategic moves,#0000FF\n" +
                     "Rook,Tactical plays,#FF0000\n";

        MockMultipartFile file = new MockMultipartFile("file", "categories.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(orgId))
                .thenReturn(Collections.emptyList());
        when(chessCategoryRepository.findByOrgIdAndName(any(), any())).thenReturn(Optional.empty());
        when(chessCategoryRepository.save(any(ChessCategory.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importChessCategories(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.importedRows()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
        verify(chessCategoryRepository, times(2)).save(any(ChessCategory.class));
    }

    @Test
    void importChessCategories_duplicateName_updatesExisting() {
        String csv = "name,description,color_hex\n" +
                     "Knight,Updated description,#00FF00\n";

        MockMultipartFile file = new MockMultipartFile("file", "categories.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        ChessCategory existing = new ChessCategory(org, "Knight", "Old description", "#AABBCC", 0, true);

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(orgId))
                .thenReturn(Collections.singletonList(existing));
        when(chessCategoryRepository.findByOrgIdAndName(orgId, "Knight")).thenReturn(Optional.of(existing));
        when(chessCategoryRepository.save(any(ChessCategory.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importChessCategories(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.importedRows()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();

        ArgumentCaptor<ChessCategory> captor = ArgumentCaptor.forClass(ChessCategory.class);
        verify(chessCategoryRepository).save(captor.capture());
        assertThat(captor.getValue().getDescription()).isEqualTo("Updated description");
        assertThat(captor.getValue().getColorHex()).isEqualTo("#00FF00");
    }

    @Test
    void importChessCategories_missingName_reportsError() {
        String csv = "name,description,color_hex\n" +
                     ",Missing name category,#123456\n";

        MockMultipartFile file = new MockMultipartFile("file", "categories.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(orgId))
                .thenReturn(Collections.emptyList());

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importChessCategories(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.errorRows()).isEqualTo(1);
        assertThat(result.errors()).hasSize(1);
        assertThat(result.errors().get(0).field()).isEqualTo("name");
    }
}
