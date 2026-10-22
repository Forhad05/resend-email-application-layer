import { defineConfig } from "drizzle-kit";
import { readFileSync, existsSync } from "fs";

// Load .env.local if DATABASE_URL is not yet in process.env
if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val;
    }
  }
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/email_tool",
  },
});

