import { User, Room } from './types';

class MatchService {
  private users: Map<string, User> = new Map();
  private waitingQueue: string[] = [];
  private matches: Map<string, string> = new Map();
  private rooms: Map<string, Room> = new Map();

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.dequeue(userId);
    this.removeMatch(userId);
  }

  enqueue(user: User): boolean {
    if (this.isUserInQueue(user.id) || this.isUserMatched(user.id)) {
      return false;
    }
    this.waitingQueue.push(user.id);
    return true;
  }

  dequeue(userId: string): void {
    const index = this.waitingQueue.indexOf(userId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  isUserInQueue(userId: string): boolean {
    return this.waitingQueue.includes(userId);
  }

  findMatch(user: User): User | null {
    if (this.waitingQueue.length === 0) {
      return null;
    }

    const partnerId = this.waitingQueue.shift();
    if (!partnerId) return null;

    const partner = this.users.get(partnerId);
    if (!partner) return null;

    this.matches.set(user.id, partner.id);
    this.matches.set(partner.id, user.id);

    return partner;
  }

  isUserMatched(userId: string): boolean {
    return this.matches.has(userId);
  }

  getMatch(userId: string): string | undefined {
    return this.matches.get(userId);
  }

  removeMatch(userId: string): void {
    const partnerId = this.matches.get(userId);
    if (partnerId) {
      this.matches.delete(userId);
      this.matches.delete(partnerId);
    }
  }

  getPartnerUser(userId: string): User | undefined {
    const partnerId = this.matches.get(userId);
    if (!partnerId) return undefined;
    return this.users.get(partnerId);
  }

  getPartnerSocketId(userId: string): string | undefined {
    const partner = this.getPartnerUser(userId);
    return partner?.socketId;
  }

  getUserStatus(userId: string): 'online' | 'busy' | 'offline' {
    if (this.isUserMatched(userId)) return 'busy';
    if (this.isUserInQueue(userId)) return 'online';
    return 'offline';
  }

  getQueueLength(): number {
    return this.waitingQueue.length;
  }
}

export const matchService = new MatchService(); 