# 03 - State Management (Zustand Store Refactoring)

## 🎯 Goal

Clean up the Zustand store to be type-safe, well-organized, and maintainable.

**Why?** Your store is the heart of your app. A messy store = messy app.

---

## Current Problems

### Problem 1: Mixed Concerns

Your store does EVERYTHING:

- Note CRUD operations
- User data management
- Remote cursor tracking
- UI state (form visibility, selections)
- Dev utilities (dummy notes)

### Problem 2: Inconsistent Action Names

```typescript
handleNoteDelete; // "handle" prefix suggests event handler
handleNoteEdit; // But it's actually a store action
updateExistingNote; // Redundant "existing"
deleteOtherUsers; // Plural but takes single userId
```

### Problem 3: Wrong Return Types

```typescript
deleteOtherUsers: (userId): Partial<StickyStore> => {
  // Returns nothing, but type says Partial<StickyStore>
};
```

### Problem 4: Redundant Actions

```typescript
updateNote; // Updates note by id
updateExistingNote; // Does the same thing!
```

---

## The Solution: Refactored Store

### New File Structure:

```
store/
├── index.ts              # Re-exports
├── useStickyStore.ts     # Main store (simplified)
├── slices/
│   ├── noteSlice.ts      # Note state & actions
│   ├── userSlice.ts      # User state & actions
│   └── uiSlice.ts        # UI state & actions
└── types.ts              # Store-specific types (optional)
```

**But for your app size**, one well-organized file is fine. Let's fix the current one first.

---

## Step 1: Understand Zustand Slices Pattern

### What is a Slice?

A "slice" is a portion of your store that manages related state and actions.

```typescript
// Instead of one giant store...
const useStore = create((set, get) => ({
  // 50+ fields and methods mixed together
}));

// ...you can organize into logical groups:
const noteSlice = (set, get) => ({
  notes: [],
  addNote: (note) => set(...),
  // All note-related stuff
});

const userSlice = (set, get) => ({
  userData: null,
  updateUserData: (name, room) => set(...),
  // All user-related stuff
});
```

### Why Slices?

1. **Easier to understand** - Related things are together
2. **Easier to test** - Test each slice independently
3. **Easier to maintain** - Know where to look for things

---

## Step 2: Refactored Store Code

Here's the complete refactored store:

```typescript
// store/useStickyStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  StickyNote,
  Position,
  UserData,
  RemoteCursor,
  RemoteCursors,
} from "@/types";
import { dummyNotes } from "@/constants/dummyData";

// ============================================================================
// TYPES
// ============================================================================

interface StickyStoreState {
  // Note State
  notes: StickyNote[];

  // User State
  userData: UserData | null;
  remoteCursors: RemoteCursors;

  // UI State
  isFormOpen: boolean;
  selectedNoteId: string | null;
  editingNote: StickyNote | null;
  formPosition: Position | null;

  // Internal
  _isDummyDataLoaded: boolean;
}

interface StickyStoreActions {
  // Generic setter for simple updates
  setState: (updates: Partial<StickyStoreState>) => void;

  // Note Actions
  addNote: (note: StickyNote) => void;
  updateNote: (noteId: string, changes: Partial<StickyNote>) => void;
  deleteNote: (noteId: string) => void;
  startEditingNote: (noteId: string) => void;

  // User Actions
  setUserData: (userName: string, roomId: string) => void;

  // Remote Cursor Actions
  updateRemoteCursor: (userId: string, cursor: Partial<RemoteCursor>) => void;
  removeRemoteCursor: (userId: string) => void;

  // UI Actions
  openNoteForm: (position: Position, note?: StickyNote) => void;
  closeNoteForm: () => void;
  selectNote: (noteId: string | null) => void;

  // Dev/Demo
  loadDummyData: () => void;
}

export type StickyStore = StickyStoreState & StickyStoreActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: StickyStoreState = {
  notes: [],
  userData: null,
  remoteCursors: {},
  isFormOpen: false,
  selectedNoteId: null,
  editingNote: null,
  formPosition: null,
  _isDummyDataLoaded: false,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStickyStore = create<StickyStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // GENERIC SETTER
      // ========================================

      setState: (updates) => {
        set((state) => ({ ...state, ...updates }));
      },

      // ========================================
      // NOTE ACTIONS
      // ========================================

      addNote: (note) => {
        set((state) => ({
          notes: [...state.notes, note],
        }));
      },

      updateNote: (noteId, changes) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === noteId ? { ...note, ...changes } : note
          ),
        }));
      },

      deleteNote: (noteId) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== noteId),
          // Also clear selection if deleting selected note
          selectedNoteId:
            state.selectedNoteId === noteId ? null : state.selectedNoteId,
        }));
      },

      startEditingNote: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note) return;

        set({
          isFormOpen: true,
          editingNote: note,
          formPosition: { x: note.x, y: note.y },
        });
      },

      // ========================================
      // USER ACTIONS
      // ========================================

      setUserData: (userName, roomId) => {
        set({
          userData: { userName, roomId },
        });
      },

      // ========================================
      // REMOTE CURSOR ACTIONS
      // ========================================

      updateRemoteCursor: (userId, cursorData) => {
        set((state) => ({
          remoteCursors: {
            ...state.remoteCursors,
            [userId]: {
              ...state.remoteCursors[userId],
              ...cursorData,
            },
          },
        }));
      },

      removeRemoteCursor: (userId) => {
        set((state) => {
          const { [userId]: _, ...remaining } = state.remoteCursors;
          return { remoteCursors: remaining };
        });
      },

      // ========================================
      // UI ACTIONS
      // ========================================

      openNoteForm: (position, note) => {
        set({
          isFormOpen: true,
          formPosition: position,
          editingNote: note || null,
        });
      },

      closeNoteForm: () => {
        set({
          isFormOpen: false,
          formPosition: null,
          editingNote: null,
        });
      },

      selectNote: (noteId) => {
        set({ selectedNoteId: noteId });
      },

      // ========================================
      // DEV/DEMO
      // ========================================

      loadDummyData: () => {
        if (get()._isDummyDataLoaded) return;
        if (get().notes.length > 0) return;

        set({
          notes: dummyNotes,
          _isDummyDataLoaded: true,
        });
      },
    }),
    {
      name: "sticky-store",
      // Only persist these fields (not UI state)
      partialize: (state) => ({
        notes: state.notes,
        userData: state.userData,
        _isDummyDataLoaded: state._isDummyDataLoaded,
      }),
    }
  )
);
```

