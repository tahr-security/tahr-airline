import { createFileRoute, redirect } from "@tanstack/react-router"
import { type UserPublic, UsersService } from "@/client"
import { AdminShell } from "@/components/AdminShell"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_admin")({
  component: AdminShell,
  beforeLoad: async () => {
    if (!isLoggedIn()) throw redirect({ to: "/login" })
    let user: UserPublic
    try {
      const response = await UsersService.readUserMe()
      user = response.data
    } catch {
      localStorage.removeItem("access_token")
      throw redirect({ to: "/login" })
    }
    if (!user.is_superuser) throw redirect({ to: "/" })
  },
})
