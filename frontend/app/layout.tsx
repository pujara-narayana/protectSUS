import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CodeVault - AI Security Sentinel',
  description: 'Secure your smart contracts with agentic intelligence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
