
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { validateProductionConfig } from "./config/security.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    validateProductionConfig();
    await connectDB();

    app.listen(PORT, () => {
      console.log(`VorldX API listening on port ${PORT}`);
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("Startup failed:", error.name);
    } else {
      console.error("Startup failed:", error.message);
    }
    await import("./config/prisma.js").then(
      ({ default: prisma }) => prisma.$disconnect()
    );
    process.exit(1);
  }
}

startServer();
