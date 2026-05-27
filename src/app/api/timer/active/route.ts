import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
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

  return Response.json(timerSession)
}
