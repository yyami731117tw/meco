'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  isSelf: boolean;
  timestamp: number;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'matched' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化 Socket.IO 連線
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('已連線到伺服器');
      setStatus('idle');
    });

    socketInstance.on('disconnect', () => {
      console.log('與伺服器斷開連線');
      setStatus('error');
      setErrorMessage('與伺服器斷開連線，正在嘗試重新連線...');
    });

    socketInstance.on('waiting', () => {
      setStatus('waiting');
      setErrorMessage('');
    });

    socketInstance.on('matched', () => {
      setStatus('matched');
      setErrorMessage('');
      setMessages([]); // 清空舊訊息
    });

    socketInstance.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketInstance.on('partner_left', () => {
      setStatus('idle');
      setErrorMessage('對方已離開聊天室');
    });

    socketInstance.on('error', (error: string) => {
      setErrorMessage(error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 發送訊息
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket) return;

    const message = {
      id: Date.now().toString(),
      text: inputMessage,
      isSelf: true,
      timestamp: Date.now(),
    };

    socket.emit('message', message);
    setInputMessage('');
  };

  // 開始配對
  const startMatching = () => {
    if (!socket) return;
    socket.emit('join');
    setStatus('waiting');
  };

  // 離開聊天室
  const leaveChat = () => {
    if (!socket) return;
    socket.emit('leave');
    setStatus('idle');
    setMessages([]);
  };

  return (
    <div className="min-h-screen p-4">
      {/* 主容器 */}
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        
        {/* 頂部導航欄 */}
        <div className="card-glass p-6 mb-6 fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A5C8F7] to-[#87ceeb] flex items-center justify-center">
                <span className="text-white font-bold text-xl">💬</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meco Chat</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">安全匿名聊天平台</p>
              </div>
            </div>
            
            {/* 狀態指示器 */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                status === 'matched' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status === 'matched' ? 'bg-green-500 pulse-gentle' :
                  status === 'waiting' ? 'bg-yellow-500 pulse-gentle' :
                  status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span>
                  {status === 'matched' ? '已配對' :
                   status === 'waiting' ? '尋找中' :
                   status === 'error' ? '連線錯誤' :
                   '待機中'}
                </span>
              </div>
              
              {/* 操作按鈕 */}
              {status === 'matched' && (
                <button onClick={leaveChat} className="btn-danger scale-in">
                  離開聊天
                </button>
              )}
              {status === 'idle' && (
                <button onClick={startMatching} className="btn-primary scale-in">
                  開始配對
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 錯誤提示 */}
        {errorMessage && (
          <div className="card-glass border-l-4 border-[#FFBF69] p-4 mb-6 fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#FFBF69] flex items-center justify-center">
                <span className="text-white text-sm">⚠</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 主要內容區域 */}
        <div className="flex-1 card-glass p-6 overflow-hidden">
          {status === 'waiting' ? (
            // 等待配對畫面
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-8 fade-in">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#A5C8F7] to-[#87ceeb] mx-auto flex items-center justify-center pulse-gentle">
                    <div className="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                      <span className="text-4xl">🔍</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-[#A5C8F7] border-opacity-30 animate-spin"></div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white">正在尋找聊天對象</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300">請稍候，我們正在為您匹配合適的聊天夥伴...</p>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-[#A5C8F7] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#A5C8F7] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-[#A5C8F7] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : status === 'matched' ? (
            // 聊天畫面
            <div className="h-full flex flex-col">
              {/* 聊天頭部 */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFBF69] to-[#FFD23F] flex items-center justify-center">
                    <span className="text-white font-bold">👤</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">匿名用戶</h3>
                    <p className="text-sm text-green-500">線上</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  已連線 • 端到端加密
                </div>
              </div>

              {/* 訊息列表 */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#A5C8F7] to-[#87ceeb] mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">💭</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">開始對話吧！說聲哈囉～</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'} fade-in`}
                    >
                      <div className={`max-w-[75%] p-4 ${message.isSelf ? 'message-bubble-self' : 'message-bubble-other'}`}>
                        <p className="break-words">{message.text}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 輸入區域 */}
              <form onSubmit={sendMessage} className="flex space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="輸入訊息..."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#A5C8F7] focus:border-transparent bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  發送 📤
                </button>
              </form>
            </div>
          ) : (
            // 歡迎畫面
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-8 fade-in">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#A5C8F7] via-[#87ceeb] to-[#FFBF69] mx-auto p-1">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-6xl">💬</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
                    歡迎來到 <span className="gradient-text">Meco Chat</span>
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                    在這裡，您可以與來自世界各地的陌生人進行安全、匿名的對話。
                    我們重視您的隱私，所有對話都是加密的。
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#A5C8F7] to-[#87ceeb] mx-auto flex items-center justify-center">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">完全匿名</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">無需註冊，保護您的身份</p>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFBF69] to-[#FFD23F] mx-auto flex items-center justify-center">
                        <span className="text-2xl">⚡</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">即時配對</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">智能匹配系統，快速找到聊天夥伴</p>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#87ceeb] to-[#A5C8F7] mx-auto flex items-center justify-center">
                        <span className="text-2xl">🛡️</span>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">安全對話</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">端到端加密，內容過濾保護</p>
                    </div>
                  </div>
                  <div className="pt-8">
                    <button onClick={startMatching} className="btn-primary text-lg px-8 py-4">
                      🚀 開始聊天
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
