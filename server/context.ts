// tRPC context setup
// Creates context for each request with user authentication and services

import { inferAsyncReturnType } from '@trpc/server'
import { CreateNextContextOptions } from '@trpc/server/adapters/next'
import prisma from '../lib/prisma'
import { AIService } from '../services/ai-service'
import { QueueService } from '../services/queue-service'

export async function createContext(opts: CreateNextContextOptions) {
  const { req, res } = opts

  // Extract auth token from header
  const token = req.headers.authorization?.replace('Bearer ', '')

  // Get user from session if authenticated
  let user = null
  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (session && session.expiresAt > new Date()) {
      user = session.user
    }
  }

  // Initialize services for this request
  const aiService = new AIService()
  const queueService = new QueueService()

  return {
    req,
    res,
    prisma,
    user,
    aiService,
    queueService,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
