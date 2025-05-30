export interface User {
  id: string;
  socketId: string;
  gender?: string;
  preferences?: {
    gender?: string;
    ageRange?: {
      min: number;
      max: number;
    };
  };
  lastActive?: Date;
} 