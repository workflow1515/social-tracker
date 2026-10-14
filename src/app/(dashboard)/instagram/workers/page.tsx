import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"
import { WorkersPageClient } from "@/components/instagram/WorkersPageClient"

export default async function InstagramWorkersPage() {
  const session = await getServerSession()
  if (!session) return null
  if (!isAdmin(session.user)) return null

  let workers: Awaited<ReturnType<typeof igApi.listWorkers>> = []
  let serviceError: string | null = null
  try {
    workers = await igApi.listWorkers()
  } catch (err) {
    serviceError = err instanceof InstagramTrackerError ? err.message : "Failed to load worker accounts."
  }

  return <WorkersPageClient workers={workers} serviceError={serviceError} />
}
