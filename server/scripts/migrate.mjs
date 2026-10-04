#!/usr/bin/env node
// Applies server/migrations/*.sql in filename order, tracking applied files
// in the schema_migrations table. This is a mirror of the repo-root
// scripts/migrate.mjs, kept inside server/ so it ships with Railway's
// build context (Root Directory = server). Keep the SQL files in sync
// with db/migrations/*.sql.
// Usage: node scripts/migrate.mjs
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? process.env.MYSQLHOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
  user: process.env.DB_USER ?? process.env.MYSQLUSER ?? "sms",
password: process.env.DB_PASS ?? process.env.MYSQLPASSWORD ?? "smspass123",
  database: process.env.DB_NAME ?? process.env.MYSQLDATABASE ?? "sms",
  multipleStatements: true,
});

await conn.execute(
  "CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
);
const [applied] = await conn.execute("SELECT filename FROM schema_migrations");
const done = new Set(applied.map((r) => r.filename));

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  if (done.has(f)) {
    console.log(`skip  ${f}`);
    continue;
  }
  const sql = readFileSync(join(dir, f), "utf8");
  await conn.query(sql);
  await conn.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [f]);
  console.log(`apply ${f}`);
}
await conn.end();
console.log("migrations complete");
