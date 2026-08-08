import { Link, Outlet } from "@tanstack/react-router"
import { BarChart3, CalendarDays, LogOut, TicketCheck } from "lucide-react"
import { Brand } from "@/components/Brand"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"

const linkClass =
  "flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-navy/70 transition-colors hover:bg-sky/10 hover:text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50 [&.active]:bg-navy [&.active]:text-white"

export function AdminShell() {
  const { logout, user } = useAuth()
  return (
    <div className="min-h-dvh bg-cream text-navy">
      <a className="skip-link" href="#admin-content">
        Skip to content
      </a>
      <header className="border-b border-navy/10 bg-cloud">
        <div className="page-container flex min-h-18 flex-wrap items-center justify-between gap-3 py-2">
          <Brand />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-navy/70 sm:inline">{user?.email}</span>
            <Button variant="outline" className="min-h-11" onClick={logout}>
              <LogOut aria-hidden="true" /> Log out
            </Button>
          </div>
        </div>
      </header>
      <div className="page-container grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Staff navigation"
          className="flex gap-2 overflow-x-auto lg:flex-col"
        >
          <Link
            to="/admin"
            className={linkClass}
            activeOptions={{ exact: true }}
          >
            <BarChart3 aria-hidden="true" /> Overview
          </Link>
          <Link to="/admin/flights" className={linkClass}>
            <CalendarDays aria-hidden="true" /> Flights
          </Link>
          <Link to="/admin/bookings" className={linkClass}>
            <TicketCheck aria-hidden="true" /> Bookings
          </Link>
        </nav>
        <main id="admin-content" tabIndex={-1} className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
