import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StickyPageProps } from '@/components/canvas/page';

interface StickyState {
  notes: StickyPageProps[];
  addNote: (note: StickyPageProps) => void;
  deleteNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<StickyPageProps>) => void;
}

export const useStickyStore = create<StickyState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (note) =>
        set((state) => ({ notes: [...state.notes, note] })),

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),
    }),
    {
      name: 'sticky-storage', // name of the item in storage (must be unique)
    }
  )
);