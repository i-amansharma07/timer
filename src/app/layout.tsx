import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Time Tracker",
  description: "Track your work hours",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-gray-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
