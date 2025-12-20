"use client";

// Imports
import React, { useState } from "react";
import StickyNote from "./sticky-note";
import NoteForm from "./note-form";

// Interfaces

// Sticky Note Properties
export interface StickyPageProps {
  id: number;
  noteName: string;
  createdBy: string | null;
  content: string | number;
  x: number;
  y: number;
}

// Array that contains Sticky Notes data
interface StickyNoteDataArray {
  length: number;
  data: Array<StickyPageProps>;
}
// For Coordinates
export type NoteCoordinates = Pick<StickyPageProps, "x" | "y">;

// Dummy data for testing
const dummyNotes: StickyPageProps[] = [
  {
    id: 1,
    noteName: "Meeting Notes 📅",
    createdBy: "Alice Johnson",
    content:
      "Team standup at 10 AM\n- Review Q4 goals\n- Discuss new feature requests\n- Plan sprint retrospective",
    x: 10,
    y: 20,
  },
  {
    id: 2,
    noteName: "Grocery List 🛒",
    createdBy: "Bob Smith",
    content:
      "Milk, Eggs, Bread, Coffee, Bananas, Chicken, Rice, Tomatoes, Cheese",
    x: 35,
    y: 15,
  },
  {
    id: 3,
    noteName: "Project Ideas 💡",
    createdBy: "Carol Davis",
    content:
      "1. Build a recipe app\n2. Create portfolio website\n3. Learn TypeScript\n4. Contribute to open source",
    x: 60,
    y: 25,
  },
  {
    id: 4,
    noteName: "Motivation Quote ✨",
    createdBy: null,
    content:
      "The only way to do great work is to love what you do. - Steve Jobs",
    x: 15,
    y: 55,
  },
  {
    id: 5,
    noteName: "Workout Routine 💪",
    createdBy: "David Lee",
    content:
      "Monday: Chest & Triceps\nWednesday: Back & Biceps\nFriday: Legs & Shoulders\nDaily: 30 min cardio",
    x: 70,
    y: 60,
  },
  {
    id: 6,
    noteName: "Book Recommendations 📚",
    createdBy: "Emma Wilson",
    content:
      "- Atomic Habits\n- The Pragmatic Programmer\n- Deep Work\n- Thinking Fast and Slow",
    x: 45,
    y: 50,
  },
  {
    id: 7,
    noteName: "Weekend Plans 🎉",
    createdBy: "Frank Brown",
    content:
      "Saturday: Movie night with friends\nSunday: Brunch at 11, then hiking at the park",
    x: 25,
    y: 75,
  },
  {
    id: 8,
    noteName: "Code Snippet 💻",
    createdBy: "Grace Martinez",
    content:
      "const greet = (name: string) => {\n  return `Hello, ${name}!`;\n};\n\nconsole.log(greet('World'));",
    x: 80,
    y: 30,
  },
];

export default function CanvasPage() {
  // State to manage notes coordinates and form visibility
  const [coordinates, setCoordinates] = useState<NoteCoordinates | null>({
    x: 0,
    y: 0,
  });
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [noteData, setNoteData] = useState<StickyPageProps[] | null>([
    ...dummyNotes,
  ]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const target = (e.target as HTMLElement).closest(".ignore");

    // If double-clicked on a sticky note
    if (target) {
      const noteId = target.getAttribute("data-note-id");
      if (noteId) {
        setSelectedNoteId(Number(noteId));
      }
      return;
    }

    // If double-clicked on empty space - create new note
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCoordinates({ x, y });
    setShowForm(true);
    setSelectedNoteId(null); // Clear selection when creating new note
  };

  const handleClickOutside = () => {
    setSelectedNoteId(null); // Clear selection when clicking outside
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onClick={handleClickOutside}
      className="relative w-full h-screen p-[3vh]"
    >
      {/* Header */}
      <div className="text-center mb-[5vh]">
        <h1
          className="text-[4vw] md:text-[3vw] lg:text-[2.5vw] font-bold text-amber-900 
                       drop-shadow-sm tracking-tight"
        >
          Welcome to Sticky (-_-) Verse
        </h1>
      </div>

      {showForm && (
        <NoteForm
          coordinates={coordinates as NoteCoordinates}
          hideForm={() => setShowForm(false)}
          updateNoteData={setNoteData}
        />
      )}
      {noteData &&
        noteData.map((note) => (
          <StickyNote
            key={note.id}
            {...note}
            showButtons={selectedNoteId === note.id}
          />
        ))}
    </div>
  );
}
