# 🗃️ Phase 3: State Management Refactoring

> **Time**: ~1.5 hours  
> **Priority**: HIGH - Clean state = predictable app  
> **Difficulty**: Medium-Hard

---

## 📋 Overview

Your current `useStickyStore.ts` is a **monolith** - it handles everything:

- Notes state
- User data
- Coordinates
- Form visibility
- Other users' cursors
- Note selection

This violates the **Single Responsibility Principle** and makes the code:

- Hard to test
- Hard to debug
- Hard to reason about
- Performance issues (re-renders on any change)

---

## 🔍 Current State Analysis

```typescript
// Current store has 18+ properties and 10+ methods!
interface StickyStore {
  notes: StickyNote[];
  userData: UserData | null;
  coordinates: NoteCoordinates | null;
  showForm: boolean;
  selectNoteId: string | null;
  editNote: Partial<StickyNote> | null;
  otherUsers: OtherUsers;
  offSet: NoteCoordinates | null;
  isDummyNotesAdded: boolean;

  handleNoteDelete: (noteId: string) => void;
  handleNoteEdit: (noteId: string) => void;
  setStore: (updates: Partial<StickyStore>) => void;
  addNote: (newNote: StickyNote) => void;
  addDummyNotes: () => void;
  updateUserData: (userName: string, roomId) => void;
  updateExistingNote: (updateNote: Partial<StickyNote>) => void;
  updateOtherUsers: (userId: string, data: OtherUserCursor) => void;
  deleteOtherUsers: (userId: string) => void;
  updateNote: (id: string, data: Partial<StickyNote>) => void;
}
```

### Problems:

1. **Too many responsibilities** - Notes, users, UI state all mixed
2. **Generic `setStore`** - No type safety, any change allowed
3. **Inconsistent naming** - `handleNoteDelete` vs `deleteOtherUsers`
4. **Missing types** - `roomId` parameter has no type
5. **Persistence overkill** - Everything persisted, even transient state

---

## 🎯 Target Architecture

Split into **3 focused stores**:

```
store/
├── use-notes-store.ts    # Notes CRUD + selection
├── use-user-store.ts     # Current user + other users
└── use-ui-store.ts       # UI state (forms, modals, etc.)
```

---

## 📝 Step-by-Step Implementation

### Step 1: Create `store/use-notes-store.ts`

```typescript
/**
 * Notes Store
 *
 * Manages all sticky note state.
 * Single responsibility: CRUD operations for notes.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StickyNote } from "@/types";

// ============================================
// TYPES
// ============================================

interface NotesState {
  /** All notes in the current room */
  notes: StickyNote[];
  /** Currently selected note ID */
  selectedNoteId: string | null;
}

interface NotesActions {
  /** Add a new note */
  addNote: (note: StickyNote) => void;
  /** Update an existing note */
  updateNote: (id: string, updates: Partial<StickyNote>) => void;
  /** Delete a note by ID */
  deleteNote: (id: string) => void;
  /** Set multiple notes at once (e.g., from server) */
  setNotes: (notes: StickyNote[]) => void;
  /** Select a note */
  selectNote: (id: string | null) => void;
  /** Clear all notes */
  clearNotes: () => void;
}

type NotesStore = NotesState & NotesActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: NotesState = {
  notes: [],
  selectedNoteId: null,
};

// ============================================
// STORE
// ============================================

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addNote: (note) => {
        set((state) => ({
          notes: [...state.notes, note],
        }));
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...updates } : note
          ),
        }));
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          // Clear selection if deleting selected note
          selectedNoteId:
            state.selectedNoteId === id ? null : state.selectedNoteId,
        }));
      },

      setNotes: (notes) => {
        set({ notes });
      },

      selectNote: (id) => {
        set({ selectedNoteId: id });
      },

      clearNotes: () => {
        set(initialState);
      },
    }),
    {
      name: "sticky-notes-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist notes, not selection state
      partialize: (state) => ({ notes: state.notes }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

/**
 * Get a specific note by ID.
 * Use outside of components for event handlers.
 */
export const getNoteById = (id: string): StickyNote | undefined => {
  return useNotesStore.getState().notes.find((note) => note.id === id);
};

/**
 * Get the currently selected note.
 */
export const getSelectedNote = (): StickyNote | undefined => {
  const { notes, selectedNoteId } = useNotesStore.getState();
  return notes.find((note) => note.id === selectedNoteId);
};
```

