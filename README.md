# NoCode AI - Technical Assessment

A Next.js application that enables users to generate web applications using Claude AI.

## Overview

This project is a functional prototype of an AI-powered no-code platform. Your task is to review the codebase, identify performance and scalability issues, and implement fixes.

**Time Limit**: 3-4 hours
**Focus**: Production readiness, performance, and scalability

## Tech Stack

- **Next.js 15** with App Router
- **React 19**
- **tRPC** for type-safe APIs
- **Prisma ORM** with PostgreSQL
- **Anthropic Claude API** for AI generation
- **TypeScript**

## Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- Claude API key from [Anthropic](https://console.anthropic.com)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nocode_ai"
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Important**: You need both a PostgreSQL database and a Claude API key for the app to run.

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the Database (Optional but Recommended)

Populate with test data to see the performance issues in action:

\```bash
npm run seed
\```

This creates:

- 3 test users with sessions
- ~20 projects with components
- ~100+ generations
- Queue jobs in various states
- Activity logs

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. Login to the Application

When you first visit the app, you'll be redirected to the login page.

**Test Account:**

- Email: `test@example.com`

Simply enter this email and click "Sign in". The authentication system will automatically create a session for the assessment environment.

> **Note**: This is a simplified auth system for the assessment. In production, this would require proper password authentication.

## Database Setup Options

### Option A: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings → Database
4. Paste into `.env` as `DATABASE_URL`

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# Create database
createdb nocode_ai

# Update .env
DATABASE_URL="postgresql://localhost:5432/nocode_ai"
```

## Project Structure

```
├── app/                 # Next.js pages and layouts
├── components/          # React components
├── server/             # tRPC routers and configuration
│   ├── context.ts      # Request context
│   ├── trpc.ts         # tRPC setup
│   └── routers/        # API routes
├── services/           # Business logic
│   ├── ai-service.ts   # Claude integration
│   └── queue-service.ts # Background jobs
├── lib/                # Utilities
│   └── prisma.ts       # Database client
└── prisma/             # Database schema
    └── schema.prisma   # Data models
```

## Your Tasks

1. **Review the codebase** for issues that would impact production
2. **Fix critical problems** related to performance, memory, and concurrency
3. **Document your findings** in `SOLUTION.md`
4. **Test your changes** to ensure they work

See `ASSESSMENT.md` for detailed instructions.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Run ESLint
npm run seed         # Seed database with test data
```

## Authentication

The app uses session-based authentication. For this assessment:

- Login page: `/auth/login`
- Test email: `test@example.com`
- Sessions persist for 7 days
- Auth token is stored in localStorage
- Logout button is in the top-right corner of the dashboard

## Need Help?

- **Setup issues**: Contact your interviewer
- **Assessment questions**: Work independently

## Notes

- Focus on impactful fixes over minor improvements
- Prioritize your time - you won't fix everything
- Document your reasoning and trade-offs

Good luck! 🚀
