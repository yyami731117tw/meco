import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Redis 客戶端
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// 等待佇列
const waitingQueue = 'waiting_queue';
const reportedMessages = 'reported_messages';

// 禁用詞列表（實際應用中應該從資料庫或配置檔案讀取）
const bannedWords = ['廣告', '色情', '賭博', '詐騙'];

// 連接到 Redis
redisClient.connect().catch(console.error);

// 訊息過濾函數
function filterMessage(text: string): { isClean: boolean; filteredText: string } {
  let filteredText = text;
  let isClean = true;

  for (const word of bannedWords) {
    if (text.includes(word)) {
      filteredText = filteredText.replace(new RegExp(word, 'g'), '***');
      isClean = false;
    }
  }

  return { isClean, filteredText };
}

// 處理 Socket.IO 連線
io.on('connection', async (socket) => {
  console.log('使用者已連線:', socket.id);

  // 處理加入請求
  socket.on('join', async () => {
    try {
      // 檢查等待佇列
      const queueLength = await redisClient.lLen(waitingQueue);
      
      if (queueLength === 0) {
        // 如果佇列為空，將使用者加入佇列
        await redisClient.lPush(waitingQueue, socket.id);
        socket.emit('waiting');
      } else {
        // 如果佇列不為空，配對使用者
        const partnerId = await redisClient.rPop(waitingQueue);
        if (partnerId) {
          // 建立聊天室
          const roomId = `room_${socket.id}_${partnerId}`;
          socket.join(roomId);
          io.sockets.sockets.get(partnerId)?.join(roomId);
          
          // 通知雙方配對成功
          io.to(roomId).emit('matched');
        }
      }
    } catch (error) {
      console.error('配對錯誤:', error);
      socket.emit('error', '配對失敗');
    }
  });

  // 處理訊息
  socket.on('message', (message) => {
    const room = Array.from(socket.rooms)[1]; // 第一個房間是 socket.id
    if (room) {
      // 過濾訊息
      const { isClean, filteredText } = filterMessage(message.text);
      
      // 如果訊息包含禁用詞，記錄到 Redis
      if (!isClean) {
        redisClient.hSet(reportedMessages, message.id, JSON.stringify({
          originalText: message.text,
          filteredText,
          timestamp: Date.now(),
          roomId: room,
        }));
      }

      // 發送過濾後的訊息
      io.to(room).emit('message', {
        ...message,
        text: filteredText,
        isSelf: false,
      });
    }
  });

  // 處理檢舉
  socket.on('report', async ({ messageId }) => {
    try {
      // 記錄被檢舉的訊息
      await redisClient.hSet(reportedMessages, messageId, JSON.stringify({
        reportedAt: Date.now(),
        reportedBy: socket.id,
      }));
      
      // 通知管理員（這裡可以擴展為發送通知到管理後台）
      console.log('訊息被檢舉:', messageId);
    } catch (error) {
      console.error('檢舉處理錯誤:', error);
    }
  });

  // 處理離開
  socket.on('leave', async () => {
    const room = Array.from(socket.rooms)[1];
    if (room) {
      // 通知聊天室中的其他使用者
      socket.to(room).emit('partner_left');
      // 離開聊天室
      socket.leave(room);
    }
  });

  // 處理斷線
  socket.on('disconnect', async () => {
    console.log('使用者已斷線:', socket.id);
    // 從等待佇列中移除
    await redisClient.lRem(waitingQueue, 0, socket.id);
    
    // 通知聊天室中的其他使用者
    const room = Array.from(socket.rooms)[1];
    if (room) {
      socket.to(room).emit('partner_left');
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
}); 