import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type Role = "super_admin" | "school_admin" | "teacher" | "accountant";

export interface TokenPayload {
  userId: number;
  schoolId: number | null; // null for super_admin
  role: Role;
}

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing env var JWT_SECRET");
  return s;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "8h";
  return jwt.sign(payload, jwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, jwtSecret()) as TokenPayload;
}
