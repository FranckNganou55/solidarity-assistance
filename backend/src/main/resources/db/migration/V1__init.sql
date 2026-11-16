-- =====================================================================
--  Makénéné Solidarité - schema initial (PostgreSQL)
-- =====================================================================

CREATE TABLE roles (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(40)  NOT NULL UNIQUE,
    name         VARCHAR(80)  NOT NULL,
    description  VARCHAR(255),
    system_role  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id    BIGINT      NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(60) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

CREATE TABLE members (
    id                            BIGSERIAL PRIMARY KEY,
    last_name                     VARCHAR(80)  NOT NULL,
    first_name                    VARCHAR(80)  NOT NULL,
    phone                         VARCHAR(30)  NOT NULL UNIQUE,
    city                          VARCHAR(80)  NOT NULL,
    quarter                       VARCHAR(80),
    photo_url                     VARCHAR(300),
    email                         VARCHAR(120),
    password_hash                 VARCHAR(255) NOT NULL,
    must_change_password          BOOLEAN      NOT NULL DEFAULT TRUE,
    active                        BOOLEAN      NOT NULL DEFAULT TRUE,
    role_id                       BIGINT       NOT NULL REFERENCES roles(id),
    cycle_contributions           INTEGER      NOT NULL DEFAULT 0,
    total_contributions           INTEGER      NOT NULL DEFAULT 0,
    required_assistances_override INTEGER,
    created_at                    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ,
    last_login_at                 TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_members_phone ON members (phone);

CREATE TABLE assistance_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    description VARCHAR(400),
    icon        VARCHAR(16),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  BIGINT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Une assistance = un evenement
CREATE TABLE events (
    id             BIGSERIAL PRIMARY KEY,
    reference      VARCHAR(30)  NOT NULL UNIQUE,
    type_id        BIGINT       NOT NULL REFERENCES assistance_types(id),
    beneficiary_id BIGINT       NOT NULL REFERENCES members(id),
    description    VARCHAR(1000),
    status         VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    closing_date   DATE,
    target_amount  NUMERIC(12,2),
    closed_at      TIMESTAMPTZ,
    closed_by      BIGINT,
    created_by     BIGINT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ
);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_beneficiary ON events (beneficiary_id);

CREATE TABLE contributions (
    id               BIGSERIAL PRIMARY KEY,
    event_id         BIGINT        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id        BIGINT        NOT NULL REFERENCES members(id),
    amount           NUMERIC(12,2) NOT NULL,
    method           VARCHAR(20)   NOT NULL DEFAULT 'CASH',
    note             VARCHAR(255),
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    cycle_number     INTEGER,
    submitted_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    validated_at     TIMESTAMPTZ,
    validated_by     BIGINT,
    rejection_reason VARCHAR(255),
    CONSTRAINT uk_contribution_event_member UNIQUE (event_id, member_id)
);
CREATE INDEX idx_contrib_member ON contributions (member_id);

CREATE TABLE assistance_requests (
    id                       BIGSERIAL PRIMARY KEY,
    member_id                BIGINT       NOT NULL REFERENCES members(id),
    type_id                  BIGINT       NOT NULL REFERENCES assistance_types(id),
    reason                   VARCHAR(1000) NOT NULL,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    cycle_count_at_request   INTEGER,
    min_required_at_request  INTEGER,
    eligible                 BOOLEAN      NOT NULL DEFAULT FALSE,
    decision_comment         VARCHAR(500),
    decided_by               BIGINT,
    decided_at               TIMESTAMPTZ,
    event_id                 BIGINT REFERENCES events(id),
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_req_member ON assistance_requests (member_id);

CREATE TABLE app_settings (
    setting_key   VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(2000),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    BIGINT,
    actor_name  VARCHAR(120),
    action      VARCHAR(60),
    entity_type VARCHAR(40),
    entity_id   BIGINT,
    details     VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
