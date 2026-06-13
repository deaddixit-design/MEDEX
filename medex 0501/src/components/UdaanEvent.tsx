import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send,
  Trash2,
  Heart,
  Music,
  Download,
  Share2,
  CheckCircle,
  QrCode,
  Compass,
  Laptop,
  Copy,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useProgram } from '../lib/ProgramContext';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Wish } from '../types';
import { InvitationCard } from './InvitationCard';

// Firestore Error Handlers according to standard firebase-integration guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Gorgeous Instagram-themed solid, fully opaque palettes for wishes
const COLOR_PALETTES = [
  { 
    bgClass: 'bg-[#E1306C]', 
    textClass: 'text-white', 
    borderClass: 'border-pink-400',
    name: 'Instagram Pink',
    colorHex: '#E1306C' 
  },
  { 
    bgClass: 'bg-[#833AB4]', 
    textClass: 'text-white', 
    borderClass: 'border-purple-400', 
    name: 'Instagram Purple',
    colorHex: '#833AB4' 
  },
  { 
    bgClass: 'bg-[#f09433]', 
    textClass: 'text-white', 
    borderClass: 'border-orange-400', 
    name: 'Instagram Coral',
    colorHex: '#f09433' 
  },
  { 
    bgClass: 'bg-[#212028]', 
    textClass: 'text-zinc-100', 
    borderClass: 'border-zinc-800', 
    name: 'Obsidian Noir',
    colorHex: '#212028' 
  },
  { 
    bgClass: 'bg-[#009688]', 
    textClass: 'text-white', 
    borderClass: 'border-teal-400', 
    name: 'Instagram Teal',
    colorHex: '#009688' 
  },
  { 
    bgClass: 'bg-[#405DE6]', 
    textClass: 'text-white', 
    borderClass: 'border-blue-400', 
    name: 'Instagram Blue',
    colorHex: '#405DE6' 
  }
];

// Helper to transform any old gradients or semi-transparent classes to robust solid opaque colors
const resolveSolidColor = (colorClass: string): string => {
  if (!colorClass) return 'bg-[#E1306C]';
  const lowercaseVal = colorClass.toLowerCase();
  
  if (lowercaseVal.includes('f9ce34') || lowercaseVal.includes('e1306c') || lowercaseVal.includes('sunset')) {
    return 'bg-[#E1306C]'; // Solid Pink
  }
  if (lowercaseVal.includes('f09433') || lowercaseVal.includes('coral') || lowercaseVal.includes('orange')) {
    return 'bg-[#f09433]'; // Solid Coral
  }
  if (lowercaseVal.includes('833ab4') || lowercaseVal.includes('purple') || lowercaseVal.includes('gradient')) {
    return 'bg-[#833AB4]'; // Solid Purple
  }
  if (lowercaseVal.includes('3b82f6') || lowercaseVal.includes('405de6') || lowercaseVal.includes('blue')) {
    return 'bg-[#405DE6]'; // Solid Blue
  }
  if (lowercaseVal.includes('teal') || lowercaseVal.includes('009688')) {
    return 'bg-[#009688]'; // Solid Teal
  }
  if (lowercaseVal.includes('zinc') || lowercaseVal.includes('noir') || lowercaseVal.includes('09090b') || lowercaseVal.includes('212028')) {
    return 'bg-[#212028]'; // Solid dark grey/obsidian
  }
  
  if (colorClass.startsWith('bg-[') && colorClass.endsWith(']')) {
    return colorClass;
  }
  
  return 'bg-[#E1306C]';
};

