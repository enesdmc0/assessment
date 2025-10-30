// Main tRPC router
// Aggregates all API routers

import { router } from '../trpc'
import { projectRouter } from './project'

export const appRouter = router({
  project: projectRouter,
})

export type AppRouter = typeof appRouter
