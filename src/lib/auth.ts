import { NextRequest } from "next/server";

import { verifyToken, type JWTPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedInternalUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "ACADEMIC";
  studentNumber: string | null;
  academicTitle: string | null;
  department: string | null;
}

export interface AuthenticatedStaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "UNIT_MANAGER" | "UNIT_STAFF";
  unitId: number | null;
}

export type SessionUser =
  | { type: "INTERNAL"; user: AuthenticatedInternalUser }
  | { type: "STAFF"; user: AuthenticatedStaffUser };

function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("auth_token")?.value ?? null;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  if (payload.type === "INTERNAL_USER") {
    const internalUser = await prisma.internalUser.findUnique({
      where: {
        id: parseInt(String(payload.id), 10),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        studentNumber: true,
        academicTitle: true,
        department: true,
        isActive: true,
      },
    });

    if (!internalUser || !internalUser.isActive) {
      return null;
    }

    return {
      type: "INTERNAL",
      user: internalUser,
    };
  }

  if (!payload.staffUserId) {
    return null;
  }

  const staffUser = await prisma.staffUser.findUnique({
    where: {
      id: payload.staffUserId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      unitId: true,
      isActive: true,
    },
  });

  if (!staffUser || !staffUser.isActive) {
    return null;
  }

  return {
    type: "STAFF",
    user: staffUser,
  };
}

export function getDashboardPathForPayload(
  payload: JWTPayload
): string {
  if (payload.type === "INTERNAL_USER") {
    return payload.role === "ACADEMIC"
      ? "/dashboard/akademik"
      : "/dashboard/ogrenci";
  }

  switch (payload.role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "UNIT_MANAGER":
      return "/dashboard/birim-muduru";
    case "UNIT_STAFF":
      return "/dashboard/birim-personeli";
    default:
      return "/dashboard/personel";
  }
}
