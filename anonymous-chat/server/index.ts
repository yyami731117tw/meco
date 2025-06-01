import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import basicAuth from 'express-basic-auth';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 等待配對的用戶隊列
const waitingUsers: any[] = [];

// 監控聊天室和使用者數量
let activeRooms = new Map<string, Set<string>>();
let totalUsers = 0;

// 更新並廣播統計信息
const broadcastStats = () => {
  const stats = {
    activeRooms: activeRooms.size,
    totalUsers: totalUsers,
    rooms: Array.from(activeRooms.entries()).map(([roomId, users]) => ({
      roomId,
      userCount: users.size
    }))
  };
  io.emit('stats_update', stats);
};

io.on('connection', (socket) => {
  console.log('用戶已連接:', socket.id);
  totalUsers++;
  broadcastStats();

  socket.on('disconnect', () => {
    console.log('用戶已斷開連接:', socket.id);
    totalUsers--;
    
    // 清理聊天室
    activeRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          activeRooms.delete(roomId);
        } else {
          // 通知其他用戶
          users.forEach(userId => {
            io.to(userId).emit('partner_left');
          });
        }
      }
    });
    
    broadcastStats();
  });

  socket.on('join', () => {
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();
      const roomId = `room_${Date.now()}`;
      
      // 創建新的聊天室
      activeRooms.set(roomId, new Set([socket.id, partner.id]));
      
      socket.join(roomId);
      partner.join(roomId);
      
      socket.emit('matched', { roomId });
      partner.emit('matched', { roomId });
      
      broadcastStats();
    } else {
      waitingUsers.push(socket);
      socket.emit('waiting');
    }
  });

  socket.on('leave', () => {
    const index = waitingUsers.indexOf(socket);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
    
    activeRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
    broadcastStats();
  });

  socket.on('message', (message) => {
    const rooms = Array.from(socket.rooms);
    if (rooms.length > 1) {
      const roomId = rooms[1];
      socket.to(roomId).emit('message', {
        ...message,
        isSelf: false
      });
    }
  });

  socket.on('message_read', (messageId) => {
    const rooms = Array.from(socket.rooms);
    if (rooms.length > 1) {
      const roomId = rooms[1];
      socket.to(roomId).emit('message_read_confirm', messageId);
    }
  });
});

// 管理員登入驗證
app.use('/admin', basicAuth({
  users: { 'admin': 'admin123' },
  challenge: true,
  realm: 'MecoAdmin',
}) as any);

let currentAnnouncement = '';

// 管理後台頁面
app.get('/admin', (req, res) => {
  // 取得聊天室與用戶資訊
  const stats = {
    activeRooms: activeRooms.size,
    totalUsers,
    waitingUsers: waitingUsers.length,
    rooms: Array.from(activeRooms.entries()).map(([roomId, users]) => ({
      roomId,
      userCount: users.size,
      users: Array.from(users)
    }))
  };
  res.send(`
    <html>
      <head>
        <title>Meco 管理後台</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: sans-serif; background: #f5f6fa; margin: 0; padding: 0; }
          .admin-container { max-width: 600px; margin: 2rem auto; background: #fff; border-radius: 16px; box-shadow: 0 2px 16px #0001; padding: 2rem; }
          h1 { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
          th { background: #f0f4fa; }
          .announcement-box { margin: 1.5rem 0; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e0e7ef; }
          .announcement-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
          .announcement-form input { flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #cbd5e1; }
          .announcement-form button { padding: 0.5rem 1.2rem; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-weight: bold; cursor: pointer; }
          .announcement-form button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="admin-container">
          <h1>Meco 管理後台</h1>
          <div class="announcement-box">
            <b>目前公告：</b><br>
            <div style="color:#2563eb; margin: 0.5rem 0; min-height: 1.5em;">${currentAnnouncement || '（無公告）'}</div>
            <form class="announcement-form" method="POST" action="/admin/announcement">
              <input type="text" name="announcement" placeholder="輸入新公告..." value="${currentAnnouncement.replace(/"/g, '&quot;')}" />
              <button type="submit">送出公告</button>
              <button type="submit" name="clear" value="1" style="background:#e11d48;">清空</button>
            </form>
          </div>
          <p>活躍聊天室數：<b>${stats.activeRooms}</b></p>
          <p>在線用戶數：<b>${stats.totalUsers}</b></p>
          <p>等待配對人數：<b>${stats.waitingUsers}</b></p>
          <h2>聊天室列表</h2>
          <table>
            <tr><th>Room ID</th><th>用戶數</th><th>用戶ID</th></tr>
            ${stats.rooms.map(r => `<tr><td>${r.roomId}</td><td>${r.userCount}</td><td>${r.users.join('<br>')}</td></tr>`).join('')}
          </table>
        </div>
      </body>
    </html>
  `);
});

// 公告送出處理
app.post('/admin/announcement', express.urlencoded({ extended: true }), (req, res) => {
  if (req.body.clear) {
    currentAnnouncement = '';
  } else {
    currentAnnouncement = req.body.announcement || '';
  }
  // 廣播給所有用戶
  io.emit('announcement', currentAnnouncement);
  res.redirect('/admin');
});

// 公告API
app.get('/api/announcement', (req, res) => {
  res.json({ announcement: currentAnnouncement });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 