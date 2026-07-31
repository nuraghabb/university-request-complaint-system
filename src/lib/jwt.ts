import jwt from "jsonwebtoken";

export interface JWTPayload {
  staffUserId: number;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  firstName: string;
  lastName: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET tanımlı değil. Proje kökündeki .env dosyasını kontrol edin."
    );
  }

  return secret;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "24h",
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}