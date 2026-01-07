"use server";

import { db } from "../db";
import { actionWrapper, ensure, getAuthUser } from "../utils";

//Verify room before joining if it exists or not
export async function verifyRoom(roomId: string) {
  return actionWrapper(async () => {
    // Step 1
    const user = await getAuthUser();

    // Step 2. check the room exists
    const room = await db.room.findUnique({
      where: {
        id: roomId,
      },
    });
    // Step 3. return room or throw error
    return ensure(room, "Room not found");
  });
}

// create new room (auto-syncs user if not found)
export async function createRoom(roomName?: string) {
  return actionWrapper(async () => {
    // Step 1.
    const user = await getAuthUser();

    // Step 2. create the room`
    const name = roomName?.trim() || "New Room";

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

    // Step 3. Return the new room Id
    return newRoom.id;
  });
}

// Join room by adding user to room user list
export async function joinRoom(roomId: string) {
  return actionWrapper(async () => {
    // Step 1.
    const user = await getAuthUser();

    // Step 2. Join the room
    const updatedRoom = await db.room.update({
      where: {
        id: roomId,
      },
      data: {
        users: {
          connect: {
            id: user!.id,
          },
        },
      },
    });

    // Step 3. Return the updated room
    return ensure(updatedRoom, "Join Room failed!");
  });
}

// Left room by removing user from room users list
export async function leaveRoom(roomId: string) {
  return actionWrapper(async () => {
    // Step 1
    const user = await getAuthUser();

    // Step 2. update the room
    const updatedRoom = await db.room.update({
      where: {
        id: roomId,
      },
      data: {
        users: {
          disconnect: {
            id: user?.id,
          },
        },
      },
    });

    // return updated room
    return ensure(updatedRoom, "Could not leave room!");
  });
}
