interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} bg-meco-primary rounded-2xl flex items-center justify-center text-white font-bold relative overflow-hidden`}>
      {/* 背景裝飾 */}
      <div className="absolute inset-0 bg-gradient-to-br from-meco-primary to-meco-accent"></div>
      
      {/* Logo 文字 */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <span className="font-bold tracking-tight">M</span>
      </div>
      
      {/* 愛心裝飾 */}
      <div className="absolute top-1 right-1 text-xs opacity-70">
        ❤️
      </div>
    </div>
  );
} 