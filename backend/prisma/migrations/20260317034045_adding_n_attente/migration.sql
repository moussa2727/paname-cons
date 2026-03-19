/*
  Warnings:

  - The values [12:00,12:30,13:00,13:30] on the enum `TimeSlot` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "ProcedureStatus" ADD VALUE 'En attente';

-- AlterEnum
BEGIN;
CREATE TYPE "TimeSlot_new" AS ENUM ('09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30');
ALTER TABLE "rendezvous" ALTER COLUMN "time" TYPE "TimeSlot_new" USING ("time"::text::"TimeSlot_new");
ALTER TYPE "TimeSlot" RENAME TO "TimeSlot_old";
ALTER TYPE "TimeSlot_new" RENAME TO "TimeSlot";
DROP TYPE "public"."TimeSlot_old";
COMMIT;
