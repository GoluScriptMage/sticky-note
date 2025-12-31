# 🏗️ Sticky Sync Architecture Guide

> A beginner-friendly guide to understanding how **Clerk**, **Prisma**, and **Next.js** work together.

---

## 📚 Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Two Ways Clerk Talks to Your Database](#two-ways-clerk-talks-to-your-database)
3. [The Data Flow Explained](#the-data-flow-explained)
4. [File Structure](#file-structure)
5. [Code Implementation](#code-implementation)
6. [Best Practices](#best-practices)

---

## 🎯 The Big Picture

Think of your app as having **three separate systems**:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     CLERK       │     │    YOUR APP     │     │    DATABASE     │
│  (Auth Service) │     │   (Next.js)     │     │   (PostgreSQL)  │
│                 │     │                 │     │                 │
│  • Handles      │     │  • Your code    │     │  • Your data    │
│    Sign up      │     │  • API routes   │     │  • Users table  │
│  • Handles      │     │  • Server       │     │  • Notes table  │
│    Sign in      │     │    Actions      │     │  • etc.         │
│  • Stores       │     │                 │     │                 │
│    passwords    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 🤔 The Key Question

> "If Clerk handles users, why do I need a User table in MY database?"

**Answer:** Clerk stores **authentication data** (email, password, login sessions). But YOUR app needs to store **business data** (user's notes, preferences, settings). You need to **link** them.

---

## 🔄 Two Ways Clerk Talks to Your Database

### Method 1: Webhooks (Server-to-Server) ⭐ RECOMMENDED

```
USER SIGNS UP ON CLERK
        │
        ▼
┌───────────────────┐
│  Clerk's Server   │
│  "New user just   │
│   signed up!"     │
└─────────┬─────────┘
          │
          │ HTTP POST (Webhook)
          ▼
┌───────────────────┐
│  Your API Route   │
│  /api/webhooks/   │
│      clerk        │
└─────────┬─────────┘
          │
          │ Create user in DB
          ▼
┌───────────────────┐
│  Your Database    │
│  (Prisma)         │
└───────────────────┘
```

**When to use:** Creating/updating/deleting users in your DB.

**Why it's better:**

- Happens automatically when user signs up
- Works even if user closes browser immediately
- Server-to-server = reliable

---

### Method 2: Client-Side Access (On-Demand)

```
USER OPENS YOUR APP
        │
        ▼
┌───────────────────┐
│  Your Page/       │
│  Component        │
│                   │
│  const { userId } │◄──── Clerk gives you this
│   = await auth()  │      automatically
└─────────┬─────────┘
          │
          │ Query with clerkId
          ▼
┌───────────────────┐
│  Your Database    │
│                   │
│  WHERE clerkId =  │
│    "user_123"     │
└───────────────────┘
```

**When to use:** Fetching user's data (notes, settings, etc.)

**Why it's useful:**

- You already have the userId from Clerk
- Just use it to query YOUR database

---

## 🔀 The Data Flow Explained

### Complete Flow: User Signs Up → Creates Note → Fetches Notes

```
STEP 1: SIGN UP
══════════════════════════════════════════════════════════════════

  User clicks "Sign Up"
         │
         ▼
  ┌─────────────┐    Webhook     ┌─────────────┐
  │   CLERK     │ ─────────────► │  YOUR API   │
  │             │                │  /api/      │
  │ Creates     │                │  webhooks/  │
  │ user_abc123 │                │  clerk      │
  └─────────────┘                └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  DATABASE   │
                                 │             │
                                 │ INSERT INTO │
                                 │ User(       │
                                 │  clerkId:   │
                                 │  "user_abc" │
                                 │ )           │
                                 └─────────────┘


STEP 2: USER CREATES A NOTE
══════════════════════════════════════════════════════════════════

  User writes note & clicks "Save"
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  Server Action: createNote()            │
  │                                         │
  │  1. const { userId } = await auth()     │ ◄── Get clerkId
  │  2. Find user in DB by clerkId          │
  │  3. Create note linked to that user     │
  └─────────────────────────────────────────┘
         │
         ▼
  ┌─────────────┐
  │  DATABASE   │
  │             │
  │  Note {     │
  │   content,  │
  │   userId    │◄── Links to YOUR User table
  │  }          │
  └─────────────┘


STEP 3: USER FETCHES THEIR NOTES
══════════════════════════════════════════════════════════════════

  User opens dashboard
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  Server Component or Server Action      │
  │                                         │
  │  1. const { userId } = await auth()     │ ◄── clerkId
  │  2. Find user WHERE clerkId = userId    │
  │  3. Get notes WHERE userId = user.id    │
  └─────────────────────────────────────────┘
         │
         ▼
  ┌─────────────┐
  │  Returns    │
  │  [          │
  │   {note 1}, │
  │   {note 2}, │
  │  ]          │
  └─────────────┘
```

---

## 📁 File Structure

```
stickysync-frontend/
│
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts        ← Webhook handler
│   │
│   ├── (auth)/                     ← Auth pages (grouped)
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx
│   │   └── sign-up/
│   │       └── [[...sign-up]]/
│   │           └── page.tsx
│   │
│   ├── dashboard/
│   │   └── page.tsx                ← Protected page
│   │
│   ├── layout.tsx                  ← ClerkProvider wraps here
│   └── page.tsx
│
├── lib/
│   ├── db.ts                       ← Prisma client
│   └── actions/
│       └── user.actions.ts         ← Server Actions
│
├── prisma/
│   └── schema.prisma               ← Database schema
│
├── middleware.ts                   ← Clerk middleware (protects routes)
│
└── .env.local                      ← Clerk keys + Database URL
```

---

## 💻 Code Implementation

### 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Your User table - LINKED to Clerk via clerkId
model User {
  id        String   @id @default(cuid())    // Your internal ID
  clerkId   String   @unique                 // Clerk's user ID (the link!)
  email     String   @unique
  name      String?
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  notes     Note[]                           // User has many notes
}

model Note {
  id        String   @id @default(cuid())
  content   String
  x         Float    @default(0)
  y         Float    @default(0)
  color     String   @default("yellow")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relation to User
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Why `clerkId` is separate from `id`?**

- `id` = Your internal ID (used in relations)
- `clerkId` = Clerk's ID (used to find user when Clerk gives you userId)

---

### 2. Webhook Handler (`app/api/webhooks/clerk/route.ts`)

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  // 1. Get the webhook secret from env
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  // 2. Get headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // 3. Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  // 5. Handle the event
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // Create user in YOUR database
    await db.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0]?.email_address ?? "",
        name: `${first_name || ""} ${last_name || ""}`.trim() || null,
        imageUrl: image_url || null,
      },
    });

    console.log(`✅ User created in DB: ${id}`);
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await db.user.update({
      where: { clerkId: id },
      data: {
        email: email_addresses[0]?.email_address ?? "",
        name: `${first_name || ""} ${last_name || ""}`.trim() || null,
        imageUrl: image_url || null,
      },
    });

    console.log(`✅ User updated in DB: ${id}`);
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    await db.user.delete({
      where: { clerkId: id },
    });

    console.log(`✅ User deleted from DB: ${id}`);
  }

  return new Response("OK", { status: 200 });
}
```

---

### 3. Server Action to Fetch User's Notes (`lib/actions/user.actions.ts`)

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Get current user from YOUR database
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

// Get user's notes
export async function getUserNotes() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find user in YOUR database
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user.notes;
}

// Create a new note
export async function createNote(content: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const note = await db.note.create({
    data: {
      content,
      userId: user.id, // Use YOUR user's ID, not clerkId
    },
  });

  return note;
}
```

