# 01 - Critical Fixes (Fix Errors First!)

## 🎯 Goal

Fix all TypeScript compilation errors BEFORE doing any refactoring.

**Why?** You can't refactor broken code. Fix it first, then improve it.

---

## 🔴 Error #1: Missing `id` Field in StickyNote Type

### Where: `types/types.ts`

### Why It's Wrong:

Your `StickyNote` interface doesn't have an `id` field, but you use `note.id` everywhere in your code. TypeScript doesn't know `id` exists!

### The Problem:

```typescript
// types/types.ts
export interface StickyNote {
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
  color?: string;
  z?: number;
  // ❌ No 'id' field!
}

// But you use note.id in sticky-note.tsx, note-form.tsx, useStickyStore.ts...
note.id; // TypeScript: "Property 'id' does not exist on type 'StickyNote'"
```

### The Fix:

```typescript
// types/types.ts
export interface StickyNote {
  id: string; // ✅ Add this!
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
  color?: string;
  z?: number;
}
```

### How To Apply:

1. Open `types/types.ts`
2. Add `id: string;` as the first field in `StickyNote`
3. Save the file

---

## 🔴 Error #2: Undefined Interface Reference

### Where: `types/types.ts`

### Why It's Wrong:

You're using `StickyPageProps` in `NoteCoordinates` but this interface doesn't exist!

### The Problem:

```typescript
// types/types.ts
export type NoteCoordinates = Pick<StickyPageProps, "x" | "y">;
//                                  ^^^^^^^^^^^^^^
//                                  This doesn't exist!
```

### The Fix:

```typescript
// types/types.ts
// Option A: Define a simple coordinate type
export interface NoteCoordinates {
  x: number;
  y: number;
}

// Option B: Pick from StickyNote instead
export type NoteCoordinates = Pick<StickyNote, "x" | "y">;
```

### Recommended: Use Option A

It's clearer and you might want coordinates without a full note.

---

## 🔴 Error #3: Test Code in Production Files

### Where: `lib/utils.ts` (Line 30-31)

### Why It's Wrong:

You left test code that causes TypeScript errors.

### The Problem:

```typescript
// lib/utils.ts
const hell: number = "hell"; // ❌ Type 'string' is not assignable to type 'number'
console.log(hell); // ❌ Shouldn't be in production
```

### The Fix:

Delete these lines entirely!

```typescript
// lib/utils.ts - REMOVE THESE LINES:
// const hell: number = "hell";
// console.log(hell);
```

---

## 🔴 Error #4: Same Test Code in Page

### Where: `app/room/[id]/page.tsx` (Lines 76-77)

### Why It's Wrong:

Same issue - test code in production.

### The Problem:

```typescript
// app/room/[id]/page.tsx
const hell: number = "hellp"; // ❌ Type error
hell = 1 + 1; // ❌ Cannot assign to 'const'
```

### The Fix:

Delete lines 76-77 from page.tsx.

---

## 🔴 Error #5: Duplicate Function Declaration

### Where: `lib/actions/actions-utils.ts`

### Why It's Wrong:

You have `syncUser` defined in BOTH:

- `lib/actions/actions-utils.ts`
- Imported from `lib/actions/user-action.ts`

This causes "Duplicate identifier" error.

### The Problem:

```typescript
// actions-utils.ts
import { syncUser } from "./user-action";  // Importing it
// ...
export async function syncUser() {...}     // Also defining it! ❌
```

### The Fix:

Keep `syncUser` in ONE place only. Remove the duplicate:

```typescript
// actions-utils.ts - REMOVE the import:
// import { syncUser } from "./user-action";  // DELETE THIS

// The local syncUser function stays
```

### Why Keep It Here?

`actions-utils.ts` is meant for utility functions. `syncUser` is a utility that `getAuthUser` needs.

---

## 🔴 Error #6: Duplicate Variable Declaration

### Where: `lib/actions/user-action.ts` (Lines 13-15)

### Why It's Wrong:

Variable `user` is declared twice in the same scope.

### The Problem:

```typescript
// user-action.ts
export async function getUserData(userId?: string, fields: Prisma.UserSelect) {
  return actionWrapper(async () => {
    const user = await getAuthUser(); // First declaration

    let user = await db.user.findUnique({
      // ❌ Second declaration!
      where: {
        clerkId: userId || user?.id,
      },
      select: fields,
    });
    return ensure(user, "User not found");
  });
}
```

### The Fix:

