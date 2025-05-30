import { User } from './types'; // 假設 User 類型定義在這個檔案

class MatchService {
  private queue: User[] = [];
  private activeMatches: Map<string, string> = new Map(); // userId -> matchedUserId
  private userStatus: Map<string, 'online' | 'offline' | 'busy'> = new Map();
  private onlineUsers: Map<string, User> = new Map(); // userId -> User object (包含 socketId)
  private readonly MATCH_TIMEOUT = 5 * 60 * 1000; // 5分鐘配對超時

  // 添加使用者到在線列表
  addUser(user: User) {
    this.onlineUsers.set(user.id, user);
    this.userStatus.set(user.id, 'online');
    console.log(`使用者 ${user.id} 上線。`);
  }

  // 從在線列表移除使用者
  removeUser(userId: string) {
    this.onlineUsers.delete(userId);
    this.userStatus.delete(userId);
    // 同時檢查是否在佇列或配對中，並移除
    if (this.isUserInQueue(userId)) {
        this.dequeue(userId);
    }
    if (this.isUserMatched(userId)) {
        this.removeMatch(userId);
    }
    console.log(`使用者 ${userId} 離線。`);
  }

  enqueue(user: User) {
    // 檢查用戶是否已在隊列中
    if (this.queue.find(u => u.id === user.id)) {
      return false;
    }

    // 檢查用戶是否已在配對中
    if (this.activeMatches.has(user.id)) {
      return false;
    }

    // 確保用戶在線，如果不在線則不加入佇列
    if (!this.onlineUsers.has(user.id)) {
        console.warn(`嘗試將離線使用者 ${user.id} 加入佇列。`);
        return false;
    }

    // 從 onlineUsers Map 中獲取最新的 User 物件，確保包含正確的 socketId 等信息
    const onlineUser = this.onlineUsers.get(user.id);
    if (!onlineUser) return false; // 應該不會發生，但安全起見

    onlineUser.lastActive = new Date();
    this.queue.push(onlineUser);
    this.userStatus.set(onlineUser.id, 'online'); // 在佇列中狀態仍視為 online
    console.log(`使用者 ${onlineUser.id} 已加入等待佇列。目前佇列長度: ${this.getQueueLength()}`);
    return true;
  }

  dequeue(userId: string) {
    this.queue = this.queue.filter(u => u.id !== userId);
    // 注意：這裡不應移除配對關係，因為 dequeue 只處理等待佇列中的用戶
    // this.activeMatches.delete(userId);
    // 移除佇列後不改變 onlineUser 狀態，狀態管理應在 removeUser 中統一處理
    // this.userStatus.delete(userId);
     console.log(`使用者 ${userId} 從等待佇列中移除。目前佇列長度: ${this.getQueueLength()}`);
  }

  findMatch(user: User): User | null {
    // 如果用戶已在配對中，返回 null
    if (this.activeMatches.has(user.id)) {
      return null;
    }

     // 確保用戶在線且不在佇列中才進行匹配尋找
     if (!this.onlineUsers.has(user.id) || this.isUserInQueue(user.id)) {
         return null;
     }

    // 從隊列中尋找匹配並隨機選擇
    const potentialMatches = this.queue.filter(candidate => {
        // 跳過自己
        if (candidate.id === user.id) {
            return false;
        }
        // 檢查性別偏好（如果有的話） - 這裡可以加入更複雜的匹配邏輯
        if (user.preferences?.gender && candidate.gender !== user.preferences.gender) {
            return false;
        }
        // TODO: 加入更多匹配條件檢查，如年齡、興趣等
        return true; // 符合基本條件
    });

    if (potentialMatches.length === 0) {
        return null; // 沒有找到潛在匹配
    }

    // 隨機選擇一個匹配對象
    const randomIndex = Math.floor(Math.random() * potentialMatches.length);
    const matchedUser = potentialMatches[randomIndex];

    // 從隊列中移除被選中的匹配對象
    this.queue = this.queue.filter(u => u.id !== matchedUser.id);

    // 建立配對
    this.activeMatches.set(user.id, matchedUser.id);
    this.activeMatches.set(matchedUser.id, user.id);
    this.userStatus.set(user.id, 'busy');
    this.userStatus.set(matchedUser.id, 'busy');

    console.log(`使用者 ${user.id} 與 ${matchedUser.id} 配對成功。`);
    return matchedUser;
  }

