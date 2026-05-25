import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect:
     *   - all dashboard routes  (/(dashboard)/*)
     *   - /youtube, /instagram, /twitter (top-level redirects)
     *   - /api routes EXCEPT:
     *       - /api/auth/** (NextAuth)
     *       - /api/cron/** (protected by CRON_SECRET bearer token)
     */
    "/youtube/:path*",
    "/instagram/:path*",
    "/twitter/:path*",
    "/admin/:path*",
    "/api/youtube/:path*",
    "/api/admin/:path*",
  ],
};
