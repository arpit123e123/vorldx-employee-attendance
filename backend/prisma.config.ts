
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();
dotenv.config({ path: ".env.migrations" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.MIGRATION_DATABASE_URL || env("DATABASE_URL"),
  },
});
