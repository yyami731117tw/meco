'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Logo from './components/Logo';

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
      setErrorMessage('連線中斷');
    });

    socketInstance.on('waiting', () => {
      setStatus('waiting');
      setErrorMessage('');
    });

    socketInstance.on('matched', () => {
      setStatus('matched');
      setErrorMessage('');
      setMessages([]);
    });

    socketInstance.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketInstance.on('partner_left', () => {
      setStatus('idle');
      setErrorMessage('對方已離開');
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

  if (status === 'idle') {
    // Meco 風格歡迎頁面
    return (
      <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
        <div className="meco-container">
          <div className="text-center space-y-12 max-w-2xl mx-auto meco-fade-in">
            <div className="space-y-8">
              <Logo size="xl" className="mx-auto meco-float" />
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-meco-dark">
                  Meco
                </h1>
                <p className="text-xl text-meco-dark/70 leading-relaxed">
                  溫暖的匿名聊天，真誠的心靈交流
                </p>
              </div>
            </div>

            <div className="meco-card max-w-lg mx-auto">
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  <div className="meco-feature-card">
                    <div className="flex items-center gap-4">
                      <div className="meco-icon-container meco-icon-primary">
                        <span>🔒</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-meco-dark">完全匿名</h3>
                        <p className="text-sm text-meco-dark/60">保護隱私，自由表達真實想法</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="meco-feature-card">
                    <div className="flex items-center gap-4">
                      <div className="meco-icon-container meco-icon-accent">
                        <span>⚡</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-meco-dark">即時配對</h3>
                        <p className="text-sm text-meco-dark/60">智能匹配，快速找到聊天夥伴</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="meco-feature-card">
                    <div className="flex items-center gap-4">
                      <div className="meco-icon-container meco-icon-secondary">
                        <span>💬</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-meco-dark">安全對話</h3>
                        <p className="text-sm text-meco-dark/60">端到端加密，溫暖安全交流</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={startMatching} 
                  className="meco-button-primary w-full text-lg py-4"
                >
                  ❤️ 開始溫暖聊天
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'waiting') {
    // Meco 風格等待頁面
    return (
      <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
        <div className="meco-container">
          <div className="text-center space-y-8 meco-fade-in">
            <div className="meco-card max-w-md mx-auto">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="meco-loading-dots">
                    <div className="meco-loading-dot"></div>
                    <div className="meco-loading-dot"></div>
                    <div className="meco-loading-dot"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-meco-dark">尋找聊天夥伴</h3>
                    <p className="text-meco-dark/70">
                      正在為您配對志趣相投的朋友...
                    </p>
                  </div>
                </div>
                
                <div className="meco-status meco-status-waiting justify-center">
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  <span>配對中</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Meco 風格聊天頁面
  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="meco-container max-w-4xl">
        <div className="space-y-6">
          {/* 頂部狀態欄 */}
          <div className="meco-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="md" />
                <div>
                  <h2 className="font-semibold text-meco-dark">Meco</h2>
                  <p className="text-sm text-meco-dark/60">匿名聊天室</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`meco-status ${
                  status === 'matched' ? 'meco-status-online' : 'meco-status-offline'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current"></div>
                  <span>{status === 'matched' ? '已連線' : '離線'}</span>
                </div>
                
                {status === 'matched' && (
                  <button onClick={leaveChat} className="meco-button-secondary text-sm">
                    離開聊天
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 聊天區域 */}
          <div className="meco-card">
            <div className="h-[500px] flex flex-col">
              {/* 訊息列表 */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="space-y-4">
                      <div className="meco-icon-container meco-icon-primary mx-auto">
                        <span>💭</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-meco-dark mb-2">開始對話</h3>
                        <p className="text-meco-dark/60 text-sm">
                          說聲哈囉，開始這段美好的相遇 ❤️
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={message.isSelf ? 'meco-chat-bubble-self' : 'meco-chat-bubble-other'}>
                        <p className="mb-1">{message.text}</p>
                        <p className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 輸入區域 */}
              <form onSubmit={sendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="輸入訊息..."
                  className="meco-input flex-1"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="meco-button-primary px-6"
                >
                  發送
                </button>
              </form>
            </div>
          </div>

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="meco-card bg-red-50/80 border-red-200">
              <p className="text-red-800 text-center text-sm">
                {errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

