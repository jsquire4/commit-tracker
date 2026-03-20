package com.compass.platform.seed;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Orchestrates the observatory extended seed data generation.
 * Activated by setting {@code compass.seed.observatory=true} in application config.
 * Skips automatically if orgs already exist in the database.
 */
@Component
@ConditionalOnProperty(name = "compass.seed.observatory", havingValue = "true")
public class ObservatorySeedGenerator implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ObservatorySeedGenerator.class);

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("event=observatory_seed_started");

        long orgCount = em.createQuery("SELECT COUNT(o) FROM Org o", Long.class).getSingleResult();
        if (orgCount > 0) {
            log.info("event=observatory_seed_skipped reason=orgs_table_not_empty count={}", orgCount);
            return;
        }

        SeedOrgBuilder orgBuilder = new SeedOrgBuilder(em);
        List<SeedOrgBuilder.OrgContext> orgs = orgBuilder.buildAll();

        SeedCycleBuilder cycleBuilder = new SeedCycleBuilder(em);
        for (SeedOrgBuilder.OrgContext org : orgs) {
            cycleBuilder.buildCycles(org);
        }

        long finalOrgCount  = em.createQuery("SELECT COUNT(o) FROM Org o", Long.class).getSingleResult();
        long finalUserCount = em.createQuery("SELECT COUNT(u) FROM AppUser u", Long.class).getSingleResult();
        long finalCycleCount = em.createQuery("SELECT COUNT(c) FROM Cycle c", Long.class).getSingleResult();
        long finalCommitCount = em.createQuery("SELECT COUNT(c) FROM Commitment c", Long.class).getSingleResult();
        long finalReconCount = em.createQuery("SELECT COUNT(r) FROM ReconciliationRecord r", Long.class).getSingleResult();

        log.info("event=observatory_seed_complete orgs={} users={} cycles={} commitments={} reconciliation_records={}",
            finalOrgCount, finalUserCount, finalCycleCount, finalCommitCount, finalReconCount);
    }
}
