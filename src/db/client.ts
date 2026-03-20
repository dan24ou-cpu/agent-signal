import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/agent_signal",
  max: 10,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export default pool;
