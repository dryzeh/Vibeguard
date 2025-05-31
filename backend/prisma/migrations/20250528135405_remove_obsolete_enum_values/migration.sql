/*
  Warnings:

  - The values [ACKNOWLEDGED] on the enum `AlertStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SIGNAL_LOSS,ZONE_BREACH,TAMPERING] on the enum `AlertType` will be removed. If these variants are still used in the database, this will fail.
  - The values [FAULT] on the enum `SensorStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [HUMIDITY,NOISE,OCCUPANCY] on the enum `SensorType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `RateLimitEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AlertStatus_new" AS ENUM ('ACTIVE', 'RESOLVED', 'ESCALATED');
ALTER TABLE "Alert" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Alert" ALTER COLUMN "status" TYPE "AlertStatus_new" USING ("status"::text::"AlertStatus_new");
ALTER TYPE "AlertStatus" RENAME TO "AlertStatus_old";
ALTER TYPE "AlertStatus_new" RENAME TO "AlertStatus";
DROP TYPE "AlertStatus_old";
ALTER TABLE "Alert" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AlertType_new" AS ENUM ('EMERGENCY', 'DISTRESS', 'BATTERY_LOW', 'ZONE_EXIT', 'ZONE_ENTRY');
ALTER TABLE "Alert" ALTER COLUMN "type" TYPE "AlertType_new" USING ("type"::text::"AlertType_new");
ALTER TYPE "AlertType" RENAME TO "AlertType_old";
ALTER TYPE "AlertType_new" RENAME TO "AlertType";
DROP TYPE "AlertType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SensorStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR');
ALTER TABLE "Sensor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Sensor" ALTER COLUMN "status" TYPE "SensorStatus_new" USING ("status"::text::"SensorStatus_new");
ALTER TYPE "SensorStatus" RENAME TO "SensorStatus_old";
ALTER TYPE "SensorStatus_new" RENAME TO "SensorStatus";
DROP TYPE "SensorStatus_old";
ALTER TABLE "Sensor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SensorType_new" AS ENUM ('RFID', 'CAMERA', 'MOTION', 'PRESENCE', 'TEMPERATURE', 'SOUND');
ALTER TABLE "Sensor" ALTER COLUMN "type" TYPE "SensorType_new" USING ("type"::text::"SensorType_new");
ALTER TYPE "SensorType" RENAME TO "SensorType_old";
ALTER TYPE "SensorType_new" RENAME TO "SensorType";
DROP TYPE "SensorType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- DropTable
DROP TABLE "RateLimitEntry";

-- CreateTable
CREATE TABLE "AnalyticsReport" (
    "id" TEXT NOT NULL,
    "nightclubId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "nightclubId" TEXT NOT NULL,
    "zoneId" TEXT,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "nightclubId" TEXT NOT NULL,
    "zoneId" TEXT,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorAnalysis" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insights" JSONB NOT NULL,
    "metadata" JSONB,
    "nightclubId" TEXT NOT NULL,
    "zoneId" TEXT,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviorAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealTimeMetric" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "nightclubId" TEXT NOT NULL,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealTimeMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataStream" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "nightclubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacheEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nightclubId" TEXT NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsReport_nightclubId_idx" ON "AnalyticsReport"("nightclubId");

-- CreateIndex
CREATE INDEX "AnalyticsReport_type_idx" ON "AnalyticsReport"("type");

-- CreateIndex
CREATE INDEX "AnalyticsReport_createdAt_idx" ON "AnalyticsReport"("createdAt");

-- CreateIndex
CREATE INDEX "AIModel_type_status_idx" ON "AIModel"("type", "status");

-- CreateIndex
CREATE INDEX "Prediction_type_timestamp_idx" ON "Prediction"("type", "timestamp");

-- CreateIndex
CREATE INDEX "Prediction_nightclubId_timestamp_idx" ON "Prediction"("nightclubId", "timestamp");

-- CreateIndex
CREATE INDEX "Anomaly_type_severity_status_idx" ON "Anomaly"("type", "severity", "status");

-- CreateIndex
CREATE INDEX "Anomaly_nightclubId_timestamp_idx" ON "Anomaly"("nightclubId", "timestamp");

-- CreateIndex
CREATE INDEX "Anomaly_zoneId_timestamp_idx" ON "Anomaly"("zoneId", "timestamp");

-- CreateIndex
CREATE INDEX "BehaviorAnalysis_type_timestamp_idx" ON "BehaviorAnalysis"("type", "timestamp");

-- CreateIndex
CREATE INDEX "BehaviorAnalysis_nightclubId_timestamp_idx" ON "BehaviorAnalysis"("nightclubId", "timestamp");

-- CreateIndex
CREATE INDEX "BehaviorAnalysis_zoneId_timestamp_idx" ON "BehaviorAnalysis"("zoneId", "timestamp");

-- CreateIndex
CREATE INDEX "RealTimeMetric_type_timestamp_idx" ON "RealTimeMetric"("type", "timestamp");

-- CreateIndex
CREATE INDEX "RealTimeMetric_nightclubId_timestamp_idx" ON "RealTimeMetric"("nightclubId", "timestamp");

-- CreateIndex
CREATE INDEX "RealTimeMetric_zoneId_timestamp_idx" ON "RealTimeMetric"("zoneId", "timestamp");

-- CreateIndex
CREATE INDEX "DataStream_type_status_idx" ON "DataStream"("type", "status");

-- CreateIndex
CREATE INDEX "DataStream_nightclubId_lastUpdate_idx" ON "DataStream"("nightclubId", "lastUpdate");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_key_key" ON "CacheEntry"("key");

-- CreateIndex
CREATE INDEX "CacheEntry_expiresAt_idx" ON "CacheEntry"("expiresAt");

-- AddForeignKey
ALTER TABLE "AnalyticsReport" ADD CONSTRAINT "AnalyticsReport_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAnalysis" ADD CONSTRAINT "BehaviorAnalysis_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAnalysis" ADD CONSTRAINT "BehaviorAnalysis_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorAnalysis" ADD CONSTRAINT "BehaviorAnalysis_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTimeMetric" ADD CONSTRAINT "RealTimeMetric_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTimeMetric" ADD CONSTRAINT "RealTimeMetric_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataStream" ADD CONSTRAINT "DataStream_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CacheEntry" ADD CONSTRAINT "CacheEntry_nightclubId_fkey" FOREIGN KEY ("nightclubId") REFERENCES "Nightclub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
