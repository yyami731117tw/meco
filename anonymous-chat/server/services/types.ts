export interface User {
  id: string;
  socketId: string;
  status?: 'online' | 'busy' | 'offline';
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isRead?: boolean;
}

export interface Room {
  id: string;
  users: Set<string>;
  messages: Message[];
} 