### 🧠 Why This Design?

| Decision                       | Reason                             |
| ------------------------------ | ---------------------------------- |
| Separate state & actions types | Clear contract, easier testing     |
| `initialState` constant        | Easy to reset, clear defaults      |
| `partialize` in persist        | Don't persist UI state (selection) |
| Selectors outside hook         | Can be used in event handlers      |

---

### Step 2: Create `store/use-user-store.ts`

```typescript
/**
 * User Store
 *
 * Manages current user and other users' presence.
 * Handles real-time cursor positions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserData, OtherUsers, OtherUserCursor } from "@/types";

// ============================================
// TYPES
// ============================================

interface UserState {
  /** Current user's data */
  currentUser: UserData | null;
  /** Other users in the room (cursors, etc.) */
  otherUsers: OtherUsers;
}

interface UserActions {
  /** Set current user data */
  setCurrentUser: (user: UserData | null) => void;
  /** Update current user's room */
  setCurrentRoom: (roomId: string) => void;
  /** Add or update another user's cursor */
  upsertOtherUser: (userId: string, data: Partial<OtherUserCursor>) => void;
  /** Remove a user (when they leave) */
  removeOtherUser: (userId: string) => void;
  /** Clear all other users */
  clearOtherUsers: () => void;
  /** Clear entire store (logout) */
  reset: () => void;
}

type UserStore = UserState & UserActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: UserState = {
  currentUser: null,
  otherUsers: {},
};

// ============================================
// STORE
// ============================================

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentUser: (user) => {
        set({ currentUser: user });
      },

      setCurrentRoom: (roomId) => {
        set((state) => ({
          currentUser: state.currentUser
            ? { ...state.currentUser, roomId }
            : null,
        }));
      },

      upsertOtherUser: (userId, data) => {
        set((state) => ({
          otherUsers: {
            ...state.otherUsers,
            [userId]: {
              // Provide defaults for new users
              userName: "Unknown",
              x: 0,
              y: 0,
              color: "#ff4757",
              // Merge with existing data
              ...state.otherUsers[userId],
              ...data,
            },
          },
        }));
      },

      removeOtherUser: (userId) => {
        set((state) => {
          const { [userId]: _, ...remainingUsers } = state.otherUsers;
          return { otherUsers: remainingUsers };
        });
      },

      clearOtherUsers: () => {
        set({ otherUsers: {} });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "sticky-user-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist current user, not other users
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

/**
 * Get count of other users in the room.
 */
export const getOtherUsersCount = (): number => {
  return Object.keys(useUserStore.getState().otherUsers).length;
};

/**
 * Check if current user has set up their profile.
 */
export const isUserSetup = (): boolean => {
  const user = useUserStore.getState().currentUser;
  return Boolean(user?.userName);
};
```

### 🧠 Why This Design?

| Decision                   | Reason                                        |
| -------------------------- | --------------------------------------------- |
| `upsertOtherUser`          | Update if exists, create if not               |
| Destructuring removal      | `const { [userId]: _, ...rest }` is immutable |
| Don't persist `otherUsers` | They're transient - rebuild on room join      |

---

### Step 3: Create `store/use-ui-store.ts`

