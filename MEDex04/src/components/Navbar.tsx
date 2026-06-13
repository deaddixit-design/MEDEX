import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Sparkles, Image, List, Home, Shield, GraduationCap, Menu, X, MessageSquare, Flame, BookOpen, Activity, Library, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProgram } from '../lib/ProgramContext';
import { MedexLogo } from './MedexLogo';

export function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { activeProgram } = useProgram();

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

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'MLT Desk', path: '/bmlt', icon: Activity },
    { name: 'Content Library', path: '/library', icon: Library },
    { name: 'Graduating alumni', path: '/batches', icon: BookOpen },
    { name: 'NEWS/ Updates', path: '/news', icon: Newspaper },
    ...(activeProgram ? [
      { name: activeProgram.name, path: '/udaan', icon: GraduationCap },
      { name: 'Participate', path: '/participate', icon: Sparkles },
      { name: 'Performances', path: '/performances', icon: List },
      { name: 'Chillies', path: '/demanding', icon: Flame }
    ] : []),
    { name: 'Gallery', path: '/gallery', icon: Image },
    { name: 'User Desk', path: '/student', icon: GraduationCap },
    { name: 'Contact', path: '/contact', icon: MessageSquare },
    { name: 'Admin', path: '/admin', icon: Shield },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 transition-all duration-500 ease-in-out",
      isHidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
            <MedexLogo size="sm" showSubtitle={true} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'text-xs font-medium transition-colors hover:text-black lg:text-sm',
                  location.pathname === item.path ? 'text-black font-bold' : 'text-zinc-500'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {activeProgram && (
              <Link
                to="/participate"
                className="hidden sm:block bg-ig-gradient text-white px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-ig-pink/20"
              >
                Join Now
              </Link>
            )}

            {/* Program Quick Link - GIF Version */}
            {activeProgram && (
              <Link
                to="/udaan"
                className="flex items-center transition-all hover:scale-105 active:scale-95 sm:mr-1 shrink-0"
                title={activeProgram.name}
              >
                <img 
                  src={activeProgram.gifUrl} 
                  alt={activeProgram.name} 
                  className="h-9 max-w-[75px] sm:max-w-none w-auto md:h-11 rounded-lg shadow-sm border border-ig-pink/10 object-contain"
                  referrerPolicy="no-referrer"
                />
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-black transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-black/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                   onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all',
                    location.pathname === item.path 
                      ? 'bg-zinc-100 text-black' 
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-black'
                  )}
                >
                  <item.icon size={20} className={cn(
                    location.pathname === item.path ? 'text-ig-pink' : 'text-zinc-400'
                  )} />
                  {item.name}
                </Link>
              ))}
              {activeProgram && (
                <div className="pt-4 px-4">
                  <Link
                    to="/participate"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-ig-gradient text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-ig-pink/20"
                  >
                    Join Now <Sparkles size={18} />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
