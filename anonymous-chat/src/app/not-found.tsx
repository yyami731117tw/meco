import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
      <div className="text-center space-y-8 fade-in max-w-md">
        <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
          <span className="text-3xl">🔍</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gradient">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            找不到頁面
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            抱歉，您要尋找的頁面似乎不存在。
            讓我們回到聊天室繼續精彩的對話吧！
          </p>
        </div>
        
        <Link href="/" className="btn btn-primary text-lg px-8 py-3 inline-block">
          返回首頁
        </Link>
      </div>
    </div>
  );
} 