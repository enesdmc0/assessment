// tRPC API handler for Next.js App Router
// Handles all tRPC requests at /api/trpc/*

import { createContext } from '@/server/context'
import { appRouter } from '@/server/routers'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            )
          }
        : undefined,
  })
}

export { handler as GET, handler as POST }
