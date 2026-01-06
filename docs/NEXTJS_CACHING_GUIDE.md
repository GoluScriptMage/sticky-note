# Quick Reference: Next.js Caching for StickyVerse

## 🎯 The Problem You're Solving

**Without Caching:**

- 10 users × 5 actions = 50 requests
- Each request checks user auth = **50 database queries** 😱
- Each query takes ~200ms = **10 seconds total!**

**With Caching:**

- 10 users × 5 actions = 50 requests
- Cached user lookups = **2-3 database queries** ✅
- Each query takes ~200ms = **0.5 seconds total!** 🚀

**Result: 20x faster!**

---

## 📚 Next.js Caching Types You Need

### **1. `cache()` - Request-Level Deduplication**

**What it does:** Multiple calls in same request = only 1 database query

```typescript
import { cache } from "react";

export const getUser = cache(async (userId: string) => {
  console.log("🔍 Querying database for:", userId);
  return await db.user.findUnique({ where: { id: userId } });
});

// Usage
const user1 = await getUser("123"); // ← Queries database
const user2 = await getUser("123"); // ← Returns cached result!
const user3 = await getUser("123"); // ← Returns cached result!
// Only 1 database query total! 🎉
```

**When to use:**

- ✅ Server Components
- ✅ Server Actions
- ✅ User authentication checks
- ✅ Any data fetched multiple times in same request

**Cache lifetime:** Single request only (resets between requests)

---

### **2. `unstable_cache()` - Time-Based Caching**

**What it does:** Cache data for X seconds across ALL requests

```typescript
import { unstable_cache } from "next/cache";

export const getUserCached = unstable_cache(
  async (userId: string) => {
    return await db.user.findUnique({ where: { id: userId } });
  },
  ["user-by-id"], // Cache key prefix
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ["users"], // For manual invalidation
  }
);

// Usage
const user = await getUserCached("123"); // ← Queries database
// ... 30 seconds later ...
const user2 = await getUserCached("123"); // ← Returns cached result!
// ... 70 seconds later ...
const user3 = await getUserCached("123"); // ← Queries database again (cache expired)
```

**When to use:**

- ✅ Data that doesn't change often (user profiles, room details)
- ✅ Expensive queries
- ❌ Data that changes frequently (note positions)

**Cache lifetime:** Configurable (seconds, minutes, hours)

---

### **3. Manual Cache Invalidation**

**What it does:** Clear cache when data changes

```typescript
import { revalidateTag } from "next/cache";

// When user updates profile
export async function updateUserProfile(userId: string, data: any) {
  await db.user.update({ where: { id: userId }, data });

  // ✅ Clear cache after update
  revalidateTag("users");
}

// Next time getUserCached() is called, it will query DB again
```

---

## 🏗️ How to Implement in Your Project

### **Step 1: Create Cache Helper** (`lib/cache.ts`)

```typescript
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

// ✅ Request-level cache (use this for auth checks)
export const getCurrentUser = cache(async () => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  return await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      email: true,
      username: true,
      imageUrl: true,
    },
  });
});

// ✅ Time-based cache (use for room details)
export const getRoomById = unstable_cache(
  async (roomId: string) => {
    return await db.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        owner: { select: { id: true, username: true } },
        users: { select: { id: true, username: true } },
      },
    });
  },
  ["room-details"],
  { revalidate: 30, tags: ["rooms"] }
);
```

---

### **Step 2: Use in Server Actions**

```typescript
// lib/actions/note-actions.ts
"use server";

import { getCurrentUser } from "@/lib/cache";

export async function createNote(input: CreateNoteInput) {
  // ❌ OLD WAY (no caching)
  // const { userId } = await auth();
  // const user = await db.user.findUnique({ where: { clerkId: userId } });

  // ✅ NEW WAY (cached!)
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return await db.note.create({
    data: { ...input, createdBy: user.id },
  });
}

export async function updateNote(noteId: string, input: UpdateNoteInput) {
  const user = await getCurrentUser(); // ← Cached!
  if (!user) throw new Error("Unauthorized");

  return await db.note.update({
    where: { id: noteId, createdBy: user.id },
    data: input,
  });
}

export async function deleteNote(noteId: string) {
  const user = await getCurrentUser(); // ← Cached!
  if (!user) throw new Error("Unauthorized");

  return await db.note.delete({
    where: { id: noteId, createdBy: user.id },
  });
}
```

**Performance Impact:**

```
Without caching:
- createNote() = 1 auth query + 1 user query + 1 insert = 3 queries
- updateNote() = 1 auth query + 1 user query + 1 update = 3 queries
- deleteNote() = 1 auth query + 1 user query + 1 delete = 3 queries
Total: 9 database queries

With caching:
- createNote() = 1 auth + 1 user (cached for rest) + 1 insert = 3 queries
- updateNote() = 0 queries (auth & user cached) + 1 update = 1 query
- deleteNote() = 0 queries (auth & user cached) + 1 delete = 1 query
Total: 5 database queries (44% reduction!)
```

---

## 🎓 What You Should Learn

### **Priority: HIGH** 🔥

1. **React `cache()` function**

   - Why: Reduce duplicate queries in same request
   - Time: 10 minutes to understand
   - Use: Every Server Action that checks auth

