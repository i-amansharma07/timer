import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const timerSession = await prisma.timerSession.findFirst({
    where: { userId: session.user.id, status: "PAUSED" },
  })

  if (!timerSession) {
    return Response.json({ error: "No paused session" }, { status: 404 })
  }

  const updated = await prisma.timerSession.update({
    where: { id: timerSession.id },
    data: {
      status: "RUNNING",
      lastResumedAt: new Date(),
    },
  })

  return Response.json(updated)
}
