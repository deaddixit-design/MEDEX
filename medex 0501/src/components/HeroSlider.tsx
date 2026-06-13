import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useProgram } from '../lib/ProgramContext';

const defaultSlides: { image: string; title: string; subtitle: string; isProgram?: boolean }[] = [
  {
    image: '/images/Hero 01.webp',
    title: 'Precision Diagnostics',
    subtitle: 'Where Every Diagnostic Finds Its Desk. Connect, share and explore clinical lab findings.',
  },
  {
    image: '/images/Hero 02.webp',
    title: 'Academic Case Archives',
    subtitle: 'Review microscopic pathology slide specimens and analyze laboratory variables.',
  },
  {
    image: '/images/Hero 03.webp',
    title: 'Collaborative Medical Science',
    subtitle: 'Engage with peer medical students and experts in hematology, biochemistry and pathology.',
  },
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const { activeProgram } = useProgram();
  const [customSettings, setCustomSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/public/settings')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError('Non-JSON response');
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setCustomSettings(data);
        }
      })
      .catch((err) => console.warn("Warning setting custom slides in hero slider:", err.message || err));
  }, []);

  const useCustomBranding = !activeProgram;

  const slides: { image: string; title: string; subtitle: string; isProgram?: boolean }[] = activeProgram ? [
    {
      image: activeProgram.gifUrl,
      title: activeProgram.name,
      subtitle: activeProgram.subtitle || 'The most awaited event of the year!',
      isProgram: true
    },
    {
      image: customSettings.home_image_1 || '/images/Hero 01.webp',
      title: 'Precision Diagnostics',
      subtitle: 'Where Every Diagnostic Finds Its Desk. Connect, share and explore clinical lab findings.',
    },
    {
      image: customSettings.home_image_2 || '/images/Hero 02.webp',
      title: 'Academic Case Archives',
      subtitle: 'Review microscopic pathology slide specimens and analyze laboratory variables.',
    },
    {
      image: customSettings.home_image_3 || '/images/Hero 03.webp',
      title: 'Collaborative Medical Science',
      subtitle: 'Engage with peer medical students and experts in hematology, biochemistry and pathology.',
    },
  ] : [
    {
      image: customSettings.home_image_1 || '/images/Hero 01.webp',
      title: 'Precision Diagnostics',
      subtitle: 'Where Every Diagnostic Finds Its Desk. Connect, share and explore clinical lab findings.',
    },
    {
      image: customSettings.home_image_2 || '/images/Hero 02.webp',
      title: 'Academic Case Archives',
      subtitle: 'Review microscopic pathology slide specimens and analyze laboratory variables.',
    },
    {
      image: customSettings.home_image_3 || '/images/Hero 03.webp',
      title: 'Collaborative Medical Science',
      subtitle: 'Engage with peer medical students and experts in hematology, biochemistry and pathology.',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative aspect-[16/9] sm:aspect-auto sm:h-[60vh] md:h-[80vh] w-full overflow-hidden bg-zinc-900 shadow-md">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-black/45 z-10" />
          <img
            src={slides[current].image}
            alt={slides[current].title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-5xl md:text-7xl font-bold text-white mb-1 md:mb-4 tracking-tight px-3"
            >
              {slides[current].title}
            </motion.h1>
            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] sm:text-lg md:text-xl text-zinc-200 max-w-xs sm:max-w-xl md:max-w-2xl mb-2 md:mb-8 px-3 leading-tight"
            >
              {slides[current].subtitle}
            </motion.p>
            {activeProgram && (
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-1.5 sm:gap-4"
              >
                <Link
                  to={slides[current].isProgram ? "/udaan" : "/participate"}
                  className="bg-ig-gradient text-white px-3 py-1.5 sm:px-10 sm:py-5 rounded-full font-bold text-[9px] sm:text-lg hover:opacity-90 transition-all shadow-xl shadow-ig-pink/30 scale-100 hover:scale-105"
                >
                  {slides[current].isProgram ? "View Event" : "Participate"}
                </Link>
                {slides[current].isProgram && (
                  <Link
                    to="/participate"
                    className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-3 py-1.5 sm:px-10 sm:py-5 rounded-full font-bold text-[9px] sm:text-lg hover:bg-white/20 transition-all scale-100 hover:scale-105"
                  >
                    Join Us
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={prev}
        className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-1 sm:p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
      >
        <ChevronLeft size={14} className="sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-1 sm:p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
      >
        <ChevronRight size={14} className="sm:w-6 sm:h-6" />
      </button>

      <div className="absolute bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              'w-1 h-1 sm:w-2 sm:h-2 rounded-full transition-all',
              current === i ? 'bg-white w-4 sm:w-8' : 'bg-white/40'
            )}
          />
        ))}
      </div>
    </div>
  );
}
