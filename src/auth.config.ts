import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

// Edge-compatible config — no Prisma, no heavy imports
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
} satisfies NextAuthConfig
