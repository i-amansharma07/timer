import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessions = await prisma.timerSession.findMany({
    where: { userId: session.user.id, status: "STOPPED" },
    select: { totalElapsedMs: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  const grouped = new Map<string, number>()
  for (const s of sessions) {
    const day = s.createdAt.toISOString().split("T")[0]
    grouped.set(day, (grouped.get(day) ?? 0) + s.totalElapsedMs)
  }

  const result = Array.from(grouped.entries())
    .map(([date, totalMs]) => ({ date, totalMs }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return Response.json(result)
}