---

## Step 3: Understanding the Changes

### Change 1: Better Naming

| Before             | After            | Why                                             |
| ------------------ | ---------------- | ----------------------------------------------- |
| `showForm`         | `isFormOpen`     | Boolean naming convention (`is*`, `has*`)       |
| `selectNoteId`     | `selectedNoteId` | Past tense for state (`selected`, not `select`) |
| `editNote` (state) | `editingNote`    | Present participle for ongoing state            |
| `coordinates`      | `formPosition`   | More specific - what coordinates?               |
| `otherUsers`       | `remoteCursors`  | More descriptive of what it actually is         |
| `setStore`         | `setState`       | Standard naming convention                      |

### Change 2: Clearer Actions

| Before               | After                | Why                                         |
| -------------------- | -------------------- | ------------------------------------------- |
| `handleNoteDelete`   | `deleteNote`         | Actions should be verbs, not event handlers |
| `handleNoteEdit`     | `startEditingNote`   | Clearer what it does                        |
| `updateExistingNote` | (removed)            | `updateNote` handles this                   |
| `updateOtherUsers`   | `updateRemoteCursor` | Singular, more accurate                     |
| `deleteOtherUsers`   | `removeRemoteCursor` | Singular, better verb                       |

### Change 3: UI Actions

New dedicated UI actions:

```typescript
openNoteForm(position, note?)  // Opens form at position, optionally for editing
closeNoteForm()                // Closes and clears form state
selectNote(noteId)             // Selects a note (null to deselect)
```

**Why?** Instead of manually setting multiple state fields, call one action.

### Change 4: Partial Persistence

```typescript
partialize: (state) => ({
  notes: state.notes,
  userData: state.userData,
  _isDummyDataLoaded: state._isDummyDataLoaded,
}),
```

**Why?** UI state (`isFormOpen`, `selectedNoteId`) shouldn't persist across sessions.

---

## Step 4: Using the New Store

### Before (scattered state updates):

```typescript
// In a component
const { setStore } = useStickyStore();

// Opening form - setting 3 fields manually
setStore({
  showForm: true,
  coordinates: { x: 100, y: 200 },
  editNote: null,
});

// Closing form - setting 3 fields manually
setStore({
  showForm: false,
  coordinates: null,
  editNote: null,
});
```

### After (single action calls):

```typescript
// In a component
const { openNoteForm, closeNoteForm, selectNote } = useStickyStore();

// Opening form
openNoteForm({ x: 100, y: 200 });

// Opening form for editing
openNoteForm({ x: note.x, y: note.y }, note);

// Closing form
closeNoteForm();
```

