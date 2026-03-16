CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    external_id     TEXT,
    email           TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'
                    CHECK (role IN ('EMPLOYEE', 'MANAGER', 'DIRECTOR', 'VP', 'EXECUTIVE', 'ANALYST')),
    reports_to      UUID REFERENCES users(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, email)
);
