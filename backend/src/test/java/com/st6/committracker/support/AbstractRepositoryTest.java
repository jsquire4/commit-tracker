package com.st6.committracker.support;

import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for repository tests using Testcontainers.
 *
 * DISABLED: Docker Engine 29.2.1 requires API version prefixes on all requests,
 * which is incompatible with the current Testcontainers/docker-java library.
 * Re-enable when Testcontainers releases a fix or Docker restores unversioned API support.
 * See: https://github.com/testcontainers/testcontainers-java/issues
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Disabled("Testcontainers incompatible with Docker Engine 29.2.1 — re-enable when fixed")
public abstract class AbstractRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("st6_test")
            .withUsername("st6_test")
            .withPassword("st6_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
