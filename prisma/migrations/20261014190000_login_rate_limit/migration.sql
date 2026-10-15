BEGIN;

-- CreateTable
CREATE TABLE "login_rate_limits" (
    "key" CHAR(64) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "login_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "login_rate_limits_expiresAt_idx" ON "login_rate_limits"("expiresAt");

ALTER TABLE "login_rate_limits" ADD CONSTRAINT "login_rate_limits_hits_check" CHECK ("hits" > 0);

COMMIT;
