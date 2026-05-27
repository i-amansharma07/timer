import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const timerSession = await prisma.timerSession.create({
    data: {
      userId: session.user.id,
      status: "RUNNING",
      lastResumedAt: new Date(),
      totalElapsedMs: 0,
    },
  })

  return Response.json(timerSession)
}
