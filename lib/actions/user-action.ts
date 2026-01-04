"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { title } from "process";
import type { StickyNote } from "@/types/types";
import type { Prisma } from "@prisma/client";
import { checker } from "../utils";

// get any of user's data
export async function getUserData(userId: string, fields: Prisma.UserSelect) {
  try {
    const user = await db.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: fields,
    });
    return user;
  } catch (err) {
    console.log("Something went wrong in Get User Data:", err);
  }
}

// update any of user's data
export async function updateUserData(data: Prisma.UserUpdateInput) {
  const { userId } = await auth();
  checker(userId!, "user not authenticated");

  try {
    const updatedUser = await db.user.update({
      where: {
        clerkId: userId,
      },
      data,
    });
    console.log("User data Updated Successfully.");
    return updatedUser;
  } catch (err) {
    console.log("Error! Can't update User Data:", err);
  }
}

// get user's notes
export async function getUserNotes() {
  const { userId } = await auth();

  checker(userId, "User not authenticated");

  // Find user in Your DATABASE
  const user = await db.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      notes: {
        createdAt: "desc",
      },
    },
  });

  return user;
}


// create new room
export async function createRoom(roomName?: string) {
  const { userId: clerkUserId } = await auth();

  checker(clerkUserId, "User not authenticated");

  const user = await db.user.findUnique({ where: { clerkId: clerkUserId } });
  checker(user?.id, "User not found in database");

  console.log("Creating room with name:", roomName);
  const name = roomName?.trim() || "New Room";

  try {
    const newRoom = await db.room.create({
      data: {
        roomName: name,
        owner: { connect: { id: user!.id } },
        users: {
          connect: {
            id: user!.id,
          },
        },
      },
    });
    return newRoom.id;
  } catch (err) {
    console.error("Can't create new room", err);
    throw err;
  }
}
