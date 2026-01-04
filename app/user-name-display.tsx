"use client";

import { getUserData, updateUserData } from "@/lib/actions/user-action";
import { useStickyStore } from "@/store/useStickyStore";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Pencil, Trash2, Check, X, ArrowRight, User } from "lucide-react";

export default function UserNameDisplay() {
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const { userId } = useAuth();

  const { setStore, userData } = useStickyStore(
    useShallow((state) => ({
      setStore: state.setStore,
      userData: state.userData,
    }))
  );

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
    fetchUserName();
  }, [userId, setStore]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    const newUsername = new FormData(e.currentTarget).get("username") as string;
    if (!newUsername) return;

    try {
      await updateUserData({ username: newUsername });
      setCurrentUserName(newUsername);
      setStore({ userData: { userName: newUsername } });
    } catch (err) {
      console.error("Failed to save username:", err);
    }
  };

  const handleEditSave = async () => {
    if (!editValue.trim()) return;
    try {
      await updateUserData({ username: editValue });
      setCurrentUserName(editValue);
      setStore({ userData: { userName: editValue } });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save username:", err);
    }
  };

  const handleDelete = async () => {
    // This will trigger the form to show again
    try {
      await updateUserData({ username: "" });
      setCurrentUserName(null);
      setStore({ userData: { userName: "" } });
    } catch (err) {
      console.error("Failed to delete username:", err);
    }
  };

  if (!currentUserName) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Welcome!</p>
            <p className="font-semibold text-gray-900">Set up your profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Choose your display name
            </label>
            <input
              name="username"
              placeholder="Enter your name..."
              required
              type="text"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Save & Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-500/25">
          {currentUserName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Signed in as
          </p>

          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                autoFocus
              />
              <button
                onClick={handleEditSave}
                className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all active:scale-90"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all active:scale-90"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 truncate">
                {currentUserName || userData?.userName}
              </p>
              <button
                onClick={() => {
                  setEditValue(currentUserName || "");
                  setIsEditing(true);
                }}
                className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                title="Edit name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete name"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Go to Dashboard Button */}
      <Link href="/dashboard" className="block">
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all active:scale-[0.98]">
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
    </div>
  );
}