2. **Server Actions vs API Routes**

   - Why: Server Actions have automatic caching
   - Time: 15 minutes to understand
   - Use: Replace all API routes with Server Actions

3. **Prisma `select` and `include`**
   - Why: Only fetch fields you need (reduce bandwidth)
   - Time: 10 minutes to understand
   - Use: Every database query

### **Priority: MEDIUM** ⭐

4. **`unstable_cache()` function**

   - Why: Cache expensive queries across requests
   - Time: 15 minutes to understand
   - Use: Room details, user profiles (data that rarely changes)

5. **Database indexes**

   - Why: 100x faster queries
   - Time: 10 minutes to understand
   - Use: Add `@@index` to Prisma schema

6. **Prisma transactions**
   - Why: Batch multiple operations (faster + atomic)
   - Time: 10 minutes to understand
   - Use: Auto-save (update multiple notes at once)

### **Priority: LOW** ⚡

7. **`revalidateTag()` and `revalidatePath()`**

   - Why: Clear cache when data changes
   - Time: 5 minutes to understand
   - Use: After user/room updates

8. **React Server Components**
   - Why: Better understanding of Next.js architecture
   - Time: 30 minutes to understand
   - Use: Future projects (not critical for this one)

---

## 📊 Performance Comparison

### **Scenario: 10 users, each creates 1 note**

| Approach                 | DB Queries | Time  | Notes                                     |
| ------------------------ | ---------- | ----- | ----------------------------------------- |
| No caching               | 30 queries | ~6s   | 3 queries per user (auth + user + insert) |
| `cache()` only           | 12 queries | ~2.4s | Auth + user cached per user               |
| `cache()` + indexes      | 12 queries | ~0.6s | Same queries but 4x faster                |
| `cache()` + batch insert | 11 queries | ~0.4s | Single batch insert at end                |

**Recommendation:** Start with `cache()`, add indexes. Batch operations are optional but nice.

---

## 🔧 Implementation Checklist

- [ ] Create `lib/cache.ts` with `getCurrentUser()`
- [ ] Update `note-actions.ts` to use `getCurrentUser()`
- [ ] Update `room-actions.ts` to use `getCurrentUser()`
- [ ] Update `user-action.ts` to use `getCurrentUser()`
- [ ] Add database indexes to `schema.prisma`
- [ ] Run `npm run db:push` to apply changes
- [ ] Test: Check server logs for reduced queries

**Expected Result:**

- Before: `🔍 Querying database for user...` appears 50 times
- After: `🔍 Querying database for user...` appears 5-10 times

---

## 💡 Common Mistakes to Avoid

### **Mistake 1: Using `cache()` in Client Components**

```typescript
// ❌ WRONG: cache() only works in Server Components/Actions
'use client';
import { cache } from 'react';

export const getUser = cache(async () => { ... }); // Won't work!
```

**Fix:** Only use `cache()` in server-side code

---

### **Mistake 2: Caching User-Specific Data Too Long**

```typescript
// ❌ WRONG: Caching user data for 1 hour
export const getCurrentUser = unstable_cache(
  async () => { ... },
  ['current-user'],
  { revalidate: 3600 } // Too long! User data might change
);
```

**Fix:** Use `cache()` instead (per-request), or very short revalidate time (<60s)

---

### **Mistake 3: Not Invalidating Cache After Updates**

```typescript
// ❌ WRONG: Update user but don't clear cache
export async function updateUser(userId: string, data: any) {
  await db.user.update({ where: { id: userId }, data });
  // Cache still has old data! 😱
}

// ✅ CORRECT: Clear cache after update
import { revalidateTag } from "next/cache";

export async function updateUser(userId: string, data: any) {
  await db.user.update({ where: { id: userId }, data });
  revalidateTag("users"); // Clear cache
}
```

---

## 📚 Resources to Learn More

### **Official Docs (10-15 min each):**

1. **React `cache()` function**

   - https://react.dev/reference/react/cache
   - Read: "Usage" section

2. **Next.js Caching**

   - https://nextjs.org/docs/app/building-your-application/caching
   - Read: "Request Memoization" section

3. **Server Actions**
   - https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
   - Read: "Revalidating Data" section

### **Video Tutorials (if you prefer visual learning):**

- Next.js Caching Explained: https://www.youtube.com/results?search_query=nextjs+caching+tutorial
- Server Actions Deep Dive: https://www.youtube.com/results?search_query=nextjs+server+actions

---

## 🎯 Summary: Your Action Plan

1. **Today (30 min):**

   - Create `lib/cache.ts`
   - Add `getCurrentUser()` helper
   - Update 1 server action to use it
   - Test and see the difference

2. **Tomorrow (1 hour):**

   - Update all server actions to use cache
   - Add database indexes
   - Run `npm run db:push`
   - Test performance improvements

3. **Learning (30 min):**
   - Read React `cache()` docs
   - Read Next.js caching docs
   - Understand why it works

**Result:** 10-20x faster database queries, professional-grade app! 🚀

---

**Questions to Answer:**

- ✅ Is Socket.io costly? → No, free and fast!
- ✅ Should I use Local → Others → DB flow? → Yes, perfect!
- ✅ How to reduce 200 DB queries? → Use `cache()`
- ✅ What Next.js concepts do I need? → `cache()`, Server Actions, indexes
- ✅ Where to learn more? → Docs above (1 hour total reading)
