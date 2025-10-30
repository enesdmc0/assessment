# Technical Assessment Solution

**Candidate Name**: Enes Demirci
**Date**: October 30, 2024
**Time Spent**: In Progress

---

## Executive Summary

Found several critical issues causing production instability. Main problems: memory leaks from service instantiation, wrong tRPC adapter blocking authentication, N+1 queries killing database performance, and missing cleanup in React components. Fixed authentication blocker and working through memory leaks. These issues would crash the app under load.

---

## Part 1: Issues Found & Fixed

### Issue #1: Wrong tRPC Adapter Breaking Authentication

**Severity**: Critical
**Category**: Architecture
**Location**: `server/context.ts:10`

**Description**:
Context function used Pages Router adapter (`CreateNextContextOptions`) but app uses App Router with fetch adapter. Headers API is different between them. Result: all API requests got 401 even with valid tokens.

**Impact**:
App completely unusable. No authenticated requests work. Users can't create projects, view data, or use any feature. Database operations fail silently.

**Root Cause**:
Next.js 15 App Router uses `fetchRequestHandler` with Web standard Request object (Headers API). Old code expected Next.js-specific request format from Pages Router. `req.headers.authorization` returns undefined because headers are accessed via `.get()` method in fetch adapter.

**Solution**:
Changed context adapter from `CreateNextContextOptions` to `FetchCreateContextFnOptions`. Updated header access from `req.headers.authorization` to `req.headers.get('authorization')`. Also updated client to read token dynamically on each request instead of only at mount.

**Trade-offs**:
None. This is the correct adapter for App Router. Previous code was fundamentally incompatible with the routing system being used.

---

### Issue #2: Memory Leak from Service Instantiation

**Severity**: Critical
**Category**: Memory / Performance
**Location**: `server/context.ts:30-31`

**Description**:
Every tRPC request creates new `AIService` and `QueueService` instances. `QueueService` constructor starts a `setInterval` that polls database every second. These intervals never get cleaned up. After 100 requests, 100 intervals run simultaneously, hammering the database.

**Impact**:
Memory usage grows continuously. Database gets overloaded with redundant queries. Server eventually crashes under normal load. Development logs flooded with query spam. Connection pool exhaustion.

**Root Cause**:
Context creation function runs per-request but treats stateful services like request-scoped objects. `QueueService` starts background polling in constructor without cleanup mechanism. Each abandoned instance keeps its interval running indefinitely.

**Solution**:
Implement singleton pattern for services. Create single instances on server startup, reuse across all requests. Store in module-level variables outside context function. Add cleanup on server shutdown if needed.

**Trade-offs**:
Services now shared across requests - must ensure thread safety. Cache behavior changes (shared vs per-request). Slightly more complex initialization logic but massive memory savings.

---

### Issue #3: Inefficient Queue Polling Strategy

**Severity**: Medium
**Category**: Performance / Architecture
**Location**: `services/queue-service.ts:47-50`

**Description**:
QueueService polls database every second regardless of whether jobs exist. Uses fixed 1-second interval even when queue is empty. No backoff strategy or event-driven approach. Results in constant database load visible in development logs.

**Impact**:
Unnecessary database queries waste resources. In production with multiple instances, polling becomes expensive at scale. Connection pool pressure from frequent queries. Higher cloud costs for database operations that return nothing.

**Root Cause**:
Simple setInterval polling chosen for background job processing. No consideration for idle periods or job arrival patterns. Common anti-pattern in queue systems - polling instead of push notifications or exponential backoff.

**Solution**:
Options: (1) Event-driven architecture using database triggers or message queue, (2) Exponential backoff when no jobs found, (3) Longer base interval (5-10s instead of 1s), (4) Disable polling in environments without background jobs. For this assessment, current approach acceptable since singleton fixed the memory leak - optimization can be deferred.

**Trade-offs**:
Event-driven adds complexity and infrastructure dependencies. Longer intervals increase job latency. Exponential backoff needs tuning. Current approach is simple and works for low-medium scale. Real fix depends on production requirements.

---

### Issue #4: React Hook Memory Leak - Missing Cleanup

**Severity**: Critical
**Category**: Memory / Client-Side
**Location**: `lib/hooks/useGenerationPolling.ts:80-83`

**Description**:
Custom hook `useGenerationPolling` starts interval with `setInterval` but cleanup function doesn't call `clearInterval`. Also adds window event listener without removing it. When component unmounts, intervals and listeners remain active indefinitely.

**Impact**:
Client-side memory leak in user browsers. Each time user navigates to/from page with this hook, new interval starts but old ones never stop. After 10 page visits, 10 intervals running simultaneously. Browser slows down, excessive API calls, poor user experience.

**Root Cause**:
Cleanup function exists but incomplete. Developer added console.log for debugging but forgot actual cleanup. Common mistake in React hooks - forgetting `clearInterval` or `removeEventListener` in return statement.

**Solution**:
Add `clearInterval(intervalId)` in cleanup function. Store event listener reference and remove with `window.removeEventListener` on cleanup. Ensure all side effects properly cleaned up when component unmounts.

