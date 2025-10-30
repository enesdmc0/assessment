// Root layout for Next.js application
// Wraps all pages with tRPC provider and global styles

import { TRPCProvider } from '@/lib/trpc-client'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoCode AI - AI-Powered Application Builder',
  description: 'Build web applications using Claude AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  )
}
