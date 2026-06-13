import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Music, Volume2, VolumeX, X, Heart } from 'lucide-react';
import { useProgram } from '../lib/ProgramContext';

interface InvitationCardProps {
  onClose?: () => void;
  forceShow?: boolean;
}

const BlossomIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 20C55 5 75 5 80 20C95 25 95 45 80 50C95 55 95 75 80 80C75 95 55 95 50 80C45 95 25 95 20 80C5 75 5 55 20 50C5 45 5 25 20 20C25 5 45 5 50 20Z" fill="currentColor" fillOpacity="0.2"/>
    <circle cx="50" cy="50" r="8" fill="currentColor" fillOpacity="0.4"/>
  </svg>
);

const LeafIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 90C10 90 40 85 60 60C80 35 90 10 90 10C90 10 65 20 40 40C15 60 10 90 10 90Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M15 85C15 85 45 80 65 55" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function InvitationCard({ onClose, forceShow }: InvitationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activeProgram } = useProgram();

  // Customization points for the user
  const cardContent = {
    title: "Official Invitation",
    event: activeProgram?.name || "UDAAN 2.0",
    date: activeProgram?.date || "March 25, 2026",
    venue: activeProgram?.location || "Main Auditorium, Block C",
    message: activeProgram?.description || "We cordially invite you to join us at the Freshers' Induction Programme. Let's celebrate the beginning of a beautiful journey together.",
    signature: activeProgram?.department || "Dept. of MLT",
    musicUrl: "https://files.catbox.moe/g5vd76.mp3" 
  };

  useEffect(() => {
    if (forceShow) {
      setShowPopup(true);
      setIsOpen(false); // Reset to closed envelope state
      return;
    }

    // Check if seen before
    const hasSeen = sessionStorage.getItem('vibe_udaan_invitation_seen');
    if (!hasSeen) {
      setShowPopup(true);
    }
  }, [forceShow]);

  const handleOpen = () => {
    setIsOpen(true);
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.warn("Audio play blocked or failed. Ensure your link is a direct file link (not a webpage).", err);
      });
    }
  };

  const handleClose = () => {
    sessionStorage.setItem('vibe_udaan_invitation_seen', 'true');
    setShowPopup(false);
    if (onClose) onClose();
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-hidden">
      <audio 
        ref={audioRef} 
        src={cardContent.musicUrl} 
        loop 
        crossOrigin="anonymous"
        onError={() => console.error("Audio Load Error: The provided URL might not be a direct audio file link.")}
      />

      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Closed State - Premium V-Cut Envelope */
          <motion.div 
            key="closed"
            initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ 
              scale: 1.1, 
              opacity: 0,
              filter: "blur(10px)",
              transition: { duration: 0.4 } 
            }}
            className="relative cursor-pointer group transition-transform duration-500 hover:scale-[1.02]"
            onClick={handleOpen}
          >
            {/* The Envelope Box */}
            <div className="w-[85vw] max-w-[320px] h-[480px] bg-[#fdfbf7] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border border-amber-900/10">
              {/* Texture Overlay */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
              
              {/* Natural Decorations (Envelope) */}
              <BlossomIcon className="absolute -top-4 -right-4 w-24 h-24 text-ig-pink rotate-12" />
              <BlossomIcon className="absolute -bottom-8 -left-8 w-32 h-32 text-ig-pink -rotate-12 opacity-60" />
              <LeafIcon className="absolute top-10 left-4 w-12 h-12 text-zinc-400 -rotate-45" />
              <LeafIcon className="absolute bottom-24 right-4 w-16 h-16 text-zinc-300 rotate-90" />
              <LeafIcon className="absolute top-1/2 left-2 w-8 h-8 text-ig-pink/20 -rotate-12" />
              <LeafIcon className="absolute top-1/3 right-4 w-10 h-10 text-ig-pink/10 rotate-45" />

              {/* V-Cut Flap */}
              <div 
                className="absolute top-0 inset-x-0 h-48 bg-[#f5f1e8] shadow-md z-20"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent" />
              </div>

              {/* Envelope Body Lines */}
              <div className="absolute bottom-0 inset-x-0 h-full border-x border-b border-amber-900/10 rounded-xl" />

              {/* Main Ribbon (Vertical) */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-ig-pink shadow-md z-10" />
              
              {/* Main Ribbon (Horizontal) */}
              <div className="absolute inset-x-0 top-[60%] -translate-y-1/2 h-8 bg-ig-pink shadow-md z-10" />

              {/* The Bow Animation */}
              <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, -2, 2, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  {/* Left Loop */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-9 bg-ig-pink rounded-full border-2 border-white/20 -rotate-12 origin-right shadow-lg" />
                  {/* Right Loop */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-11 h-9 bg-ig-pink rounded-full border-2 border-white/20 rotate-12 origin-left shadow-lg" />
                  {/* Knot */}
                  <div className="w-7 h-7 bg-ig-pink rounded shadow-xl border border-white/30 relative z-10 flex items-center justify-center">
                    <Heart size={14} className="text-white fill-white animate-pulse" />
                  </div>
                  {/* Ribbons Tails */}
                  <div className="absolute top-4.5 -left-1 w-9 h-11 bg-ig-pink/90 origin-top-left rotate-[30deg] -z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }} />
                  <div className="absolute top-4.5 -right-1 w-9 h-11 bg-ig-pink/90 origin-top-right -rotate-[30deg] -z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }} />
                </motion.div>
              </div>

              {/* Seal/Text */}
              <div className="absolute bottom-12 inset-x-0 text-center px-6 z-40">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-900/40 mb-2">Exclusive Invitation</div>
                <div className="h-px w-12 bg-amber-900/10 mx-auto mb-4" />
                <h2 className="text-xl font-serif italic text-amber-900/80 tracking-wide">
                  Specially Crafted for You
                </h2>
                <motion.div 
                  className="mt-8 text-[10px] font-bold text-ig-pink uppercase tracking-widest bg-white/60 py-2 px-4 inline-block rounded-full shadow-sm"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Click to Untie
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Opened State - Smooth Paper Unfold Animation */
          <motion.div 
            key="opened"
            initial={{ scaleY: 0, opacity: 0, filter: "brightness(0.5) blur(10px)" }}
            animate={{ 
              scaleY: 1, 
              opacity: 1,
              filter: "brightness(1) blur(0px)",
              transition: { 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for a "springy" snap
                opacity: { duration: 0.4 }
              }
            }}
            className="w-full max-w-[420px] max-h-[85vh] bg-[#fdfaf5] rounded-[1.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-auto origin-center flex flex-col border border-white/20"
          >
            {/* Paper Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
            
            {/* Elegant Floral Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                animate={{ opacity: 0.4, scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, duration: 1.2 }}
                className="absolute -top-12 -left-12 w-44 h-44 text-ig-pink"
              >
                <BlossomIcon className="w-full h-full" />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotate: 20 }}
                animate={{ opacity: 0.3, scale: 1, rotate: 0 }}
                transition={{ delay: 1, duration: 1.5 }}
                className="absolute top-1/4 -right-16 w-36 h-36 text-ig-pink"
              >
                <BlossomIcon className="w-full h-full" />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 0.2, y: 0 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="absolute bottom-1/2 -left-10 w-20 h-20 text-zinc-400 rotate-180"
              >
                <LeafIcon className="w-full h-full" />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ delay: 0.6, duration: 1.5 }}
                className="absolute -bottom-24 -right-24 w-72 h-72 text-ig-pink/40"
              >
                <BlossomIcon className="w-full h-full" />
              </motion.div>

              {/* Sparkle/Gold Dust elements */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-amber-400 rounded-full"
                  initial={{ 
                    opacity: 0,
                    x: Math.random() * 500,
                    y: Math.random() * 800 
                  }}
                  animate={{ 
                    opacity: [0, 0.8, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2 + Math.random() * 3,
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                />
              ))}
            </div>

            {/* Elegant Background Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-ig-pink/5 rounded-bl-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-ig-pink/5 rounded-tr-full blur-3xl" />

            <div className="relative z-10 p-5 sm:p-7 md:p-9 flex flex-col items-center text-center">
              {/* Header Controls */}
              <div className="w-full flex justify-between items-center mb-5 sm:mb-8">
                <button 
                  onClick={toggleMute}
                  className="p-2 sm:p-2.5 bg-white/80 rounded-xl hover:bg-white transition-all border border-zinc-200/50 shadow-sm"
                >
                  {isMuted ? <VolumeX size={16} className="text-zinc-400" /> : <Volume2 size={16} className="text-ig-pink" />}
                </button>
                <div className="flex flex-col items-center">
                   <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{activeProgram?.name || 'VIBE'}</div>
                   <div className="w-6 h-0.5 bg-ig-pink mt-1 rounded-full" />
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 sm:p-2.5 bg-white/80 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-200/50 shadow-sm"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Main Content */}
              <div className="space-y-4 sm:space-y-5 max-w-sm w-full">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-1"
                >
                  <div className="text-[9px] sm:text-[10px] font-black text-ig-pink uppercase tracking-[0.5em]">{cardContent.title}</div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-black leading-[0.95] break-words">
                    {cardContent.event}
                  </h2>
                </motion.div>

                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 60 }}
                  transition={{ delay: 0.7, duration: 1 }}
                  className="h-1 bg-ig-gradient mx-auto rounded-full shadow-sm" 
                />

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="space-y-4 sm:space-y-5"
                >
                  <p className="text-zinc-600 font-serif italic text-xs sm:text-sm leading-relaxed px-1 sm:px-0">
                    "{cardContent.message}"
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <div className="space-y-0.5">
                      <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-400">When & Where</div>
                      <div className="text-base sm:text-lg font-bold text-black leading-snug">{cardContent.date}</div>
                      <div className="text-zinc-500 font-medium text-xs leading-normal">{cardContent.venue}</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 }}
                  className="pt-4 sm:pt-6 border-t border-zinc-100/80 w-full"
                >
                   <div className="text-[10px] italic text-zinc-400 mb-0.5">Sincerely yours,</div>
                   <div className="text-lg sm:text-xl font-black tracking-tighter text-zinc-800">{cardContent.signature}</div>
                </motion.div>

                <motion.button 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  onClick={handleClose}
                  className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 px-4 bg-black text-white text-[9px] sm:text-[10px] font-black tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-md active:scale-[0.98] rounded-xl"
                >
                  ACCEPT INVITATION
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
