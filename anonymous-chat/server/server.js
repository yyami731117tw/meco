import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);

// 配置 CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 存儲等待配對的用戶和已配對的房間
let waitingUsers = [];
let activeRooms = new Map();

// 生成房間ID
function generateRoomId() {
  return 'room_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// 清理離線用戶
function cleanupUser(socketId) {
  // 從等待列表移除
  waitingUsers = waitingUsers.filter(user => user.socketId !== socketId);
  
  // 處理已配對房間中的用戶離開
  for (let [roomId, room] of activeRooms.entries()) {
    if (room.users.includes(socketId)) {
      // 通知房間中的其他用戶
      const otherUser = room.users.find(id => id !== socketId);
      if (otherUser) {
        io.to(otherUser).emit('partner_left');
      }
      activeRooms.delete(roomId);
      break;
    }
  }
}

// 嘗試配對用戶
function tryMatchUsers() {
  if (waitingUsers.length >= 2) {
    // 隨機選擇兩個用戶進行配對
    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();
    
    const roomId = generateRoomId();
    
    // 創建房間
    activeRooms.set(roomId, {
      users: [user1.socketId, user2.socketId],
      createdAt: Date.now()
    });
    
    // 將用戶加入Socket.IO房間
    io.sockets.sockets.get(user1.socketId)?.join(roomId);
    io.sockets.sockets.get(user2.socketId)?.join(roomId);
    
    // 通知兩個用戶配對成功
    io.to(user1.socketId).emit('matched', { roomId });
    io.to(user2.socketId).emit('matched', { roomId });
    
    console.log(`用戶配對成功: ${user1.socketId} 和 ${user2.socketId} 在房間 ${roomId}`);
  }
}

// Socket.IO 連線處理
io.on('connection', (socket) => {
  console.log('用戶連線:', socket.id);
  
  // 用戶加入配對隊列
  socket.on('join', () => {
    console.log('用戶請求配對:', socket.id);
    
    // 檢查用戶是否已在等待列表中
    if (!waitingUsers.find(user => user.socketId === socket.id)) {
      waitingUsers.push({
        socketId: socket.id,
        joinedAt: Date.now()
      });
      
      socket.emit('waiting');
      console.log(`用戶 ${socket.id} 加入等待隊列，當前等待人數: ${waitingUsers.length}`);
      
      // 嘗試配對
      tryMatchUsers();
    }
  });
  
  // 處理訊息
  socket.on('message', (messageData) => {
    console.log('收到訊息:', messageData);
    
    // 找到用戶所在的房間
    let userRoom = null;
    for (let [roomId, room] of activeRooms.entries()) {
      if (room.users.includes(socket.id)) {
        userRoom = roomId;
        break;
      }
    }
    
    if (userRoom) {
      // 轉發訊息給房間中的其他用戶
      socket.to(userRoom).emit('message', {
        ...messageData,
        isSelf: false
      });
      
      // 確認訊息已發送給發送者
      socket.emit('message', {
        ...messageData,
        isSelf: true
      });
    } else {
      socket.emit('error', '未找到聊天房間');
    }
  });
  
  // 用戶離開配對或聊天
  socket.on('leave', () => {
    console.log('用戶主動離開:', socket.id);
    cleanupUser(socket.id);
  });
  
  // 處理斷線
  socket.on('disconnect', (reason) => {
    console.log('用戶斷線:', socket.id, '原因:', reason);
    cleanupUser(socket.id);
  });
  
  // 錯誤處理
  socket.on('error', (error) => {
    console.error('Socket錯誤:', error);
  });
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeRooms: activeRooms.size,
    waitingUsers: waitingUsers.length
  });
});

// 統計端點
app.get('/stats', (req, res) => {
  res.json({
    activeRooms: activeRooms.size,
    waitingUsers: waitingUsers.length,
    connectedClients: io.sockets.sockets.size
  });
});

// 定期清理過期的等待用戶（超過5分鐘）
setInterval(() => {
  const now = Date.now();
  const expiredTime = 5 * 60 * 1000; // 5分鐘
  
  waitingUsers = waitingUsers.filter(user => {
    if (now - user.joinedAt > expiredTime) {
      console.log('清理過期等待用戶:', user.socketId);
      return false;
    }
    return true;
  });
}, 60000); // 每分鐘檢查一次

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Meco聊天服務器運行在端口 ${PORT}`);
  console.log(`📊 健康檢查: http://localhost:${PORT}/health`);
  console.log(`📈 統計信息: http://localhost:${PORT}/stats`);
}); 