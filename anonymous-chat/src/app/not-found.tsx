import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-8 fade-in">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#A5C8F7] via-[#87ceeb] to-[#FFBF69] mx-auto p-1">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              <span className="text-5xl">🔍</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-[#A5C8F7] to-[#FFBF69] bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            找不到頁面
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            抱歉，您要尋找的頁面似乎不存在。
            讓我們回到聊天室繼續精彩的對話吧！
          </p>
          
          <div className="pt-8">
            <Link href="/" className="btn-primary text-lg px-8 py-4 inline-block">
              🏠 返回首頁
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 