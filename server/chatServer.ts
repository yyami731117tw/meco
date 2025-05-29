import { Server, Socket } from 'socket.io';
import { matchService } from './services/matchService';
import { createClient } from 'redis';
import { Server as HttpServer } from 'http';

// 類型定義
interface UserData {
  gender?: string;
  preferences?: {
    gender?: string;
    ageRange?: {
      min: number;
      max: number;
    };
  };
}

interface MessageData {
  from: string;
  message: string;
  timestamp: string;
}

interface SystemMessage {
  type: 'connected' | 'error' | 'info';
  message: string;
}

// 用戶連接映射
const userConnections = new Map<string, string>(); // userId -> socketId

// 創建 Redis 客戶端
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err));

export async function createChatServer(server: HttpServer) {
  await redisClient.connect();

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // 中間件：驗證用戶
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error('Authentication error'));
    }
    socket.data.userId = userId;
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId} (${socket.id})`);

    // 更新用戶連接映射
    userConnections.set(userId, socket.id);

    // 加入用戶房間
    socket.join(userId);

    // 發送系統消息
    const systemMessage: SystemMessage = {
      type: 'connected',
      message: '已成功連接到聊天伺服器'
    };
    socket.emit('system', systemMessage);

    // 加入配對隊列
    socket.on('joinQueue', async (userData: UserData) => {
      try {
        const user = {
          id: userId,
          socketId: socket.id,
          gender: userData.gender,
          preferences: userData.preferences
        };

        const success = matchService.enqueue(user);
        if (!success) {
          socket.emit('error', { message: '已在配對隊列中或已配對' });
          return;
        }

        const match = matchService.findMatch(user);
        if (match) {
          // 創建聊天室
          const roomId = `chat:${[userId, match.id].sort().join(':')}`;
          socket.join(roomId);
          io.sockets.sockets.get(match.socketId)?.join(roomId);

          // 通知雙方配對成功
          io.to(roomId).emit('matched', {
            roomId,
            partnerId: match.id,
            timestamp: new Date().toISOString()
          });

          // 發送歷史消息
          const history = await redisClient.lRange(`messages:${roomId}`, 0, -1);
          socket.emit('history', history.map((msg: string) => JSON.parse(msg)));
        } else {
          socket.emit('waiting', {
            queuePosition: matchService.getQueueLength(),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Join queue error:', error);
        socket.emit('error', { message: '加入配對隊列失敗' });
      }
    });

    // 發送消息
    socket.on('message', async ({ roomId, message }: { roomId: string; message: string }) => {
      try {
        const match = matchService.getMatch(userId);
        if (!match) {
          socket.emit('error', { message: '未配對狀態' });
          return;
        }

        const messageData: MessageData = {
          from: userId,
          message,
          timestamp: new Date().toISOString()
        };

        // 保存消息到 Redis
        await redisClient.lPush(`messages:${roomId}`, JSON.stringify(messageData));
        await redisClient.lTrim(`messages:${roomId}`, 0, 99); // 只保留最近 100 條消息

        // 發送消息到聊天室
        io.to(roomId).emit('message', messageData);
      } catch (error) {
        console.error('Message error:', error);
        socket.emit('error', { message: '發送消息失敗' });
      }
    });

    // 離開配對
    socket.on('leave', async () => {
      try {
        const match = matchService.getMatch(userId);
        if (match) {
          const roomId = `chat:${[userId, match].sort().join(':')}`;
          
          // 通知對方
          io.to(roomId).emit('partnerLeft', {
            userId,
            timestamp: new Date().toISOString()
          });

          // 清理配對
          matchService.removeMatch(userId);
          socket.leave(roomId);
        }

        matchService.dequeue(userId);
        socket.emit('left');
      } catch (error) {
        console.error('Leave error:', error);
        socket.emit('error', { message: '離開配對失敗' });
      }
    });

    // 心跳檢測
    socket.on('heartbeat', () => {
      matchService.updateUserActivity(userId);
      socket.emit('heartbeat_ack');
    });

    // 斷開連接
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (${socket.id})`);
      
      // 清理用戶狀態
      const match = matchService.getMatch(userId);
      if (match) {
        const roomId = `chat:${[userId, match].sort().join(':')}`;
        io.to(roomId).emit('partnerLeft', {
          userId,
          timestamp: new Date().toISOString()
        });
        matchService.removeMatch(userId);
      }

      matchService.dequeue(userId);
      userConnections.delete(userId);
    });
  });

  return io;
} 