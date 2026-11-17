-- ParkEase | PostgreSQL 17 | logical relational schema
-- The running application uses MongoDB. This schema is for the DBMS submission.
-- Rows represent published layouts. An unused position in a row is a gap.
-- Opening and closing times are mall-local (IST). Booking timestamps are absolute.
-- Role-specific permissions and inventory publication are application rules.
-- Guard assignments and QR tokens are planned extensions from the normalization design.

BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL CHECK (length(btrim(name)) >= 2),
    email varchar(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
    phone varchar(20),
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'MALL_OWNER', 'ADMIN', 'GUARD')),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED')),
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    rejection_reason varchar(500),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES refresh_families(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    replaced_by_token_hash text UNIQUE REFERENCES refresh_tokens(token_hash) ON DELETE SET NULL,
    created_by_ip inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at),
    CHECK (replaced_by_token_hash IS DISTINCT FROM token_hash)
);

CREATE TABLE malls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id),
    approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    name varchar(120) NOT NULL,
    city varchar(80) NOT NULL,
    address varchar(250) NOT NULL,
    description varchar(500) NOT NULL DEFAULT '',
    hourly_rate_paise integer NOT NULL CHECK (hourly_rate_paise BETWEEN 0 AND 1000000),
    opening_time time NOT NULL DEFAULT '08:00',
    closing_time time NOT NULL DEFAULT '23:00',
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE')),
    approved_at timestamptz,
    rejection_reason varchar(500),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (name, city, address)
);

CREATE TABLE parking_floors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mall_id uuid NOT NULL REFERENCES malls(id),
    name varchar(24) NOT NULL,
    display_order smallint NOT NULL CHECK (display_order > 0),
    UNIQUE (mall_id, display_order),
    CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX parking_floor_name_per_mall ON parking_floors (mall_id, lower(name));

CREATE TABLE parking_rows (
    floor_id uuid NOT NULL REFERENCES parking_floors(id),
    row_number smallint NOT NULL CHECK (row_number BETWEEN 1 AND 30),
    cell_count smallint NOT NULL CHECK (cell_count BETWEEN 1 AND 60),
    PRIMARY KEY (floor_id, row_number)
);

CREATE TABLE parking_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_id uuid NOT NULL,
    row_number smallint NOT NULL,
    slot_code varchar(24) NOT NULL CHECK (length(btrim(slot_code)) > 0),
    position smallint NOT NULL CHECK (position BETWEEN 1 AND 60),
    vehicle_type text NOT NULL CHECK (vehicle_type IN ('CAR', 'BIKE')),
    is_accessible boolean NOT NULL DEFAULT false,
    is_electric boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE')),
    retired_at timestamptz,
    FOREIGN KEY (floor_id, row_number) REFERENCES parking_rows (floor_id, row_number),
    UNIQUE (floor_id, row_number, position)
);

CREATE UNIQUE INDEX parking_slot_code_per_floor ON parking_slots (floor_id, lower(slot_code));

CREATE TABLE bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id uuid NOT NULL REFERENCES users(id),
    slot_id uuid NOT NULL REFERENCES parking_slots(id),
    vehicle_number varchar(20) NOT NULL CHECK (vehicle_number ~ '^[A-Z0-9][A-Z0-9 -]{2,19}$'),
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    hourly_rate_snapshot_paise integer NOT NULL CHECK (hourly_rate_snapshot_paise >= 0),
    total_amount_paise bigint GENERATED ALWAYS AS (
        round(hourly_rate_snapshot_paise * extract(epoch FROM (end_time - start_time)) / 3600)::bigint
    ) STORED,
    status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    cancelled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_time > start_time),
    CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
    -- Adjacent windows can share an endpoint. Cancelled bookings stop blocking the bay.
    CONSTRAINT no_overlapping_slot_bookings EXCLUDE USING gist (
        slot_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
);

-- Planned: a guard can be assigned to multiple malls and a mall can have multiple guards.
CREATE TABLE guard_assignments (
    guard_id uuid NOT NULL REFERENCES users(id),
    mall_id uuid NOT NULL REFERENCES malls(id),
    assigned_by uuid NOT NULL REFERENCES users(id),
    gate_label varchar(80),
    assigned_at timestamptz NOT NULL DEFAULT now(),
    deactivated_at timestamptz,
    PRIMARY KEY (guard_id, mall_id)
);

-- Planned: each booking can have at most one QR credential.
CREATE TABLE qr_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
    token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    status text NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'REVOKED', 'USED')),
    expires_at timestamptz NOT NULL,
    entry_scanned_at timestamptz,
    exit_scanned_at timestamptz,
    CHECK (exit_scanned_at IS NULL OR (entry_scanned_at IS NOT NULL AND exit_scanned_at >= entry_scanned_at))
);

CREATE INDEX refresh_families_user_idx ON refresh_families (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_expiry_idx ON refresh_tokens (expires_at);
CREATE INDEX malls_owner_idx ON malls (owner_id);
CREATE INDEX bookings_driver_start_idx ON bookings (driver_id, start_time DESC);
CREATE INDEX bookings_slot_idx ON bookings (slot_id);
CREATE INDEX guard_assignments_mall_idx ON guard_assignments (mall_id);

COMMIT;
