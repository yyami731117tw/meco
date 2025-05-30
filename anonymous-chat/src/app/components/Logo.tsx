import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <Image
        src="/meco-logo.png"
        alt="Meco Logo"
        fill
        className="object-contain"
        priority
        onError={(e) => {
          // 如果圖檔載入失敗，隱藏圖片並顯示fallback
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="w-full h-full bg-[#9BB5D6] rounded-2xl flex items-center justify-center text-white font-semibold">
                Meco
              </div>
            `;
          }
        }}
      />
    </div>
  );
} 