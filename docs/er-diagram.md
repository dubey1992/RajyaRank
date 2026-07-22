# ER Diagram — Phase 1

```mermaid
erDiagram
  User ||--o| StudentProfile : has
  User ||--o| StaffProfile : has
  User ||--o{ UserIdentity : has
  User ||--o{ UserRole : has
  Role ||--o{ UserRole : grants
  Role ||--o{ RolePermission : has
  Permission ||--o{ RolePermission : in
  User ||--o{ StaffAssignment : scoped_by
  User ||--o{ LoginSession : has
  User ||--o{ MfaFactor : has
  State ||--o{ Exam : contains
  ExamBody ||--o{ Exam : conducts
  State ||--o{ StaffAssignment : scope
  Exam ||--o{ StaffAssignment : scope

  User {
    uuid id PK
    enum kind "STUDENT|STAFF"
    enum status
    string phone
    string email
    string passwordHash
    string locale
    bool mfaEnabled
    int failedLogins
    datetime lockedUntil
    int permVersion "busts principal cache"
  }
  StaffAssignment {
    uuid id PK
    enum scope "STATE|EXAM|COURSE|SUBJECT|BATCH"
    uuid stateId
    uuid examId
    uuid courseId "FK in Phase 2"
    uuid subjectId "FK in Phase 2"
    uuid batchId "FK in Phase 2"
    datetime deletedAt
  }
  LoginSession {
    uuid id PK
    string refreshTokenHash UK
    string familyId "rotation/reuse family"
    enum assurance "AAL1|AAL2"
    enum status
    datetime expiresAt
  }
  StaffInvitation {
    uuid id PK
    string email
    enum roleKey
    json assignments
    string tokenHash UK
    enum status
    datetime expiresAt
  }
  AuditLog {
    uuid id PK
    string action
    enum result "SUCCESS|DENIED|FAILED"
    string reasonCode
    json before
    json after
    string correlationId
  }
```

Standalone / cross-cutting entities: `OtpChallenge`, `AuditLog` (append-only), `ExamBody`.
Later phases attach Course/Batch/Subject/Chapter/Topic/Lesson, questions/tests/attempts, orders/
payments/entitlements, doubts, notifications, and support to this core.
