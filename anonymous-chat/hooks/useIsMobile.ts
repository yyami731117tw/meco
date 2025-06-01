import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // 初始檢查
    checkIsMobile();

    // 監聽視窗大小變化
    window.addEventListener('resize', checkIsMobile);

    // 清理監聽器
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}; 