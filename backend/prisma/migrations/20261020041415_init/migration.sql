/*
  Warnings:

  - You are about to drop the column `companyId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Shift` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to drop the column `companyId` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to alter the column `employeeId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QRSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QRSessionToShift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ShiftEmployees` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employee,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employee` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Made the column `employeeId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "QRSession" DROP CONSTRAINT "QRSession_companyId_fkey";

-- DropForeignKey
ALTER TABLE "QRSession" DROP CONSTRAINT "QRSession_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_createdById_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "_QRSessionToShift" DROP CONSTRAINT "_QRSessionToShift_A_fkey";

-- DropForeignKey
ALTER TABLE "_QRSessionToShift" DROP CONSTRAINT "_QRSessionToShift_B_fkey";

-- DropForeignKey
ALTER TABLE "_ShiftEmployees" DROP CONSTRAINT "_ShiftEmployees_A_fkey";

-- DropForeignKey
ALTER TABLE "_ShiftEmployees" DROP CONSTRAINT "_ShiftEmployees_B_fkey";

-- DropIndex
DROP INDEX "Attendance_companyId_arrivalStatus_date_idx";

-- DropIndex
DROP INDEX "Attendance_companyId_date_idx";

-- DropIndex
DROP INDEX "Attendance_employeeId_date_key";

-- DropIndex
DROP INDEX "Shift_companyId_isActive_idx";

-- DropIndex
DROP INDEX "User_companyId_role_idx";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "companyId",
DROP COLUMN "employeeId",
ADD COLUMN     "employee" TEXT NOT NULL,
ALTER COLUMN "checkIn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "companyId",
DROP COLUMN "createdById",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(80);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyId",
ALTER COLUMN "name" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "employeeId" SET NOT NULL,
ALTER COLUMN "employeeId" SET DATA TYPE VARCHAR(50);

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "QRSession";

-- DropTable
DROP TABLE "_QRSessionToShift";

-- DropTable
DROP TABLE "_ShiftEmployees";

-- CreateTable
CREATE TABLE "QrSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignedEmployees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_QRSessionShifts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_QRSessionShifts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrSession_tokenHash_key" ON "QrSession"("tokenHash");

-- CreateIndex
CREATE INDEX "QrSession_expiresAt_idx" ON "QrSession"("expiresAt");

-- CreateIndex
CREATE INDEX "_AssignedEmployees_B_index" ON "_AssignedEmployees"("B");

-- CreateIndex
CREATE INDEX "_QRSessionShifts_B_index" ON "_QRSessionShifts"("B");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employee_date_key" ON "Attendance"("employee", "date");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employee_fkey" FOREIGN KEY ("employee") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrSession" ADD CONSTRAINT "QrSession_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployees" ADD CONSTRAINT "_AssignedEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedEmployees" ADD CONSTRAINT "_AssignedEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QRSessionShifts" ADD CONSTRAINT "_QRSessionShifts_A_fkey" FOREIGN KEY ("A") REFERENCES "QrSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QRSessionShifts" ADD CONSTRAINT "_QRSessionShifts_B_fkey" FOREIGN KEY ("B") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