```typescript
export async function getUserData(userId?: string, fields: Prisma.UserSelect) {
  return actionWrapper(async () => {
    const authUser = await getAuthUser(); // ✅ Renamed to authUser

    const userData = await db.user.findUnique({
      // ✅ Renamed to userData
      where: {
        clerkId: userId || authUser?.id,
      },
      select: fields,
    });
    return ensure(userData, "User not found");
  });
}
```

---

## 🔴 Error #7: Import Path Errors in useSocket.ts

### Where: `hooks/useSocket.ts`

### Why It's Wrong:

TypeScript can't find the modules. This might be a path alias issue.

### The Problem:

```typescript
Cannot find module '@/types/socketTypes' or its corresponding type declarations.
Cannot find module '@/store/useStickyStore' or its corresponding type declarations.
```

### Possible Causes:

1. **tsconfig.json missing paths** - Check if `@/*` is properly configured
2. **Files moved/renamed** - Check if files exist at those paths
3. **Missing type exports** - Check if types are properly exported

### How to Debug:

```bash
# Check if files exist
ls -la types/
ls -la store/

# Check tsconfig.json has proper paths
cat tsconfig.json | grep -A5 "paths"
```

### The Fix (if tsconfig.json is wrong):

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 🔴 Error #8: 'state' is of type 'unknown'

### Where: `hooks/useSocket.ts` (Lines 24-25)

### Why It's Wrong:

Zustand's `useShallow` isn't inferring types properly.

### The Problem:

```typescript
const { deleteOtherUsers, updateOtherUsers } = useStickyStore(
  useShallow((state) => ({
    // ❌ 'state' is unknown
    deleteOtherUsers: state.deleteOtherUsers,
    updateOtherUsers: state.updateOtherUsers,
  }))
);
```

### The Fix:

Add explicit type annotation:

```typescript
import { StickyStore } from "@/store/useStickyStore";

const { deleteOtherUsers, updateOtherUsers } = useStickyStore(
  useShallow((state: StickyStore) => ({
    // ✅ Explicit type
    deleteOtherUsers: state.deleteOtherUsers,
    updateOtherUsers: state.updateOtherUsers,
  }))
);
```

---

## 🔴 Error #9: Return Type Mismatch in Store

### Where: `store/useStickyStore.ts` (Line 97)

### Why It's Wrong:

`deleteOtherUsers` has wrong return type annotation.

### The Problem:

```typescript
deleteOtherUsers: (userId): Partial<StickyStore> => {
  // Returns Partial<StickyStore>?
  // But Zustand expects void or undefined from state setters
  const newData: OtherUsers = { ...get().otherUsers };
  delete newData[userId];
  set(() => ({
    otherUsers: { ...newData },
  }));
  // ❌ No explicit return, but annotation says Partial<StickyStore>
};
```

### The Fix:

```typescript
deleteOtherUsers: (userId): void => {
  // ✅ Change to void
  const newData: OtherUsers = { ...get().otherUsers };
  delete newData[userId];
  set(() => ({
    otherUsers: { ...newData },
  }));
};
```

Or simply remove the return type annotation and let TypeScript infer it.

---

## ✅ Verification Checklist

After making all fixes, run these commands:

```bash
# 1. Check for TypeScript errors
npx tsc --noEmit

# 2. Run the dev server
npm run dev

# 3. Check the browser console for errors
# Open http://localhost:3000 and check DevTools console
```

### Expected Result:

- No red squiggly lines in VS Code
- `npx tsc --noEmit` completes with no errors
- Dev server starts without crashes
- No console errors about missing properties

---

## 📝 Summary of Changes

| File                           | Change                                              |
| ------------------------------ | --------------------------------------------------- |
| `types/types.ts`               | Add `id: string` to StickyNote, fix NoteCoordinates |
| `lib/utils.ts`                 | Remove test code (lines 30-31)                      |
| `app/room/[id]/page.tsx`       | Remove test code (lines 76-77)                      |
| `lib/actions/actions-utils.ts` | Remove duplicate import                             |
| `lib/actions/user-action.ts`   | Rename duplicate variables                          |
| `hooks/useSocket.ts`           | Add explicit state type                             |
| `store/useStickyStore.ts`      | Fix return type annotation                          |

---

## 🎓 What You Learned

1. **Always define complete types** - If you use a property, it must be in the interface
2. **Don't leave test code** - Use proper testing frameworks instead
3. **One source of truth** - Functions should be defined in one place
4. **Explicit types help** - When TypeScript can't infer, tell it explicitly
5. **Return types matter** - Zustand functions should match expected signatures

---

**Next: [02-TYPES-UNIFICATION.md](./02-TYPES-UNIFICATION.md)** - Let's clean up your type system!
