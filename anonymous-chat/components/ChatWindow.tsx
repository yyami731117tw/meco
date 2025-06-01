import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div 
        className="
          flex-1 overflow-y-auto p-4 space-y-4
          absolute top-[60px] left-0 right-0 bottom-[80px]
          md:relative md:top-0 md:bottom-0
        " 
        ref={messagesEndRef}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg px-4 py-2
                ${msg.isSelf 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }
              `}
            >
              <p className="break-words">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.isSelf ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatWindow; 