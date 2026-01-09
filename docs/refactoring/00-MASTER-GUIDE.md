
# 🎯 Sticky Sync - Master Refactoring Guide

> **Goal**: Transform messy code into clean, professional, maintainable code while learning modern React/Next.js best practices.

---

## 📋 Table of Contents

1. [Current Problems Identified](#current-problems-identified)
2. [Target Architecture](#target-architecture)
3. [The Golden Rules](#the-golden-rules)
4. [Refactoring Order](#refactoring-order)
5. [File Organization Standards](#file-organization-standards)
6. [Quick Reference](#quick-reference)

---

## 🚨 Current Problems Identified

After analyzing your entire codebase, here are the issues found:

### Critical Errors (Must Fix First)

| File                           | Error                                             | Why It's Bad                               |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------ |
| `lib/utils.ts`                 | `const hell: number = "hell"`                     | Type mismatch - breaks type safety         |
| `app/room/[id]/page.tsx`       | `const hell: number = "hellp"` and `hell = 1 + 1` | Type error + const reassignment            |
| `app/room/[id]/page.tsx`       | `handleDoubleClick` is undefined                  | Function is referenced but not defined     |
| `lib/actions/user-action.ts`   | `let user` declared twice                         | Variable name collision                    |
| `lib/actions/actions-utils.ts` | Wrong import paths                                | Using dist paths instead of proper imports |

### Architectural Issues

| Issue                         | Files Affected                                                     | Impact                                           |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Page files too long**       | `dashboard/page.tsx` (291 lines), `room/[id]/page.tsx` (322 lines) | Hard to maintain, violates single responsibility |
| **Duplicated types**          | `types.ts`, `socketTypes.ts`, `room-types.ts`                      | Same `StickyNote` defined 3 times!               |
| **State management chaos**    | `useStickyStore.ts`                                                | Too many responsibilities, no separation         |
| **No separation of concerns** | `room/[id]/page.tsx`                                               | UI, logic, and side effects mixed together       |
| **Missing error handling**    | All server actions                                                 | Inconsistent error patterns                      |

### Code Smells

```
❌ Magic numbers everywhere (e.g., THROTTLE_DELAY = 50)
❌ Hardcoded colors and sizes
❌ Comments that state the obvious
❌ Unused imports
❌ Inconsistent naming (createRoom vs createNote vs handleNoteDelete)
❌ No loading/error states for async operations
❌ No input validation
```

---

## 🏗️ Target Architecture

```
stickysync-frontend/
├── app/                          # Next.js App Router (pages only!)
│   ├── layout.tsx               # Root layout (< 30 lines)
│   ├── (auth)/                  # Auth route group
│   ├── (home)/                  # Public pages
│   │   ├── page.tsx            # Landing (< 50 lines)
│   │   └── _components/        # Page-specific components
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard (< 50 lines)
│   │   └── _components/        # Dashboard-specific components
│   └── room/
│       └── [id]/
│           ├── page.tsx        # Room page (< 50 lines)
│           └── _components/    # Room-specific components
│
├── components/                   # Shared/reusable components
│   ├── ui/                      # Shadcn/base components
│   ├── layout/                  # Layout components
│   └── features/                # Feature components
│
├── lib/                         # Core utilities
│   ├── db.ts                   # Prisma client
│   ├── utils.ts                # General utilities
│   └── validations/            # Zod schemas
│
├── server/                      # Server-side code
│   ├── actions/                # Server actions (organized by domain)
│   │   ├── room.actions.ts
│   │   ├── note.actions.ts
│   │   └── user.actions.ts
│   └── socket/                 # Socket.io server
│
├── hooks/                       # Custom React hooks (< 100 lines each)
│   ├── use-socket.ts
│   ├── use-canvas-transform.ts
│   └── use-note-drag.ts
│
├── store/                       # State management
│   ├── use-user-store.ts       # User-related state
│   ├── use-room-store.ts       # Room-related state
│   └── use-canvas-store.ts     # Canvas-related state
│
├── types/                       # TypeScript types (single source of truth)
│   ├── index.ts                # Re-export all types
│   ├── user.types.ts
│   ├── room.types.ts
│   ├── note.types.ts
│   └── socket.types.ts
│
├── constants/                   # App-wide constants
│   ├── config.ts               # Configuration values
│   └── theme.ts                # Theme constants
│
└── docs/                        # Documentation
    └── refactoring/            # These guides!
```

---

## 📜 The Golden Rules

### Rule 1: Single Responsibility Principle

```
Every file should do ONE thing well.
```

**Bad Example (current code):**

```tsx
// page.tsx doing EVERYTHING
export default function CanvasPage() {
  // State management
  // Socket connection
  // Event handlers
  // Canvas logic
  // Drag handlers
  // UI rendering
  // ... 322 lines of chaos
}
```

**Good Example (target):**

```tsx
// page.tsx - ONLY assembles components
export default function RoomPage() {
  return (
    <RoomProvider roomId={params.id}>
      <RoomHeader />
      <Canvas>
        <NotesLayer />
        <CursorsLayer />
      </Canvas>
      <ZoomControls />
      <NoteFormModal />
    </RoomProvider>
  );
}
```

### Rule 2: 100-Line Rule

```
No file should exceed 100 lines.
If it does, split it.
```

**How to split:**

- Extract components → `_components/`
- Extract hooks → `hooks/`
- Extract utilities → `lib/`
- Extract types → `types/`

### Rule 3: Colocation

```
Keep related things close, but shared things higher.
```

| Component Used In | Location                |
| ----------------- | ----------------------- |
| Only in one page  | `app/page/_components/` |
| Multiple pages    | `components/`           |
| Across the app    | `components/ui/`        |

### Rule 4: Type Everything

```
No `any`, no implicit types, no duplicates.
```

**Bad:**

```tsx
const handleClick = (e) => { ... }  // ❌ implicit any
```

**Good:**

```tsx
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... }
```

### Rule 5: Separation of Concerns

```
UI components should NOT:
- Make API calls directly
- Manage complex state
- Handle business logic
```

---

## 📝 Refactoring Order

Follow this exact order for best results:

### Phase 1: Fix Critical Errors (30 mins)

> These are blocking your app from working

1. Fix `lib/utils.ts` - Remove test code
2. Fix `app/room/[id]/page.tsx` - Remove test code, add `handleDoubleClick`
3. Fix `lib/actions/user-action.ts` - Fix variable collision
4. Fix `lib/actions/actions-utils.ts` - Fix imports

### Phase 2: Unify Types (1 hour)

> Single source of truth for all types

1. Create unified type files in `types/`
2. Remove duplicate type definitions
3. Update all imports

### Phase 3: Split State Management (1.5 hours)

> Make state predictable and maintainable

1. Split `useStickyStore` into smaller stores
2. Create proper selectors
3. Add proper typing

### Phase 4: Refactor Server Actions (1 hour)

> Clean, consistent, type-safe server code

1. Organize actions by domain
2. Add proper error handling
3. Add input validation with Zod

### Phase 5: Extract Components (2 hours)

> Make UI code reusable and testable

1. Dashboard page components
2. Room page components
3. Shared components

### Phase 6: Split Hooks (1 hour)

> Make hooks focused and reusable

1. Split `useCanvasTransform` (600 lines!)
2. Create dedicated drag hook
3. Clean up socket hook

---

## 📁 File Organization Standards

### Naming Conventions

| Type       | Convention                 | Example                 |
| ---------- | -------------------------- | ----------------------- |
| Components | PascalCase                 | `StickyNote.tsx`        |
| Hooks      | camelCase, use- prefix     | `use-socket.ts`         |
| Types      | PascalCase, .types suffix  | `note.types.ts`         |
| Actions    | camelCase, .actions suffix | `room.actions.ts`       |
| Utils      | camelCase                  | `format-date.ts`        |
| Constants  | UPPER_SNAKE_CASE           | `const MAX_NOTES = 100` |

### File Structure Standards

**Component File:**

```tsx
// 1. Imports (external → internal → types → styles)
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonProps } from './button.types';

// 2. Types (if small, else separate file)
interface Props extends ButtonProps {
  variant?: 'primary' | 'secondary';
}

// 3. Constants (if any)
const VARIANTS = { ... };

// 4. Component
export function Button({ variant = 'primary', ...props }: Props) {
  // hooks first
  const [state, setState] = useState();

  // handlers
  const handleClick = () => {};

  // render
  return <button onClick={handleClick} />;
}

// 5. Export (if needed)
export default Button;
```

**Hook File:**

```tsx
// 1. Imports
import { useState, useCallback, useEffect } from 'react';

// 2. Types
interface UseCustomHookOptions { ... }
interface UseCustomHookReturn { ... }

// 3. Hook
export function useCustomHook(options: UseCustomHookOptions): UseCustomHookReturn {
  // state
  // effects
  // handlers
  // return
}
```

---

## 🔗 Quick Reference

### Related Guides

| Guide                                                | Purpose              | Time      |
| ---------------------------------------------------- | -------------------- | --------- |
| [01-CRITICAL-FIXES.md](./01-CRITICAL-FIXES.md)       | Fix blocking errors  | 30 min    |
| [02-TYPES-UNIFICATION.md](./02-TYPES-UNIFICATION.md) | Unify type system    | 1 hour    |
| [03-STATE-MANAGEMENT.md](./03-STATE-MANAGEMENT.md)   | Split Zustand stores | 1.5 hours |
| [04-SERVER-ACTIONS.md](./04-SERVER-ACTIONS.md)       | Clean server code    | 1 hour    |
| [05-COMPONENTS.md](./05-COMPONENTS.md)               | Extract components   | 2 hours   |
| [06-HOOKS.md](./06-HOOKS.md)                         | Split hooks          | 1 hour    |
| [07-FINAL-CHECKLIST.md](./07-FINAL-CHECKLIST.md)     | Verify everything    | 30 min    |

### Progress Tracker

```
[ ] Phase 1: Critical Fixes
[ ] Phase 2: Types Unification
[ ] Phase 3: State Management
[ ] Phase 4: Server Actions
[ ] Phase 5: Components
[ ] Phase 6: Hooks
[ ] Phase 7: Final Review
```

---

## 🎓 Learning Outcomes

By completing this refactoring, you will learn:

1. **TypeScript Best Practices** - Proper typing, no any, discriminated unions
2. **React Patterns** - Composition, separation of concerns, custom hooks
3. **Next.js 14+ Patterns** - App router, server actions, server components
4. **State Management** - When to use Zustand vs context vs props
5. **Clean Code Principles** - SRP, DRY, KISS, YAGNI
6. **Professional File Organization** - Scalable folder structure

---

> 🚀 **Ready?** Start with [01-CRITICAL-FIXES.md](./01-CRITICAL-FIXES.md)
