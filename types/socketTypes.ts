// Interfaces

export interface DataPayload {
  userId: string;
  roomId: string;
  userName: string;
}

// Server to Client Events
export interface ServerToClientEvents {
  // User Joined Room
  user_joined: (data: DataPayload) => void;

  // User Left Room
  user_left: (data: DataPayload) => void;

  // send the current room data
  room_data: (data: Partial<DataPayload>) => void;
}

export interface ClientToServerEvents {
  // Join Room
  join_room: (data: DataPayload) => void;

  // Leave Room
  leave_room: (data: DataPayload) => void;

  // get the current room Data
  get_room_data: (data: Partial<DataPayload>) => void;
}

export interface SocketData {
  userId: string;
  roomId: string;
  userName: string;
}
