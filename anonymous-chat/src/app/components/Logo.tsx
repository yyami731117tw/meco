interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* 背景圓角矩形 */}
        <rect
          x="0"
          y="0"
          width="120"
          height="120"
          rx="24"
          ry="24"
          fill="#9BB5D6"
        />
        
        {/* 左側對話氣泡（帶愛心） */}
        <path
          d="M25 35 Q20 30 20 40 Q20 50 25 55 L30 60 L35 55 Q40 50 40 40 Q40 30 35 35 Q30 30 25 35 Z"
          fill="#F5F2ED"
        />
        
        {/* 愛心圖案 */}
        <path
          d="M28 40 Q26 38 25 40 Q24 38 22 40 Q22 42 25 45 Q28 42 28 40 Z M38 40 Q36 38 35 40 Q34 38 32 40 Q32 42 35 45 Q38 42 38 40 Z"
          fill="#9BB5D6"
        />
        
        {/* 右側對話氣泡 */}
        <circle
          cx="70"
          cy="30"
          r="6"
          fill="#F5F2ED"
        />
        
        {/* 大的對話氣泡 */}
        <path
          d="M55 50 Q50 45 50 55 Q50 70 55 75 L65 85 L75 75 Q85 70 85 55 Q85 45 80 50 Q70 40 55 50 Z"
          fill="#F5F2ED"
        />
        
        {/* Meco 文字 */}
        <text
          x="60"
          y="105"
          textAnchor="middle"
          className="fill-cream text-2xl font-medium"
          fill="#F5F2ED"
          fontSize="16"
        >
          Meco
        </text>
      </svg>
    </div>
  );
} 