---

## Step 5: Update Components to Use New Store

### Update `note-form.tsx`:

```typescript
// Before
const { setStore, coordinates, editNote } = useStickyStore(
  useShallow((state) => ({
    coordinates: state.coordinates,
    editNote: state.editNote,
    setStore: state.setStore,
  }))
);

// Close handler
const handleClose = () => {
  setStore({ showForm: false, editNote: null });
};

// After
const { closeNoteForm, formPosition, editingNote, addNote, updateNote } =
  useStickyStore(
    useShallow((state) => ({
      formPosition: state.formPosition,
      editingNote: state.editingNote,
      closeNoteForm: state.closeNoteForm,
      addNote: state.addNote,
      updateNote: state.updateNote,
    }))
  );

// Close handler
const handleClose = () => {
  closeNoteForm();
};
```

### Update `sticky-note.tsx`:

```typescript
// Before
const { handleNoteEdit, handleNoteDelete } = useStickyStore(...);

// After
const { startEditingNote, deleteNote } = useStickyStore(
  useShallow((state) => ({
    startEditingNote: state.startEditingNote,
    deleteNote: state.deleteNote,
  }))
);
```

### Update `page.tsx`:

```typescript
// Before
const { showForm, coordinates, selectNoteId, setStore, otherUsers } = useStickyStore(...);

// After
const {
  isFormOpen,
  formPosition,
  selectedNoteId,
  selectNote,
  remoteCursors,
  closeNoteForm,
  openNoteForm,
} = useStickyStore(
  useShallow((state) => ({
    isFormOpen: state.isFormOpen,
    formPosition: state.formPosition,
    selectedNoteId: state.selectedNoteId,
    selectNote: state.selectNote,
    remoteCursors: state.remoteCursors,
    closeNoteForm: state.closeNoteForm,
    openNoteForm: state.openNoteForm,
  }))
);
```

---

## Step 6: Selector Best Practices

### Bad: Selecting entire store

```typescript
// ❌ Re-renders on ANY state change
const store = useStickyStore();
```

### Good: Select only what you need

```typescript
// ✅ Only re-renders when these specific values change
const { notes, selectedNoteId } = useStickyStore(
  useShallow((state) => ({
    notes: state.notes,
    selectedNoteId: state.selectedNoteId,
  }))
);
```

### Even Better: Create custom selector hooks

```typescript
// hooks/useNotes.ts
export function useNotes() {
  return useStickyStore(
    useShallow((state) => ({
      notes: state.notes,
      addNote: state.addNote,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
    }))
  );
}

// hooks/useNoteForm.ts
export function useNoteForm() {
  return useStickyStore(
    useShallow((state) => ({
      isFormOpen: state.isFormOpen,
      editingNote: state.editingNote,
      formPosition: state.formPosition,
      openNoteForm: state.openNoteForm,
      closeNoteForm: state.closeNoteForm,
    }))
  );
}

// Usage in components:
const { notes, addNote } = useNotes();
const { isFormOpen, openNoteForm } = useNoteForm();
```

---

## 🎓 What You Learned

### 1. Zustand Best Practices

- **Name state as nouns** (`notes`, `userData`, `selectedNoteId`)
- **Name actions as verbs** (`addNote`, `deleteNote`, `selectNote`)
- **Boolean state uses `is*` prefix** (`isFormOpen`, `isLoading`)
- **Use `useShallow` to prevent unnecessary re-renders**
- **Use `partialize` to control what gets persisted**

### 2. Action Design Principles

- **Single Responsibility** - Each action does one thing
- **Minimal Parameters** - Actions take only what they need
- **Side-Effect Free** - Actions only update state, no API calls

### 3. State Organization

```typescript
// Group related state together in your mental model:

// === Data State (persisted) ===
notes: StickyNote[]
userData: UserData | null

// === Remote State (synced with server) ===
remoteCursors: RemoteCursors

// === UI State (not persisted) ===
isFormOpen: boolean
selectedNoteId: string | null
editingNote: StickyNote | null
formPosition: Position | null
```

---

## ✅ Verification Checklist

After refactoring the store:

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Test in browser
npm run dev

# 3. Check these scenarios work:
# - Create a new note
# - Edit an existing note
# - Delete a note
# - See other users' cursors
# - Form opens at correct position
# - Selecting a note shows action buttons
```

---

**Next: [04-SERVER-ACTIONS.md](./04-SERVER-ACTIONS.md)** - Let's clean up server actions!
