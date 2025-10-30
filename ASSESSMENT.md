# NoCode AI - Technical Assessment

## Overview

You'll be debugging and improving a Next.js application that lets users generate web applications using Claude AI. The codebase is functional but has **performance, scalability, and architectural issues** that would cause problems in production.

**Time Limit**: 3-4 hours
**Focus**: Find and fix issues that impact production readiness

---

## What We're Testing

This assessment evaluates:

1. **Performance Optimization** - Can you identify inefficient patterns in the codebase?
2. **Resource Management** - Do you understand lifecycle and cleanup best practices?
3. **Production Concerns** - Can you spot issues that would cause problems at scale?
4. **React Knowledge** - Do you know React 19 patterns and common pitfalls?
5. **System Design** - Can you think about scalability and production deployment?
6. **Code Quality** - Do you recognize anti-patterns and technical debt?

---

## The Application

**NoCode AI** is a platform where users can:

- Create projects
- Generate components using AI (Claude)
- View project statistics and activity
- Process background jobs via a queue system

**Tech Stack**:

- Next.js 15 (App Router)
- React 19
- tRPC
- Prisma + PostgreSQL
- Anthropic Claude API

---

## Getting Started

### Authentication

The application requires authentication to access. When you first run the app and visit `http://localhost:3000`, you'll be redirected to the login page.

**Test Credentials:**

- Email: `test@example.com`
- Simply enter the email and click "Sign in"

The authentication system will automatically create a session for you. Sessions are valid for 7 days and stored in `localStorage`.

> **Note**: This is a simplified authentication system for the assessment environment. Users are auto-created on first login. In production, this would require proper password authentication and security measures.

**Logout**: Use the logout button in the top-right corner of the dashboard to test the auth flow.

---

## Known Issues (From Production Monitoring)

Our monitoring shows:

1. **Server Instability**: Memory usage grows over time in development and production
2. **Performance Degradation**: Response times increase as data grows
3. **Resource Usage**: Higher cloud costs than expected for the traffic level
4. **Inconsistent Behavior**: Occasionally jobs process multiple times or not at all
5. **Client Issues**: Some users report browser slowdowns after extended use

---

## Your Tasks

### Priority 1: Find Critical Issues (2-2.5 hours)

Focus on issues that would cause production problems:

- Server crashes or instability
- Performance bottlenecks
- Data inconsistencies
- Resource leaks
- Correctness issues

### Priority 2: Suggest Improvements (1-1.5 hours)

Propose architectural improvements:

- How would you scale this to 10,000 users?
- What would you monitor in production?
- How would you reduce operational costs?
- What's missing for production readiness?

### Priority 3: Documentation (30 minutes)

Document your findings in `SOLUTION.md`:

- Issues found (with severity)
- Root cause analysis
- Your fixes
- Recommendations

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase)
- Claude API key

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma db push
npm run dev
```

Visit http://localhost:3000

---

## Deliverables

1. **Fixed Code** - Your improvements committed to the codebase
2. **SOLUTION.md** - Your analysis and recommendations
3. **Be Ready To Discuss**:
    - Your debugging process
    - Trade-offs in your solutions
    - How you'd scale this system

---

## Evaluation Criteria

**What we care about**:

- ✅ Finding the most impactful issues
- ✅ Understanding root causes (not just symptoms)
- ✅ Production-ready solutions
- ✅ Clear communication
- ✅ Scalability thinking

**What we don't care about**:

- ❌ Finding every possible issue
- ❌ Perfect code style
- ❌ Comprehensive test coverage
- ❌ Completing everything

---

## Guidelines

### Do

- Prioritize by impact (critical > nice-to-have)
- Test your fixes
- Document your reasoning
- Think about production deployment
- Be honest about time constraints

### Don't

- Try to fix everything (you won't have time)
- Rewrite from scratch
- Spend hours on minor issues
- Worry about UI/UX polish
- Over-engineer solutions

---

## Areas to Investigate

Consider reviewing these areas (not exhaustive):

- Database queries and schema design
- Service and resource initialization
- Request handling and context
- Background job processing
- Frontend component lifecycle
- External API integration
- Data fetching patterns
- State management

---

## Time Management Suggestion

- **30 min**: Setup, explore codebase, understand architecture
- **90 min**: Find and analyze issues
- **60-90 min**: Implement fixes for critical issues
- **30 min**: Document findings and recommendations

---

## Questions?

**Setup Issues**: Contact your interviewer
**Assessment Questions**: Work independently

---

**Good luck! We're interested in your thought process and prioritization as much as the fixes themselves.**