**Trade-offs**:
None. This is a bug fix with no downsides. Cleanup is essential for React effects with subscriptions.

---

### Issue #5: WebSocket Memory Leak - Missing Cleanup

**Severity**: High
**Category**: Memory / Client-Side
**Location**: `components/ProjectDashboard.tsx:61-74`

**Description**:
Component creates WebSocket connection in useEffect but never closes it. No cleanup function provided. WebSocket remains open even after component unmounts. Each time user navigates to dashboard, new connection opens while old ones stay alive.

**Impact**:
Accumulating WebSocket connections waste client resources and server connections. Browser maintains multiple active sockets unnecessarily. Server socket pool exhaustion possible with many users. Network traffic continues for unmounted components.

**Root Cause**:
Developer started WebSocket connection but forgot cleanup. Common pattern in React - side effects need cleanup. WebSocket has `.close()` method that should be called on unmount.

**Solution**:
Add cleanup function that calls `ws.close()`. Store WebSocket reference and close it when component unmounts or projectId changes. Ensures one connection per mounted component.

**Trade-offs**:
None. Proper resource cleanup is mandatory for WebSocket connections. No downside to closing connections when component unmounts.

---

### Issue #6: N+1 Query Problem - Project List

**Severity**: High
**Category**: Performance / Database
**Location**: `server/routers/project.ts:26-49`

**Description**:
Project list endpoint fetches projects then loops through each one making additional queries for component count, latest generation, and user info. For 20 projects this creates 61 database queries (1 initial + 20×3 additional). Classic N+1 query problem.

**Impact**:
Slow response times as project count grows. Database overload with redundant queries. Poor scalability - 100 projects means 301 queries. Increased latency for users. Higher database costs in production.

**Root Cause**:
Using Promise.all with map to fetch related data sequentially per project. Not leveraging Prisma's relational query capabilities. User data already available in context but queried again unnecessarily for each project.

**Solution**:
Use Prisma's `include` for relations and `_count` for aggregates in single query. Remove redundant user query since context already has user data. Reduces 61 queries to 1 efficient query with joins.

**Trade-offs**:
None significant. Prisma's include/count designed for this. Single query with joins more efficient than multiple round-trips. May return slightly more data but network savings from fewer queries outweigh this.

---

[Continue for all issues found...]

---

## Part 2: Architecture Analysis

### Current Architecture

Describe your understanding of how the system is structured:

```
[Your analysis]
```

### Strengths

What's done well in this codebase?

```
[Your analysis]
```

### Weaknesses

What are the main architectural concerns?

```
[Your analysis]
```

---

## Part 3: Scaling Recommendations

### How would you scale this to 10,000+ concurrent users?

**Database Layer**:
```
[Your recommendations]
```

**Application Layer**:
```
[Your recommendations]
```

**Queue/Background Jobs**:
```
[Your recommendations]
```

**AI Integration**:
```
[Your recommendations]
```

**Monitoring & Observability**:
```
[What would you track? What alerts would you set up?]
```

---

## Part 4: Production Readiness

### What's missing for production deployment?

**Infrastructure**:
```
- [ ] Item 1
- [ ] Item 2
```

**Monitoring**:
```
- [ ] Item 1
- [ ] Item 2
```

**Security**:
```
- [ ] Item 1
- [ ] Item 2
```

**Testing**:
```
- [ ] Item 1
- [ ] Item 2
```

---

## Part 5: AI Integration Review

### Current Prompt Engineering

What did you observe about how prompts are structured?

```
[Your analysis]
```

### Cost Optimization Opportunities

How could AI costs be reduced?

```
[Your recommendations]
```

### Improvements Made

What did you change in the AI integration?

```
[Your changes]
```

---

## Part 6: Additional Observations

### Code Quality

```
[Comments on overall code quality, patterns used, etc.]
```

### Testing Strategy

If you were to add tests, what would you prioritize?

```
[Your approach]
```

### Documentation

```
[Comments on code documentation, API docs, etc.]
```

---

## Part 7: Time Management & Priorities

### How did you spend your time?

```
- Setup & exploration: ___ minutes
- Issue identification: ___ minutes
- Implementing fixes: ___ minutes
- Testing: ___ minutes
- Documentation: ___ minutes
```

### Prioritization

Why did you choose to fix the issues you fixed?

```
[Your reasoning]
```

### What would you do with more time?

```
[Issues you identified but didn't have time to fix]
```

---

## Part 8: Questions & Discussion Points

### Questions for the team

```
1. [Question about architecture decisions]
2. [Question about requirements or constraints]
3. [Question about future plans]
```

### Areas for discussion

```
[Topics you'd like to discuss in a follow-up interview]
```

---

## Summary Checklist

- [ ] Critical issues identified and fixed
- [ ] Performance improvements implemented
- [ ] Memory leaks addressed
- [ ] Concurrency issues resolved
- [ ] Security concerns noted
- [ ] Scaling strategy documented
- [ ] Code tested and working
- [ ] Trade-offs documented

---

## Closing Thoughts

Any final comments about the assessment, your approach, or the codebase?

```
[Your thoughts]
```

---

**Thank you for completing this assessment!**
