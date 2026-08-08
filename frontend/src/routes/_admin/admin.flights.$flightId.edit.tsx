import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { AdminFlightForm } from "@/components/AdminFlightForm"
import { ErrorPanel, LoadingPanel } from "@/components/StatusPanel"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api"

export const Route = createFileRoute("/_admin/admin/flights/$flightId/edit")({
  component: EditFlightPage,
  head: () => ({ meta: [{ title: "Edit flight — Tahr Air staff" }] }),
})

function EditFlightPage() {
  const { flightId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const flight = useQuery({
    queryKey: ["admin-flight", flightId],
    queryFn: () => api.admin.flight(flightId),
  })
  const update = useMutation({
    mutationFn: (values: Parameters<typeof api.admin.updateFlight>[1]) =>
      api.admin.updateFlight(flightId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flights"] })
      queryClient.invalidateQueries({ queryKey: ["admin-flight", flightId] })
      navigate({ to: "/admin/flights" })
    },
  })
  if (flight.isLoading) return <LoadingPanel label="Loading flight" />
  if (flight.isError || !flight.data)
    return <ErrorPanel retry={() => flight.refetch()} />
  return (
    <div className="max-w-4xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/admin/flights">
          <ArrowLeft /> Back to flights
        </Link>
      </Button>
      <p className="eyebrow">{flight.data.flight_number}</p>
      <h1 className="mb-7 text-4xl font-black">Edit flight</h1>
      <AdminFlightForm
        flight={flight.data}
        submitting={update.isPending}
        submitLabel="Save changes"
        onSubmit={(values) => update.mutate(values)}
        serverError={
          update.error instanceof ApiError
            ? update.error.message
            : update.isError
              ? "Changes could not be saved."
              : undefined
        }
      />
    </div>
  )
}
