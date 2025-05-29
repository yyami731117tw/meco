# Meco Chat - 匿名聊天應用

Meco Chat 是一個即時匿名聊天應用，提供用戶友好的界面和安全的聊天環境。

## 功能特點

- 即時匿名聊天
- 智能匹配系統
- 管理員儀表板
- 訊息報告功能
- 即時通知

## 技術棧

- 前端：Next.js, React, TailwindCSS
- 後端：Node.js, Express, Socket.IO
- 數據庫：Redis
- 部署：Vercel (前端), Railway (後端)

## 本地開發設置

1. 克隆倉庫：
```bash
git clone https://github.com/your-username/meco-chat.git
cd meco-chat
```

2. 安裝依賴：
```bash
# 安裝前端依賴
npm install

# 安裝後端依賴
cd server
npm install
```

3. 設置環境變量：
創建 `.env.local` 文件並添加以下變量：
```
# Frontend Environment Variables
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Backend Environment Variables
PORT=3001
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# Admin Dashboard
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

4. 啟動開發服務器：
```bash
# 終端 1：啟動前端
npm run dev

# 終端 2：啟動後端
npm run dev:server
```

## 部署

### 前端部署 (Vercel)

1. 在 Vercel 上創建新項目
2. 連接 GitHub 倉庫
3. 設置環境變量：
   - `NEXT_PUBLIC_SOCKET_URL`
   - `FRONTEND_URL`

### 後端部署 (Railway)

1. 在 Railway 上創建新項目
2. 連接 GitHub 倉庫
3. 設置環境變量：
   - `PORT`
   - `REDIS_URL`
   - `NODE_ENV`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`

## 腳本命令

- `npm run dev` - 啟動前端開發服務器
- `npm run build` - 構建前端
- `npm run start` - 啟動前端生產服務器
- `npm run server` - 啟動後端服務器
- `npm run dev:server` - 啟動後端開發服務器
- `npm run build:server` - 構建後端
- `npm run start:server` - 啟動後端生產服務器

## 貢獻指南

1. Fork 項目
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建 Pull Request

## 授權

MIT License 