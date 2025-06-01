import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Message } from '../types';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';

const Chat: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'chatting' | 'disconnected'>('waiting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (socket) {
      socket.on('matched', ({ roomId }: { roomId: string }) => {
        setRoomId(roomId);
        setStatus('chatting');
        // 確保在配對成功後不會意外斷開
        socket.off('disconnect');
        socket.on('disconnect', () => {
          setStatus('disconnected');
          setRoomId(null);
          setMessages([]);
        });
      });

      socket.on('partner_left', () => {
        setStatus('waiting');
        setRoomId(null);
        setMessages([]);
      });

      socket.on('message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('error', (error: string) => {
        console.error('Socket error:', error);
        // 不要立即斷開，而是顯示錯誤訊息
        setError(error);
      });

      return () => {
        socket.off('matched');
        socket.off('partner_left');
        socket.off('message');
        socket.off('error');
      };
    }
  }, [socket]);

  const handleSendMessage = (text: string) => {
    if (socket && roomId) {
      const message: Message = {
        id: Date.now().toString(),
        text,
        senderId: socket.id,
        timestamp: Date.now(),
        isSelf: true
      };
      socket.emit('message', message);
      setMessages(prev => [...prev, message]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <ChatWindow messages={messages} />
      <ChatInput onSendMessage={handleSendMessage} disabled={status !== 'chatting'} />
    </div>
  );
};

export default Chat; 