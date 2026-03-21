import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { validateCredentials } from "@/lib/accounts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const account = validateCredentials(
          credentials?.email as string,
          credentials?.password as string
        );
        if (!account) return null;
        return {
          id: account.email,
          email: account.email,
          name: account.profile.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
