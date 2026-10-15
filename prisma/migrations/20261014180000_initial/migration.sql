BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "StatusOverride" AS ENUM ('SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuctionMode" AS ENUM ('UNKNOWN', 'ELECTRONIC', 'LIVE');

-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('UNKNOWN', 'LEGAL_ENTITY', 'INDIVIDUAL_AND_LEGAL_ENTITY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(160),
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "officialNumber" VARCHAR(40) NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "agency" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(300) NOT NULL,
    "mode" "AuctionMode" NOT NULL DEFAULT 'UNKNOWN',
    "officialUrl" TEXT NOT NULL,
    "noticeDocumentUrl" TEXT,
    "sourceStatus" VARCHAR(100),
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "statusOverride" "StatusOverride",
    "proposalStartsAt" TIMESTAMPTZ(3),
    "proposalEndsAt" TIMESTAMPTZ(3),
    "classificationAt" TIMESTAMPTZ(3),
    "biddingStartsAt" TIMESTAMPTZ(3),
    "biddingEndsAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "minimumBid" DECIMAL(18,2) NOT NULL,
    "appraisalValue" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "state" CHAR(2) NOT NULL,
    "city" VARCHAR(160) NOT NULL,
    "storageFacility" VARCHAR(240) NOT NULL,
    "pickupAddress" TEXT,
    "officialUrl" TEXT NOT NULL,
    "sourceStatus" VARCHAR(100),
    "sourceParticipationIconUrl" TEXT,
    "participationType" "ParticipationType" NOT NULL DEFAULT 'UNKNOWN',
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "statusOverride" "StatusOverride",
    "personalNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_items" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_images" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "alt" VARCHAR(300) NOT NULL,
    "position" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "mimeType" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lot_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_officialNumber_key" ON "auctions"("officialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_slug_key" ON "auctions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_officialUrl_key" ON "auctions"("officialUrl");

-- CreateIndex
CREATE INDEX "auctions_deletedAt_publicationStatus_proposalEndsAt_idx" ON "auctions"("deletedAt", "publicationStatus", "proposalEndsAt");

-- CreateIndex
CREATE INDEX "auctions_deletedAt_publicationStatus_proposalStartsAt_idx" ON "auctions"("deletedAt", "publicationStatus", "proposalStartsAt");

-- CreateIndex
CREATE INDEX "auctions_deletedAt_mode_idx" ON "auctions"("deletedAt", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lots_slug_key" ON "lots"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lots_officialUrl_key" ON "lots"("officialUrl");

-- CreateIndex
CREATE INDEX "lots_deletedAt_publicationStatus_categoryId_minimumBid_idx" ON "lots"("deletedAt", "publicationStatus", "categoryId", "minimumBid");

-- CreateIndex
CREATE INDEX "lots_deletedAt_publicationStatus_state_city_idx" ON "lots"("deletedAt", "publicationStatus", "state", "city");

-- CreateIndex
CREATE INDEX "lots_deletedAt_publicationStatus_minimumBid_idx" ON "lots"("deletedAt", "publicationStatus", "minimumBid");

-- CreateIndex
CREATE INDEX "lots_deletedAt_publicationStatus_createdAt_idx" ON "lots"("deletedAt", "publicationStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lots_auctionId_number_key" ON "lots"("auctionId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "lot_items_lotId_position_key" ON "lot_items"("lotId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "lot_images_storageKey_key" ON "lot_images"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "lot_images_lotId_position_key" ON "lot_images"("lotId", "position");

-- CreateIndex
CREATE INDEX "favorites_lotId_idx" ON "favorites"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_lotId_key" ON "favorites"("userId", "lotId");

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_items" ADD CONSTRAINT "lot_items_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_images" ADD CONSTRAINT "lot_images_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auctions" ADD CONSTRAINT "auctions_proposal_dates_check"
CHECK ("proposalStartsAt" IS NULL OR "proposalEndsAt" IS NULL OR "proposalEndsAt" > "proposalStartsAt");

ALTER TABLE "auctions" ADD CONSTRAINT "auctions_bidding_dates_check"
CHECK ("biddingStartsAt" IS NULL OR "biddingEndsAt" IS NULL OR "biddingEndsAt" > "biddingStartsAt");

ALTER TABLE "lots" ADD CONSTRAINT "lots_amounts_check"
CHECK ("minimumBid" >= 0 AND ("appraisalValue" IS NULL OR "appraisalValue" >= 0));

ALTER TABLE "lots" ADD CONSTRAINT "lots_number_currency_check"
CHECK ("number" > 0 AND "currency" = 'BRL');

ALTER TABLE "lot_items" ADD CONSTRAINT "lot_items_quantity_position_check"
CHECK ("quantity" > 0 AND "position" >= 0);

ALTER TABLE "lot_images" ADD CONSTRAINT "lot_images_dimensions_position_check"
CHECK ("position" >= 0 AND ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));

CREATE INDEX "lots_search_idx" ON "lots" USING GIN (
    to_tsvector('portuguese', coalesce("title", '') || ' ' || coalesce("description", ''))
);

COMMIT;
