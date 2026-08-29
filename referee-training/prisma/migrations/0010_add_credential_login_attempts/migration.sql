-- Track failed credential logins with hashed identifiers for durable throttling.
CREATE TABLE "CredentialLoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "firstFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CredentialLoginAttempt_key_key" ON "CredentialLoginAttempt"("key");
CREATE INDEX "CredentialLoginAttempt_lockedUntil_idx" ON "CredentialLoginAttempt"("lockedUntil");
