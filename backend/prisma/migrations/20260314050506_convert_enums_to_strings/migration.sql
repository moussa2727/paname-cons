/*
  Warnings:

  - You are about to alter the column `destinationAutre` on the `rendezvous` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `filiereAutre` on the `rendezvous` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `niveauEtudeAutre` on the `rendezvous` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - Changed the type of `destination` on the `rendezvous` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `niveauEtude` on the `rendezvous` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `filiere` on the `rendezvous` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "rendezvous" DROP COLUMN "destination",
ADD COLUMN     "destination" VARCHAR(100) NOT NULL,
ALTER COLUMN "destinationAutre" SET DATA TYPE VARCHAR(100),
DROP COLUMN "niveauEtude",
ADD COLUMN     "niveauEtude" VARCHAR(100) NOT NULL,
DROP COLUMN "filiere",
ADD COLUMN     "filiere" VARCHAR(100) NOT NULL,
ALTER COLUMN "filiereAutre" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "niveauEtudeAutre" SET DATA TYPE VARCHAR(100);
