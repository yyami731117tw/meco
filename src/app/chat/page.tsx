'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  text: string;
  isSelf: boolean;
  timestamp: number;
}

export default function ChatRoom() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPartnerLeft, setIsPartnerLeft] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 連接到 Socket.IO 伺服器
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('join');
    });

    socketRef.current.on('waiting', () => {
      setIsWaiting(true);
    });

    socketRef.current.on('matched', () => {
      setIsWaiting(false);
    });

    socketRef.current.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('partner_left', () => {
      setIsPartnerLeft(true);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    const message: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isSelf: true,
      timestamp: Date.now(),
    };

    socketRef.current.emit('message', message);
    setMessages(prev => [...prev, message]);
    setInputMessage('');
  };

  const handleLeave = () => {
    socketRef.current?.emit('leave');
    router.push('/');
  };

  const handleReport = (messageId: string) => {
    socketRef.current?.emit('report', { messageId });
  };

  if (isWaiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-800">正在尋找聊天對象...</h2>
          <p className="text-gray-600 mb-8">請稍候，我們正在為您配對</p>
          <button
            onClick={handleLeave}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full transition-colors"
          >
            取消配對
          </button>
        </div>
      </div>
    );
  }

  if (isPartnerLeft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">對方已離開聊天室</h2>
          <p className="text-gray-600 mb-8">您可以返回首頁重新開始聊天</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* 聊天室標題 */}
      <div className="bg-white shadow-sm py-4">
        <div className="max-w-2xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Meco 聊天室</h1>
          <button
            onClick={handleLeave}
            className="text-red-500 hover:text-red-600 font-medium"
          >
            結束聊天
          </button>
        </div>
      </div>

      {/* 訊息列表 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
            >
              <div className="relative group">
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.isSelf
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  {message.text}
                </div>
                {!message.isSelf && (
                  <button
                    onClick={() => handleReport(message.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="檢舉訊息"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 輸入框 */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            發送
          </button>
        </form>
      </div>
    </div>
  );
} 