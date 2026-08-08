import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { AdminFlightForm } from "@/components/AdminFlightForm"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"

export const Route = createFileRoute("/_admin/admin/flights/new")({
  component: NewFlightPage,
  head: () => ({ meta: [{ title: "Add flight — Tahr Air staff" }] }),
})

function NewFlightPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: api.admin.createFlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flights"] })
      navigate({ to: "/admin/flights" })
    },
  })
  return (
    <div className="max-w-4xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/admin/flights">
          <ArrowLeft /> Back to flights
        </Link>
      </Button>
      <p className="eyebrow">Schedule builder</p>
      <h1 className="mb-7 text-4xl font-black">Add a flight</h1>
      <AdminFlightForm
        submitting={create.isPending}
        submitLabel="Create flight"
        onSubmit={(values) => create.mutate(values)}
        serverError={
          create.error instanceof ApiError
            ? create.error.message
            : create.isError
              ? "Flight could not be created."
              : undefined
        }
      />
    </div>
  )
}
