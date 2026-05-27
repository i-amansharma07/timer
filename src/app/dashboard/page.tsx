import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TimerDisplay } from "@/components/TimerDisplay"
import { HistoryLog } from "@/components/HistoryLog"

interface DayEntry {
  date: string
  totalMs: number
}

function groupByDay(sessions: { totalElapsedMs: number; createdAt: Date }[]): DayEntry[] {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const day = s.createdAt.toISOString().split("T")[0]
    map.set(day, (map.get(day) ?? 0) + s.totalElapsedMs)
  }
  return Array.from(map.entries())
    .map(([date, totalMs]) => ({ date, totalMs }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [activeSession, stoppedSessions] = await Promise.all([
    prisma.timerSession.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["RUNNING", "PAUSED"] },
      },
    }),
    prisma.timerSession.findMany({
      where: { userId: session.user.id, status: "STOPPED" },
      select: { totalElapsedMs: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const initialSession = activeSession
    ? {
        status: activeSession.status as "RUNNING" | "PAUSED",
        totalElapsedMs: activeSession.totalElapsedMs,
        lastResumedAt: activeSession.lastResumedAt?.toISOString() ?? null,
      }
    : null

  const history = groupByDay(stoppedSessions)

  return (
    <main className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-20">
          <span className="text-sm text-gray-500 font-medium">
            {session.user.name ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="flex justify-center mb-20">
          <TimerDisplay initialSession={initialSession} />
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
            History
          </h2>
          <HistoryLog history={history} />
        </div>
      </div>
    </main>
  )
}
