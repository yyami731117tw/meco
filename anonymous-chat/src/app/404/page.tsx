import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            頁面走失了
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            這個頁面似乎不存在
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Link href="/" className="btn btn-primary">
            返回首頁
          </Link>
          <Link href="/" className="btn btn-ghost">
            開始聊天
          </Link>
        </div>
      </div>
    </div>
  );
} 