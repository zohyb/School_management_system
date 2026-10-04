import mysql from "mysql2/promise";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var ${name}`);
  return v;
}

// Railway's MySQL plugin exposes MYSQL* variables; accept them as fallbacks
// so the service works without manual variable mapping.
export const pool = mysql.createPool({
  host: env("DB_HOST", process.env.MYSQLHOST ?? "localhost"),
  port: Number(env("DB_PORT", process.env.MYSQLPORT ?? "3306")),
  user: env("DB_USER", process.env.MYSQLUSER ?? "sms"),
  password: env("DB_PASSWORD", process.env.MYSQLPASSWORD ?? "smspass123"),
  database: env("DB_NAME", process.env.MYSQLDATABASE ?? "sms"),
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

export type Row = Record<string, unknown>;

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  // mysql2 types its values loosely; the helper keeps a strict unknown[] surface.
  const [rows] = await pool.execute(sql, params as never);
  return rows as T[];
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** For INSERT/UPDATE/DELETE: returns the raw OkPacket (insertId, affectedRows). */
export async function execute(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params as never);
  return result as { insertId: number; affectedRows: number };
}
