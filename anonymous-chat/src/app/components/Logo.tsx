import Image from 'next/image';
import { CSSProperties } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl';
  className?: string;
  style?: CSSProperties;
}

export default function Logo({ size = 'md', className = '', style }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    xxl: 'w-32 h-32',
    '3xl': 'w-40 h-40'
  };

  const sizePixels = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    xxl: 128,
    '3xl': 160
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative flex items-center justify-center`} style={style}>
      <Image
        src="/meco-logo.png.png"
        alt="Meco Logo"
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="rounded-2xl object-cover"
        onError={(e) => {
          // Fallback 到文字版本 Logo
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = `
            <div 
              style="
                width: ${sizePixels[size]}px; 
                height: ${sizePixels[size]}px; 
                background: linear-gradient(135deg, #9BB5D6 0%, #7BA3D0 100%);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                position: relative;
                overflow: hidden;
              "
            >
              <span style="font-size: ${
                size === '3xl' ? '3rem' : 
                size === 'xxl' ? '2.5rem' :
                size === 'xl' ? '2rem' : 
                size === 'lg' ? '1.5rem' : 
                size === 'md' ? '1.125rem' : '0.875rem'
              }; z-index: 10;">M</span>
              <div style="position: absolute; top: 4px; right: 4px; font-size: ${
                size === '3xl' || size === 'xxl' ? '1.5rem' : 
                size === 'xl' ? '1.125rem' : '0.75rem'
              }; opacity: 0.7;">❤️</div>
            </div>
          `;
        }}
      />
    </div>
  );
} 