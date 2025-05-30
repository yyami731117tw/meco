import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
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
          // 極簡fallback設計
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium text-current">
                M
              </div>
            `;
          }
        }}
      />
    </div>
  );
} 