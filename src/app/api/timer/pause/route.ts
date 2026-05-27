import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const timerSession = await prisma.timerSession.findFirst({
    where: { userId: session.user.id, status: "RUNNING" },
  })

  if (!timerSession) {
    return Response.json({ error: "No running session" }, { status: 404 })
  }

  const now = new Date()
  const elapsed = timerSession.lastResumedAt
    ? now.getTime() - timerSession.lastResumedAt.getTime()
    : 0

  const updated = await prisma.timerSession.update({
    where: { id: timerSession.id },
    data: {
      status: "PAUSED",
      totalElapsedMs: timerSession.totalElapsedMs + elapsed,
      lastResumedAt: null,
    },
  })

  return Response.json(updated)
}
