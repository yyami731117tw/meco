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
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 頂部導航 */}
        <div className="card fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Logo size="md" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Meco</h1>
                <p className="text-sm text-gray-500">溫暖的匿名聊天</p>
              </div>
            </div>
            
            {/* 狀態與操作 */}
            <div className="flex items-center gap-4">
              <div className={`status-indicator ${
                status === 'matched' ? 'status-online' :
                status === 'waiting' ? 'status-waiting' :
                'status-offline'
              }`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                <span>
                  {status === 'matched' ? '已連線' :
                   status === 'waiting' ? '配對中' :
                   status === 'error' ? '連線錯誤' :
                   '離線'}
                </span>
              </div>
              
              {status === 'matched' && (
                <button onClick={leaveChat} className="btn btn-secondary">
                  斷開連線
                </button>
              )}
              {status === 'idle' && (
                <button onClick={startMatching} className="btn btn-primary">
                  開始聊天
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 錯誤提示 */}
        {errorMessage && (
          <div className="card" style={{borderColor: 'rgba(237, 137, 54, 0.3)', backgroundColor: 'rgba(237, 137, 54, 0.05)'}}>
            <p className="text-orange-700 dark:text-orange-300">{errorMessage}</p>
          </div>
        )}

        {/* 主要內容 */}
        <div className="card h-[600px] flex flex-col">
          {status === 'waiting' ? (
            // 等待配對
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 fade-in">
                <div className="w-20 h-20 mx-auto icon-container-primary rounded-3xl gentle-bounce">
                  <span className="text-3xl">🔍</span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    尋找聊天夥伴中
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">正在為您匹配志同道合的聊天對象...</p>
                </div>
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              </div>
            </div>
          ) : status === 'matched' ? (
            // 聊天界面
            <>
              {/* 聊天頭部 */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 icon-container rounded-xl">
                    <span className="text-lg">❤️</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">匿名朋友</h3>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      在線中
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
                  🔒 端到端加密
                </div>
              </div>

              {/* 訊息區域 */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto icon-container rounded-2xl mb-4">
                      <span className="text-2xl">💭</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">開始溫暖的對話</h3>
                    <p className="text-gray-500">說聲哈囉，分享今天的心情吧</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={message.isSelf ? 'message-self' : 'message-other'}>
                        <p className="break-words">{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 輸入區域 */}
              <form onSubmit={sendMessage} className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="輸入訊息..."
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="btn btn-primary disabled:opacity-50"
                >
                  發送
                </button>
              </form>
            </>
          ) : (
            // 歡迎頁面
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-8 fade-in max-w-lg">
                <Logo size="xl" className="mx-auto gentle-bounce" />
                
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    歡迎來到 <span className="text-gradient">Meco</span>
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                    與世界各地的朋友進行溫暖、安全的匿名對話。
                    在這裡，每一次相遇都是美好的開始。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-8">
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 mx-auto icon-container rounded-2xl">
                      <span className="text-xl">🔒</span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">完全匿名</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">保護隱私，自由表達</p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 mx-auto icon-container-accent rounded-2xl">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">即時配對</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">快速找到聊天夥伴</p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 mx-auto icon-container rounded-2xl">
                      <span className="text-xl">❤️</span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">溫暖連結</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">真誠友善的交流</p>
                  </div>
                </div>

                <button onClick={startMatching} className="btn btn-primary text-lg px-8 py-3">
                  開始溫暖聊天
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

