'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = () => {
    setIsLoading(true);
    router.push('/chat');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-blue-600 mb-2">Meco</h1>
          <p className="text-xl text-gray-600">Match + Connect</p>
        </div>

        {/* 品牌口號 */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            遇見有趣的靈魂
          </h2>
          <p className="text-gray-600 text-lg">
            在 Meco，每個對話都是一次新的相遇
          </p>
        </div>

        {/* 開始聊天按鈕 */}
        <button
          onClick={handleStartChat}
          disabled={isLoading}
          className="group relative bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          <span className="relative z-10">
            {isLoading ? '配對中...' : '開始聊天'}
          </span>
          <div className="absolute inset-0 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        {/* 安全提示 */}
        <p className="mt-8 text-sm text-gray-500">
          我們重視您的隱私，所有對話都是匿名的
        </p>
      </div>
    </main>
  );
} 