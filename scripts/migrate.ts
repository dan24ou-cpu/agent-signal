import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://localhost:5432/agent_signal",
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const schemaPath = path.join(__dirname, "..", "src", "db", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    await client.query(schema);
    console.log("Schema applied successfully");
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message: string };
    // Ignore "type already exists" errors for idempotency
    if (pgErr.code === "42710") {
      console.log("Types already exist, skipping type creation...");
      // Re-run without CREATE TYPE statements
      const schemaPath = path.join(__dirname, "..", "src", "db", "schema.sql");
      const schema = fs.readFileSync(schemaPath, "utf-8");
      const withoutTypes = schema
        .split("\n")
        .filter((line) => !line.startsWith("CREATE TYPE"))
        .join("\n");
      await client.query(withoutTypes);
      console.log("Schema applied (without types)");
    } else {
      console.error("Migration failed:", pgErr.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

migrate();
