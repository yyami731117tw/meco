type User = {
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
};

class MatchService {
  private queue: User[] = [];
  private activeMatches: Map<string, string> = new Map(); // userId -> matchedUserId
  private userStatus: Map<string, 'online' | 'offline' | 'busy'> = new Map();
  private readonly MATCH_TIMEOUT = 5 * 60 * 1000; // 5分鐘配對超時

  enqueue(user: User) {
    // 檢查用戶是否已在隊列中
    if (this.queue.find(u => u.id === user.id)) {
      return false;
    }

    // 檢查用戶是否已在配對中
    if (this.activeMatches.has(user.id)) {
      return false;
    }

    user.lastActive = new Date();
    this.queue.push(user);
    this.userStatus.set(user.id, 'online');
    return true;
  }

  dequeue(userId: string) {
    this.queue = this.queue.filter(u => u.id !== userId);
    this.activeMatches.delete(userId);
    this.userStatus.delete(userId);
  }

  findMatch(user: User): User | null {
    // 如果用戶已在配對中，返回 null
    if (this.activeMatches.has(user.id)) {
      return null;
    }

    // 清理過期的配對
    this.cleanupExpiredMatches();

    // 從隊列中尋找匹配
    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];
      
      // 跳過自己
      if (candidate.id === user.id) {
        continue;
      }

      // 檢查性別偏好（如果有的話）
      if (user.preferences?.gender && candidate.gender !== user.preferences.gender) {
        continue;
      }

      // 找到匹配，從隊列中移除並建立配對
      this.queue.splice(i, 1);
      this.activeMatches.set(user.id, candidate.id);
      this.activeMatches.set(candidate.id, user.id);
      this.userStatus.set(user.id, 'busy');
      this.userStatus.set(candidate.id, 'busy');
      return candidate;
    }

    return null;
  }

  getMatch(userId: string): string | undefined {
    return this.activeMatches.get(userId);
  }

  removeMatch(userId: string) {
    const partnerId = this.activeMatches.get(userId);
    if (partnerId) {
      this.activeMatches.delete(userId);
      this.activeMatches.delete(partnerId);
      this.userStatus.delete(userId);
      this.userStatus.delete(partnerId);
    }
  }

  getUserStatus(userId: string): 'online' | 'offline' | 'busy' | undefined {
    return this.userStatus.get(userId);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveMatchesCount(): number {
    return this.activeMatches.size / 2; // 因為每個配對都存儲了兩次
  }

  private cleanupExpiredMatches() {
    const now = new Date();
    for (const [userId, partnerId] of this.activeMatches.entries()) {
      const user = this.queue.find(u => u.id === userId);
      if (user?.lastActive && (now.getTime() - user.lastActive.getTime() > this.MATCH_TIMEOUT)) {
        this.removeMatch(userId);
      }
    }
  }

  updateUserActivity(userId: string) {
    const user = this.queue.find(u => u.id === userId);
    if (user) {
      user.lastActive = new Date();
    }
  }

  isUserInQueue(userId: string): boolean {
    return this.queue.some(u => u.id === userId);
  }

  isUserMatched(userId: string): boolean {
    return this.activeMatches.has(userId);
  }
}

export const matchService = new MatchService(); 