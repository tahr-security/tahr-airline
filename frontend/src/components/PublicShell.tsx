import { Link, Outlet } from "@tanstack/react-router"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Brand } from "@/components/Brand"

const navLink =
  "flex min-h-11 items-center rounded-lg px-3 font-bold text-navy/80 transition-colors hover:bg-sky/10 hover:text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50 [&.active]:bg-sky/15 [&.active]:text-navy"

export function PublicShell() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="min-h-dvh bg-cream text-navy">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-cloud/95 backdrop-blur">
        <div className="page-container flex min-h-18 items-center justify-between gap-5">
          <Brand />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-navy/15 text-navy md:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            aria-label="Main navigation"
            className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-navy/10 bg-cloud p-4 shadow-soft md:static md:flex md:flex-row md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          >
            <Link
              to="/"
              className={navLink}
              activeOptions={{ exact: true }}
              onClick={close}
            >
              Book flights
            </Link>
            <Link to="/manage" className={navLink} onClick={close}>
              Manage booking
            </Link>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-navy/10 bg-cloud">
        <div className="page-container flex flex-col gap-5 py-8 text-sm text-navy/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-navy">Tahr Air</p>
            <p>Friendly flights from Montréal to the places you love.</p>
          </div>
          <Link
            to="/login"
            className="min-h-11 self-start rounded-lg px-3 py-3 font-bold transition-colors hover:bg-sky/10 hover:text-navy focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50"
          >
            Staff login
          </Link>
        </div>
      </footer>
    </div>
  )
}
