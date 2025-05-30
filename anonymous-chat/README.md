# Meco - 匿名聊天應用

Meco 是一個現代化的匿名聊天應用，讓用戶可以與陌生人進行隨機配對聊天。

## 功能特色

- 🎭 **完全匿名** - 無需註冊，保護隱私
- 🔀 **隨機配對** - 智能匹配系統，遇見有趣的人
- 💬 **實時聊天** - 基於 Socket.IO 的即時通訊
- 📱 **響應式設計** - 支援桌面和移動設備
- 🎨 **現代化 UI** - 美觀的 Meco 設計風格

## 技術架構

### 前端
- **Next.js 14** - React 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式框架
- **Socket.IO Client** - 實時通訊

### 後端
- **Node.js + Express** - 服務器
- **Socket.IO** - WebSocket 通訊
- **內存存儲** - 用戶配對和房間管理

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

#### 1. 同時運行前端和後端（推薦）
```bash
npm run dev:full
```

#### 2. 分別運行
```bash
# 終端 1 - 運行後端服務器
npm run dev:server

# 終端 2 - 運行前端應用
npm run dev
```

### 訪問應用

- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **健康檢查**: http://localhost:3001/health
- **統計信息**: http://localhost:3001/stats

## 使用說明

1. 打開瀏覽器訪問 http://localhost:3000
2. 點擊「開始聊天」按鈕
3. 等待系統為您配對聊天夥伴
4. 配對成功後即可開始聊天
5. 可隨時點擊「離開聊天」結束對話

## 項目結構

```
anonymous-chat/
├── src/app/                 # Next.js 應用
│   ├── components/          # React 組件
│   │   └── Logo.tsx        # Meco Logo 組件
│   ├── globals.css         # 全域樣式
│   └── page.tsx            # 主頁面
├── server/                  # 後端服務器
│   └── server.js           # Socket.IO 服務器
├── public/                  # 靜態資源
├── package.json            # 依賴配置
└── README.md              # 項目說明
```

## 環境變量

在根目錄創建 `.env.local` 文件（可選）：

```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## 部署

### 生產構建
```bash
npm run build
npm start  # 前端
npm run server  # 後端
```

### 環境變量設置
- `CLIENT_URL`: 前端應用的 URL（用於 CORS 配置）
- `PORT`: 後端服務器端口（默認 3001）
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO 服務器地址

## 後端 API

### 健康檢查
```http
GET /health
```

### 統計信息
```http
GET /stats
```

## Socket.IO 事件

### 客戶端發送
- `join` - 加入配對隊列
- `leave` - 離開聊天
- `message` - 發送訊息

### 服務器發送
- `waiting` - 等待配對中
- `matched` - 配對成功
- `message` - 收到訊息
- `partner_left` - 聊天夥伴離開
- `error` - 錯誤信息

## 開發

這是一個使用 [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) 建立的 [Next.js](https://nextjs.org) 項目。

### 了解更多

- [Next.js 文檔](https://nextjs.org/docs)
- [Socket.IO 文檔](https://socket.io/docs/v4)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)

## 部署到 Vercel

最簡單的部署方式是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。

查看 [Next.js 部署文檔](https://nextjs.org/docs/app/building-your-application/deploying) 了解更多詳情。