```typescript
/**
 * UI Store
 *
 * Manages ephemeral UI state.
 * NOT persisted - resets on page refresh.
 */

import { create } from "zustand";
import type { NoteCoordinates, StickyNote } from "@/types";

// ============================================
// TYPES
// ============================================

interface NoteFormState {
  /** Is the note form visible? */
  isOpen: boolean;
  /** Position where the form was opened (for new notes) */
  position: NoteCoordinates | null;
  /** Note being edited (null for new notes) */
  editingNote: StickyNote | null;
}

interface UIState {
  /** Note form state */
  noteForm: NoteFormState;
  /** Is the canvas currently being dragged? */
  isDragging: boolean;
  /** ID of the note currently being dragged */
  draggingNoteId: string | null;
}

interface UIActions {
  /** Open form to create a new note at position */
  openNoteForm: (position: NoteCoordinates) => void;
  /** Open form to edit an existing note */
  openEditForm: (note: StickyNote) => void;
  /** Close the note form */
  closeNoteForm: () => void;
  /** Set dragging state */
  setDragging: (isDragging: boolean) => void;
  /** Set which note is being dragged */
  setDraggingNote: (noteId: string | null) => void;
  /** Reset all UI state */
  resetUI: () => void;
}

type UIStore = UIState & UIActions;

// ============================================
// INITIAL STATE
// ============================================

const initialNoteFormState: NoteFormState = {
  isOpen: false,
  position: null,
  editingNote: null,
};

const initialState: UIState = {
  noteForm: initialNoteFormState,
  isDragging: false,
  draggingNoteId: null,
};

// ============================================
// STORE
// ============================================

export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,

  openNoteForm: (position) => {
    set({
      noteForm: {
        isOpen: true,
        position,
        editingNote: null,
      },
    });
  },

  openEditForm: (note) => {
    set({
      noteForm: {
        isOpen: true,
        position: { x: note.x, y: note.y },
        editingNote: note,
      },
    });
  },

  closeNoteForm: () => {
    set({ noteForm: initialNoteFormState });
  },

  setDragging: (isDragging) => {
    set({ isDragging });
  },

  setDraggingNote: (noteId) => {
    set({
      draggingNoteId: noteId,
      isDragging: noteId !== null,
    });
  },

  resetUI: () => {
    set(initialState);
  },
}));

// ============================================
// CONVENIENCE SELECTORS
// ============================================

/**
 * Check if we're currently editing a note.
 */
export const isEditingNote = (): boolean => {
  return useUIStore.getState().noteForm.editingNote !== null;
};

/**
 * Check if any modal/form is open.
 */
export const hasOpenModal = (): boolean => {
  return useUIStore.getState().noteForm.isOpen;
};
```

### 🧠 Why This Design?

| Decision                        | Reason                                   |
| ------------------------------- | ---------------------------------------- |
| No `persist`                    | UI state should not survive page refresh |
| Nested `noteForm` object        | Groups related state together            |
| `initialNoteFormState` separate | Can reset just the form                  |
| Action names are verbs          | `openNoteForm` not `setNoteFormOpen`     |

---

### Step 4: Update Components to Use New Stores

Now update your components to use the new stores. Here's how:

**Before (old monolithic store):**

```typescript
const { notes, userData, showForm, coordinates, otherUsers, setStore } =
  useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      userData: state.userData,
      showForm: state.showForm,
      coordinates: state.coordinates,
      otherUsers: state.otherUsers,
      setStore: state.setStore,
    }))
  );
```

**After (new focused stores):**

```typescript
// Only import what you need
import { useNotesStore } from "@/store/use-notes-store";
import { useUserStore } from "@/store/use-user-store";
import { useUIStore } from "@/store/use-ui-store";

// Use direct selectors (better performance)
const notes = useNotesStore((state) => state.notes);
const selectedNoteId = useNotesStore((state) => state.selectedNoteId);

const currentUser = useUserStore((state) => state.currentUser);
const otherUsers = useUserStore((state) => state.otherUsers);

const noteForm = useUIStore((state) => state.noteForm);
```

---

### Step 5: Create Custom Hook Selectors (Optional but Recommended)

For commonly used combinations, create custom hooks:

