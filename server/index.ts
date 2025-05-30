import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import cors from 'cors';
import { matchService } from './services/matchService'; // 導入 MatchService
import { User } from './services/types'; // 導入 User 類型

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

// 等待佇列 (不再直接操作，由 MatchService 內部管理)
// const waitingQueue = 'waiting_queue';
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

  // 當使用者連線時，將其加入到 MatchService 的在線使用者列表
  const newUser: User = { id: socket.id, socketId: socket.id };
  matchService.addUser(newUser);

  // 處理加入請求
  socket.on('join', async () => {
    try {
      // 從 MatchService 獲取最新的 User 物件
      const user = matchService.getUser(socket.id);
      if (!user) {
          socket.emit('error', '使用者狀態異常，請重新連線');
          return;
      }

      // 先嘗試尋找是否有等待中的配對
      const matchedUser = matchService.findMatch(user);

      if (matchedUser) {
        // 找到匹配，建立聊天室
        const roomId = `room_${socket.id}_${matchedUser.socketId}`;
        socket.join(roomId);
        // 使用 matchedUser.socketId 加入房間
        io.sockets.sockets.get(matchedUser.socketId)?.join(roomId);

        // 通知雙方配對成功
        io.to(roomId).emit('matched', { partnerId: matchedUser.id }); // 發送 partnerId
        console.log(`使用者 ${socket.id} 與 ${matchedUser.id} 配對成功，房間號: ${roomId}`);

      } else {
        // 如果沒有找到匹配，將使用者加入等待佇列
        const added = matchService.enqueue(user);
        if (added) {
          socket.emit('waiting');
          console.log(`使用者 ${socket.id} 已加入等待佇列。目前佇列長度: ${matchService.getQueueLength()}`);
        } else {
          // 如果使用者已經在佇列或配對中
          // 可以選擇發送不同的事件或訊息
           const status = matchService.getUserStatus(socket.id);
           if (status === 'busy') {
               socket.emit('already_matched', { partnerId: matchService.getMatch(socket.id) });
           } else if (status === 'online' && matchService.isUserInQueue(socket.id)) {
               socket.emit('already_waiting');
           } else {
                socket.emit('error', '您已在佇列或配對中'); // 通用錯誤訊息
           }
        }
      }
    } catch (error) {
      console.error('配對請求處理錯誤:', error);
      socket.emit('error', '處理配對請求失敗');
    }
  });

  // 處理訊息
  socket.on('message', (message) => {
    // const room = Array.from(socket.rooms)[1]; // 第一個房間是 socket.id
    // if (room) {
      // 從 MatchService 獲取配對者的 socketId
      const partnerSocketId = matchService.getPartnerSocketId(socket.id);

      if (partnerSocketId) {
         // 過濾訊息
        const { isClean, filteredText } = filterMessage(message.text);

        // 如果訊息包含禁用詞，記錄到 Redis
        if (!isClean) {
          // TODO: 實現將被檢舉訊息記錄到 MatchService 或其他服務
          redisClient.hSet(reportedMessages, message.id, JSON.stringify({
            originalText: message.text,
            filteredText,
            timestamp: Date.now(),
            // roomId: room, // 這裡不再依賴 room，而是通過 partnerSocketId 發送
            senderId: socket.id, // 記錄發送者 ID
            partnerId: matchService.getMatch(socket.id), // 記錄接收者 ID
          }));
          console.log(`訊息 ${message.id} 包含禁用詞並已記錄。`);
        }

        // 發送過濾後的訊息給聊天室中的對方 (使用 partnerSocketId)
        io.to(partnerSocketId).emit('message', {
          ...message,
          text: filteredText,
          isSelf: false, // 發送給對方，isSelf 為 false
          timestamp: Date.now(), // 添加時間戳
        });
        console.log(`從 ${socket.id} 發送訊息給 ${partnerSocketId}: ${filteredText}`);

        // 發送給自己，isSelf 為 true
        socket.emit('message', {
          ...message,
          text: filteredText,
          isSelf: true, // 發送給自己，isSelf 為 true
          timestamp: Date.now(), // 添加時間戳
        });

      } else {
          // 如果沒有找到配對，可能是狀態異常
          console.warn(`使用者 ${socket.id} 嘗試發送訊息但未找到配對。`);
          socket.emit('error', '您目前沒有配對對象，無法發送訊息。');
      }
    // }
  });

  // 處理檢舉
  socket.on('report', async ({ messageId }) => {
    try {
      // TODO: 將檢舉處理移到 MatchService 或獨立的 ReportService
      // 這裡可以獲取原始訊息內容來存儲更詳細的檢舉信息
      const messageData = await redisClient.hGet(reportedMessages, messageId);
      const reportInfo = messageData ? JSON.parse(messageData) : {};

      await redisClient.hSet(reportedMessages, messageId, JSON.stringify({
        ...reportInfo,
        reportedAt: Date.now(),
        reportedBy: socket.id,
      }));

      console.log(`訊息 ${messageId} 被使用者 ${socket.id} 檢舉。`);
       socket.emit('report_success', { messageId }); // 通知檢舉成功

    } catch (error) {
      console.error('檢舉處理錯誤:', error);
      socket.emit('error', '處理檢舉失敗');
    }
  });

  // 處理離開
  socket.on('leave', async () => {
     // 從 MatchService 中移除配對關係
     if (matchService.isUserMatched(socket.id)) {
         // 通知配對對象使用者已離開
         const partnerUser = matchService.getPartnerUser(socket.id);
         if (partnerUser) {
             io.to(partnerUser.socketId).emit('partner_left');
              console.log(`使用者 ${socket.id} 離開，通知對方 ${partnerUser.id}。`);
             // 讓對方也離開房間（如果他們還在房間裡）
              io.sockets.sockets.get(partnerUser.socketId)?.leave(`room_${socket.id}_${partnerUser.socketId}`);
         }

        // 移除配對
        matchService.removeMatch(socket.id);

        // 讓自己離開房間
        const room = Array.from(socket.rooms)[1]; // 假設第二個是房間 ID
        if (room) {
            socket.leave(room);
             console.log(`使用者 ${socket.id} 離開房間 ${room}。`);
        }

     } else if (matchService.isUserInQueue(socket.id)) {
        // 如果使用者在等待佇列中，則從佇列中移除
        matchService.dequeue(socket.id);
        console.log(`使用者 ${socket.id} 從等待佇列中移除。`);
     }

     // 可以選擇將使用者狀態設置回 online 或其他狀態
     // 狀態管理應由 removeUser 或 disconnect 統一處理
     // matchService.setUserOnline(socket.id);

     socket.emit('left'); // 通知使用者已離開
  });

  // 處理斷線
  socket.on('disconnect', async () => {
    console.log('使用者已斷線:', socket.id);

    // 從 MatchService 中移除使用者（不論在佇列或配對中）
    matchService.removeUser(socket.id);

    // 移除使用者後，如果他們在配對中，removeUser 會處理通知對方
    // 如果在佇列中，removeUser 會處理從佇列移除

     // 讓使用者離開所有房間 (除了自己的 socket.id 房間)
     const rooms = Array.from(socket.rooms).slice(1);
     rooms.forEach(room => {
         socket.leave(room);
         console.log(`使用者 ${socket.id} 斷線並離開房間 ${room}。`);
     });

    // Redis 連線斷開處理 (如果需要)
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`伺服器運行在 port ${PORT}`);
}); 