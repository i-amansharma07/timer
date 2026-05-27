interface DayEntry {
  date: string
  totalMs: number
}

interface Props {
  history: DayEntry[]
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, "0")}m`
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function HistoryLog({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-gray-600 text-sm">No sessions recorded yet.</p>
  }

  return (
    <div className="divide-y divide-gray-800/60">
      {history.map(({ date, totalMs }) => (
        <div key={date} className="flex justify-between items-center py-3">
          <span className="text-gray-400 text-sm">{formatDate(date)}</span>
          <span className="font-mono text-white font-medium">{formatDuration(totalMs)}</span>
        </div>
      ))}
    </div>
  )
}
