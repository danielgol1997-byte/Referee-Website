import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      country?: string | null;
      profileComplete?: boolean;
      isActive?: boolean;
    };
  }

  interface User {
    role: Role;
    country?: string | null;
    profileComplete?: boolean;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    country?: string | null;
    profileComplete?: boolean;
    isActive?: boolean;
  }
}

