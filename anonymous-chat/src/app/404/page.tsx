import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
      <div className="text-center space-y-8 fade-in max-w-md">
        <div className="w-24 h-24 mx-auto icon-container-accent rounded-3xl">
          <span className="text-4xl">🚫</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gradient">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            頁面走失了
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            看起來這個頁面在網路世界中迷路了。
            不如來 Meco 開始一場溫暖的匿名聊天吧！
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn btn-primary px-6 py-2.5 inline-block">
            返回首頁
          </Link>
          <Link href="/" className="btn btn-secondary px-6 py-2.5 inline-block">
            開始聊天
          </Link>
        </div>
      </div>
    </div>
  );
} 