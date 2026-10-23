
import "dotenv/config";
import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) in .env"
      );
    }

    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true }
    });

    if (existingAdmin) {
      throw new Error("An admin already exists. Setup stopped.");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existingUser) {
      throw new Error(
        "This email already belongs to another account."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: {
        employeeId: "VWX-ADMIN-001",
        name: "System Administrator",
        email,
        password: passwordHash,
        role: "admin",
        isActive: true
      }
    });

    console.log("Initial Admin created successfully.");
    console.log(`Employee ID: ${admin.employeeId}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Database user ID: ${admin.id}`);
    console.log(
      "Use this database user ID for QR_DISPLAY_CREATED_BY_USER_ID if required."
    );
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
