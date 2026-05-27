import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const timerSession = await prisma.timerSession.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["RUNNING", "PAUSED"] },
    },
  })

  if (!timerSession) {
    return Response.json({ error: "No active session" }, { status: 404 })
  }

  const now = new Date()
  const additionalElapsed =
    timerSession.status === "RUNNING" && timerSession.lastResumedAt
      ? now.getTime() - timerSession.lastResumedAt.getTime()
      : 0

  const updated = await prisma.timerSession.update({
    where: { id: timerSession.id },
    data: {
      status: "STOPPED",
      totalElapsedMs: timerSession.totalElapsedMs + additionalElapsed,
      lastResumedAt: null,
      stoppedAt: now,
    },
  })

  return Response.json(updated)
}
