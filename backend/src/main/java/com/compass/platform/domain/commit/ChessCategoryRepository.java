package com.compass.platform.domain.commit;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChessCategoryRepository extends JpaRepository<ChessCategory, UUID> {
    List<ChessCategory> findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(UUID orgId);
    Optional<ChessCategory> findByOrgIdAndName(UUID orgId, String name);
}
