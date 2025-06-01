import React, { useState, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      // 移除自動聚焦，讓鍵盤保持開啟
      // if (inputRef.current) {
      //   inputRef.current.focus();
      // }
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`
        fixed bottom-0 left-0 right-0 
        ${isMobile ? 'px-4 pb-4' : 'p-4'} 
        bg-white dark:bg-gray-800 
        border-t border-gray-200 dark:border-gray-700
      `}
    >
      <div className="flex gap-2 max-w-3xl mx-auto">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="輸入訊息..."
          disabled={disabled}
          className={`
            flex-1 px-4 py-2 rounded-full
            border border-gray-300 dark:border-gray-600
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-700 dark:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isMobile ? 'text-base' : 'text-sm'}
          `}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={`
            px-4 py-2 rounded-full
            bg-blue-500 text-white
            hover:bg-blue-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${isMobile ? 'text-base' : 'text-sm'}
          `}
        >
          發送
        </button>
      </div>
    </form>
  );
};

export default ChatInput; 