---

### 4. Using in a Server Component (`app/dashboard/page.tsx`)

```tsx
import { getUserNotes } from "@/lib/actions/user.actions";

export default async function DashboardPage() {
  const notes = await getUserNotes();

  return (
    <div>
      <h1>Your Notes</h1>
      {notes.map((note) => (
        <div key={note.id}>{note.content}</div>
      ))}
    </div>
  );
}
```

---

## ✅ Best Practices

### For Clerk

| Do ✅                             | Don't ❌                                   |
| --------------------------------- | ------------------------------------------ |
| Use webhooks for user sync        | Don't manually create users on sign-in     |
| Store `clerkId` in your DB        | Don't store passwords (Clerk handles this) |
| Use `auth()` in Server Components | Don't expose Clerk secret keys             |
| Protect routes with middleware    | Don't trust client-side auth alone         |

### For Prisma

| Do ✅                               | Don't ❌                                         |
| ----------------------------------- | ------------------------------------------------ |
| Use a single Prisma client instance | Don't create new `PrismaClient()` per request    |
| Use relations (`@relation`)         | Don't store IDs without relations                |
| Run migrations in development       | Don't push directly to production DB             |
| Use `cuid()` or `uuid()` for IDs    | Don't use auto-increment for distributed systems |

### For Next.js 16

| Do ✅                            | Don't ❌                                      |
| -------------------------------- | --------------------------------------------- |
| Use Server Components by default | Don't use `"use client"` everywhere           |
| Use Server Actions for mutations | Don't create API routes for simple operations |
| Co-locate components with pages  | Don't dump everything in `/components`        |
| Use `loading.tsx` for suspense   | Don't show blank screens while loading        |

---

## 🔧 Setup Checklist

1. **Install dependencies:**

   ```bash
   npm install @clerk/nextjs @prisma/client svix
   npm install -D prisma
   ```

2. **Set up environment variables (`.env.local`):**

   ```env
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   CLERK_WEBHOOK_SECRET=whsec_xxx

   # Clerk URLs
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/stickysync"
   ```

3. **Initialize Prisma:**

   ```bash
   npx prisma init
   npx prisma db push   # In development
   npx prisma generate  # Generate client
   ```

4. **Set up Clerk webhook in dashboard:**
   - Go to Clerk Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret to `CLERK_WEBHOOK_SECRET`

---

## 🎓 Key Takeaways

1. **Clerk = Authentication** (who you are)
2. **Your DB = Application Data** (what you own)
3. **`clerkId` = The Bridge** (links both systems)
4. **Webhooks = Auto-sync** (keeps your DB in sync with Clerk)
5. **`auth()` = Get current user** (use it everywhere on server)

---

_Created for Sticky Sync project - Happy coding! 🚀_
