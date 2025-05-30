import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-8 fade-in">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#A5C8F7] via-[#87ceeb] to-[#FFBF69] mx-auto p-1">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              <span className="text-5xl">🚫</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-6xl font-bold gradient-text">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            頁面走失了
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
            看起來這個頁面在網路世界中迷路了。
            不如來開始一場新的匿名聊天吧！
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/" className="btn-primary text-lg px-8 py-4 inline-block">
              🏠 返回首頁
            </Link>
            <Link href="/" className="btn-secondary text-lg px-8 py-4 inline-block">
              💬 開始聊天
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 