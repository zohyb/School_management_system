import { Request, Router } from "express";
import { z } from "zod";
import { execute, query, queryOne } from "../db.js";
import { requireAuth, requireRole, schoolId } from "../middleware/auth.js";
import { Role } from "../lib/auth.js";

export interface CrudOptions {
  table: string;
  /** columns the client may write */
  writable: string[];
  /** zod schema for create/update bodies (partial applied on update) */
  schema: z.ZodTypeAny;
  searchable?: string[];
  orderBy?: string;
  roles?: Role[];
  /** extra WHERE fragments, e.g. ["is_active = 1"] */
  where?: string[];
  /** join clause appended after FROM table, e.g. "LEFT JOIN ..." */
  join?: string;
  /** extra select columns when join is used */
  extraSelect?: string;
  softDeleteColumn?: string;
}

function likeClause(cols: string[], q: string): { clause: string; params: unknown[] } {
  if (!q || cols.length === 0) return { clause: "", params: [] };
  return {
    clause: `(${cols.map((c) => `${c} LIKE ?`).join(" OR ")})`,
    params: cols.map(() => `%${q}%`),
  };
}

export function makeCrudRouter(opts: CrudOptions): Router {
  const r = Router();
  const roles = opts.roles ?? ["school_admin", "teacher", "accountant"];
  r.use(requireAuth, requireRole(...roles));

  r.get("/", async (req: Request, res) => {
    const sid = schoolId(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const per = Math.min(100, Math.max(1, Number(req.query.per ?? 25)));
    const search = String(req.query.q ?? "");
    const where = [`t.school_id = ?`, ...(opts.where ?? [])];
    const params: unknown[] = [sid];
    const { clause, params: likeParams } = likeClause(opts.searchable ?? [], search);
    if (clause) {
      where.push(clause);
      params.push(...likeParams);
    }
    const select = opts.extraSelect ? `t.*, ${opts.extraSelect}` : `t.*`;
    const from = `FROM ${opts.table} t ${opts.join ?? ""}`;
    const total = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n ${from} WHERE ${where.join(" AND ")}`,
      params
    );
    const rows = await query(
      `SELECT ${select} ${from} WHERE ${where.join(" AND ")} ORDER BY ${opts.orderBy ?? "t.id DESC"} LIMIT ? OFFSET ?`,
      [...params, per, (page - 1) * per]
    );
    res.json({ data: rows, total: total?.n ?? 0, page, per });
  });

  r.get("/:id", async (req, res) => {
    const row = await queryOne(`SELECT * FROM ${opts.table} WHERE id = ? AND school_id = ?`, [
      req.params.id,
      schoolId(req),
    ]);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  });

  r.post("/", async (req, res) => {
    const parsed = opts.schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      return;
    }
    const data = parsed.data as Record<string, unknown>;
    const cols = opts.writable.filter((c) => data[c] !== undefined);
    const result = await execute(
      `INSERT INTO ${opts.table} (school_id, ${cols.join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`,
      [schoolId(req), ...cols.map((c) => data[c])]
    );
    const row = await queryOne(`SELECT * FROM ${opts.table} WHERE id = ?`, [result.insertId]);
    res.status(201).json(row);
  });

  r.patch("/:id", async (req, res) => {
    const parsed = (opts.schema as z.ZodObject<Record<string, z.ZodTypeAny>>).partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    const data = parsed.data as Record<string, unknown>;
    const cols = opts.writable.filter((c) => data[c] !== undefined);
    if (cols.length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }
    const n = await query(
      `UPDATE ${opts.table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ? AND school_id = ?`,
      [...cols.map((c) => data[c]), req.params.id, schoolId(req)]
    );
    if ((n as unknown as { affectedRows: number }).affectedRows === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const row = await queryOne(`SELECT * FROM ${opts.table} WHERE id = ?`, [req.params.id]);
    res.json(row);
  });

  r.delete("/:id", async (req, res) => {
    const sid = schoolId(req);
    if (opts.softDeleteColumn) {
      await query(`UPDATE ${opts.table} SET ${opts.softDeleteColumn} = 0 WHERE id = ? AND school_id = ?`, [
        req.params.id,
        sid,
      ]);
    } else {
      await query(`DELETE FROM ${opts.table} WHERE id = ? AND school_id = ?`, [req.params.id, sid]);
    }
    res.json({ ok: true });
  });

  return r;
}
