-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('En attente', 'En cours', 'Terminé', 'Rejeté', 'Annulé');

-- CreateEnum
CREATE TYPE "StepName" AS ENUM ('DEMANDE ADMISSION', 'ENTRETIEN MOTIVATION', 'DEMANDE VISA', 'PREPARATIF VOYAGE');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('En cours', 'Terminée', 'Refusée', 'Annulée');

-- CreateEnum
CREATE TYPE "RendezvousStatus" AS ENUM ('En attente', 'Confirmé', 'Terminé', 'Annulé');

-- CreateEnum
CREATE TYPE "AdminOpinion" AS ENUM ('Favorable', 'Défavorable');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('Bac', 'Bac+1', 'Bac+2', 'Licence', 'Master I', 'Master II', 'Doctorat');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30');

-- CreateEnum
CREATE TYPE "DestinationEnum" AS ENUM ('Russie', 'Chypre', 'Chine', 'Maroc', 'Algérie', 'Turquie', 'France', 'Autre');

-- CreateEnum
CREATE TYPE "Filiere" AS ENUM ('Informatique', 'Médecine', 'Droit', 'Commerce', 'Ingénierie', 'Architecture', 'Autre');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RevocationReason" AS ENUM ('SESSION_EXPIRED', 'MANUAL_LOGOUT', 'PASSWORD_CHANGED', 'ADMIN_REVOKE', 'MANUAL_REVOKE', 'MAX_SESSIONS_REACHED', 'INACTIVITY', 'REMEMBER_ME_EXPIRED', 'SESSION_MAX_AGE');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('ADMIN', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'CANCEL', 'COMPLETE', 'RESPOND', 'EXPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoutUntil" TIMESTAMP(3),
    "lastLogout" TIMESTAMP(3),
    "logoutReason" TEXT,
    "logoutTransaction" TEXT,
    "logoutCount" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" TIMESTAMP(3),
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "tokenType" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notifications" JSONB NOT NULL DEFAULT '{"email":true,"push":false,"sms":false}',
    "dashboardLayout" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" JSONB,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "deactivatedAt" TIMESTAMP(3),
    "revocationReason" "RevocationReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRememberMe" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "rotationCount" INTEGER NOT NULL DEFAULT 0,
    "previousTokenId" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "status" "TokenStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT,
    "prenom" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationAutre" TEXT,
    "filiere" TEXT NOT NULL,
    "filiereAutre" TEXT,
    "niveauEtude" TEXT NOT NULL,
    "statut" "ProcedureStatus" NOT NULL DEFAULT 'En cours',
    "raisonRejet" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletionReason" TEXT,
    "dateCompletion" TIMESTAMP(3),
    "dateDerniereModification" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steps" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "nom" "StepName" NOT NULL,
    "statut" "StepStatus" NOT NULL DEFAULT 'En attente',
    "raisonRefus" TEXT,
    "order" INTEGER DEFAULT 0,
    "dateMaj" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCompletion" TIMESTAMP(3),

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_comments" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL DEFAULT 'ADMIN',
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_timeline" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stepName" "StepName",
    "oldStatus" "StepStatus",
    "newStatus" "StepStatus",
    "oldProcedureStatus" TEXT,
    "newProcedureStatus" TEXT,
    "comment" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rendezvous" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "destination" "DestinationEnum" NOT NULL,
    "destinationAutre" TEXT,
    "niveauEtude" "EducationLevel" NOT NULL,
    "filiere" "Filiere" NOT NULL,
    "filiereAutre" TEXT,
    "date" TEXT NOT NULL,
    "time" "TimeSlot" NOT NULL,
    "status" "RendezvousStatus" NOT NULL DEFAULT 'Confirmé',
    "avisAdmin" "AdminOpinion",
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "CancelledBy",
    "cancellationReason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "rendezvous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rendezvous_reminders" (
    "id" TEXT NOT NULL,
    "rendezvousId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '24H_BEFORE',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "NotificationType" NOT NULL DEFAULT 'EMAIL',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rendezvous_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "firstName" VARCHAR(50),
    "lastName" VARCHAR(50),
    "email" VARCHAR(100) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "adminResponse" VARCHAR(2000),
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channel" "NotificationType" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "uploadedBy" TEXT,
    "description" TEXT,
    "procedure_id" TEXT,
    "rendezvous_id" TEXT,
    "contact_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProcedureRendezvous" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProcedureRendezvous_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_logoutUntil_isActive_idx" ON "users"("logoutUntil", "isActive");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_loginAt_idx" ON "login_history"("loginAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_isActive_expiresAt_idx" ON "sessions"("userId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_deactivatedAt_idx" ON "sessions"("deactivatedAt");

-- CreateIndex
CREATE INDEX "sessions_lastActivity_idx" ON "sessions"("lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_isActive_idx" ON "refresh_tokens"("isActive");

-- CreateIndex
CREATE INDEX "refresh_tokens_deactivatedAt_idx" ON "refresh_tokens"("deactivatedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_lastActivity_idx" ON "refresh_tokens"("lastActivity");

-- CreateIndex
CREATE UNIQUE INDEX "reset_tokens_token_key" ON "reset_tokens"("token");

-- CreateIndex
CREATE INDEX "reset_tokens_expiresAt_idx" ON "reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "reset_tokens_token_idx" ON "reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_token_key" ON "revoked_tokens"("token");

-- CreateIndex
CREATE INDEX "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "revoked_tokens_token_idx" ON "revoked_tokens"("token");

-- CreateIndex
CREATE INDEX "procedures_email_isDeleted_idx" ON "procedures"("email", "isDeleted");

-- CreateIndex
CREATE INDEX "procedures_rendezVousId_idx" ON "procedures"("rendezVousId");

-- CreateIndex
CREATE INDEX "procedures_statut_idx" ON "procedures"("statut");

-- CreateIndex
CREATE INDEX "procedures_created_at_idx" ON "procedures"("created_at");

-- CreateIndex
CREATE INDEX "procedures_destination_idx" ON "procedures"("destination");

-- CreateIndex
CREATE INDEX "procedures_filiere_idx" ON "procedures"("filiere");

-- CreateIndex
CREATE INDEX "steps_procedureId_idx" ON "steps"("procedureId");

-- CreateIndex
CREATE INDEX "steps_statut_idx" ON "steps"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "steps_procedureId_nom_key" ON "steps"("procedureId", "nom");

-- CreateIndex
CREATE INDEX "procedure_comments_procedureId_idx" ON "procedure_comments"("procedureId");

-- CreateIndex
CREATE INDEX "procedure_timeline_procedureId_idx" ON "procedure_timeline"("procedureId");

-- CreateIndex
CREATE INDEX "procedure_timeline_created_at_idx" ON "procedure_timeline"("created_at");

-- CreateIndex
CREATE INDEX "rendezvous_email_status_idx" ON "rendezvous"("email", "status");

-- CreateIndex
CREATE INDEX "rendezvous_status_date_idx" ON "rendezvous"("status", "date");

-- CreateIndex
CREATE INDEX "rendezvous_email_date_idx" ON "rendezvous"("email", "date");

-- CreateIndex
CREATE INDEX "rendezvous_date_status_time_idx" ON "rendezvous"("date", "status", "time");

-- CreateIndex
CREATE INDEX "rendezvous_created_at_idx" ON "rendezvous"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rendezvous_date_time_key" ON "rendezvous"("date", "time");

-- CreateIndex
CREATE INDEX "rendezvous_reminders_rendezvousId_idx" ON "rendezvous_reminders"("rendezvousId");

-- CreateIndex
CREATE INDEX "rendezvous_reminders_scheduledFor_status_idx" ON "rendezvous_reminders"("scheduledFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "destinations_country_key" ON "destinations"("country");

-- CreateIndex
CREATE INDEX "destinations_country_idx" ON "destinations"("country");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_isRead_idx" ON "contacts"("isRead");

-- CreateIndex
CREATE INDEX "contacts_created_at_idx" ON "contacts"("created_at");

-- CreateIndex
CREATE INDEX "contacts_isDeleted_idx" ON "contacts"("isDeleted");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "files_entityType_entityId_idx" ON "files"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "files_uploadedBy_idx" ON "files"("uploadedBy");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_logs_userId_idx" ON "system_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "backups_filename_key" ON "backups"("filename");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");

-- CreateIndex
CREATE INDEX "backups_status_idx" ON "backups"("status");

-- CreateIndex
CREATE INDEX "_ProcedureRendezvous_B_index" ON "_ProcedureRendezvous"("B");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reset_tokens" ADD CONSTRAINT "reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_comments" ADD CONSTRAINT "procedure_comments_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_timeline" ADD CONSTRAINT "procedure_timeline_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous" ADD CONSTRAINT "rendezvous_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous_reminders" ADD CONSTRAINT "rendezvous_reminders_rendezvousId_fkey" FOREIGN KEY ("rendezvousId") REFERENCES "rendezvous"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_procedure_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_rendezvous_fkey" FOREIGN KEY ("rendezvous_id") REFERENCES "rendezvous"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProcedureRendezvous" ADD CONSTRAINT "_ProcedureRendezvous_A_fkey" FOREIGN KEY ("A") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProcedureRendezvous" ADD CONSTRAINT "_ProcedureRendezvous_B_fkey" FOREIGN KEY ("B") REFERENCES "rendezvous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
