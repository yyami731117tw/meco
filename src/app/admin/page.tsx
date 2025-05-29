'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface ReportedMessage {
  id: string;
  originalText: string;
  filteredText: string;
  timestamp: number;
  roomId: string;
  reportedAt?: number;
  reportedBy?: string;
}

export default function AdminDashboard() {
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 連接到 Socket.IO 伺服器
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: process.env.ADMIN_TOKEN, // 實際應用中應該使用更安全的認證方式
      },
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      // 請求檢舉訊息列表
      socketRef.current?.emit('get_reported_messages');
    });

    socketRef.current.on('reported_messages', (messages: ReportedMessage[]) => {
      setReportedMessages(messages);
    });

    socketRef.current.on('new_report', (message: ReportedMessage) => {
      setReportedMessages(prev => [message, ...prev]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleAction = (messageId: string, action: 'ignore' | 'ban') => {
    socketRef.current?.emit('admin_action', { messageId, action });
    // 從列表中移除已處理的訊息
    setReportedMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-gray-800">正在連接...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">管理後台</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">檢舉訊息列表</h2>
          
          {reportedMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">目前沒有檢舉訊息</p>
          ) : (
            <div className="space-y-4">
              {reportedMessages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm text-gray-500">
                        原始訊息：{message.originalText}
                      </p>
                      <p className="text-sm text-gray-500">
                        過濾後：{message.filteredText}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        時間：{new Date(message.timestamp).toLocaleString()}
                      </p>
                      {message.reportedAt && (
                        <p className="text-xs text-gray-400">
                          檢舉時間：{new Date(message.reportedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(message.id, 'ignore')}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                      >
                        忽略
                      </button>
                      <button
                        onClick={() => handleAction(message.id, 'ban')}
                        className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                      >
                        封鎖
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 