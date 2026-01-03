"use client";

import { getUserData, updateUserData } from "@/lib/actions/user-action"; // Import your update action
import { useStickyStore } from "@/store/useStickyStore";
import { useAuth } from "@clerk/nextjs";
import { stat } from "fs";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";

export default function UserNameDisplay() {
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const { userId, username } = useAuth();

  console.log("Auth username:", username);
  const { setStore, userData } = useStickyStore(
    useShallow((state) => ({
      setStore: state.setStore,
      userData: state.userData,
    }))
  );

  // 1. Fetching the data
  useEffect(() => {
    async function fetchUserName() {
      if (!userId) return;
      try {
        const data = await getUserData(userId, { username: true });
        if (data?.username) {
          setCurrentUserName(data.username);
          setStore({ userData: { userName: data.username } });
        }
      } catch (err) {
        console.error("Error fetching username:", err);
      }
    }

    fetchUserName(); // Call the function
  }, [userId]);

  // 2. Sending the form data
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    // Use FormData to get the value from the input field
    const newUsername = new FormData(e.currentTarget).get("username") as string;

    if (!newUsername) return;

    try {
      await updateUserData({ username: newUsername });
      setCurrentUserName(newUsername);
      setStore({ userData: { userName: newUsername } });
      console.log("Username updated in DB!");
    } catch (err) {
      console.error("Failed to save username:", err);
    }
  };

  if (!currentUserName) {
    return (
      <div className="p-4 border rounded-lg bg-slate-50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Choose your Sticky Sync name:
          </label>
          <input
            name="username" // <--- CRITICAL: FormData uses this name
            placeholder="Enter username"
            required={true}
            type="text"
            className="border p-2 rounded"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Save Username
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 font-bold">
      User:{" "}
      <span className="text-blue-600">
        {currentUserName || userData?.userName}
      </span>
      <Link href="/dashboard" className="inline-block ml-2 w-4 h-4">
        <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          Go to DashBoard
          <span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 inline-block"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
        </button>
      </Link>
    </div>
  );
}
