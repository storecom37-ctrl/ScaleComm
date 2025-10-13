import NextAuth from "next-auth"
import { externalAuthConfig } from "./external-auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth(externalAuthConfig)
