# ParkEase Database Normalization

ParkEase manages user accounts, mall submissions, and the planned parking reservation and gate workflows. This document describes a **logical relational design**. The application uses MongoDB, where each relation corresponds to a collection or to a logical grouping of fields. The current code implements `User`, `RefreshToken`, and `Mall`. Guard assignments, parking slots, bookings, and QR credentials are planned.

In the examples below, `X → Y` means that a value of `X) determines one value of `Y`. Fields and IDs are simplified to show the dependencies.

## First Normal Form (1NF)

Each row has a key, and each field holds one value. Consider a mall record with two parking slots:

```text
MallSheet(MallID, MallName, City, SlotNumbers)
(M1, "City Centre", "Delhi", ["A-01", "A-02"])
```

Flatten the repeating slot list into one row per slot:

| MallID | SlotNumber | MallName | City | SlotStatus |
| --- | --- | --- | --- | --- |
| M1 | A-01 | City Centre | Delhi | AVAILABLE |
| M1 | A-02 | City Centre | Delhi | OCCUPIED |
| M2 | A-01 | Riverside Mall | Noida | AVAILABLE |

The key is `(MallID, SlotNumber)` because each mall can have its own slot called `A-01`. Each token rotation, guard assignment, and booking is likewise represented by its own row.

## Second Normal Form (2NF)

A relation in 2NF has no non-key attribute that depends on only part of a candidate key. In the 1NF example:

- `(MallID, SlotNumber) → SlotStatus`
- `MallID → MallName, City`

Mall name and city depend on only one part of the slot key. Split them into two relations:

```text
Mall(MallID PK, MallName, City)
ParkingSlot(MallID PK/FK, SlotNumber PK, SlotStatus)
```

`ParkingSlot` has the composite primary key `(MallID, SlotNumber)` in this example. The planned schema uses a separate `SlotID` primary key and preserves the pair as a unique alternate key. Joining on `MallID` reconstructs the flat table. A mall’s city can now be updated in one place, and a mall can exist before any slots are added.

## Third Normal Form (3NF)

Remove transitive dependencies between non-key fields. For example, consider a booking record that also stores the customer’s current email and the slot’s mall:

```text
BookingID → UserID → Email
BookingID → SlotID → MallID
```

Store the email in `User` and the slot’s mall in `ParkingSlot`. A booking references both by ID. The mall can be found by joining `Booking` to `ParkingSlot`, then to `Mall`. The same approach applies to the mall owner’s name, which belongs in `User`, and to the mall of a QR credential, which can be found through its booking.

The resulting logical relations are shown below. In the table, PK means primary key, FK means foreign key, and AK means alternate candidate key. Routine audit timestamps are omitted.

| Relation | Keys and references | Other attributes |
| --- | --- | --- |
| `User` | `UserID` (PK), `Email` (AK), `ApprovedBy` (FK → User) | Name, Phone, PasswordHash, Role, Status, ApprovedAt, RejectionReason |
| `Mall` | `MallID` (PK), `OwnerID` (FK → User), `(Name, City, Address)` (AK) | Name, City, Address, Description, HourlyRatePaise, OpeningTime, ClosingTime, Status |
| `RefreshFamily` | `FamilyID` (PK), `UserID` (FK → User) | — |
| `RefreshToken` | `RefreshTokenID` (PK), `TokenHash` (AK), `FamilyID` (FK → RefreshFamily) | ExpiresAt, RevokedAt, ReplacedByTokenHash (nullable self-reference), CreatedByIP, UserAgent |
| `GuardAssignment` (planned) | `(GuardID, MallID)` (PK), `GuardID` (FK → User), `MallID` (FK → Mall), `AssignedBy` (FK → User) | GateLabel, IsActive, DeactivatedAt |
| `ParkingSlot` (planned) | `SlotID` (PK), `MallID` (FK → Mall), `(MallID, SlotNumber)` (AK) | SlotNumber, Floor, Zone, VehicleType, Status, IsActive |
| `Booking` (planned) | `BookingID` (PK), `UserID` (FK → User), `SlotID` (FK → ParkingSlot) | VehicleNumber, Status, ReservedAt, ExpiresAt, EntryTime, ExitTime, HourlyRateSnapshotPaise, BillingStatus |
| `QRToken` (planned) | `QRTokenID` (PK), `BookingID` (FK → Booking and AK), `TokenHash` (AK) | Status, ExpiresAt, EntryScannedAt, ExitScannedAt |

`RefreshFamily` is a logical decomposition of the implemented `RefreshToken` collection. Each rotation family belongs to one user, so `FamilyID → UserID`. Moving this dependency into its own relation gives a single place to store the family’s owner.

A booking’s rate snapshot records the price quoted at reservation time. It stays on the booking because the mall can change its current rate later. In the normalized design, elapsed time, billable hours, and the calculated charge can be derived from the recorded times, the rate snapshot, and the applicable billing policy.

## Boyce–Codd Normal Form (BCNF)

BCNF requires every determinant of a nontrivial functional dependency to be a superkey. Under the stated business rules, the decomposed relations satisfy BCNF for the dependencies identified here:

| Determinant | Why it is a superkey |
| --- | --- |
| `UserID` or `Email` in `User` | Each identifies one account. |
| `MallID` or `(Name, City, Address)` in `Mall` | Each identifies one submitted mall profile. The alternate key is the exact stored tuple. |
| `FamilyID` in `RefreshFamily` | Each identifies one refresh family and its owner. |
| `RefreshTokenID` or `TokenHash` in `RefreshToken` | Each identifies one token rotation record. |
| `(GuardID, MallID)` in `GuardAssignment` | Each pair identifies one assignment. A guard may be assigned to several malls, and a mall may have several guards. |
| `SlotID` or `(MallID, SlotNumber)` in `ParkingSlot` | Each identifies one physical slot. |
| `BookingID` in `Booking` | Each identifies one reservation. A user or slot can appear in many historical bookings. |
| `QRTokenID`, `BookingID`, or `TokenHash` in `QRToken` | Each identifies one credential under the planned rule of one QR record per booking. |

The MongoDB implementation stores `userId` alongside `familyId` in refresh token documents, so that collection does not satisfy BCNF under `familyId → userId`. The planned MongoDB design also copies mall IDs onto bookings and QR records for direct lookup. Those copies are intentional denormalization and must stay consistent with the referenced slot or booking.

## Project references

- [Current Mongoose models](../server/src/models/)
- [Planned database design and indexes](../docs/DATABASE_DESIGN.md)
