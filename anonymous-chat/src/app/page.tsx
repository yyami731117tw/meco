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
  imageUrl?: string;
}

interface Stats {
  activeRooms: number;
  totalUsers: number;
  rooms: Array<{
    roomId: string;
    userCount: number;
  }>;
}

// 打字動畫 hook
function useTypewriter(text: string, totalDuration = 10000) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const speed = Math.max(30, Math.floor(totalDuration / text.length));
    const timer = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, totalDuration]);
  return {displayed, done};
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'matched' | 'error' | 'connecting'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [hideAnnouncement, setHideAnnouncement] = useState(false);

  // 保存聊天狀態到localStorage
  const saveChatState = (messages: Message[], status: string, partnerLeft: boolean = false, roomId: string | null = null) => {
    if (typeof window !== 'undefined') {
      const chatState = {
        messages: messages.map(m => ({ ...m })), // isRead 狀態也存進去
        status,
        partnerLeft,
        roomId,
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
            setMessages(chatState.messages || []); // isRead 狀態會還原
            setRoomId(chatState.roomId);
            if (chatState.status === 'matched') {
              setStatus('matched');
            }
            if (chatState.partnerLeft) {
              setPartnerLeft(true);
              setErrorMessage('對方已離開聊天，您可以繼續查看聊天記錄');
            }
            return { restored: true, roomId: chatState.roomId };
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
    return { restored: false, roomId: null };
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
        saveChatState(messages, status, partnerLeft, roomId);
        
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
  }, [status, messages, partnerLeft, socket, roomId]);

  // 初始化時恢復聊天狀態
  useEffect(() => {
    const { restored, roomId: restoredRoomId } = restoreChatState();
    if (!restored) {
      setStatus('connecting');
    } else {
      setRoomId(restoredRoomId);
    }
  }, []);

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

  // 重新連接功能
  const reconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setErrorMessage('重連次數已達上限，請重新整理頁面');
      return;
    }

    setStatus('connecting');
    setErrorMessage('');
    setReconnectAttempts(prev => prev + 1);

    // 清除之前的重連計時器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // 設置新的重連計時器
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.connect();
      } else {
        window.location.reload(); // 如果沒有 socket 實例，重新整理頁面
      }
    }, 1000 * Math.min(reconnectAttempts + 1, 5)); // 指數退避，最多等待5秒
  };

  // 初始化 Socket.IO 連線
  useEffect(() => {
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
        setReconnectAttempts(0); // 重置重連次數
      });

      socketInstance.on('stats_update', (newStats: Stats) => {
        setStats(newStats);
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

      socketInstance.on('matched', (data: { roomId: string }) => {
        setStatus('matched');
        setErrorMessage('');
        setMessages([]);
        setPartnerLeft(false);
        setRoomId(data.roomId);
        // 清除之前的聊天記錄，開始新對話
        clearChatState();
      });

      socketInstance.on('message', (message: Message) => {
        setMessages(prev => {
          const newMessages = [...prev, message];
          // 自動發送所有未讀訊息的已讀確認
          const unread = newMessages.filter(m => !m.isSelf && !m.isSystem && !m.isRead);
          unread.forEach(m => {
            socketInstance.emit('message_read', m.id);
          });
          return newMessages;
        });
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
            saveChatState(newMessages, 'matched', true, roomId);
          }, 0);
          return newMessages;
        });
        
        setPartnerLeft(true);
        setErrorMessage('對方已離開聊天，您可以繼續查看聊天記錄');
      });

      socketInstance.on('error', (error: string) => {
        setErrorMessage(error);
      });

      socketInstance.on('reconnect_success', () => {
        console.log('重新連接成功');
        setIsOnline(true);
        setErrorMessage('');
      });

      socketInstance.on('reconnect_failed', () => {
        console.log('重新連接失敗');
        setPartnerLeft(true);
        setErrorMessage('無法重新連接到聊天室，對方可能已離開');
      });

      socketInstance.on('announcement', (msg: string) => {
        setAnnouncement(msg);
        setHideAnnouncement(false);
      });

      setSocket(socketInstance);
    };

    initializeSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [roomId]);

  // 自動保存聊天記錄
  useEffect(() => {
    if (status === 'matched' && messages.length > 0) {
      saveChatState(messages, status, partnerLeft, roomId);
    }
  }, [messages, status, partnerLeft, roomId]);

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 發送訊息
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !imageToSend) || !socket || !isOnline) return;

    const message: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isSelf: true,
      timestamp: Date.now(),
    };
    if (imageToSend) {
      message.imageUrl = imageToSend;
    }

    socket.emit('message', message);
    setInputMessage('');
    setImageToSend(null);
  };

  // 圖片上傳狀態
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 檢查檔案大小
      if (file.size > 2 * 1024 * 1024) {
        setImageError('圖片大小請勿超過 2MB');
        return;
      }
      // 檢查檔案格式
      if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
        setImageError('僅支援 jpg, png, gif, webp 格式');
        return;
      }
      setImageError(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImg(event.target?.result as string); // 先進入預覽視窗
      };
      reader.readAsDataURL(file);
    }
  };

  // 確認發送圖片
  const confirmSendImage = () => {
    // 直接發送訊息
    if (previewImg) {
      sendMessageImg(previewImg);
      setPreviewImg(null);
    }
  };
  // 新增發送圖片訊息的函式
  const sendMessageImg = (img: string) => {
    if (!socket || !isOnline) return;
    const message: Message = {
      id: Date.now().toString(),
      text: '',
      isSelf: true,
      timestamp: Date.now(),
      imageUrl: img
    };
    socket.emit('message', message);
  };
  // 取消發送圖片
  const cancelSendImage = () => {
    setPreviewImg(null);
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

  // 在聊天頁面頂部添加統計信息
  const renderStats = () => {
    if (!stats) return null;
    
    return (
      <div className="meco-card bg-blue-50/80 border-blue-200 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-blue-700">在線用戶: {stats.totalUsers}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-green-700">活躍聊天室: {stats.activeRooms}</span>
            </div>
          </div>
          {!isOnline && (
            <button onClick={reconnect} className="meco-button-secondary text-xs px-3 py-1">
              重新連線 ({reconnectAttempts}/{maxReconnectAttempts})
            </button>
          )}
        </div>
      </div>
    );
  };

  // 取得公告
  useEffect(() => {
    fetch('/api/announcement')
      .then(res => res.json())
      .then(data => {
        if (data.announcement) setAnnouncement(data.announcement);
      });
  }, []);

  // 監聽 socket.io 公告
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: string) => {
      setAnnouncement(msg);
      setHideAnnouncement(false);
    };
    socket.on('announcement', handler);
    return () => { socket.off('announcement', handler); };
  }, [socket]);

  // 首頁打字動畫內容
  const homeDesc = '在這裡，你可以與陌生人進行匿名對話，分享想法，發現新的連結。每一次對話都是一次全新的體驗。';
  const {displayed: homeDescTyped, done: homeDescDone} = useTypewriter(homeDesc, 10000);

  // 狀態：加密連線動畫與等待配對
  if (status === 'connecting' || status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white">
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="flex gap-2">
            <span className="block w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
            <span className="block w-3 h-3 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="block w-3 h-3 bg-blue-200 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">正在建立加密連線...</h3>
            <p className="text-gray-500 text-base">請稍候，Meco 正在為你配對安全的聊天對象</p>
          </div>
          {status === 'waiting' && (
            <button
              onClick={() => {
                if (socket) socket.emit('leave');
                setStatus('idle');
              }}
              className="meco-button-secondary mt-4 px-8 py-3 text-lg"
            >
              取消配對
            </button>
          )}
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

            <div className="meco-card-home meco-card max-w-lg mx-auto">
              <div className="space-y-6">
                <p className="text-base text-gray-700 leading-relaxed text-center min-h-[3.5em]">
                  {homeDescTyped}
                  <span className={`inline-block w-2 align-bottom animate-blink ${homeDescDone ? 'opacity-0' : 'opacity-100'}`}>|</span>
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

  // Meco 風格聊天頁面
  return (
    <div className="min-h-screen flex flex-col">
      {/* 公告橫幅 */}
      {announcement && !hideAnnouncement && (
        <div className="w-full bg-yellow-100 text-yellow-900 text-center py-2 px-4 text-sm font-medium flex items-center justify-center relative z-40">
          <span className="truncate max-w-[90vw]">{announcement}</span>
          <button onClick={() => setHideAnnouncement(true)} className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-700 hover:text-red-500 text-lg font-bold px-2">×</button>
        </div>
      )}
      {/* 頂部狀態欄 */}
      <div className="p-4 lg:p-6 sticky top-0 z-30 bg-gradient-to-b from-white/90 to-transparent backdrop-blur-md">
        <div className="meco-container max-w-4xl">
          {renderStats()}
          <div className="meco-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="md" />
                <div className="hidden sm:block">
                  <h2 className="font-semibold text-gray-700">Meco</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
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

      {/* 聊天區域 - 佔滿剩餘空間 */}
      <div className="flex-1 flex flex-col px-0 lg:px-6">
        <div className="flex-1 flex flex-col w-full">
          {/* 訊息列表 */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-6">
            {messages.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-2">加密連線完成，開始聊天吧！</h3>
                <p className="text-gray-600 text-base">說聲哈囉，開始這段美好的相遇 ❤️</p>
              </div>
            ) :
              messages.map((message) => (
                <div key={message.id} className={`flex w-full ${
                  message.isSystem ? 'justify-center' : message.isSelf ? 'justify-end' : 'justify-start'
                }`}>
                  <div className={
                    message.isSystem 
                      ? ''
                      : message.isSelf 
                        ? 'meco-chat-bubble-self max-w-[90%] ml-0 mr-1 sm:mr-4'
                        : 'meco-chat-bubble-other max-w-[90%] mr-0 ml-1 sm:ml-4'
                  }>
                    <p className={`mb-1 ${message.isSystem ? 'text-red-600 font-medium text-sm' : ''}`}>
                      {message.text}
                    </p>
                    {/* 顯示圖片訊息 */}
                    {message.imageUrl && (
                      <div className="flex flex-col items-start">
                        <img 
                          src={message.imageUrl} 
                          alt="圖片訊息" 
                          className="max-w-[200px] max-h-[200px] rounded-xl mt-1 border shadow-md cursor-pointer hover:opacity-80 transition"
                          onClick={() => setLightboxImg(message.imageUrl!)}
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.img-error-msg')) {
                              const msg = document.createElement('span');
                              msg.className = 'img-error-msg text-xs text-red-400 mt-1';
                              msg.innerText = '圖片已失效';
                              parent.appendChild(msg);
                            }
                          }}
                        />
                        <span className="text-xs text-gray-400 mt-1">圖片</span>
                      </div>
                    )}
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
            }
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* 輸入區域 - 固定在底部 */}
      <div className="p-4 lg:p-6">
        <div className="meco-container max-w-4xl">
          <div className="meco-chat-input-container sm:mx-0 mx-[-1rem]">
            <form onSubmit={sendMessage} className="flex gap-3 items-center">
              <label className="cursor-pointer bg-white border border-blue-200 p-2 rounded-full flex items-center justify-center w-9 h-9 min-w-0 min-h-0 shadow hover:bg-blue-50 transition" title="上傳圖片">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {/* SVG 相機圖示 */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#2563eb" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 19.5V6.75A2.25 2.25 0 014.5 4.5h2.379a2.25 2.25 0 012.12-1.5h2.002a2.25 2.25 0 012.12 1.5H19.5a2.25 2.25 0 012.25 2.25v12.75a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </label>
              {/* 圖片發送前預覽視窗 */}
              {previewImg && (
                <div className="fixed inset-0 z-50 bg-black/60 meco-preview-modal">
                  <img src={previewImg} alt="預覽" className="meco-preview-modal-img" />
                  <div className="meco-preview-modal-btns">
                    <button onClick={confirmSendImage} className="meco-button-primary w-full py-3 text-lg">發送</button>
                    <button onClick={cancelSendImage} className="meco-button-secondary w-full py-3 text-lg">取消</button>
                  </div>
                </div>
              )}
              {imageError && (
                <span className="text-red-500 text-xs ml-2">{imageError}</span>
              )}
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
                disabled={(!inputMessage.trim() && !imageToSend) || !isOnline || partnerLeft}
                className="meco-button-primary px-6"
              >
                發送
              </button>
            </form>
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

      {/* Lightbox 圖片放大預覽 */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="放大圖片" className="max-w-[90vw] max-h-[80vh] rounded-xl shadow-2xl border-2 border-white" />
        </div>
      )}
    </div>
  );
}

