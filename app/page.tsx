"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserData } from "@/types";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [nameInput, setNameInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Step 1: Set timer and change loading states
    const timer = setTimeout(() => {
      // Step 2: Check localStorage
      const rawData = localStorage.getItem("sync_userData");
      if (rawData) {
        const parsedData: UserData = JSON.parse(rawData);
        setUserData(parsedData);
      }
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNewUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `${Math.random().toString(36).substr(2, 9)}`;
    const newData: UserData = { sync_userId: newId, sync_userName: nameInput };

    localStorage.setItem("sync_userData", JSON.stringify(newData));
    setUserData(newData);
  };

  const navigateToRoom = () => {
    // Redirecting to a random room ID as planned
    const roomId = crypto.randomUUID();
    router.push(`/room/${roomId}`);
  };

  // STAGE 1: Nothing happens for 2 seconds
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center circuit-canvas text-gray-400">
        Initializing Workspace...
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <div className="p-8 bg-white shadow-2xl rounded-lg border border-gray-100 w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Sticky Sync</h1>

        {userData ? (
          /* STAGE 3A: User exists in localStorage */
          <div className="text-center">
            <p className="mb-4">
              Welcome back,{" "}
              <span className="font-bold">{userData.sync_userName}</span>
            </p>
            <button
              onClick={navigateToRoom}
              className="w-full bg-black text-white p-3 rounded-md hover:opacity-90 transition-all"
            >
              Create New Room
            </button>
          </div>
        ) : (
          /* STAGE 3B: No user found - Show Form */
          <form onSubmit={handleNewUserSubmit}>
            <input
              type="text"
              required
              placeholder="What's your name?"
              className="border p-3 w-full rounded-md mb-4 outline-none focus:ring-2 focus:ring-blue-400"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-black text-white p-3 rounded-md hover:opacity-90"
            >
              Set Identity
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
