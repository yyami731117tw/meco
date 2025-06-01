export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isSelf: boolean;
  isRead?: boolean;
} 