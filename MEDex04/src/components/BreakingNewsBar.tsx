import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';

export function BreakingNewsBar() {
  const [news, setNews] = useState({ enabled: false, text: '' });

  useEffect(() => {
    // Poll settings every 15 seconds to support updates while admin edits
    const fetchSettings = () => {
      fetch('/api/public/settings')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new TypeError('Non-JSON response');
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            setNews({
              enabled: !!data.breaking_news_enabled,
              text: data.breaking_news_text || ''
            });
          }
        })
        .catch((err) => console.warn('Warning loading breaking news settings:', err.message || err));
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 15000);
    return () => clearInterval(interval);
  }, []);

  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleToggle = (e: any) => {
      if (e.detail !== undefined) {
        setIsHidden(e.detail);
      } else {
        setIsHidden(prev => !prev);
      }
    };
    window.addEventListener('toggle-global-navbar', handleToggle);
    return () => {
      window.removeEventListener('toggle-global-navbar', handleToggle);
    };
  }, []);

  if (!news.enabled || !news.text.trim()) return null;

  return (
    <div 
      id="breaking-news-ticker-bar" 
      className={`fixed left-0 right-0 z-40 px-4 py-1.5 pointer-events-none transition-all duration-500 ease-in-out ${
        isHidden ? "-translate-y-full opacity-0 top-0" : "translate-y-0 opacity-100 top-16"
      }`}
    >
      <div className="max-w-2xl mx-auto w-full bg-[#ee2a7b]/10 backdrop-blur-md border border-[#ee2a7b]/20 hover:border-[#ee2a7b]/45 rounded-full shadow-md hover:shadow-lg transition-all pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes ticker-scroll {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .animate-news-marquee {
            display: inline-flex;
            white-space: nowrap;
            gap: 5rem;
            animation: ticker-scroll 28s linear infinite;
          }
          .animate-news-marquee:hover {
            animation-play-state: paused;
          }
        `}} />
        
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#ee2a7b] to-[#6228d7] text-white font-black text-[9px] uppercase tracking-widest rounded-full shrink-0 shadow-sm animate-pulse">
          <Megaphone size={11} fill="currentColor" className="text-white animate-pulse" />
          <span>BREAKING</span>
        </div>
        
        <div className="relative flex-1 overflow-hidden h-4 flex items-center text-[10.5px] font-black text-zinc-950 tracking-tight font-sans">
          <div className="animate-news-marquee">
            <span>{news.text}</span>
            <span>{news.text}</span>
            <span>{news.text}</span>
            <span>{news.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