```typescript
// store/hooks.ts

import { useNotesStore } from "./use-notes-store";
import { useUserStore } from "./use-user-store";
import { useUIStore } from "./use-ui-store";
import { useShallow } from "zustand/shallow";

/**
 * Get notes with the currently selected note flagged.
 */
export function useNotesWithSelection() {
  return useNotesStore(
    useShallow((state) => ({
      notes: state.notes,
      selectedNoteId: state.selectedNoteId,
    }))
  );
}

/**
 * Get all user-related state.
 */
export function useUsers() {
  return useUserStore(
    useShallow((state) => ({
      currentUser: state.currentUser,
      otherUsers: state.otherUsers,
    }))
  );
}

/**
 * Get note form state and actions.
 */
export function useNoteForm() {
  const noteForm = useUIStore((state) => state.noteForm);
  const openNoteForm = useUIStore((state) => state.openNoteForm);
  const openEditForm = useUIStore((state) => state.openEditForm);
  const closeNoteForm = useUIStore((state) => state.closeNoteForm);

  return {
    ...noteForm,
    open: openNoteForm,
    openEdit: openEditForm,
    close: closeNoteForm,
  };
}

/**
 * Get drag state.
 */
export function useDragState() {
  return useUIStore(
    useShallow((state) => ({
      isDragging: state.isDragging,
      draggingNoteId: state.draggingNoteId,
      setDraggingNote: state.setDraggingNote,
    }))
  );
}
```

---

### Step 6: Delete Old Store

After migrating all components:

1. Remove `store/useStickyStore.ts`
2. Update all imports

---

## 🔄 Migration Mapping

| Old                            | New                                        |
| ------------------------------ | ------------------------------------------ |
| `notes`                        | `useNotesStore(s => s.notes)`              |
| `selectNoteId`                 | `useNotesStore(s => s.selectedNoteId)`     |
| `userData`                     | `useUserStore(s => s.currentUser)`         |
| `otherUsers`                   | `useUserStore(s => s.otherUsers)`          |
| `showForm`                     | `useUIStore(s => s.noteForm.isOpen)`       |
| `coordinates`                  | `useUIStore(s => s.noteForm.position)`     |
| `editNote`                     | `useUIStore(s => s.noteForm.editingNote)`  |
| `setStore({ showForm: true })` | `useUIStore.getState().openNoteForm(pos)`  |
| `handleNoteDelete(id)`         | `useNotesStore.getState().deleteNote(id)`  |
| `handleNoteEdit(id)`           | `useUIStore.getState().openEditForm(note)` |

---

## ✅ Verification Checklist

After refactoring, verify:

- [ ] Notes persist after page refresh
- [ ] Current user persists after page refresh
- [ ] Other users DO NOT persist (they're rebuilt on join)
- [ ] Note form opens at correct position
- [ ] Note editing loads correct data
- [ ] Note selection works
- [ ] Dragging notes works
- [ ] Deleting notes clears selection if selected

---

## 🧠 Deep Dive: Zustand Best Practices

### 1. Avoid Storing Derived State

```typescript
// ❌ Bad - derived state in store
const store = create((set) => ({
  notes: [],
  noteCount: 0, // This is derived!
  addNote: (note) =>
    set((s) => ({
      notes: [...s.notes, note],
      noteCount: s.notes.length + 1, // Have to update both!
    })),
}));

// ✅ Good - derive in component or selector
const store = create((set) => ({
  notes: [],
  addNote: (note) =>
    set((s) => ({
      notes: [...s.notes, note],
    })),
}));

// Use in component
const notes = useStore((s) => s.notes);
const noteCount = notes.length; // Derived when needed
```

### 2. Use Immer for Complex Updates

```typescript
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useStore = create(
  immer((set) => ({
    nested: { deep: { value: 0 } },
    increment: () =>
      set((state) => {
        // Mutate directly! Immer handles immutability
        state.nested.deep.value += 1;
      }),
  }))
);
```

### 3. Subscribe to Changes Outside React

```typescript
// In an event handler or utility
const unsubscribe = useNotesStore.subscribe(
  (state) => state.notes,
  (notes) => {
    console.log("Notes changed:", notes);
  }
);
```

---

## 📚 What You Learned

1. **Single Responsibility Stores** - Each store does one thing
2. **Separation of Concerns** - Persisted vs ephemeral state
3. **Proper TypeScript Patterns** - Separate State & Actions types
4. **Zustand Patterns** - `partialize`, selectors, subscriptions
5. **Performance** - Only subscribe to what you need
6. **Testing** - Smaller stores are easier to test

---

## ⏭️ Next Step

Now that your state is clean, move on to:
**[04-SERVER-ACTIONS.md](./04-SERVER-ACTIONS.md)** - Refactor server actions

---

## 🔗 Resources

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zustand Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [React State Management Comparison](https://react.dev/learn/managing-state)
