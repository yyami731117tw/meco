import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            找不到頁面
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            您要尋找的頁面不存在
          </p>
        </div>
        
        <Link href="/" className="btn btn-primary">
          返回首頁
        </Link>
      </div>
    </div>
  );
} 