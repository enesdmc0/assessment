// tRPC context setup
// Creates context for each request with user authentication and services

import { inferAsyncReturnType } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import prisma from '../lib/prisma'
import { AIService } from '../services/ai-service'
import { QueueService } from '../services/queue-service'

// Singleton instances to reuse across requests
let aiServiceInstance: AIService | null = null
let queueServiceInstance: QueueService | null = null

function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService()
  }
  return aiServiceInstance
}

function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService()
  }
  return queueServiceInstance
}

export async function createContext(opts: FetchCreateContextFnOptions) {
  const { req } = opts

  // Extract auth token from header
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

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

  const aiService = getAIService()
  const queueService = getQueueService()

  return {
    req,
    prisma,
    user,
    aiService,
    queueService,
  }
}

export type Context = inferAsyncReturnType<typeof createContext>
