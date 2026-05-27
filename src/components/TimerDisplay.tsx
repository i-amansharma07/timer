"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type UIStatus = "IDLE" | "RUNNING" | "PAUSED"

interface InitialSession {
  status: "RUNNING" | "PAUSED"
  totalElapsedMs: number
  lastResumedAt: string | null
}

interface Props {
  initialSession: InitialSession | null
}

function formatTime(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export function TimerDisplay({ initialSession }: Props) {
  const router = useRouter()

  const initialStatus: UIStatus = !initialSession
    ? "IDLE"
    : (initialSession.status as UIStatus)

  // Avoid SSR hydration mismatch — seed frozen value, compute real elapsed in useEffect
  const [status, setStatus] = useState<UIStatus>(initialStatus)
  const [displayMs, setDisplayMs] = useState(initialSession?.totalElapsedMs ?? 0)
  const [isLoading, setIsLoading] = useState(false)

  // Accurate tick base: elapsed at last startInterval call, and when that call happened
  const tickBaseRef = useRef<{ elapsed: number; startedAt: number }>(
    initialSession?.status === "RUNNING" && initialSession.lastResumedAt
      ? {
          elapsed: initialSession.totalElapsedMs,
          startedAt: new Date(initialSession.lastResumedAt).getTime(),
        }
      : { elapsed: 0, startedAt: 0 }
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startInterval(baseElapsed: number) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const now = Date.now()
    tickBaseRef.current = { elapsed: baseElapsed, startedAt: now }
    setDisplayMs(baseElapsed)
    intervalRef.current = setInterval(() => {
      setDisplayMs(tickBaseRef.current.elapsed + (Date.now() - tickBaseRef.current.startedAt))
    }, 1000)
  }

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function currentElapsed(): number {
    return tickBaseRef.current.elapsed + (Date.now() - tickBaseRef.current.startedAt)
  }

  // Rehydrate on mount after SSR — start ticking if session was RUNNING
  useEffect(() => {
    if (initialSession?.status === "RUNNING" && initialSession.lastResumedAt) {
      const elapsed =
        initialSession.totalElapsedMs +
        (Date.now() - new Date(initialSession.lastResumedAt).getTime())
      startInterval(elapsed)
    }
    return stopInterval
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/timer/start", { method: "POST" })
      if (!res.ok) return
      setStatus("RUNNING")
      startInterval(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePause = async () => {
    const frozen = currentElapsed()
    stopInterval()
    setIsLoading(true)
    try {
      const res = await fetch("/api/timer/pause", { method: "POST" })
      if (!res.ok) {
        startInterval(frozen)
        return
      }
      setDisplayMs(frozen)
      setStatus("PAUSED")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResume = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/timer/resume", { method: "POST" })
      if (!res.ok) return
      setStatus("RUNNING")
      startInterval(displayMs)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    const wasRunning = status === "RUNNING"
    const snapshot = wasRunning ? currentElapsed() : displayMs
    stopInterval()
    setIsLoading(true)
    try {
      const res = await fetch("/api/timer/stop", { method: "POST" })
      if (!res.ok) {
        if (wasRunning) startInterval(snapshot)
        return
      }
      setDisplayMs(0)
      setStatus("IDLE")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="text-8xl font-mono font-bold tabular-nums tracking-tight">
        {formatTime(displayMs)}
      </div>

      <div className="flex gap-3">
        {status === "IDLE" && (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="px-10 py-3 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
        )}

        {status === "RUNNING" && (
          <>
            <button
              onClick={handlePause}
              disabled={isLoading}
              className="px-10 py-3 bg-amber-500 text-white rounded-xl text-base font-semibold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Pause
            </button>
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="px-10 py-3 bg-red-600 text-white rounded-xl text-base font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stop
            </button>
          </>
        )}

        {status === "PAUSED" && (
          <>
            <button
              onClick={handleResume}
              disabled={isLoading}
              className="px-10 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Resume
            </button>
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="px-10 py-3 bg-red-600 text-white rounded-xl text-base font-semibold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}
