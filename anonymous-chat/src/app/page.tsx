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
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* 狀態列 */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">匿名聊天</h1>
          <div className="flex items-center gap-3">
            {status === 'matched' && (
              <button
                onClick={leaveChat}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                離開聊天
              </button>
            )}
            {status === 'idle' && (
              <button
                onClick={startMatching}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
              >
                開始配對
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 狀態提示 */}
      {errorMessage && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 text-sm" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* 聊天室 */}
      <div className="flex-1 overflow-hidden">
        {status === 'waiting' ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-850">
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">正在尋找聊天對象...</p>
            </div>
          </div>
        ) : status === 'matched' ? (
          <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-850">
            {/* 訊息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg p-3 text-sm break-words ${
                      message.isSelf
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="text-xs mt-1 text-right opacity-80">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 輸入框 */}
            <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
              <div className="max-w-4xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="輸入訊息..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
                >
                  發送
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-850">
            <div className="text-center p-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                歡迎來到匿名聊天
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                點擊「開始配對」按鈕，開始與陌生人聊天
              </p>
              <button
                onClick={startMatching}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
              >
                開始配對
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
