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
    <div className="flex items-center justify-center select-none" style={{ width, height }}>
      <svg 
        viewBox="0 0 520 220" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* MEDex Brand Gradients */}
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#005ca9" />
            <stop offset="100%" stopColor="#003566" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1faf38" />
            <stop offset="100%" stopColor="#0e6d1e" />
          </linearGradient>
          {/* Swoosh Gradient matching the logo image perfectly (left/darker to right/lighter) */}
          <linearGradient id="swooshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#044d13" />
            <stop offset="35%" stopColor="#0b7e28" />
            <stop offset="100%" stopColor="#1faf38" />
          </linearGradient>
        </defs>

        {/* === BRAND EMBLEM (Left Side) === */}
        <g id="brand-emblem">
          
          {/* Extra Stacked Pages on Left-Most Rim (Green and Rich Dark Green) */}
          <path d="M 40 70 C 35 70, 25 80, 22 105 C 20 120, 22 135, 30 142 L 34 142 C 26 135, 25 120, 27 105 C 30 85, 38 75, 42 75 Z" fill="#044d13" />
          <path d="M 46 65 C 40 65, 30 75, 27 100 C 25 115, 27 130, 35 137 L 39 137 C 31 130, 30 115, 32 100 C 35 80, 43 70, 48 70 Z" fill="#1faf38" />
          <path d="M 49 61 C 43 61, 33 71, 30 96 C 28 111, 30 126, 38 133 L 42 133 C 34 126, 33 111, 35 96 C 38 76, 46 66, 51 66 Z" fill="#0b7e28" />

          {/* Medical Cross Circle (above left page) */}
          <g id="cross-badge" transform="translate(3, -2)">
            <circle cx="101" cy="32" r="16" fill="url(#blueGrad)" />
            <rect x="98.5" y="22" width="5" height="20" rx="1.2" fill="#ffffff" />
            <rect x="91" y="29.5" width="20" height="5" rx="1.2" fill="#ffffff" />
          </g>

          {/* Stethoscope Badge & Circle Reflector (above right page) */}
          <g id="stethoscope-badge" transform="translate(138, 8)">
            {/* Ear loop tubing */}
            <path 
              d="M 12 11 C 12 4, 28 4, 28 11 C 28 20, 20 25, 20 32" 
              fill="none" 
              stroke="url(#greenGrad)" 
              strokeWidth="3.2" 
              strokeLinecap="round" 
            />
            {/* Ear tips */}
            <circle cx="12" cy="11" r="2.2" fill="url(#greenGrad)" />
            {/* Stethoscope diaphragm/bell */}
            <path d="M 20 31 L 20 35 M 17 35 L 23 35" stroke="url(#greenGrad)" strokeWidth="3" strokeLinecap="round" />
            
            {/* Circle reflector glass item */}
            <circle cx="36" cy="20" r="6" fill="none" stroke="url(#greenGrad)" strokeWidth="2.8" />
            <line x1="36" y1="26" x2="36" y2="31" stroke="url(#greenGrad)" strokeWidth="2.8" strokeLinecap="round" />
          </g>

          {/* Main Book Base Shape */}
          {/* Left Side Page (Blue Stroke) */}
          <path 
            d="M 68 135 C 102 118, 128 122, 137 132 L 137 72 C 128 62, 102 58, 68 75 Z" 
            fill="#ffffff" 
            stroke="url(#blueGrad)" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
          {/* Right Side Page (Green Stroke) */}
          <path 
            d="M 137 132 C 146 122, 172 118, 206 135 L 206 75 C 172 58, 146 62, 137 72 Z" 
            fill="#ffffff" 
            stroke="url(#greenGrad)" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
          
          {/* Inner Pages Detail Lines */}
          <path d="M 72 131 C 104 115, 126 119, 134 128 L 134 69 C 126 60, 104 56, 72 71 Z" fill="#ffffff" stroke="#e2edf7" strokeWidth="1" />
          <path d="M 202 131 C 170 115, 148 119, 140 128 L 140 69 C 148 60, 170 56, 202 71 Z" fill="#ffffff" stroke="#e2f7e5" strokeWidth="1" />

          {/* Spine of the Book */}
          <line x1="137.5" y1="73" x2="137.5" y2="130" stroke="url(#blueGrad)" strokeWidth="2" />

          {/* Green ECG Heartbeat Wave tracing across both pages */}
          <polyline 
            points="78,105 92,105 96,94 100,116 104,101 108,105 137,105 144,105 148,88 153,122 157,105 162,105 166,96 170,114 174,105 196,105" 
            fill="none" 
            stroke="url(#greenGrad)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </g>

        {/* === BRAND TYPOGRAPHY (Right Side) === */}
        <g id="brand-text">
          {/* "MED" in elegant, heavy, ultra-sans-serif */}
          <text 
            x="192" 
            y="126" 
            fill="url(#blueGrad)" 
            fontSize="104" 
            fontWeight="900" 
            fontFamily="'Inter', 'Outfit', 'Helvetica Neue', Arial, sans-serif" 
            letterSpacing="-3"
          >
            MED
          </text>
          {/* "ex" in vibrant, bold italic green */}
          <text 
            x="412" 
            y="126" 
            fill="url(#greenGrad)" 
            fontSize="104" 
            fontWeight="900" 
            fontFamily="'Outfit', 'Inter', 'Helvetica Neue', Arial, sans-serif" 
            fontStyle="italic"
            letterSpacing="-2"
          >
            ex
          </text>
        </g>

        {/* === THE GREEN SWOOSH / BANNER === */}
        <g id="green-swoosh">
          {/* Smooth bezier curves tracing the swoosh under MEDex */}
          <path 
            d="M 68 142 C 120 178, 220 184, 300 180 C 370 176, 440 166, 495 143 C 445 160, 375 168, 300 171 C 220 174, 120 166, 68 142" 
            fill="url(#swooshGrad)" 
          />
          
          {showSubtitle && (
            <text 
              x="300" 
              y="166" 
              fill="#ffffff" 
              fontSize="14" 
              fontWeight="900" 
              fontFamily="'Inter', 'Outfit', sans-serif" 
              textAnchor="middle" 
              letterSpacing="2.5"
            >
              SHARE • LEARN • HEAL
            </text>
          )}
        </g>

        {/* === THE "THE EASIEST WAY" SLOGAN === */}
        {showSubtitle && (
          <g id="tagline-handwriting">
            <text 
              x="300" 
              y="204" 
              fill="#18181b" 
              fontSize="34" 
              fontWeight="500" 
              fontFamily="'Caveat', cursive" 
              textAnchor="middle"
            >
              The easiest way
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
