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

  return (
    <div className="min-h-screen flex flex-col">
      {/* 頂部欄 */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-lg font-semibold">Meco</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`status ${
              status === 'matched' ? 'status-online' :
              status === 'waiting' ? 'status-waiting' :
              'status-offline'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
              {status === 'matched' ? '已連線' :
               status === 'waiting' ? '配對中' :
               '離線'}
            </div>
            
            {status === 'matched' && (
              <button onClick={leaveChat} className="btn btn-ghost text-xs">
                離開
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="flex-1 flex flex-col">
        {status === 'idle' ? (
          // 歡迎頁面
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md space-y-8">
              <Logo size="lg" className="mx-auto" />
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Meco</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  匿名聊天，安全連結
                </p>
              </div>

              <button 
                onClick={startMatching} 
                className="btn btn-primary w-full"
              >
                開始聊天
              </button>
            </div>
          </div>
        ) : status === 'waiting' ? (
          // 等待配對
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-6">
              <div className="loading">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">尋找中</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  正在為您配對...
                </p>
              </div>
            </div>
          </div>
        ) : (
          // 聊天界面
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            {/* 聊天區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-sm">開始對話...</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}>
                    <div className={message.isSelf ? 'message-self' : 'message-other'}>
                      <p>{message.text}</p>
                      <p className="text-xs opacity-60 mt-1">
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
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <form onSubmit={sendMessage} className="flex gap-2">
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
                  className="btn btn-primary"
                >
                  發送
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 錯誤提示 */}
        {errorMessage && (
          <div className="border-t border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-3">
            <div className="max-w-4xl mx-auto">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm text-center">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

