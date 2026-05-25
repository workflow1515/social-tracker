import { NextAuthOptions, getServerSession as _getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "./permissions";

declare module "next-auth" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Session { user: SessionUser }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface User extends SessionUser {}
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface JWT extends SessionUser {}
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge:   24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text"     },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.is_active) return null;

        const passwordOk = await bcrypt.compare(credentials.password, user.password_hash);
        if (!passwordOk) return null;

        const sessionUser: SessionUser = {
          id:       user.id,
          username: user.username,
          name:     user.name,
          role:     user.role,
        };

        return sessionUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
      }
      return token;
    },
    session({ session, token }) {
      if (!token.id) return session;
      session.user = {
        id:       token.id       as string,
        username: token.username as string,
        name:     token.name     as string,
        role:     token.role     as SessionUser["role"],
      };
      return session;
    },
  },
};

export const getServerSession = () => _getServerSession(authOptions);