  getMatch(userId: string): string | undefined {
    return this.activeMatches.get(userId);
  }

  removeMatch(userId: string) {
    const partnerId = this.activeMatches.get(userId);
    if (partnerId) {
      this.activeMatches.delete(userId);
      this.activeMatches.delete(partnerId);

      // 移除配對後，將用戶狀態設置為 online 或 offline (如果他們還連線著)
      // 狀態管理應在 removeUser 或 disconnect 事件中處理
      // this.userStatus.delete(userId); // 先刪除 busy 狀態
      // this.userStatus.delete(partnerId); // 先刪除 busy 狀態

       console.log(`使用者 ${userId} 和 ${partnerId} 已從 MatchService 移除配對。`);
       // TODO: 檢查用戶是否還在線，更新其狀態（這應該由調用者（如 disconnect 事件）處理）
       // 例如：在 disconnect 或 leave 事件中呼叫 removeUser
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

  // 清理過期配對的邏輯（可以在後端定期運行）
  cleanupExpiredMatches() {
    const now = new Date();
    const usersToRemoveFromQueue: string[] = [];
    this.queue.forEach(user => {
      if (user.lastActive && (now.getTime() - user.lastActive.getTime() > this.MATCH_TIMEOUT)) {
        usersToRemoveFromQueue.push(user.id);
      }
    });

    usersToRemoveFromQueue.forEach(userId => {
      this.dequeue(userId);
      // 從 onlineUsers 移除（如果在佇列中超時，視為離線處理）
      this.removeUser(userId);
      console.log(`使用者 ${userId} 因超時從等待佇列中移除並標記為離線。`);
    });

    // TODO: 處理配對中的超時（例如聊天室長時間無活動）
    // 這需要在 activeMatches 中追蹤每個配對的最後活動時間
  }

  updateUserActivity(userId: string) {
     // 更新在線用戶的活動時間，主要用於清理超時用戶
     const user = this.onlineUsers.get(userId);
     if (user) {
       user.lastActive = new Date();
     }
     // 同時更新佇列中的用戶活動時間，如果他們在佇列中
     const userInQueue = this.queue.find(u => u.id === userId);
     if (userInQueue) {
        userInQueue.lastActive = new Date();
     }
  }

  isUserInQueue(userId: string): boolean {
    return this.queue.some(u => u.id === userId);
  }

  isUserMatched(userId: string): boolean {
    return this.activeMatches.has(userId);
  }

  // 獲取配對者的 Socket ID
  getPartnerSocketId(userId: string): string | undefined {
     const partnerId = this.activeMatches.get(userId);
     if (partnerId) {
       // 從 onlineUsers Map 中查找配對者的 User 物件，獲取其 socketId
       const partnerUser = this.onlineUsers.get(partnerId);
       return partnerUser?.socketId;
     }
     return undefined;
  }

   // 獲取配對者的 User 物件
  getPartnerUser(userId: string): User | undefined {
     const partnerId = this.activeMatches.get(userId);
     if (partnerId) {
       return this.onlineUsers.get(partnerId);
     }
     return undefined;
  }

  // 獲取指定 userId 的 User 物件
  getUser(userId: string): User | undefined {
      return this.onlineUsers.get(userId);
  }

}

export const matchService = new MatchService();

// 定期運行清理過期配對的任務
setInterval(() => {
  matchService.cleanupExpiredMatches();
}, 60 * 1000); // 每分鐘檢查一次 