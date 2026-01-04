import type { StickyNote } from "@/types/types";

// Dummy data for testing - positions in PIXELS (world space)
// Notes are scattered across a 3000x2000 pixel canvas area
export const dummyNotes: StickyNote[] = [
  {
    id: "k3j8d9f2a",
    noteName: "Meeting Notes 📅",
    createdBy: "Alice Johnson",
    content:
      "Team standup at 10 AM\n- Review Q4 goals\n- Discuss new feature requests\n- Plan sprint retrospective",
    x: 100,
    y: 250,
  },
  {
    id: "m5n7p1q4w",
    noteName: "Grocery List 🛒",
    createdBy: "Bob Smith",
    content:
      "Milk, Eggs, Bread, Coffee, Bananas, Chicken, Rice, Tomatoes, Cheese",
    x: 450,
    y: 200,
  },
  {
    id: "r8t2y6u9e",
    noteName: "Project Ideas 💡",
    createdBy: "Carol Davis",
    content:
      "1. Build a recipe app\n2. Create portfolio website\n3. Learn TypeScript\n4. Contribute to open source",
    x: 800,
    y: 280,
  },
  {
    id: "a4s7d3f5g",
    noteName: "Motivation Quote ✨",
    createdBy: null,
    content:
      "The only way to do great work is to love what you do. - Steve Jobs",
    x: 150,
    y: 550,
  },
  {
    id: "h9j1k8l0z",
    noteName: "Workout Routine 💪",
    createdBy: "David Lee",
    content:
      "Monday: Chest & Triceps\nWednesday: Back & Biceps\nFriday: Legs & Shoulders\nDaily: 30 min cardio",
    x: 500,
    y: 480,
  },
  {
    id: "x2c4v7b6n",
    noteName: "Book Recommendations 📚",
    createdBy: "Emma Wilson",
    content:
      "- Atomic Habits\n- The Pragmatic Programmer\n- Deep Work\n- Thinking Fast and Slow",
    x: 200,
    y: 780,
  },
  {
    id: "q3w5e8r0t",
    noteName: "Weekend Plans 🎉",
    createdBy: "Frank Brown",
    content:
      "Saturday: Movie night with friends\nSunday: Brunch at 11, then hiking at the park",
    x: 850,
    y: 550,
  },
  {
    id: "y7u2i5o9p",
    noteName: "Code Snippet 💻",
    createdBy: "Grace Martinez",
    content:
      "const greet = (name: string) => {\n  return `Hello, ${name}!`;\n};\n\nconsole.log(greet('World'));",
    x: 1150,
    y: 320,
  },
];