export function UdaanEvent() {
  const { activeProgram } = useProgram();
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({ days: 12, hours: 8, minutes: 42, seconds: 15 });

  // Guestbook wishes states
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoadingWishes, setIsLoadingWishes] = useState(true);
  const [newWishName, setNewWishName] = useState('');
  const [newWishMessage, setNewWishMessage] = useState('');
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionUid, setSessionUid] = useState('');
  const [currentWishIndex, setCurrentWishIndex] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Social Share states and handlers
  const [shareCopied, setShareCopied] = useState(false);

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      // silent fallback
    });
  };

  // Reset or adjust currentWishIndex when wishes list length changes
  useEffect(() => {
    if (wishes.length > 0 && currentWishIndex >= wishes.length) {
      setCurrentWishIndex(wishes.length - 1);
    } else if (wishes.length === 0) {
      setCurrentWishIndex(0);
    }
  }, [wishes.length, currentWishIndex]);

  // VIP Pass Builder states
  const [vipName, setVipName] = useState('');
  const [hasGeneratedPass, setHasGeneratedPass] = useState(false);
  const [passSerial, setPassSerial] = useState('');

  // Initialize background music, user session ID, and setup the auto-reveal invitation
  useEffect(() => {
    // Session ID for deleting users' own wishes
    let currentSessionId = localStorage.getItem('vibe_udaan_session_id');
    if (!currentSessionId) {
      currentSessionId = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('vibe_udaan_session_id', currentSessionId);
    }
    setSessionUid(currentSessionId);

    // Dynamic Admin Auth check
    const token = localStorage.getItem('admin_token');
    const adminUnlocked = localStorage.getItem('vibe_udaan_admin_unlocked');
    if (token || adminUnlocked === 'true' || auth.currentUser) {
      setIsAdminMode(true);
    }

    // Auto-reveal invitation card once per user upon layout load
    const invitationSeen = localStorage.getItem('vibe_udaan_invitation_seen');
    if (!invitationSeen) {
      setShowEnvelope(true);
      localStorage.setItem('vibe_udaan_invitation_seen', 'true');
    }

    // Audio setup
    const audioObj = new Audio('https://files.catbox.moe/g5vd76.mp3');
    audioObj.loop = true;
    audioRef.current = audioObj;

    // Reactively monitor Google firebase auth users as well
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAdminMode(true);
      }
    });

    return () => {
      audioObj.pause();
      audioRef.current = null;
      unsubscribeAuth();
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.log('Audio playback blocked initially:', err));
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  // Event info parsing from Firestore structure
  const festivalTitle = activeProgram?.name || "Udaan 2.0";
  const festivalSubtitle = activeProgram?.subtitle || "Annual College Festival";
  const festivalDateString = activeProgram?.date || "March 25, 2026";
  const festivalTimeString = activeProgram?.time || "10:00 AM Onwards";
  const festivalVenueString = activeProgram?.location || "Main Auditorium, Campus Complex";
  const festivalDressCode = activeProgram?.dressCode || "Traditional Creative / High Fashion";
  const festivalDescription = activeProgram?.description || "A breathtaking union of culture, color, technology, and stage performances. Experience a celebration where student voices rise and our talent takes flight.";

  // Dynamic Countdown calculation to our destination date
  useEffect(() => {
    const getTargetTimestamp = (): number => {
      // 1. Try customizable countdownDate field first
      if (activeProgram?.countdownDate && activeProgram.countdownDate.trim() !== '') {
        const parsed = Date.parse(activeProgram.countdownDate.trim());
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      
      // 2. Try parsing display date and display time together
      if (activeProgram?.date) {
        let fullDateStr = activeProgram.date;
        if (activeProgram.time) {
          fullDateStr = `${activeProgram.date} ${activeProgram.time}`;
        }
        const parsedCombined = Date.parse(fullDateStr);
        if (!isNaN(parsedCombined)) {
          return parsedCombined;
        }
        
        // 3. Try parsing display date only
        const parsedJustDate = Date.parse(activeProgram.date);
        if (!isNaN(parsedJustDate)) {
          return parsedJustDate;
        }
      }

      // 4. Default standard fallback
      return new Date("September 05, 2026 10:00:00").getTime();
    };

    const targetDate = getTargetTimestamp();
    
    // Set initial calculations immediately
    const computeTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    computeTimeLeft();
    const interval = setInterval(computeTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [activeProgram]);

  // Fetch Wishes real-time from Firestore
  useEffect(() => {
    const path = 'wishes';
    const wishesRef = collection(db, path);
    const q = query(wishesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishList: Wish[] = [];
      const currentProgramId = activeProgram?.id || 'default';
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.isDeleted) {
          const wishProgramId = data.programId || 'default';
          if (wishProgramId === currentProgramId) {
            wishList.push({
              id: doc.id,
              name: data.name || 'Anonymous',
              message: data.message || '',
              color: data.color || 'bg-[#E1306C]',
              ink: data.ink || 'text-white',
              authorSessionId: data.authorSessionId || '',
              createdAt: data.createdAt,
              programId: wishProgramId,
            } as Wish);
          }
        }
      });
      setWishes(wishList);
      setIsLoadingWishes(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [activeProgram]);

  // Submit Wish handler
  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishName.trim() || !newWishMessage.trim()) return;

    setIsSubmitting(true);
    const path = 'wishes';
    const chosenPalette = COLOR_PALETTES[selectedPaletteIdx];

    const wishPayload = {
      name: newWishName.trim(),
      message: newWishMessage.trim(),
      color: chosenPalette.bgClass,
      ink: chosenPalette.textClass,
      authorSessionId: sessionUid,
      createdAt: serverTimestamp(),
      isDeleted: false,
      programId: activeProgram?.id || 'default',
    };

    try {
      await addDoc(collection(db, path), wishPayload);
      setNewWishName('');
      setNewWishMessage('');
      // Smooth visual feedback with sparkle symbol spawning
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Wish handler (only for owned wishes)
  const handleDeleteWish = async (id: string) => {
    const path = `wishes/${id}`;
    try {
      await deleteDoc(doc(db, 'wishes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // RSVP VIP Pass generator
  const handleBuildPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipName.trim()) return;
    const serial = `UDAAN-VIP-${Math.floor(100000 + Math.random() * 900000)}`;
    setPassSerial(serial);
    setHasGeneratedPass(true);
  };

  return (
    <div id="udaan-invitation-container" className="min-h-screen bg-[#07060a] text-zinc-100 overflow-x-hidden relative font-sans">
      
      {/* Decorative Blur Backdrops matching Instagram gradient signature */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#f9ce34]/10 via-[#ee2a7b]/10 to-transparent rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#6228d7]/10 via-[#ee2a7b]/10 to-transparent rounded-full filter blur-[140px] pointer-events-none" />

      {/* Floating Sparkle Elements decoration */}
      <div className="absolute top-1/4 right-[5%] w-2 h-2 bg-yellow-400 rotate-45 rounded-sm animate-ping pointer-events-none" />
      <div className="absolute bottom-1/4 left-[8%] w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce pointer-events-none" />

      {/* Audio Controller Wrapper */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button 
          id="audio-soundtrack-toggle"
          onClick={toggleMusic}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#121118]/90 backdrop-blur-md rounded-full border border-zinc-800 text-xs font-bold shadow-2xl transition-all duration-300 hover:scale-105 hover:border-[#ee2a7b] whitespace-nowrap"
        >
          <Music size={14} className={`${isPlaying ? 'animate-spin text-[#ee2a7b]' : 'text-zinc-500'}`} />
          <span>{isPlaying ? "Playing Symphony" : "Play Ambient Sound"}</span>
        </button>
        {isPlaying && (
          <button 
            id="audio-mute-toggle"
            onClick={toggleMute}
            className="p-2.5 bg-[#121118]/90 backdrop-blur-md rounded-full border border-zinc-800 shadow-2xl transition-all hover:scale-115 hover:border-[#ee2a7b]"
          >
            {isMuted ? <VolumeX size={14} className="text-zinc-400" /> : <Volume2 size={14} className="text-[#ee2a7b]" />}
          </button>
        )}
      </div>

      {/* Top Header Controls bar */}
      <header id="invitation-header-bar" className="max-w-7xl mx-auto px-4 py-3 sm:py-6 flex items-center justify-between border-b border-zinc-900 z-10 relative">
        <Link 
          to="/" 
          id="nav-back-button"
          className="group flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-zinc-400 hover:text-white uppercase transition-all duration-300"
        >
          <div className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition">
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="hidden xs:inline">Back to Main</span>
        </Link>

        {/* Elegant Centered Brand Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-black tracking-[0.3em] uppercase bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          <Sparkles size={14} className="text-pink-500" />
          <span>Exclusively Invited</span>
        </div>

        {/* Re-trigger envelope option */}
        <button 
          id="reopen-envelope-trigger"
          onClick={() => setShowEnvelope(true)}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black tracking-[0.1em] rounded-full border border-[#ee2a7b]/30 hover:border-[#ee2a7b]/80 bg-[#ee2a7b]/5 hover:bg-[#ee2a7b]/10 text-white shadow-md hover:shadow-[#ee2a7b]/10 transition-all duration-300 active:scale-95"
        >
          OPEN ENVELOPE
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-12 relative z-10">
        
        {/* Main Content Layout Grid */}
        <div id="invitation-layout-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 items-start">
          
          {/* LEFT COLUMN: GORGEOUS INVITATION DETAILS & COUNTDOWN (7 COLS) */}
          <section id="invitation-detail-column" className="lg:col-span-7 space-y-5 sm:space-y-8 flex flex-col items-center">
            
            {/* Super polished badge centered */}
            <div className="flex flex-col items-center text-center w-full space-y-2.5 sm:space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] sm:text-xs font-semibold text-[#ee2a7b]">
                <Sparkles size={10} className="animate-pulse" />
                <span>CULTURAL EXTRAVAGANZA</span>
              </div>

              {/* Glowing Big Title centered - Instagram Color Palette */}
              <div className="space-y-2 w-full">
                <h1 id="invitation-main-title" className="text-3xl xs:text-4xl sm:text-6xl md:text-8xl lg:text-[6rem] font-black tracking-tighter uppercase leading-[0.95] sm:leading-[0.9] text-white">
                  <span className="block text-zinc-400 font-sans tracking-wide text-[10px] sm:text-sm font-bold mb-1 sm:mb-3">Presenting the official celebration for 2026:</span>
                  <span className="animate-title-shine bg-clip-text text-transparent block py-1.5 sm:py-2">
                    {festivalTitle}
                  </span>
                </h1>
                <p id="invitation-subtitle" className="text-xs sm:text-base lg:text-lg text-zinc-400 max-w-xl mx-auto font-medium tracking-wide">
                  {festivalSubtitle} • {festivalVenueString}
                </p>
              </div>

              {/* Compact Countdown board below subtitle */}
              <div id="countdown-board-mini" className="relative group p-2.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-950/80 border border-zinc-900 overflow-hidden shadow-xl max-w-md w-full mx-auto mt-1">
                <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600" />
                <div className="relative z-10 w-full">
                  <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center justify-center gap-1.5 font-sans">
                    <Clock size={10} className="text-[#ee2a7b]" />
                    <span>Countdown to Launch</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center font-mono">
                    <div className="bg-zinc-900/50 p-1 sm:p-2 rounded-lg border border-zinc-800/40 relative">
                      <div className="text-base sm:text-2xl font-black text-white tracking-tight">{timeLeft.days}</div>
                      <div className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider text-zinc-500 mt-0.5 font-sans">Days</div>
                    </div>
                    <div className="bg-zinc-900/50 p-1 sm:p-2 rounded-lg border border-zinc-800/40 relative">
                      <div className="text-base sm:text-2xl font-black text-[#ee2a7b] tracking-tight">{timeLeft.hours}</div>
                      <div className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider text-zinc-500 mt-0.5 font-sans">Hours</div>
                    </div>
                    <div className="bg-zinc-900/50 p-1 sm:p-2 rounded-lg border border-zinc-800/40 relative">
                      <div className="text-base sm:text-2xl font-black text-[#6228d7] tracking-tight">{timeLeft.minutes}</div>
                      <div className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider text-zinc-500 mt-0.5 font-sans">Mins</div>
                    </div>
                    <div className="bg-zinc-900/50 p-1 sm:p-2 rounded-lg border border-zinc-800/40 relative animate-pulse">
                      <div className="text-base sm:text-2xl font-black text-[#f9ce34] tracking-tight">{timeLeft.seconds}</div>
                      <div className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider text-zinc-500 mt-0.5 font-sans">Secs</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Event Description */}
            <p id="invitation-intro-text" className="text-zinc-300 text-xs sm:text-base leading-relaxed font-normal text-center max-w-2xl px-1">
              {festivalDescription}
            </p>

            {/* Highly Highlighted Cards Grid for Key Details in 3 beautiful columns */}
            <div id="details-cards-grid" className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full pt-1">
              
              <div 
                id="highlight-datetime-card"
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-start gap-2.5 sm:gap-3 transform hover:scale-[1.02] transition-all duration-300"
              >
                <div className="p-2 rounded-lg bg-amber-400 text-black font-black shrink-0 animate-pulse">
                  <Calendar size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h4 className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-amber-400 mb-0.5 sm:mb-1 flex items-center gap-1 font-sans">
                    <span>Date & Time</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                  </h4>
                  <p className="font-extrabold text-white text-xs sm:text-sm leading-tight">{festivalDateString}</p>
                  <p className="text-[10px] text-zinc-300 font-medium mt-0.5 inline-block px-1 rounded bg-zinc-90 w-fit">{festivalTimeString}</p>
                </div>
              </div>

              <div 
                id="highlight-location-card"
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border-2 border-[#ee2a7b]/80 shadow-[0_0_20px_rgba(238,42,123,0.15)] flex items-start gap-2.5 sm:gap-3 transform hover:scale-[1.02] transition-all duration-300"
              >
                <div className="p-2 rounded-lg bg-[#ee2a7b] text-white shrink-0">
                  <MapPin size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h4 className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-[#ee2a7b] mb-0.5 sm:mb-1 flex items-center gap-1 font-sans">
                    <span>Official Location</span>
                  </h4>
                  <p className="font-extrabold text-white text-xs sm:text-sm leading-tight">{festivalVenueString}</p>
                  <p className="text-[10px] text-purple-300 font-medium mt-0.5">Access allowed to invitees</p>
                </div>
              </div>

              <div 
                id="highlight-dresscode-card"
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border-2 border-[#6228d7]/80 shadow-[0_0_20px_rgba(98,40,215,0.15)] flex items-start gap-2.5 sm:gap-3 transform hover:scale-[1.02] transition-all duration-300"
              >
                <div className="p-2 rounded-lg bg-[#6228d7] text-white shrink-0">
                  <Sparkles size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h4 className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-purple-400 mb-0.5 sm:mb-1 flex items-center gap-1 font-sans">
                    <span>Dress Theme</span>
                  </h4>
                  <p className="font-extrabold text-white text-xs sm:text-sm leading-tight">{festivalDressCode}</p>
                  <p className="text-[10px] text-zinc-300 font-medium mt-0.5 font-sans">Insta color palette vibes</p>
                </div>
              </div>

            </div>

            {/* Always Available Download PDF Option */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
              <a 
                href={activeProgram?.invitationPdfUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"} 
                target="_blank" 
                rel="noreferrer"
                id="pdf-invitation-link"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:scale-[1.02] active:scale-[0.98] text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.2em] transition-all duration-300 shadow-[0_5px_22px_rgba(238,42,123,0.3)] border border-white/15"
              >
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/20 shrink-0">
                  <Download size={13} className="animate-bounce" />
                </div>
                <span>Download Official PDF Invitation Catalogue</span>
              </a>
            </div>

            {/* Social Share Option Segment */}
            <div id="social-share-section" className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border border-zinc-900 shadow-lg space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#ee2a7b]/10 text-[#ee2a7b] border border-[#ee2a7b]/20 shrink-0">
                  <Share2 size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Share Vibe</h3>
                  <p className="text-[9px] text-zinc-500">Invite friends directly to Udaan page</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center p-2 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 text-zinc-300 hover:text-[#f9ce34] border border-zinc-900/60 transition-all text-center gap-2 group min-h-[44px] cursor-pointer"
                >
                  <div className="relative h-[14px] w-[14px] flex items-center justify-center shrink-0">
                    <AnimatePresence mode="wait">
                      {shareCopied ? (
                        <motion.div
                          key="copied"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="text-emerald-400"
                        >
                          <Check size={14} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="group-hover:scale-110 transition-transform duration-200"
                        >
                          <Copy size={13} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">{shareCopied ? 'Copied' : 'Link'}</span>
                </button>

                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🎉 Join us for Udaan 2026: The Ultimate Cultural Extravaganza! ✨\n\n📅 Date: ${festivalDateString}\n🎨 Theme: ${festivalDressCode}\n📍 Location: ${festivalVenueString}\n\nCheck out details, post congratulations wishes, and download your VIP entry pass here:\n${window.location.origin}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center p-2 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 text-zinc-300 hover:text-emerald-400 border border-zinc-900/60 transition-all text-center gap-2 group min-h-[44px]"
                >
                  <div className="group-hover:scale-110 transition-transform duration-200 text-emerald-500 shrink-0">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.1 1.449 4.881 1.45 5.568 0 10.105-4.534 10.107-10.104.002-2.699-1.045-5.234-2.951-7.141C16.719 1.452 14.185.4 11.486.4 5.921.4 1.383 4.932 1.38 10.505c-.001 1.83.479 3.619 1.392 5.174l-.946 3.454 3.541-.929zM17.51 14.8c-.29-.145-1.71-.845-1.97-.94-.27-.1-.46-.145-.66.145-.19.29-.74.94-.905 1.13-.17.19-.34.21-.63.07-2.6-.13-4.15-1.09-5.06-2.67-.28-.48-.04-.74.2-.98.22-.22.48-.56.72-.84.24-.28.32-.48.48-.8.16-.31.08-.59-.04-.84-.12-.24-.66-1.6-.9-2.19-.24-.58-.49-.5-.66-.51l-.57-.01c-.2 0-.51.07-.78.37-.27.3-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.02.15.19 2.07 3.16 5.01 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.11.57-.08 1.71-.7 1.95-1.37.24-.67.24-1.24.17-1.37-.07-.13-.27-.2-.56-.35z"/>
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">WhatsApp</span>
                </a>

                {/* Twitter / X Share */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `🎉 Excited for Udaan 2026: The Ultimate Cultural Extravaganza! 🌟\n📅 ${festivalDateString}\n🎨 Theme: ${festivalDressCode}\n📍 ${festivalVenueString}\n\nJoin us, view celebrations details and sign the wishing wall right here:`
                  )}&url=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center p-2 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 text-zinc-300 hover:text-sky-400 border border-zinc-900/60 transition-all text-center gap-2 group min-h-[44px]"
                >
                  <div className="group-hover:scale-110 transition-transform duration-200 text-sky-400 shrink-0">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">X</span>
                </a>

                {/* Facebook Share */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center p-2 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 text-zinc-300 hover:text-blue-400 border border-zinc-900/60 transition-all text-center gap-2 group min-h-[44px]"
                >
                  <div className="group-hover:scale-110 transition-transform duration-200 text-blue-500 shrink-0">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Facebook</span>
                </a>
              </div>
            </div>

          </section>

          {/* RIGHT COLUMN: REFINED GUESTBOOK & WISHING WALL (5 COLS) */}
          <section id="guestbook-wishes-column" className="lg:col-span-5 space-y-6 sm:space-y-8">
            
            <div id="wishing-wall-card-box" className="p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] bg-zinc-950 border border-zinc-900 shadow-2xl space-y-4 sm:space-y-6">

              {/* Real-time wishes list ABOVE the form with a stacked, sliding appearance */}
              <div className="space-y-3 pt-2 border-b border-zinc-900/60 pb-4">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-zinc-400">
                  <span>WALL ENTRIES ({wishes.length})</span>
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#ee2a7b] animate-pulse">Live Stack</span>
                </div>

                {isLoadingWishes ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    Loading guestbook entries...
                  </div>
                ) : wishes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-600 rounded-2xl bg-zinc-900/10 border border-dashed border-zinc-800">
                    Be the first well-wisher to post a congratulatory card!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* The Stacked slider */}
                    <div className="relative w-full h-[145px] sm:h-[180px] flex items-center justify-center mt-1 sm:mt-2">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {wishes.map((wish, index) => {
                          // Visual order based on currentWishIndex
                          const relativeIndex = (index - currentWishIndex + wishes.length) % wishes.length;
                          
                          // Only keep upper 3 cards in stack visual buffer
                          if (relativeIndex < 0 || relativeIndex >= 3) return null;

                          const scale = 1 - relativeIndex * 0.05;
                          const yOffset = relativeIndex * 8;
                          const zIndex = 30 - relativeIndex;
                          // Force fully solid opaque cards so that background card text never bleeds through
                          const opacity = 1;

                          const isTopCard = relativeIndex === 0;

                          return (
                            <motion.div
                              key={wish.id}
                              style={{ zIndex, scale, y: yOffset }}
                              initial={{ opacity: 0, scale: 0.9, x: isTopCard ? 150 : 0 }}
                              animate={{ 
                                opacity: 1, 
                                scale,
                                x: 0,
                                transition: { type: "spring", stiffness: 300, damping: 25 } 
                              }}
                              exit={{ opacity: 0, scale: 0.85, x: isTopCard ? -150 : 0, transition: { duration: 0.2 } }}
                              drag={isTopCard ? "x" : false}
                              dragConstraints={{ left: 0, right: 0 }}
                              dragElastic={0.7}
                              onDragEnd={(event, info) => {
                                if (info.offset.x > 100) {
                                  // Swiped right -> previous wish Card
                                  setCurrentWishIndex((prev) => (prev - 1 + wishes.length) % wishes.length);
                                } else if (info.offset.x < -100) {
                                  // Swiped left -> next wish Card
                                  setCurrentWishIndex((prev) => (prev + 1) % wishes.length);
                                }
                              }}
                              className={`absolute w-full p-3.5 sm:p-4.5 rounded-xl ${resolveSolidColor(wish.color)} ${wish.ink} shadow-xl border border-white/10 flex flex-col justify-between h-[125px] sm:h-[155px] overflow-hidden ${isTopCard ? 'cursor-grab active:cursor-grabbing select-none' : 'pointer-events-none'}`}
                            >
                              {/* Glass Shine Accent */}
                              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none" />

                              {isTopCard ? (
                                <>
                                  <div className="space-y-1 relative z-10 w-full font-sans">
                                    <div className="flex items-center justify-between opacity-85 text-[8px] sm:text-[9px] font-black uppercase tracking-wider">
                                      <span>INSTA NOTE</span>
                                      <span className="flex items-center gap-1">
                                        <Heart size={9} fill="currentColor" className="text-white animate-pulse" /> Note {index + 1} of {wishes.length}
                                      </span>
                                    </div>

                                    <p className="text-[11px] sm:text-xs leading-relaxed font-serif italic line-clamp-2 sm:line-clamp-3">
                                      "{wish.message}"
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-white/10 relative z-10 w-full shrink-0 font-sans">
                                    <span className="text-[10px] sm:text-xs font-black tracking-tight opacity-95">
                                      — {wish.name}
                                    </span>
                                    {(wish.authorSessionId === sessionUid || isAdminMode) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteWish(wish.id);
                                        }}
                                        className="p-1 px-1.5 rounded bg-black/20 text-white/80 hover:text-white hover:bg-red-500 transition-all text-[8px] font-bold flex items-center gap-1 shrink-0"
                                        title={isAdminMode ? "Admin Delete" : "Delete my wish"}
                                      >
                                        <Trash2 size={8} /> {isAdminMode ? "Admin Delete" : "Delete"}
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full" />
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Stack Controller / Slide Nav */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-1">
                       <button
                        type="button"
                        onClick={() => {
                          setCurrentWishIndex((prev) => (prev - 1 + wishes.length) % wishes.length);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] sm:text-xs font-bold text-zinc-300 hover:text-white transition active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        &larr; Prev
                      </button>

                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                        Explore ({currentWishIndex + 1}/{wishes.length})
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentWishIndex((prev) => (prev + 1) % wishes.length);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] sm:text-xs font-bold text-zinc-300 hover:text-white transition active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        Next &rarr;
                      </button>
                    </div>

                    {/* Admin Mode Activation Controls */}
                    <div className="flex items-center justify-center gap-2 mt-3 pt-1.5 border-t border-zinc-900/60 w-full">
                      {isAdminMode ? (
                        <div className="flex items-center justify-between w-full text-[9px] font-mono text-zinc-500 uppercase px-1">
                          <span className="text-[#f9ce34] font-black tracking-wider flex items-center gap-1">
                            🛡️ Mod Panel Active (Admin Mode)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdminMode(false);
                              localStorage.removeItem('vibe_udaan_admin_unlocked');
                              localStorage.removeItem('admin_token');
                            }}
                            className="text-red-400 hover:text-red-300 underline lowercase font-bold font-sans self-center shrink-0"
                          >
                            logout mod
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const pass = prompt("Enter Admin Passcode to enable moderate deletion mode:");
                            if (pass === "admin123") {
                              setIsAdminMode(true);
                              localStorage.setItem('vibe_udaan_admin_unlocked', 'true');
                              alert("Success: Admin Deletion Mode Activated! You can now moderate and delete any wishing card.");
                            } else if (pass !== null) {
                              alert("Error: Incorrect Administrator Passcode.");
                            }
                          }}
                          className="text-[9px] font-black text-zinc-600 hover:text-[#f9ce34] transition duration-200 tracking-wider uppercase font-mono flex items-center gap-1.5"
                          id="unlock-admin-wishes-button"
                        >
                          🔒 Mod Controls
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wish Submission Form centered below */}
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-[#ee2a7b] uppercase">New Card Entry</span>
                <p className="text-xs text-zinc-400">
                  Create your own custom styled note to attach onto the swipable stack!
                </p>
              </div>

              <form onSubmit={handleAddWish} className="space-y-3 pt-0.5">
                <div className="space-y-1">
                  <label htmlFor="wish-name-input" className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Your Name</label>
                  <input 
                    type="text" 
                    id="wish-name-input"
                    value={newWishName} 
                    onChange={(e) => setNewWishName(e.target.value)}
                    placeholder="e.g. John Doe (Dept of CS)"
                    required
                    maxLength={40}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-[#ee2a7b] focus:ring-1 focus:ring-[#ee2a7b] rounded-xl text-zinc-100 placeholder-zinc-600 text-xs outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="wish-message-input" className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Your Wish Message</label>
                  <textarea 
                    id="wish-message-input"
                    value={newWishMessage} 
                    onChange={(e) => setNewWishMessage(e.target.value)}
                    placeholder="Type your celebratory note or greeting..."
                    required
                    maxLength={200}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-[#ee2a7b] focus:ring-1 focus:ring-[#ee2a7b] rounded-xl text-zinc-100 placeholder-zinc-600 text-xs outline-none transition-all resize-none"
                  />
                </div>

                {/* Color Palette Selector - Instagram Tones */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block">Choose Card Aesthetics</span>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PALETTES.map((palette, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPaletteIdx(idx)}
                        className={`w-5 h-5 rounded-full border-2 ${palette.bgClass} flex items-center justify-center transition ${selectedPaletteIdx === idx ? 'border-white scale-110 shadow-md' : 'border-transparent scale-100 hover:scale-105'}`}
                        title={palette.name}
                      >
                        {selectedPaletteIdx === idx && (
                          <div className="w-1 h-1 bg-white rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  id="wish-submit-btn"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#ee2a7b] hover:bg-[#c13584] text-white text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Posting Note...' : 'POST WISH TO WALL'}
                  <Send size={11} />
                </button>
              </form>

            </div>

          </section>

        </div>

      </main>

      {/* Embedded Core Envelope Invitation Card Modal */}
      <InvitationCard 
        forceShow={showEnvelope} 
        onClose={() => setShowEnvelope(false)} 
      />

    </div>
  );
}
