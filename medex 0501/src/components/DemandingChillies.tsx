import React, { useState, useEffect } from 'react';
import { Music, Camera, Video, ArrowLeft, ExternalLink, Flame, Wind, Guitar, Mic2, Speaker, Disc, Headphones, Play, Pause, Maximize2, X, Eye, Sparkles, Smile, BarChart3, HelpCircle, History, RefreshCw, Send, Radio, Plus, Check, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DemandingItem } from '../types';
import { cn } from '../lib/utils';

const MusicElement = ({ Icon, delay, className, size = 24 }: { Icon: any, delay: number, className: string, size?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0.1, 0.2, 0.1],
      scale: [1, 1.1, 1],
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0]
    }}
    transition={{ 
      duration: 5 + Math.random() * 5,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
    className={`absolute pointer-events-none ${className}`}
  >
    <Icon size={size} />
  </motion.div>
);


export function DemandingChillies() {
  const [items, setItems] = useState<DemandingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'audio' | 'video' | 'photo' | 'vibe'>('audio');
  const [audioStyle, setAudioStyle] = useState<string>('All');
  const [videoStyle, setVideoStyle] = useState<string>('All');
  const [photoStyle, setPhotoStyle] = useState<string>('All');

  // Vibe Check AI States
  const [moodInput, setMoodInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [vibeResult, setVibeResult] = useState<any>(null);
  const [vibeHistory, setVibeHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vibe_history') || '[]');
    } catch {
      return [];
    }
  });
  const [vibeError, setVibeError] = useState<string | null>(null);
  const [activeVibeSong, setActiveVibeSong] = useState<any>(null);
  const [proceduralAudioPlaying, setProceduralAudioPlaying] = useState(false);
  const [synthesizerStep, setSynthesizerStep] = useState<string>('');
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [addingTrackKey, setAddingTrackKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSearchQuery('');
  }, [activeSection]);

  const handleAddToList = async (e: React.MouseEvent, track: any, type: 'song' | 'videography') => {
    e.stopPropagation();
    const trackKey = `${track.title}-${type}`;
    if (addedItems[trackKey]) return;

    setAddingTrackKey(trackKey);
    try {
      const res = await fetch('/api/demanding-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: track.title,
          link: track.link,
          description: track.vibeReason || track.description || `Recommended for vibe: ${track.vibeStyle || 'Trending'}`,
          category: track.vibeStyle || track.category || 'Trending'
        })
      });
      if (res.ok) {
        setAddedItems(prev => ({ ...prev, [trackKey]: true }));
        // Refresh demanding items list immediately so they show up on other tabs
        fetchItems();
      } else {
        console.error('Failed to add track to list');
      }
    } catch (err) {
      console.error('Error adding track:', err);
    } finally {
      setAddingTrackKey(null);
    }
  };

  const vibeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const synthContextRef = React.useRef<AudioContext | null>(null);
  const synthNodesRef = React.useRef<any[]>([]);

  const isDirectAudioLink = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    
    // YouTube search or play links cannot be streamed via HTML5 audio
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return false;
    }
    
    return true;
  };

  const startSynth = (freqType: string) => {
    try {
      stopSynth();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      synthContextRef.current = ctx;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      
      const dynamicsCompressor = ctx.createDynamicsCompressor();
      dynamicsCompressor.threshold.setValueAtTime(-24, ctx.currentTime);
      dynamicsCompressor.knee.setValueAtTime(30, ctx.currentTime);
      dynamicsCompressor.ratio.setValueAtTime(12, ctx.currentTime);
      dynamicsCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
      dynamicsCompressor.release.setValueAtTime(0.25, ctx.currentTime);

      filter.connect(dynamicsCompressor);
      dynamicsCompressor.connect(ctx.destination);

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.12, ctx.currentTime);
      mainGain.connect(filter);

      synthNodesRef.current.push(mainGain);

      let frequencies: number[] = [130.81, 164.81, 196.00, 261.63];
      let oscType: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine';
      let lpFreq = 800;

      if (freqType === 'synthWave') {
        frequencies = [110.00, 146.83, 164.81, 220.00];
        oscType = 'triangle';
        lpFreq = 600;
        
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(6, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(200, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        synthNodesRef.current.push(lfo);
      } else if (freqType === 'ambientMelody') {
        frequencies = [174.61, 220.00, 261.63, 349.23];
        oscType = 'sine';
        lpFreq = 400;

        const vibrato = ctx.createOscillator();
        vibrato.frequency.setValueAtTime(0.5, ctx.currentTime);
        const vibGain = ctx.createGain();
        vibGain.gain.setValueAtTime(0.02, ctx.currentTime);
        vibrato.connect(vibGain);
        vibrato.connect(mainGain.gain);
        vibrato.start();
        synthNodesRef.current.push(vibrato);
      } else if (freqType === 'subBass') {
        frequencies = [48.99, 65.41, 73.42];
        oscType = 'sine';
        lpFreq = 120;
      } else if (freqType === 'jazzyGuitar') {
        frequencies = [146.83, 185.00, 220.00, 277.18];
        oscType = 'sine';
        lpFreq = 1200;

        const tremolo = ctx.createOscillator();
        tremolo.frequency.setValueAtTime(4, ctx.currentTime);
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.04, ctx.currentTime);
        tremolo.connect(tremoloGain);
        tremoloGain.connect(mainGain.gain);
        tremolo.start();
        synthNodesRef.current.push(tremolo);
      } else if (freqType === 'chillHarmonics') {
        frequencies = [293.66, 369.99, 440.00, 587.33];
        oscType = 'sine';
        lpFreq = 1500;
        
        const intervalId = setInterval(() => {
          if (ctx.state === 'running') {
            const chimeOsc = ctx.createOscillator();
            const chimeGain = ctx.createGain();
            chimeOsc.type = 'sine';
            const randomNote = frequencies[Math.floor(Math.random() * frequencies.length)] * 2;
            chimeOsc.frequency.setValueAtTime(randomNote, ctx.currentTime);
            
            chimeGain.gain.setValueAtTime(0, ctx.currentTime);
            chimeGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
            
            chimeOsc.connect(chimeGain);
            chimeGain.connect(filter);
            chimeOsc.start();
            chimeOsc.stop(ctx.currentTime + 3.0);
          }
        }, 800);
        
        (synthNodesRef.current as any).intervalId = intervalId;
      }

      filter.frequency.setValueAtTime(lpFreq, ctx.currentTime);

      frequencies.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = oscType;
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.detune.setValueAtTime((idx - 1.5) * 8, ctx.currentTime);

        oscGain.gain.setValueAtTime(0, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.5);

        osc.connect(oscGain);
        oscGain.connect(mainGain);
        
        osc.start();
        synthNodesRef.current.push(osc);
      });

    } catch (e) {
      console.error('Failed to boot procedural Web Audio synth:', e);
    }
  };

  const stopSynth = () => {
    if (synthNodesRef.current && (synthNodesRef.current as any).intervalId) {
      clearInterval((synthNodesRef.current as any).intervalId);
    }

    if (synthNodesRef.current) {
      synthNodesRef.current.forEach(node => {
        try {
          node.disconnect();
          node.stop();
        } catch {}
      });
      synthNodesRef.current = [];
    }

    if (synthContextRef.current) {
      try {
        synthContextRef.current.close();
      } catch {}
      synthContextRef.current = null;
    }
  };

  // Sync Audios state (both native and synthesised)
  useEffect(() => {
    if (proceduralAudioPlaying && activeVibeSong) {
      const isDirect = isDirectAudioLink(activeVibeSong.link);
      if (isDirect) {
        stopSynth();
        if (vibeAudioRef.current) {
          vibeAudioRef.current.play().catch(err => {
            console.warn('Audio play restricted until user action:', err);
          });
        }
      } else {
        if (vibeAudioRef.current) {
          vibeAudioRef.current.pause();
        }
        startSynth(activeVibeSong.audioFrequency || 'ambientMelody');
      }
    } else {
      stopSynth();
      if (vibeAudioRef.current) {
        vibeAudioRef.current.pause();
      }
    }

    return () => {
      stopSynth();
    };
  }, [proceduralAudioPlaying, activeVibeSong]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/demanding-items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch demanding items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVibeCheck = async (e?: React.FormEvent, customMood?: string) => {
    if (e) e.preventDefault();
    const moodToAnalyze = customMood || moodInput;
    if (!moodToAnalyze.trim()) return;

    setAnalyzing(true);
    setVibeError(null);
    setActiveVibeSong(null);
    setProceduralAudioPlaying(false);

    // Rotate messages on screen during loading
    const steps = [
      'Tuning into your frequency...',
      'Decoding emotional harmonics...',
      'Synthesizing procedural wave patterns...',
      'Matching against campus records...',
      'Filtering our high-demand chillies pool...'
    ];
    setSynthesizerStep(steps[0]);
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setSynthesizerStep(steps[stepIdx]);
      }
    }, 1200);

    try {
      const res = await fetch('/api/vibe-check-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: moodToAnalyze })
      });
      if (!res.ok) {
        throw new Error('Vibe check service did not reply successfully.');
      }
      const data = await res.json();
      setVibeResult(data);

      // Save to history list
      const newHistoryItem = {
        id: Date.now(),
        moodText: moodToAnalyze,
        detectedMood: data.detectedMood,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scores: data.scores,
        colorPalette: data.colorPalette,
        playlist: data.playlist
      };
      const updatedHistory = [newHistoryItem, ...vibeHistory.filter(h => h.moodText !== moodToAnalyze).slice(0, 9)];
      setVibeHistory(updatedHistory);
      localStorage.setItem('vibe_history', JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error(err);
      setVibeError('Unable to check vibe. Please verify connection and retry.');
    } finally {
      clearInterval(interval);
      setAnalyzing(false);
    }
  };

  // Helper to get unique styles for a subset of items
  const getStylesForType = (typeItems: DemandingItem[]) => {
    const uniqueStyles = Array.from(new Set(typeItems.map(item => item.category || 'Trending').filter(Boolean)));
    return ['All', ...uniqueStyles];
  };

  const allSongs = items.filter(item => item && item.type && item.type.toLowerCase() === 'song');
  const allVideos = items.filter(item => item && item.type && (item.type.toLowerCase() === 'videography' || item.type.toLowerCase() === 'video'));
  const allPhotos = items.filter(item => item && item.type && (item.type.toLowerCase() === 'photography' || item.type.toLowerCase() === 'photo'));

  const audioStyles = getStylesForType(allSongs);
  const videoStyles = getStylesForType(allVideos);
  const photoStyles = getStylesForType(allPhotos);

  const filterBySearch = (itemList: DemandingItem[]) => {
    if (!searchQuery.trim()) return itemList;
    const needle = searchQuery.toLowerCase().trim();
    return itemList.filter(item => 
      (item.title && item.title.toLowerCase().includes(needle)) ||
      (item.description && item.description.toLowerCase().includes(needle)) ||
      (item.category && item.category.toLowerCase().includes(needle))
    );
  };

  const filteredAllSongs = filterBySearch(allSongs);
  const filteredAllVideos = filterBySearch(allVideos);
  const filteredAllPhotos = filterBySearch(allPhotos);

  const songs = audioStyle === 'All' ? filteredAllSongs : filteredAllSongs.filter(item => (item.category || 'Trending') === audioStyle);
  const videography = videoStyle === 'All' ? filteredAllVideos : filteredAllVideos.filter(item => (item.category || 'Trending') === videoStyle);
  const photography = photoStyle === 'All' ? filteredAllPhotos : filteredAllPhotos.filter(item => (item.category || 'Trending') === photoStyle);

  const getDirectUrl = (url: string) => {
    if (!url) return '';
    // Handle Google Drive links
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://drive.google.com/uc?id=${driveMatch[1]}`;
    }
    return url;
  };

  const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube thumbnail
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    
    // Google Drive thumbnail
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    
    return '';
  };

  const isYoutube = (url: string) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20 md:pt-32 pb-8 md:pb-24 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1)_0%,transparent_50%)]" />
        
        {/* Musical Instruments */}
        <MusicElement Icon={Guitar} delay={0} className="top-[10%] left-[5%] text-red-500/20" size={120} />
        <MusicElement Icon={Mic2} delay={1} className="top-[40%] right-[3%] text-zinc-500/20" size={80} />
        <MusicElement Icon={Speaker} delay={2} className="bottom-[10%] left-[8%] text-red-600/10" size={100} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] right-[10%] text-zinc-400/20 pointer-events-none"
        >
          <Disc size={60} />
        </motion.div>
        <MusicElement Icon={Headphones} delay={1.5} className="bottom-[25%] right-[15%] text-red-500/10" size={90} />
        
        {/* Sound Waves / Abstract Lines */}
        <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-around px-20 gap-2 opacity-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: ['10%', '60%', '20%', '80%', '10%'] }}
              transition={{ 
                duration: 1 + Math.random() * 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: i * 0.1
              }}
              className="w-1 bg-red-600 rounded-full"
            />
          ))}
        </div>
        <MusicElement Icon={Music} delay={2.5} className="top-[60%] left-[15%] text-zinc-600/20" size={40} />
        <MusicElement Icon={Guitar} delay={3} className="bottom-[40%] left-[30%] rotate-45 text-red-700/10" size={150} />
        
        {/* Floating notes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, -40, 0],
              x: [0, Math.sin(i) * 20, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.8
            }}
            className="absolute text-red-500/20"
            style={{ 
              left: `${15 + i * 15}%`, 
              top: `${20 + (i % 3) * 20}%`
            }}
          >
            <Music size={24 + i * 4} />
          </motion.div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-12">
          <Link to="/udaan" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium mb-4 md:mb-8 text-sm md:text-base">
            <ArrowLeft size={16} /> Back to Udaan 2.0
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
            <div className="space-y-2 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative">
                  <Flame className="text-red-600 w-6 h-6 md:w-12 md:h-12 fill-red-600 animate-pulse" />
                  <motion.div 
                    animate={{ 
                      y: [-5, -25], 
                      opacity: [0.5, 0],
                      scale: [1, 2]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 text-white/30"
                  >
                    <Wind size={14} />
                  </motion.div>
                </div>
                <h1 className="text-3xl md:text-7xl font-black italic tracking-tighter text-white flex items-center gap-2">
                  Demanding <span className="text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Chillies</span>
                  <Music className="text-white/20 w-8 h-8 md:w-16 md:h-16 -rotate-12" />
                </h1>
              </div>
              <p className="text-zinc-400 text-sm md:text-xl max-w-2xl font-medium leading-tight">
                Curated trends and high-demand tracks <span className="text-white">set to a jazz vibe.</span>
              </p>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="relative flex items-center gap-2 md:gap-8 mt-8 md:mt-12 w-fit">
            {[
              { id: 'audio', label: 'Audio', Icon: Music },
              { id: 'video', label: 'Video', Icon: Video },
              { id: 'photo', label: 'Photography', Icon: Camera },
              { id: 'vibe', label: 'Vibe Check AI', Icon: Sparkles }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={cn(
                  "relative group flex items-center gap-2 px-4 py-2 md:py-3 z-10 transition-colors duration-300",
                  activeSection === section.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <section.Icon size={14} className={cn("hidden md:block transition-transform duration-300", activeSection === section.id ? "scale-110" : "group-hover:scale-110")} />
                <span className="font-black uppercase text-[10px] md:text-xs tracking-[0.2em]">{section.label}</span>
                {activeSection === section.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-red-600 rounded-xl md:rounded-2xl -z-10 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Local Filter Bar Component */}
        {(() => {
          const FilterBar = ({ styles, activeStyle, setActiveStyle }: { styles: string[], activeStyle: string, setActiveStyle: (s: string) => void }) => {
            if (styles.length <= 1) return null;
            return (
              <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                {styles.map(style => (
                  <button
                    key={style}
                    onClick={() => setActiveStyle(style)}
                    className="relative group px-3 py-1 md:px-4 md:py-1.5 transition-colors duration-300"
                  >
                    <span className={cn(
                      "relative z-10 text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                      activeStyle === style ? "text-black" : "text-zinc-500 group-hover:text-zinc-300"
                    )}>
                      {style}
                    </span>
                    {activeStyle === style && (
                      <motion.div
                        layoutId={`filter-${activeSection}`}
                        className="absolute inset-0 bg-white rounded-full -z-0 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            );
          };

          return (
            <div className="space-y-12 md:space-y-20 mt-12 md:mt-16">
              {activeSection !== 'vibe' && (
                <div className="relative max-w-md w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeSection === 'audio' ? 'songs' : activeSection === 'video' ? 'videos' : 'photos'} by title, style, or description...`}
                    className="w-full bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-650/45 focus:ring-1 focus:ring-red-650/30 transition-all font-medium shadow-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeSection === 'audio' && (
                  <motion.section
                    key="audio-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 md:space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <Music className="text-red-600" size={24} />
                        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Demanding Songs</h2>
                      </div>
                      <FilterBar styles={audioStyles} activeStyle={audioStyle} setActiveStyle={setAudioStyle} />
                    </div>
                    
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl shadow-black">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-white/5 text-zinc-400">
                              <th className="px-3 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs">№</th>
                              <th className="px-4 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs">Title</th>
                              <th className="hidden md:table-cell px-8 py-5 font-black uppercase tracking-widest text-xs">Style</th>
                              <th className="px-4 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs text-right">Preview</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                                {songs.length > 0 ? (
                                  songs.map((song, idx) => (
                                    <React.Fragment key={song.id}>
                                      <tr className={cn(
                                        "hover:bg-red-600/5 transition-colors group",
                                        activeItemId === song.id && "bg-red-600/5"
                                      )}>
                                        <td className="px-3 md:px-8 py-4 md:py-6 font-bold text-zinc-600 text-xs md:text-base">#{idx + 1}</td>
                                        <td className="px-4 md:px-8 py-4 md:py-6">
                                          <div className="font-black text-sm md:text-lg text-white line-clamp-1">{song.title}</div>
                                          <div className="text-[10px] md:text-sm text-zinc-400 mt-0.5 line-clamp-1 italic">{song.description}</div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-6">
                                          <span className="px-3 py-1 bg-red-600/10 rounded-full text-[10px] font-black uppercase text-red-500 border border-red-500/20">
                                            {song.category || 'Trending'}
                                          </span>
                                        </td>
                                        <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                                          <div className="flex items-center justify-end gap-3">
                                            <button 
                                              onClick={() => setActiveItemId(activeItemId === song.id ? null : song.id)}
                                              className={cn(
                                                "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg",
                                                activeItemId === song.id 
                                                  ? "bg-white text-red-600" 
                                                  : "bg-red-600 text-white shadow-red-900/20"
                                              )}
                                            >
                                              {activeItemId === song.id ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {activeItemId === song.id && (
                                        <tr>
                                          <td colSpan={4} className="px-4 md:px-8 py-4 bg-red-600/5 border-b border-red-600/10">
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              className="py-4 overflow-hidden"
                                            >
                                          <div className="px-0 md:px-4">
                                            {isYoutube(song.link) ? (
                                              <div className="relative aspect-video w-full max-w-xl mx-auto rounded-xl overflow-hidden bg-black border border-white/10 shadow-lg">
                                                <iframe
                                                  src={getEmbedUrl(song.link)}
                                                  className="w-full h-full border-0"
                                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                  allowFullScreen
                                                />
                                              </div>
                                            ) : (
                                              <audio 
                                                key={song.id}
                                                src={getDirectUrl(song.link)}
                                                controls 
                                                autoPlay 
                                                className="w-full h-10 md:h-14"
                                              >
                                                Your browser does not support the audio element.
                                              </audio>
                                            )}
                                          </div>
                                            </motion.div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 md:py-12 text-center text-zinc-500 font-medium italic text-xs md:text-base">
                                  No tracks match this style.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.section>
                )}

                {activeSection === 'video' && (
                  <motion.section
                    key="video-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 md:space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <Video className="text-red-500" size={24} />
                        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Videography</h2>
                      </div>
                      <FilterBar styles={videoStyles} activeStyle={videoStyle} setActiveStyle={setVideoStyle} />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-1 md:px-0">
                      {videography.length > 0 ? (
                        videography.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            className="group bg-zinc-900/50 backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col"
                          >
                            <div className="relative aspect-video overflow-hidden bg-black">
                              {activeItemId === item.id ? (
                                isYoutube(item.link) ? (
                                  <iframe
                                    src={getEmbedUrl(item.link)}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video controls autoPlay className="w-full h-full">
                                    <source src={item.link} />
                                  </video>
                                )
                              ) : (
                                <>
                                  {getThumbnailUrl(item.link) ? (
                                    <img 
                                      src={getThumbnailUrl(item.link)} 
                                      alt={item.title} 
                                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                      <Video className="text-white/20 w-6 h-6 md:w-10 md:h-10" />
                                    </div>
                                  )}
                                  <button 
                                    onClick={() => setActiveItemId(item.id)}
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <div className="w-8 h-8 md:w-12 md:h-12 bg-red-600 rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                                      <Play size={16} className="md:w-6 md:h-6" fill="currentColor" />
                                    </div>
                                  </button>
                                </>
                              )}
                              {activeItemId === item.id && (
                                <button 
                                  onClick={() => setActiveItemId(null)}
                                  className="absolute top-1 right-1 md:top-2 md:right-2 p-1.5 md:p-2 bg-black/50 hover:bg-black text-white rounded-full z-10"
                                >
                                  <X size={12} className="md:w-4 md:h-4" />
                                </button>
                              )}
                            </div>
                            <div className="p-3 md:p-6 flex-grow">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1 md:mb-2">
                                <h3 className="font-bold text-white text-[10px] md:text-lg line-clamp-1">{item.title}</h3>
                                {item.category && (
                                  <span className="px-1.5 py-0.5 bg-red-600/10 rounded-full text-[7px] md:text-[10px] font-black uppercase text-red-500 border border-red-500/20 w-fit">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] md:text-xs text-zinc-400 line-clamp-2 italic leading-tight">
                                {item.description}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center text-zinc-500 italic bg-zinc-900/30 rounded-2xl border border-white/5">
                          No videos match this style.
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {activeSection === 'photo' && (
                  <motion.section
                    key="photo-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 md:space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <Camera className="text-red-500" size={24} />
                        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Photography</h2>
                      </div>
                      <FilterBar styles={photoStyles} activeStyle={photoStyle} setActiveStyle={setPhotoStyle} />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-1 md:px-0">
                      {photography.length > 0 ? (
                        photography.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            className="group bg-zinc-900/50 backdrop-blur-xl rounded-xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col cursor-pointer"
                            onClick={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-black">
                              <img 
                                src={getDirectUrl(item.link)} 
                                alt={item.title} 
                                className={cn(
                                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                                  activeItemId === item.id ? "object-contain" : "object-cover"
                                )}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-black">
                                  {activeItemId === item.id ? <Pause size={14} className="md:w-5 md:h-5" /> : <Eye size={14} className="md:w-5 md:h-5" />}
                                </div>
                              </div>
                            </div>
                            <div className="p-3 md:p-6 bg-zinc-900/40 flex-grow">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1 md:mb-2">
                                <h3 className="font-bold text-white text-[10px] md:text-lg line-clamp-1">{item.title}</h3>
                                {item.category && (
                                  <span className="px-1.5 py-0.5 bg-red-600/10 rounded-full text-[7px] md:text-[10px] font-black uppercase text-red-500 border border-red-500/20 w-fit">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] md:text-xs text-zinc-400 line-clamp-2 italic leading-tight">
                                {item.description}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center text-zinc-500 italic bg-zinc-900/30 rounded-2xl border border-white/5">
                          No images match this style.
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {activeSection === 'vibe' && (
                  <motion.section
                    key="vibe-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                      <Sparkles className="text-red-500 animate-pulse" size={24} />
                      <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white">Vibe Check Mood Analytics</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Left: Input Mood Form */}
                      <div className="lg:col-span-5 space-y-6">
                        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold">
                            <Smile size={18} className="text-red-500" />
                            <span>How is your vibe right now?</span>
                          </div>
                          
                          <form onSubmit={handleVibeCheck} className="space-y-4">
                            <textarea
                              value={moodInput}
                              onChange={(e) => setMoodInput(e.target.value)}
                              placeholder="e.g. Tired after study sessions, need a slow blues lofi to decompress..."
                              className="w-full h-32 bg-black/40 text-white rounded-2xl p-4 border border-white/10 focus:border-red-600 focus:outline-none transition-all text-sm leading-relaxed resize-none font-medium"
                              disabled={analyzing}
                            />
                            
                            {vibeError && (
                              <p className="text-red-400 text-xs italic">{vibeError}</p>
                            )}

                            <button
                              type="submit"
                              disabled={analyzing || !moodInput.trim()}
                              className={cn(
                                "w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
                                analyzing || !moodInput.trim()
                                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-500 text-white shadow-red-950/20 active:scale-95"
                              )}
                            >
                              {analyzing ? (
                                <>
                                  <RefreshCw size={14} className="animate-spin" />
                                  <span>Analyzing frequency...</span>
                                </>
                              ) : (
                                <>
                                  <Send size={14} />
                                  <span>Check frequency</span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Quick Mood preset boosters */}
                        <div className="space-y-3">
                          <h4 className="text-zinc-500 text-xs font-black uppercase tracking-wider">Quick Mood Boosters</h4>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { text: "Stressed after non-stop lectures, need slow cozy jazz string harmony to study and relax", label: "📚 Study Flow", color: "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40" },
                              { text: "Super excited and hyper! Getting ready for the Udaan 2.0 fest tonight with my team, need energizing brass!", label: "🔥 Festival Hype", color: "border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40" },
                              { text: "Feeling high-focus and coding in the campus zone. Give me rich binaural synth elements.", label: "💻 Deep Coding", color: "border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/40" },
                              { text: "Melancholic quiet evening, looking for classic keyboards and peaceful lounge melodies", label: "🌙 Peaceful Healing", color: "border-teal-500/20 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/40" }
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                disabled={analyzing}
                                onClick={() => {
                                  setMoodInput(preset.text);
                                  handleVibeCheck(undefined, preset.text);
                                }}
                                className={cn(
                                  "border px-3 py-1.5 rounded-full text-[10px] font-bold transition-all text-left truncate max-w-full cursor-pointer",
                                  preset.color
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Past Mood log history in browser */}
                        {vibeHistory.length > 0 && (
                          <div className="space-y-3 bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
                            <h4 className="text-zinc-500 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                              <History size={12} />
                              <span>Your Mood log history</span>
                            </h4>
                            <div className="divide-y divide-white/5 max-h-48 overflow-y-auto pr-1">
                              {vibeHistory.map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setVibeResult(item);
                                    setMoodInput(item.moodText);
                                  }}
                                  className="w-full text-left py-2 hover:bg-white/5 px-2 rounded-lg transition-all flex items-center justify-between text-xs group cursor-pointer"
                                >
                                  <div className="truncate max-w-[70%]">
                                    <span className="font-bold text-white block truncate">{item.moodText}</span>
                                    <span className="text-[10px] text-zinc-500">{item.date} • {item.detectedMood}</span>
                                  </div>
                                  <span className="text-zinc-600 group-hover:text-red-500 font-bold transition-all text-[10px] uppercase">Restore</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Results panel */}
                      <div className="lg:col-span-7">
                        {analyzing ? (
                          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-12 text-center h-[420px] flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
                              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" size={20} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-black text-xl text-white uppercase tracking-wider">AI DJ is thinking</h3>
                              <p className="text-sm font-medium text-red-500 animate-pulse">{synthesizerStep}</p>
                            </div>
                            <div className="flex gap-1.5 h-6 items-end justify-center w-36">
                              {[...Array(6)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  animate={{ height: ['20%', '100%', '20%'] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                                  className="w-1.5 bg-red-600 rounded-full"
                                />
                              ))}
                            </div>
                          </div>
                        ) : vibeResult ? (
                          <div className="space-y-6">
                            {/* Mood Analytics badge and summary */}
                            <div className={cn("rounded-3xl border p-6 transition-all shadow-xl space-y-4", vibeResult.colorPalette?.primary || "bg-slate-950", vibeResult.colorPalette?.border || "border-zinc-800")}>
                              <div className="flex items-center justify-between">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase text-white/90 tracking-widest border border-white/10">
                                  Mood Frequency: {vibeResult.detectedMood}
                                </span>
                                <span className="text-zinc-400 font-black text-xs uppercase tracking-widest flex items-center gap-1">
                                  <BarChart3 size={12} />
                                  Mood Analytics
                                </span>
                              </div>
                              <p className="text-sm md:text-base text-zinc-200 italic font-medium leading-relaxed">
                                "{vibeResult.moodSummary}"
                              </p>

                              {/* Progress metrics bars */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-white/10">
                                {[
                                  { label: 'Happiness', val: vibeResult.scores?.happiness, col: 'bg-amber-500' },
                                  { label: 'Energy', val: vibeResult.scores?.energy, col: 'bg-red-500' },
                                  { label: 'Focus', val: vibeResult.scores?.focus, col: 'bg-indigo-500' },
                                  { label: 'Calm', val: vibeResult.scores?.calm, col: 'bg-teal-500' }
                                ].map((score) => (
                                  <div key={score.label} className="bg-black/20 p-3 rounded-2xl border border-white/5">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-zinc-400">
                                      <span>{score.label}</span>
                                      <span className="text-white">{score.val}%</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-805 rounded-full mt-1.5 overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${score.val || 50}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className={cn("h-full rounded-full", score.col)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Audio Visualizer section */}
                            {activeVibeSong && (
                              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-4 md:p-6 space-y-4 shadow-xl">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">
                                      {isDirectAudioLink(activeVibeSong.link) ? "High-Demand Audio Channel" : isYoutube(activeVibeSong.link) ? "High-Demand Video Deck" : "Active Modulation Channel"}
                                    </span>
                                    <h3 className="font-black text-sm md:text-lg text-white">{activeVibeSong.title}</h3>
                                    <p className="text-xs text-zinc-400">by {activeVibeSong.artist} • {activeVibeSong.bpm} BPM • {activeVibeSong.vibeStyle}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => setProceduralAudioPlaying(!proceduralAudioPlaying)}
                                      className="w-12 h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                                    >
                                      {proceduralAudioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                    </button>
                                  </div>
                                </div>

                                <RealtimeWaveCanvas frequencyType={activeVibeSong.audioFrequency || "ambientMelody"} isPlaying={proceduralAudioPlaying} />

                                {isDirectAudioLink(activeVibeSong.link) && (
                                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5">
                                    <audio 
                                      ref={vibeAudioRef}
                                      src={getDirectUrl(activeVibeSong.link)}
                                      controls
                                      className="w-full h-10"
                                      onPlay={() => setProceduralAudioPlaying(true)}
                                      onPause={() => setProceduralAudioPlaying(false)}
                                    />
                                  </div>
                                )}

                                {isYoutube(activeVibeSong.link) && (
                                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 space-y-2">
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
                                      {proceduralAudioPlaying ? (
                                        <iframe
                                          src={getEmbedUrl(activeVibeSong.link)}
                                          className="w-full h-full border-0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 group">
                                          {getThumbnailUrl(activeVibeSong.link) ? (
                                            <img 
                                              src={getThumbnailUrl(activeVibeSong.link)} 
                                              alt={activeVibeSong.title} 
                                              className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity duration-300"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : null}
                                          <button 
                                            onClick={() => setProceduralAudioPlaying(true)}
                                            className="relative z-10 w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-xl shadow-black/50 cursor-pointer"
                                          >
                                            <Play size={22} fill="currentColor" className="ml-1" />
                                          </button>
                                          <span className="relative z-10 text-xs font-black uppercase tracking-widest text-zinc-400 mt-3 group-hover:text-white transition-colors duration-300">
                                            Stream Video Deck
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                  <span>
                                    {isDirectAudioLink(activeVibeSong.link) 
                                      ? "Streaming High-Demand MP3 Deck" 
                                      : isYoutube(activeVibeSong.link)
                                      ? "Streaming YouTube Player Deck"
                                      : "Waveform Procedural Synthesizer Active"}
                                  </span>
                                  {activeVibeSong.link && (
                                    <a
                                      href={activeVibeSong.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-red-400 hover:text-white transition-colors inline-flex items-center gap-1 font-bold"
                                    >
                                      External Link <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Smart Playlist tracks stack */}
                            <div className="space-y-3">
                              <h3 className="text-zinc-400 font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                                <Radio size={14} className="text-red-500" />
                                <span>AI Vibe Smart Playlist suggestions</span>
                              </h3>

                              <div className="space-y-2">
                                {vibeResult.playlist?.map((track: any, index: number) => {
                                  const isActive = activeVibeSong?.title === track.title;
                                  return (
                                    <div
                                      key={index}
                                      onClick={() => {
                                        setActiveVibeSong(track);
                                        setProceduralAudioPlaying(true);
                                      }}
                                      className={cn(
                                        "group bg-zinc-900/40 hover:bg-zinc-900/80 border rounded-2xl p-4 transition-all duration-300 flex items-start gap-4 cursor-pointer",
                                        isActive ? "border-red-600/50 bg-zinc-900/80 shadow-lg shadow-red-950/20" : "border-white/5 hover:border-white/10"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black tracking-tighter shrink-0 transition-colors",
                                        isActive ? "bg-red-600 text-white" : "bg-white/5 text-zinc-400 group-hover:bg-red-600/10 group-hover:text-red-500"
                                      )}>
                                        {isActive && proceduralAudioPlaying ? (
                                          <div className="flex items-end gap-0.5 h-3">
                                            <div className="w-0.5 h-full bg-current animate-pulse" />
                                            <div className="w-0.5 h-1/2 bg-current animate-pulse delay-75" />
                                            <div className="w-0.5 h-3/4 bg-current animate-pulse delay-150" />
                                          </div>
                                        ) : (
                                          <span>#{index + 1}</span>
                                        )}
                                      </div>

                                      <div className="flex-grow space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{track.title}</div>
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-white/5 text-zinc-400 rounded-full text-[9px] font-bold">
                                              {track.bpm} BPM
                                            </span>
                                            <span className="px-2 py-0.5 bg-red-600/10 text-red-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                              {track.vibeStyle || track.category}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-xs text-zinc-400 italic">by {track.artist}</div>
                                        <p className="text-xs text-zinc-500 line-clamp-2 italic leading-relaxed pt-1">
                                          "{track.vibeReason}"
                                        </p>

                                        {/* Action buttons (Add to list & external play) */}
                                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 mt-2 border-t border-white/5">
                                          <button
                                            onClick={(e) => handleAddToList(e, track, 'song')}
                                            className={cn(
                                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer",
                                              addedItems[`${track.title}-song`]
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : addingTrackKey === `${track.title}-song`
                                                ? "bg-zinc-800 text-zinc-500 border border-white/5 cursor-wait"
                                                : "bg-zinc-950 hover:bg-red-600/10 text-zinc-300 hover:text-red-500 border border-white/5 hover:border-red-500/30"
                                            )}
                                            disabled={addedItems[`${track.title}-song`] || addingTrackKey === `${track.title}-song`}
                                          >
                                            {addedItems[`${track.title}-song`] ? (
                                              <>
                                                <Check size={10} />
                                                <span>Added to Audio</span>
                                              </>
                                            ) : (
                                              <>
                                                <Plus size={10} />
                                                <span>Add to Audio</span>
                                              </>
                                            )}
                                          </button>

                                          <button
                                            onClick={(e) => handleAddToList(e, track, 'videography')}
                                            className={cn(
                                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer",
                                              addedItems[`${track.title}-videography`]
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : addingTrackKey === `${track.title}-videography`
                                                ? "bg-zinc-800 text-zinc-500 border border-white/5 cursor-wait"
                                                : "bg-zinc-950 hover:bg-red-600/10 text-zinc-300 hover:text-red-500 border border-white/5 hover:border-red-500/30"
                                            )}
                                            disabled={addedItems[`${track.title}-videography`] || addingTrackKey === `${track.title}-videography`}
                                          >
                                            {addedItems[`${track.title}-videography`] ? (
                                              <>
                                                <Check size={10} />
                                                <span>Added to Video</span>
                                              </>
                                            ) : (
                                              <>
                                                <Plus size={10} />
                                                <span>Add to Video</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-900/20 border border-white/5 border-dashed rounded-3xl p-12 text-center h-[420px] flex flex-col items-center justify-center space-y-4">
                            <Sparkles className="text-zinc-650 animate-pulse" size={48} />
                            <div className="max-w-sm space-y-2">
                              <h3 className="font-bold text-lg text-white">Your Personal Sound Frequency</h3>
                              <p className="text-sm text-zinc-500 leading-relaxed">
                                Enter your current state of mind on the left or tap one of our quick boosters presets to run an instant Vibe Check.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Interactive procedurally rendered glowing Soundwave Canvas Visualizer block
function RealtimeWaveCanvas({ frequencyType, isPlaying }: { frequencyType: string; isPlaying: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 96;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isPlaying) {
        // Draw flat line with subtle wave
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      phase += 0.05;

      const wavesCount = frequencyType === 'ambientMelody' || frequencyType === 'chillHarmonics' ? 2 : 4;
      const waveColors = {
        synthWave: ['rgba(239, 68, 68, 0.8)', 'rgba(236, 72, 153, 0.5)', 'rgba(139, 92, 246, 0.3)'],
        ambientMelody: ['rgba(52, 211, 153, 0.7)', 'rgba(45, 212, 191, 0.4)'],
        subBass: ['rgba(219, 39, 119, 0.8)', 'rgba(124, 58, 237, 0.5)', 'rgba(79, 70, 229, 0.3)'],
        jazzyGuitar: ['rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.4)', 'rgba(244, 63, 94, 0.2)'],
        chillHarmonics: ['rgba(45, 212, 191, 0.6)', 'rgba(56, 189, 248, 0.4)']
      };

      const selectedColors = waveColors[frequencyType as keyof typeof waveColors] || ['rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.2)'];

      for (let w = 0; w < wavesCount; w++) {
        ctx.beginPath();
        ctx.strokeStyle = selectedColors[w % selectedColors.length];
        ctx.lineWidth = w === 0 ? 2 : 1;

        const amplitudes = {
          synthWave: 25,
          ambientMelody: 15,
          subBass: 35,
          jazzyGuitar: 20,
          chillHarmonics: 18
        };
        const amplitudeFactor = amplitudes[frequencyType as keyof typeof amplitudes] || 20;

        const frequencies = {
          synthWave: 0.02,
          ambientMelody: 0.01,
          subBass: 0.005,
          jazzyGuitar: 0.03,
          chillHarmonics: 0.015
        };
        const frequencyFactor = frequencies[frequencyType as keyof typeof frequencies] || 0.02;

        for (let x = 0; x < canvas.width; x++) {
          const yOffset = Math.sin(x * frequencyFactor + phase + w * 1.5) * 
                          Math.cos(x * 0.003 + phase * 0.5) * 
                          amplitudeFactor;
          const y = canvas.height / 2 + yOffset;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [frequencyType, isPlaying]);

  return (
    <div className="w-full h-24 bg-black/40 rounded-xl relative overflow-hidden border border-white/5 flex flex-col justify-end p-2">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <span className="relative font-mono text-[9px] uppercase text-zinc-500 tracking-wider flex items-center gap-1">
        <Radio size={10} className={isPlaying ? 'text-red-500 animate-pulse' : ''} />
        {isPlaying ? `Modulation Level: ${frequencyType}` : 'Ready to stream'}
      </span>
    </div>
  );
}
