import React, { useState, useEffect } from 'react';

export function MedexLogo({ size = 'md', showSubtitle = true, dark = false }: { size?: 'sm' | 'md' | 'lg' | 'xl', showSubtitle?: boolean, dark?: boolean }) {
  const [customSvg, setCustomSvg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('custom_app_logo_svg');
    if (saved && saved.trim()) {
      setCustomSvg(saved);
    } else {
      setCustomSvg(null);
    }

    const handleUpdate = () => {
      const live = localStorage.getItem('custom_app_logo_svg');
      if (live && live.trim()) {
        setCustomSvg(live);
      } else {
        setCustomSvg(null);
      }
    };

    window.addEventListener('custom-logo-updated', handleUpdate);
    return () => {
      window.removeEventListener('custom-logo-updated', handleUpdate);
    };
  }, []);

  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const isXl = size === 'xl';

  const width = isSm ? '140px' : isLg ? '340px' : isXl ? '500px' : '240px';
  const height = isSm ? '45px' : isLg ? '110px' : isXl ? '160px' : '75px';

  if (customSvg) {
    const isSvg = customSvg.trim().startsWith('<svg') || customSvg.trim().startsWith('<SVG') || customSvg.trim().startsWith('<?xml');
    if (isSvg) {
      return (
        <div 
          className="flex items-center justify-center select-none" 
          style={{ width, height }}
          dangerouslySetInnerHTML={{ __html: customSvg }}
        />
      );
    } else {
      return (
        <div 
          className="flex items-center justify-center select-none px-2" 
          style={{ width, height }}
        >
          <img 
            src={customSvg} 
            alt="App Logo" 
            className="object-contain max-w-full h-auto max-h-full" 
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }
  }

  return (
    <div className="flex items-center justify-center select-none px-2" style={{ width, height }}>
      <img 
        src="/images/logo.webp" 
        alt="App Logo" 
        className="object-contain max-w-full h-auto max-h-full" 
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
