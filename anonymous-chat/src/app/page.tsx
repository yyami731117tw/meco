'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Logo from './components/Logo';

interface Message {
  id: string;
  text: string;
  isSelf: boolean;
  timestamp: number;
  isSystem?: boolean;
  isRead?: boolean;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'matched' | 'error' | 'connecting'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 保存聊天狀態到localStorage
  const saveChatState = (messages: Message[], status: string, partnerLeft: boolean = false) => {
    if (typeof window !== 'undefined') {
      const chatState = {
        messages,
        status,
        partnerLeft,
        timestamp: Date.now()
      };
      localStorage.setItem('meco_chat_state', JSON.stringify(chatState));
    }
  };

  // 從localStorage恢復聊天狀態
  const restoreChatState = () => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('meco_chat_state');
      if (savedState) {
        try {
          const chatState = JSON.parse(savedState);
          // 檢查是否是最近的聊天（24小時內）
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          
          if (now - chatState.timestamp < oneDay) {
            setMessages(chatState.messages || []);
            if (chatState.status === 'matched') {
              setStatus('matched');
            }
            if (chatState.partnerLeft) {
              setPartnerLeft(true);
              setErrorMessage('對方已離開聊天，您可以繼續查看聊天記錄');
            }
            return true;
          } else {
            // 清除過期的聊天記錄
            localStorage.removeItem('meco_chat_state');
          }
        } catch (error) {
          console.error('無法恢復聊天狀態:', error);
          localStorage.removeItem('meco_chat_state');
        }
      }
    }
    return false;
  };

  // 清除聊天狀態
  const clearChatState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('meco_chat_state');
    }
  };

  // 處理瀏覽器關閉
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === 'matched' && messages.length > 0) {
        // 如果正在聊天中，保存狀態
        saveChatState(messages, status, partnerLeft);
        
        // 通知服務器用戶離開
        if (socket) {
          socket.emit('leave');
        }
      } else {
        // 清除聊天狀態
        clearChatState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [status, messages, partnerLeft, socket]);

  // 初始化時恢復聊天狀態
  useEffect(() => {
    const restored = restoreChatState();
    if (!restored) {
      setStatus('connecting');
    }
  }, []);

  // 初始化 Socket.IO 連線
  useEffect(() => {
    // 檢查後端服務是否可用
    const checkBackendHealth = async () => {
      try {
        await fetch(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
          method: 'HEAD',
          mode: 'no-cors'
        });
        return true;
      } catch {
        console.log('後端服務暫時不可用');
        return false;
      }
    };

    const initializeSocket = async () => {
      const backendAvailable = await checkBackendHealth();
      
      if (!backendAvailable) {
        setStatus('error');
        setErrorMessage('聊天服務暫時維護中，請稍後再試');
        setIsOnline(false);
        return;
      }

      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000,
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('已連線到伺服器');
        setStatus('idle');
        setIsOnline(true);
        setErrorMessage('');
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('與伺服器斷開連線:', reason);
        setStatus('error');
        setIsOnline(false);
        if (reason === 'io server disconnect') {
          setErrorMessage('伺服器主動斷開連線');
        } else {
          setErrorMessage('連線中斷，正在嘗試重新連線...');
        }
      });

      socketInstance.on('connect_error', (error) => {
        console.log('連線錯誤:', error);
        setStatus('error');
        setIsOnline(false);
        setErrorMessage('無法連接到聊天服務，請檢查網路連線');
      });

      socketInstance.on('waiting', () => {
        setStatus('waiting');
        setErrorMessage('');
      });

      socketInstance.on('matched', () => {
        setStatus('matched');
        setErrorMessage('');
        setMessages([]);
        setPartnerLeft(false);
        // 清除之前的聊天記錄，開始新對話
        clearChatState();
      });

      socketInstance.on('message', (message: Message) => {
        setMessages(prev => [...prev, message]);
        
        // 如果是對方的訊息，自動發送已讀確認
        if (!message.isSelf && !message.isSystem) {
          socketInstance.emit('message_read', message.id);
        }
      });

      socketInstance.on('message_read_confirm', (messageId: string) => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ));
      });

      socketInstance.on('partner_left', () => {
        // 添加系統訊息到聊天記錄
        const systemMessage: Message = {
          id: Date.now().toString(),
          text: '對方已離開聊天室',
          isSelf: false,
          timestamp: Date.now(),
          isSystem: true
        };
        
        setMessages(prev => {
          const newMessages = [...prev, systemMessage];
          // 保存狀態，標記對方已離開
          setTimeout(() => {
            saveChatState(newMessages, 'matched', true);
          }, 0);
          return newMessages;
        });
        
        setPartnerLeft(true);
        setErrorMessage('對方已離開聊天，您可以繼續查看聊天記錄');
      });

      socketInstance.on('error', (error: string) => {
        setErrorMessage(error);
      });

      setSocket(socketInstance);
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // 自動保存聊天記錄
  useEffect(() => {
    if (status === 'matched' && messages.length > 0) {
      saveChatState(messages, status, partnerLeft);
    }
  }, [messages, status, partnerLeft]);

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 發送訊息
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !isOnline) return;

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
    if (!socket || !isOnline) {
      setErrorMessage('聊天服務暫時不可用，請稍後再試');
      return;
    }
    socket.emit('join');
    setStatus('waiting');
  };

  // 離開聊天室
  const leaveChat = () => {
    if (!socket) return;
    socket.emit('leave');
    setStatus('idle');
    setMessages([]);
    setPartnerLeft(false);
    setErrorMessage('');
    // 清除本地存儲
    clearChatState();
  };

  // 重新連線
  const reconnect = () => {
    setStatus('connecting');
    setErrorMessage('');
    window.location.reload();
  };

  if (status === 'connecting') {
    return (
      <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
        <div className="meco-container">
          <div className="text-center space-y-8 meco-fade-in">
            <div className="meco-card max-w-md mx-auto">
              <div className="space-y-6">
                <div className="meco-loading-dots">
                  <div className="meco-loading-dot"></div>
                  <div className="meco-loading-dot"></div>
                  <div className="meco-loading-dot"></div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-700">連線中</h3>
                  <p className="text-gray-600">正在連接聊天服務...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'idle' || status === 'error') {
    // Meco 風格歡迎頁面
    return (
      <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
        <div className="meco-container">
          <div className="text-center space-y-12 max-w-2xl mx-auto meco-fade-in">
            <div className="space-y-8">
              <Logo size="3xl" className="mx-auto meco-float" />
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-700">
                  Meco
                </h1>
                <h2 className="text-2xl md:text-3xl font-medium text-gray-600">
                  陌生不等於距離，Match 也沒那麼難
                </h2>
              </div>
            </div>

            <div className="meco-card max-w-lg mx-auto">
              <div className="space-y-6">
                <p className="text-lg text-gray-700 leading-relaxed text-center">
                  在這裡，你可以與陌生人進行匿名對話，分享想法，發現新的連結。每一次對話都是一次全新的體驗。
                </p>
                
                {status === 'error' ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-orange-800 text-sm mb-2">😔 聊天服務暫時不可用</p>
                      <p className="text-orange-600 text-xs">後端服務正在維護中，請稍後再試</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={reconnect} 
                        className="meco-button-secondary flex-1"
                      >
                        🔄 重新連線
                      </button>
                      <button 
                        onClick={startMatching} 
                        className="meco-button-primary flex-1"
                        disabled={!isOnline}
                      >
                        {isOnline ? '開始聊天' : '服務維護中'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={startMatching} 
                    className="meco-button-primary w-full text-lg py-4"
                    disabled={!isOnline}
                  >
                    {isOnline ? '開始聊天' : '連線中...'}
                  </button>
                )}
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
                    <h3 className="text-2xl font-semibold text-gray-700">配對中</h3>
                    <p className="text-gray-600">
                      別擔心，Meco 讓 Match 變得簡單又溫柔
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setStatus('idle')} 
                  className="meco-button-secondary w-full"
                >
                  取消配對
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Meco 風格聊天頁面
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 lg:p-6">
        <div className="meco-container max-w-4xl">
          {/* 頂部狀態欄 */}
          <div className="meco-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="md" />
                <div>
                  <h2 className="font-semibold text-gray-700">Meco</h2>
                  <p className="text-sm text-gray-600">匿名聊天室</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* 加密連線指示器 */}
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <span className="font-medium">🔒 端對端加密</span>
                </div>
                
                {status === 'matched' && (
                  <button onClick={leaveChat} className="meco-button-secondary text-sm">
                    離開聊天
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 聊天區域 - 移除卡片限制 */}
      <div className="flex-1 p-4 lg:p-6 pt-0">
        <div className="meco-container max-w-4xl h-full">
          <div className="h-full flex flex-col">
            {/* 訊息列表 */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-6">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="space-y-4">
                    <div className="meco-icon-container meco-icon-primary mx-auto">
                      <span>✨</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">開始對話</h3>
                      <p className="text-gray-600 text-sm">
                        說聲哈囉，開始這段美好的相遇 ❤️
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${
                    message.isSystem ? 'justify-center' : message.isSelf ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={
                      message.isSystem 
                        ? 'meco-system-message' 
                        : message.isSelf 
                          ? 'meco-chat-bubble-self' 
                          : 'meco-chat-bubble-other'
                    }>
                      <p className="mb-1">{message.text}</p>
                      {!message.isSystem && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs opacity-60">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {message.isSelf && (
                            <div className="text-xs ml-2">
                              {message.isRead ? (
                                <span className="text-blue-500">✓✓</span>
                              ) : (
                                <span className="text-gray-400">✓</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 輸入區域 */}
            <div className="meco-chat-input-container">
              <form onSubmit={sendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    !isOnline ? "連線中斷..." 
                    : partnerLeft ? "對方已離開聊天..." 
                    : "輸入訊息..."
                  }
                  className="meco-input flex-1"
                  disabled={!isOnline || partnerLeft}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !isOnline || partnerLeft}
                  className="meco-button-primary px-6"
                >
                  發送
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 錯誤提示 */}
      {errorMessage && (
        <div className="p-4 lg:p-6 pt-0">
          <div className="meco-container max-w-4xl">
            <div className="meco-card bg-orange-50/80 border-orange-200">
              <div className="flex items-center justify-between">
                <p className="text-orange-800 text-sm">{errorMessage}</p>
                {!isOnline && (
                  <button onClick={reconnect} className="meco-button-secondary text-xs px-3 py-1">
                    重新連線
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

