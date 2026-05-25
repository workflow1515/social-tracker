export type SessionUser = {
  id: string
  username: string
  name: string
  role: "admin" | "user"
}

export const isAdmin = (u: SessionUser) => u.role === "admin"
