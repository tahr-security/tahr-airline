import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { LockKeyhole, Plane } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Brand } from "@/components/Brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

const loginSchema = z.object({
  username: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}) satisfies z.ZodType<AccessToken>
type LoginForm = z.infer<typeof loginSchema>

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: () => {
    if (isLoggedIn()) throw redirect({ to: "/admin" })
  },
  head: () => ({ meta: [{ title: "Staff login — Tahr Air" }] }),
})

function LoginPage() {
  const { loginMutation } = useAuth()
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })
  return (
    <main className="grid min-h-dvh bg-cream lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand className="[&>span]:text-white" />
        <div className="relative z-10 max-w-lg">
          <p className="eyebrow !text-coral">Staff operations</p>
          <h2 className="text-5xl font-black leading-tight">
            Keep every journey running smoothly.
          </h2>
          <p className="mt-5 text-lg font-semibold leading-8 text-white/70">
            Manage schedules, capacity, and bookings from one focused workspace.
          </p>
        </div>
        <Plane
          className="absolute -bottom-20 -right-24 size-96 rotate-[-12deg] text-sky/20"
          aria-hidden="true"
        />
        <p className="text-sm text-white/60">Authorized Tahr Air staff only</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Brand className="mb-10 lg:hidden" />
          <div className="surface p-6 sm:p-9">
            <LockKeyhole
              className="mb-4 size-9 text-sky-ink"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-black">Staff login</h1>
            <p className="mt-2 text-navy/70">
              Sign in with your administrator credentials.
            </p>
            <form
              className="mt-7 grid gap-5"
              onSubmit={form.handleSubmit((values) =>
                loginMutation.mutate(values),
              )}
            >
              <div>
                <label className="field-label" htmlFor="username">
                  Email address
                </label>
                <Input
                  id="username"
                  type="email"
                  autoComplete="username"
                  data-testid="email-input"
                  {...form.register("username")}
                  aria-invalid={!!form.formState.errors.username}
                />
                {form.formState.errors.username && (
                  <p className="field-error">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  data-testid="password-input"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                />
                {form.formState.errors.password && (
                  <p className="field-error">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <Link
              to="/"
              className="mt-6 flex min-h-11 items-center justify-center rounded-lg font-bold text-sky-ink hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-coral/50"
            >
              Return to Tahr Air
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
