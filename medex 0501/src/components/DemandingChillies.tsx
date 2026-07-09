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
  const [listAudioPlaying, setListAudioPlaying] = useState(false);
  const [synthesizerStep, setSynthesizerStep] = useState<string>('');
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [addingTrackKey, setAddingTrackKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playMode, setPlayMode] = useState<'video' | 'audio'>('video');

  // YouTube player refs for synchronization
  const ytPlayerRef = React.useRef<any>(null);
  const listYtPlayerRef = React.useRef<any>(null);

  // Web Audio sync references are handled directly through direct element/context connections

  // Load YouTube Iframe API once
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    setSearchQuery('');
  }, [activeSection]);

  // Sync and prevent multiple audio playbacks simultaneously
  useEffect(() => {
    if (proceduralAudioPlaying && activeVibeSong) {
      setActiveItemId(null);
    }
  }, [proceduralAudioPlaying, activeVibeSong]);

  useEffect(() => {
    if (activeItemId !== null) {
      setProceduralAudioPlaying(false);
    }
  }, [activeItemId]);

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
  const mediaContextRef = React.useRef<AudioContext | null>(null);
  const listMediaContextRef = React.useRef<AudioContext | null>(null);
  const synthAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const synthNodesRef = React.useRef<any[]>([]);

  // Web Audio Analyser references
  const audioSourceRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  const setupAudioAnalyser = () => {
    if (!vibeAudioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!mediaContextRef.current) {
        mediaContextRef.current = new AudioCtx();
      }
      const ctx = mediaContextRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!audioSourceRef.current) {
        audioSourceRef.current = ctx.createMediaElementSource(vibeAudioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        audioSourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
        setActiveAnalyser(analyser);
      }
    } catch (err) {
      console.warn('Web Audio API analyser setup failed:', err);
    }
  };

  // Web Audio Analyser references for list tracks
  const listAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const listAudioSourceRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const [listAnalyser, setListAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (listMediaContextRef.current) {
      try {
        listMediaContextRef.current.close();
      } catch {}
      listMediaContextRef.current = null;
    }
    listAudioSourceRef.current = null;
    setListAnalyser(null);
    setListAudioPlaying(false);
  }, [activeItemId]);

  const setupListAudioAnalyser = () => {
    if (!listAudioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!listMediaContextRef.current) {
        listMediaContextRef.current = new AudioCtx();
      }
      const ctx = listMediaContextRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!listAudioSourceRef.current) {
        listAudioSourceRef.current = ctx.createMediaElementSource(listAudioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        listAudioSourceRef.current.connect(analyser);
        analyser.connect(ctx.destination);
        setListAnalyser(analyser);
      }
    } catch (err) {
      console.warn('Web Audio API list analyser setup failed:', err);
    }
  };

  // Reset players on song transitions
  useEffect(() => {
    ytPlayerRef.current = null;
  }, [activeVibeSong]);

  useEffect(() => {
    listYtPlayerRef.current = null;
  }, [activeItemId]);

  const initYTPlayer = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    
    const checkAPI = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        try {
          ytPlayerRef.current = new (window as any).YT.Player(iframe, {
            events: {
              onStateChange: (event: any) => {
                const state = event.data;
                // 1 = playing, 2 = paused, 0 = ended
                if (state === 1) {
                  setProceduralAudioPlaying(true);
                } else if (state === 2 || state === 0) {
                  setProceduralAudioPlaying(false);
                }
              }
            }
          });
        } catch (e) {
          console.warn('YT Player initialization failed:', e);
        }
      } else {
        setTimeout(checkAPI, 100);
      }
    };
    checkAPI();
  };

  const initListYTPlayer = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    
    const checkAPI = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        try {
          listYtPlayerRef.current = new (window as any).YT.Player(iframe, {
            events: {
              onStateChange: (event: any) => {
                const state = event.data;
                setListAudioPlaying(state === 1 || state === 3);
              }
            }
          });
        } catch (e) {
          console.warn('List YT Player initialization failed:', e);
        }
      } else {
        setTimeout(checkAPI, 100);
      }
    };
    checkAPI();
  };

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

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      synthAnalyserRef.current = analyser;

      filter.connect(dynamicsCompressor);
      dynamicsCompressor.connect(analyser);
      analyser.connect(ctx.destination);
      setActiveAnalyser(analyser);

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

    setActiveAnalyser(prev => (prev === synthAnalyserRef.current ? null : prev));
    synthAnalyserRef.current = null;
  };

  // Sync Audios state (both native and synthesised)
  useEffect(() => {
    if (proceduralAudioPlaying && activeVibeSong) {
      const isDirect = isDirectAudioLink(activeVibeSong.link);
      const isYT = activeVibeSong.link && (activeVibeSong.link.includes('youtube.com') || activeVibeSong.link.includes('youtu.be'));
      
      if (isDirect) {
        stopSynth();
        if (vibeAudioRef.current) {
          vibeAudioRef.current.play().catch(err => {
            console.warn('Audio play restricted until user action:', err);
          });
        }
      } else if (isYT) {
        // Stop synthesizer completely when streaming YouTube songs
        stopSynth();
        if (vibeAudioRef.current) {
          vibeAudioRef.current.pause();
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

  const songs = (audioStyle === 'All' || searchQuery.trim() !== '') ? filteredAllSongs : filteredAllSongs.filter(item => (item.category || 'Trending') === audioStyle);
  const videography = (videoStyle === 'All' || searchQuery.trim() !== '') ? filteredAllVideos : filteredAllVideos.filter(item => (item.category || 'Trending') === videoStyle);
  const photography = (photoStyle === 'All' || searchQuery.trim() !== '') ? filteredAllPhotos : filteredAllPhotos.filter(item => (item.category || 'Trending') === photoStyle);

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
    <div className="min-h-screen bg-zinc-950 pt-16 md:pt-32 pb-8 md:pb-24 relative overflow-hidden">
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

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
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
                <h1 className="text-[2rem] leading-none sm:text-4xl md:text-7xl font-black italic tracking-tighter text-white flex items-center gap-2 min-w-0">
                  Demanding <span className="text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Chillies</span>
                  <Music className="hidden sm:block text-white/20 w-8 h-8 md:w-16 md:h-16 -rotate-12 shrink-0" />
                </h1>
              </div>
              <p className="text-zinc-400 text-sm md:text-xl max-w-2xl font-medium leading-tight">
                Curated trends and high-demand tracks <span className="text-white">set to a jazz vibe.</span>
              </p>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="-mx-3 sm:mx-0 mt-6 md:mt-12 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative flex items-center gap-2 md:gap-8 w-max min-w-full sm:min-w-0 px-3 sm:px-0">
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
                  "relative group flex items-center justify-center gap-2 px-3.5 py-2.5 md:px-4 md:py-3 z-10 transition-colors duration-300 shrink-0",
                  activeSection === section.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <section.Icon size={14} className={cn("hidden md:block transition-transform duration-300", activeSection === section.id ? "scale-110" : "group-hover:scale-110")} />
                <span className="font-black uppercase text-[10px] md:text-xs tracking-[0.12em] md:tracking-[0.2em] whitespace-nowrap">{section.label}</span>
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
        </div>

        {/* Local Filter Bar Component */}
        {(() => {
          const FilterBar = ({ styles, activeStyle, setActiveStyle }: { styles: string[], activeStyle: string, setActiveStyle: (s: string) => void }) => {
            if (styles.length <= 1) return null;
            return (
              <div className="-mx-1 flex gap-2 mb-4 md:mb-6 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
                {styles.map(style => (
                  <button
                    key={style}
                    onClick={() => setActiveStyle(style)}
                    className="relative group px-3 py-1.5 md:px-4 md:py-1.5 transition-colors duration-300 shrink-0"
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
            <div className="space-y-8 md:space-y-20 mt-8 md:mt-16">
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
                      <div className="overflow-hidden">
                        <table className="block md:table w-full text-left">
                          <thead className="hidden md:table-header-group">
                            <tr className="bg-white/5 text-zinc-400">
                              <th className="px-3 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs">#</th>
                              <th className="px-4 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs">Title</th>
                              <th className="hidden md:table-cell px-8 py-5 font-black uppercase tracking-widest text-xs">Style</th>
                              <th className="px-4 md:px-8 py-3 md:py-5 font-black uppercase tracking-widest text-[10px] md:text-xs text-right">Preview</th>
                            </tr>
                          </thead>
                          <tbody className="block md:table-row-group p-2 md:p-0 space-y-2 md:space-y-0 md:divide-y md:divide-white/5">
                                {songs.length > 0 ? (
                                  songs.map((song, idx) => (
                                    <React.Fragment key={song.id}>
                                      <tr className={cn(
                                        "block md:table-row rounded-2xl md:rounded-none border md:border-0 border-white/5 hover:bg-red-600/5 transition-colors group overflow-hidden",
                                        activeItemId === song.id ? "bg-red-600/10 md:bg-red-600/5 border-red-600/20" : "bg-black/20 md:bg-transparent"
                                      )}>
                                        <td className="hidden md:table-cell px-3 md:px-8 py-4 md:py-6 font-bold text-zinc-600 text-xs md:text-base">#{idx + 1}</td>
                                        <td className="block md:table-cell px-3 md:px-8 pt-3 pb-1 md:py-6">
                                          <div className="flex items-start gap-2 md:block">
                                            <span className="md:hidden mt-0.5 text-[10px] font-black text-red-500/70 shrink-0">#{idx + 1}</span>
                                            <div className="min-w-0">
                                              <div className="font-black text-sm md:text-lg text-white line-clamp-2 md:line-clamp-1 leading-snug">{song.title}</div>
                                              <div className="text-[10px] md:text-sm text-zinc-400 mt-1 line-clamp-2 md:line-clamp-1 italic leading-snug">{song.description}</div>
                                              <span className="md:hidden inline-flex mt-2 px-2 py-0.5 bg-red-600/10 rounded-full text-[8px] font-black uppercase text-red-500 border border-red-500/20 max-w-full truncate">
                                                {song.category || 'Trending'}
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="hidden md:table-cell px-8 py-6">
                                          <span className="px-3 py-1 bg-red-600/10 rounded-full text-[10px] font-black uppercase text-red-500 border border-red-500/20">
                                            {song.category || 'Trending'}
                                          </span>
                                        </td>
                                        <td className="block md:table-cell px-3 md:px-8 pt-1 pb-3 md:py-6 text-right">
                                          <div className="flex items-center justify-end gap-3">
                                            <button 
                                              onClick={() => setActiveItemId(activeItemId === song.id ? null : song.id)}
                                              className={cn(
                                                "w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg",
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
                                          <td colSpan={4} className="block md:table-cell px-2 md:px-8 py-3 md:py-4 bg-red-600/5 border-b border-red-600/10 rounded-2xl md:rounded-none">
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              className="py-2 md:py-4 overflow-hidden"
                                            >
                                          <div className="px-0 md:px-4 space-y-4">
                                            {isYoutube(song.link) ? (
                                              <div className="space-y-4">
                                                <RealtimeWaveCanvas 
                                                  frequencyType="synthWave" 
                                                  isPlaying={listAudioPlaying} 
                                                  bpm={90} 
                                                  analyser={null}
                                                  ytPlayerRef={listYtPlayerRef}
                                                  syncSource="youtube"
                                                />
                                                <div className="relative aspect-video w-full max-w-xl mx-auto rounded-xl overflow-hidden bg-black border border-white/10 shadow-lg">
                                                  <iframe
                                                    ref={initListYTPlayer}
                                                    src={getEmbedUrl(song.link) + (song.link.includes('?') ? '&enablejsapi=1' : '?enablejsapi=1')}
                                                    className="w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                  />
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-4">
                                                <RealtimeWaveCanvas 
                                                  frequencyType="ambientMelody" 
                                                  isPlaying={listAudioPlaying} 
                                                  bpm={80} 
                                                  analyser={listAnalyser}
                                                  audioElementRef={listAudioRef}
                                                  syncSource="audio"
                                                />
                                                <audio 
                                                  ref={listAudioRef}
                                                  key={song.id}
                                                  src={getDirectUrl(song.link)}
                                                  controls 
                                                  crossOrigin="anonymous"
                                                  autoPlay 
                                                  onPlay={() => {
                                                    setupListAudioAnalyser();
                                                    setListAudioPlaying(true);
                                                  }}
                                                  onPause={() => setListAudioPlaying(false)}
                                                  className="w-full h-10 md:h-14"
                                                >
                                                  Your browser does not support the audio element.
                                                </audio>
                                              </div>
                                            )}
                                          </div>
                                            </motion.div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))
                            ) : (
                              <tr className="block md:table-row">
                                <td colSpan={4} className="block md:table-cell px-4 py-8 md:py-12 text-center text-zinc-500 font-medium italic text-xs md:text-base">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-0 md:px-0">
                      {videography.length > 0 ? (
                        videography.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            className="group bg-zinc-900/50 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col"
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
                            <div className="p-4 md:p-6 flex-grow">
                              <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                                <h3 className="font-bold text-white text-sm md:text-lg line-clamp-2 md:line-clamp-1 leading-snug">{item.title}</h3>
                                {item.category && (
                                  <span className="px-2 py-0.5 bg-red-600/10 rounded-full text-[8px] md:text-[10px] font-black uppercase text-red-500 border border-red-500/20 w-fit shrink-0">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs md:text-xs text-zinc-400 line-clamp-2 italic leading-snug">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-0 md:px-0">
                      {photography.length > 0 ? (
                        photography.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            className="group bg-zinc-900/50 backdrop-blur-xl rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col cursor-pointer"
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
                            <div className="p-4 md:p-6 bg-zinc-900/40 flex-grow">
                              <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                                <h3 className="font-bold text-white text-sm md:text-lg line-clamp-2 md:line-clamp-1 leading-snug">{item.title}</h3>
                                {item.category && (
                                  <span className="px-2 py-0.5 bg-red-600/10 rounded-full text-[8px] md:text-[10px] font-black uppercase text-red-500 border border-red-500/20 w-fit shrink-0">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs md:text-xs text-zinc-400 line-clamp-2 italic leading-snug">
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

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">
                      {/* Left: Input Mood Form */}
                      <div className="lg:col-span-5 space-y-4 md:space-y-6">
                        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl space-y-4">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold">
                            <Smile size={18} className="text-red-500" />
                            <span>How is your vibe right now?</span>
                          </div>
                          
                          <form onSubmit={handleVibeCheck} className="space-y-4">
                            <textarea
                              value={moodInput}
                              onChange={(e) => setMoodInput(e.target.value)}
                              placeholder="e.g. Tired after study sessions, need a slow blues lofi to decompress..."
                              className="w-full h-28 md:h-32 bg-black/40 text-white rounded-2xl p-4 border border-white/10 focus:border-red-600 focus:outline-none transition-all text-sm leading-relaxed resize-none font-medium"
                              disabled={analyzing}
                            />
                            
                            {vibeError && (
                              <p className="text-red-400 text-xs italic">{vibeError}</p>
                            )}

                            <button
                              type="submit"
                              disabled={analyzing || !moodInput.trim()}
                              className={cn(
                                "w-full py-3.5 md:py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer",
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
                              { text: "Stressed after non-stop lectures, need slow cozy jazz string harmony to study and relax", label: "Study Flow", color: "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40" },
                              { text: "Super excited and hyper! Getting ready for the Udaan 2.0 fest tonight with my team, need energizing brass!", label: "Festival Hype", color: "border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40" },
                              { text: "Feeling high-focus and coding in the campus zone. Give me rich binaural synth elements.", label: "Deep Coding", color: "border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/40" },
                              { text: "Melancholic quiet evening, looking for classic keyboards and peaceful lounge melodies", label: "Peaceful Healing", color: "border-teal-500/20 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/40" }
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
                            <div className="divide-y divide-white/5 max-h-40 md:max-h-48 overflow-y-auto pr-1">
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
                                    <span className="text-[10px] text-zinc-500">{item.date} - {item.detectedMood}</span>
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
                          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-12 text-center min-h-[280px] md:h-[420px] flex flex-col items-center justify-center space-y-4 md:space-y-6">
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
                            <div className={cn("rounded-2xl md:rounded-3xl border p-4 md:p-6 transition-all shadow-xl space-y-4", vibeResult.colorPalette?.primary || "bg-slate-950", vibeResult.colorPalette?.border || "border-zinc-800")}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-3 border-t border-white/10">
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
                              <div className="bg-zinc-900 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 space-y-4 shadow-xl">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">
                                      {isDirectAudioLink(activeVibeSong.link) ? "High-Demand Audio Channel" : isYoutube(activeVibeSong.link) ? "High-Demand Video Deck" : "Active Modulation Channel"}
                                    </span>
                                    <h3 className="font-black text-sm md:text-lg text-white line-clamp-2 leading-snug">{activeVibeSong.title}</h3>
                                    <p className="text-[11px] md:text-xs text-zinc-400 line-clamp-2">by {activeVibeSong.artist} â€¢ {activeVibeSong.bpm} BPM â€¢ {activeVibeSong.vibeStyle}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => setProceduralAudioPlaying(!proceduralAudioPlaying)}
                                        className="w-11 h-11 md:w-12 md:h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                                      >
                                        {proceduralAudioPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                      </button>
                                   </div>
                                 </div>

                                 <RealtimeWaveCanvas 
                                     frequencyType={activeVibeSong.audioFrequency || "ambientMelody"} 
                                     isPlaying={proceduralAudioPlaying} 
                                     bpm={activeVibeSong.bpm}
                                     analyser={activeAnalyser}
                                     ytPlayerRef={ytPlayerRef}
                                     audioElementRef={vibeAudioRef}
                                     syncSource={isYoutube(activeVibeSong.link) ? "youtube" : "audio"}
                                   />

                                  <div className={cn("bg-black/30 p-2.5 rounded-2xl border border-white/5", !isDirectAudioLink(activeVibeSong.link) && "hidden")}>
                                   <audio 
                                     ref={vibeAudioRef}
                                     src={isDirectAudioLink(activeVibeSong.link) ? getDirectUrl(activeVibeSong.link) : ""}
                                     controls
                                     crossOrigin="anonymous"
                                     className="w-full h-10"
                                     onPlay={() => {
                                       setupAudioAnalyser();
                                       setProceduralAudioPlaying(true);
                                     }}
                                     onPause={() => setProceduralAudioPlaying(false)}
                                   />
                                 </div>

                                {isYoutube(activeVibeSong.link) && (
                                  <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 space-y-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={() => setPlayMode('audio')}
                                        className={cn(
                                          "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border",
                                          playMode === 'audio'
                                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-650/20"
                                            : "border-white/10 text-zinc-500 hover:text-white"
                                        )}
                                      >
                                        Audio Mode
                                      </button>
                                      <button
                                        onClick={() => setPlayMode('video')}
                                        className={cn(
                                          "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border",
                                          playMode === 'video'
                                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-650/20"
                                            : "border-white/10 text-zinc-500 hover:text-white"
                                        )}
                                      >
                                        Video Mode
                                      </button>
                                    </div>

                                    {playMode === 'video' ? (
                                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner">
                                        {proceduralAudioPlaying ? (
                                          <iframe
                                            ref={initYTPlayer}
                                            src={getEmbedUrl(activeVibeSong.link) + (activeVibeSong.link.includes('?') ? '&enablejsapi=1' : '?enablejsapi=1')}
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
                                              onClick={() => {
                                                setProceduralAudioPlaying(true);
                                              }}
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
                                    ) : (
                                      <div className="relative h-36 md:h-44 w-full rounded-xl bg-gradient-to-br from-zinc-900 to-black/90 border border-white/10 shadow-inner flex flex-col items-center justify-center overflow-hidden">
                                        {proceduralAudioPlaying && (
                                          <div className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none">
                                            <iframe
                                              ref={initYTPlayer}
                                              src={getEmbedUrl(activeVibeSong.link) + (activeVibeSong.link.includes('?') ? '&enablejsapi=1' : '?enablejsapi=1')}
                                              className="w-full h-full border-0"
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                            />
                                          </div>
                                        )}
                                        
                                        <div className={cn(
                                          "w-20 h-20 rounded-full bg-zinc-950 border-[6px] border-zinc-800 shadow-2xl relative flex items-center justify-center",
                                          proceduralAudioPlaying ? "animate-spin [animation-duration:8s]" : ""
                                        )}>
                                          <div className="absolute inset-1.5 rounded-full border border-zinc-700/30" />
                                          <div className="absolute inset-3.5 rounded-full border border-zinc-700/30" />
                                          <div className="absolute inset-5.5 rounded-full border border-zinc-700/30" />
                                          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center border border-black/35 shadow-inner">
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-white/10" />
                                          </div>
                                        </div>

                                        {!proceduralAudioPlaying && (
                                          <button 
                                            onClick={() => setProceduralAudioPlaying(true)}
                                            className="absolute inset-0 m-auto w-11 h-11 md:w-12 md:h-12 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg cursor-pointer"
                                          >
                                            <Play size={20} fill="currentColor" className="ml-1" />
                                          </button>
                                        )}

                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-4 animate-pulse">
                                          {proceduralAudioPlaying ? "Playing Audio Channel..." : "Audio Mode Muted"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
                                  <span className="min-w-0">
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

// Interactive music-wave canvas visualizer block
function RealtimeWaveCanvas({ frequencyType, isPlaying, bpm, analyser, ytPlayerRef, audioElementRef, syncSource = 'audio' }: { frequencyType: string; isPlaying: boolean; bpm?: number; analyser?: AnalyserNode | null; ytPlayerRef?: React.RefObject<any>; audioElementRef?: React.RefObject<HTMLAudioElement | null>; syncSource?: 'audio' | 'youtube' }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const lastYtTimeRef = React.useRef<number>(0);
  const lastSyncNowRef = React.useRef<number>(0);
  const lastAudioTimeRef = React.useRef<number>(0);
  const lastAudioSyncNowRef = React.useRef<number>(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width || 300;
        canvas.height = height || 96;
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ytPlayer = ytPlayerRef?.current;
      const audioEl = audioElementRef?.current;
      let activePlaying = isPlaying;
      let timeMs = performance.now();
      let hasYoutubeClock = false;

      // Only sync with audio element if it has a source loaded (prevents matching current page URL)
      if (audioEl && audioEl.src && audioEl.src !== window.location.href) {
        try {
          activePlaying = !audioEl.paused && !audioEl.ended;
          const audioTime = audioEl.currentTime * 1000;
          const now = performance.now();
          if (activePlaying) {
            if (lastAudioTimeRef.current !== audioTime) {
              lastAudioTimeRef.current = audioTime;
              lastAudioSyncNowRef.current = now;
            }
            const elapsed = now - lastAudioSyncNowRef.current;
            const safeElapsed = Math.min(elapsed, 500); // prevent drift
            timeMs = audioTime + safeElapsed;
          } else {
            timeMs = audioTime;
          }
        } catch (e) {}
      } else if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getPlayerState === 'function') {
        try {
          const state = ytPlayer.getPlayerState();
          // state 1 = playing, 3 = buffering
          activePlaying = (state === 1 || state === 3);
          hasYoutubeClock = true;
          
          const ytTime = ytPlayer.getCurrentTime() * 1000;
          const now = performance.now();
          if (activePlaying) {
            if (lastYtTimeRef.current !== ytTime) {
              lastYtTimeRef.current = ytTime;
              lastSyncNowRef.current = now;
            }
            const elapsed = now - lastSyncNowRef.current;
            const safeElapsed = Math.min(elapsed, 500); // prevent drift
            timeMs = ytTime + safeElapsed;
          } else {
            timeMs = ytTime;
          }

        } catch (e) {
          // fallback
        }
      }

      const waveColors = {
        synthWave: ['rgba(239, 68, 68, 0.9)', 'rgba(236, 72, 153, 0.66)', 'rgba(139, 92, 246, 0.45)'],
        ambientMelody: ['rgba(52, 211, 153, 0.86)', 'rgba(45, 212, 191, 0.55)', 'rgba(56, 189, 248, 0.34)'],
        subBass: ['rgba(219, 39, 119, 0.9)', 'rgba(124, 58, 237, 0.62)', 'rgba(79, 70, 229, 0.42)'],
        jazzyGuitar: ['rgba(245, 158, 11, 0.9)', 'rgba(239, 68, 68, 0.56)', 'rgba(244, 63, 94, 0.36)'],
        chillHarmonics: ['rgba(45, 212, 191, 0.82)', 'rgba(56, 189, 248, 0.54)', 'rgba(99, 102, 241, 0.34)']
      };

      const selectedColors = waveColors[frequencyType as keyof typeof waveColors] || ['rgba(239, 68, 68, 0.82)', 'rgba(239, 68, 68, 0.4)', 'rgba(236, 72, 153, 0.28)'];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 5;
      const baseRadius = Math.max(18, Math.min(canvas.width, canvas.height) * 0.18);

      const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      background.addColorStop(0, 'rgba(9, 9, 11, 0.92)');
      background.addColorStop(0.48, 'rgba(24, 24, 27, 0.74)');
      background.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = selectedColors[1];
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();

      if (!activePlaying) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.moveTo(24, centerY);
        ctx.lineTo(canvas.width - 24, centerY);
        ctx.stroke();

        animationId = requestAnimationFrame(draw);
        return;
      }

      // Check if we have active Web Audio analyser node data and if it has actual signal (not silent/CORS-blocked/all-zeros)
      let realTimeData: Uint8Array = new Uint8Array(0);
      let frequencyData: Uint8Array = new Uint8Array(0);
      let waveAmplifier = 1.0;
      let hasRealAudioData = false;
      
      if (analyser) {
        try {
          const bufferLength = analyser.frequencyBinCount;
          realTimeData = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(realTimeData);
          
          frequencyData = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(frequencyData);
          
          let sum = 0;
          let isAllConstant = true;
          let isAllZero = true;
          const firstVal = realTimeData[0];
          
          for (let i = 0; i < bufferLength; i++) {
            if (realTimeData[i] !== 0) {
              isAllZero = false;
            }
            const val = (realTimeData[i] - 128) / 128;
            sum += val * val;
            if (realTimeData[i] !== firstVal) {
              isAllConstant = false;
            }
          }
          const rms = Math.sqrt(sum / bufferLength);
          waveAmplifier = rms * 4.0;
          
          // If the waveform data changes (not all constant/silent/all-zeros) and rms > 0.005, we have real data!
          if (!isAllZero && !isAllConstant && rms > 0.005) {
            hasRealAudioData = true;
          }
        } catch (e) {
          realTimeData = new Uint8Array(0);
          frequencyData = new Uint8Array(0);
        }
      }

      if (analyser && hasRealAudioData && realTimeData.length > 0) {
        const strokeColor = selectedColors[0];
        const bassEnergy = frequencyData.length
          ? frequencyData.slice(0, Math.max(3, Math.floor(frequencyData.length * 0.16))).reduce((sum, value) => sum + value, 0) / (Math.max(3, Math.floor(frequencyData.length * 0.16)) * 255)
          : waveAmplifier;
        const midEnergy = frequencyData.length
          ? frequencyData.slice(Math.floor(frequencyData.length * 0.16), Math.floor(frequencyData.length * 0.58)).reduce((sum, value) => sum + value, 0) / (Math.max(1, Math.floor(frequencyData.length * 0.42)) * 255)
          : waveAmplifier * 0.7;
        const pulse = Math.min(1.2, bassEnergy * 1.4 + waveAmplifier * 0.2);

        const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(canvas.width, canvas.height) * (0.74 + pulse));
        glow.addColorStop(0, strokeColor.replace(/[\d.]+\)$/, `${0.16 + pulse * 0.18})`));
        glow.addColorStop(0.5, selectedColors[1]);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barCount = 42;
        const barGap = 3;
        const barWidth = Math.max(3, (canvas.width - 44 - barGap * (barCount - 1)) / barCount);
        const barBaseY = canvas.height - 18;
        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * frequencyData.length);
          const value = (frequencyData[dataIndex] || 0) / 255;
          const eased = Math.pow(value, 0.72);
          const barHeight = Math.max(5, eased * (canvas.height * 0.54));
          const x = 22 + i * (barWidth + barGap);
          const y = barBaseY - barHeight;
          const barGradient = ctx.createLinearGradient(0, y, 0, barBaseY);
          barGradient.addColorStop(0, selectedColors[0]);
          barGradient.addColorStop(0.55, selectedColors[1]);
          barGradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
          ctx.fillStyle = barGradient;
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(timeMs / 2400);
        ctx.strokeStyle = selectedColors[0];
        ctx.lineWidth = 2;
        ctx.shadowColor = selectedColors[0];
        ctx.shadowBlur = 16 + pulse * 18;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius + pulse * 18, 0.15, Math.PI * 1.62);
        ctx.stroke();
        ctx.strokeStyle = selectedColors[2];
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.62 + midEnergy * 13, Math.PI * 0.25, Math.PI * 1.1);
        ctx.stroke();
        ctx.restore();

        // Draw actual real-time waveform line over the music graphic.
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10 + waveAmplifier * 15;

        const bufferLength = realTimeData.length;
        for (let x = 0; x < canvas.width; x += 2) {
          const dataIndex = Math.floor((x / canvas.width) * bufferLength);
          const v = realTimeData[dataIndex] / 128.0;
          
          // If silence, (v - 1.0) is 0, so wave goes completely flat!
          const yOffset = (v - 1.0) * (canvas.height / 2) * 1.5 * Math.min(1.0, waveAmplifier * 3.0);
          const y = canvas.height / 2 + yOffset - 6;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (hasYoutubeClock) {
        const strokeColor = selectedColors[0];
        const targetBpm = bpm || 90;
        const beatPeriod = 60000 / targetBpm;
        const beatPhase = (timeMs % beatPeriod) / beatPeriod;
        const beatPulse = Math.exp(-beatPhase * 4.6);
        const phase = (timeMs / 1000) * (targetBpm / 60) * Math.PI * 2;
        const barCount = 42;
        const barGap = 3;
        const barWidth = Math.max(3, (canvas.width - 44 - barGap * (barCount - 1)) / barCount);
        const barBaseY = canvas.height - 18;

        const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(canvas.width, canvas.height) * (0.62 + beatPulse * 0.38));
        glow.addColorStop(0, strokeColor.replace(/[\d.]+\)$/, `${0.1 + beatPulse * 0.2})`));
        glow.addColorStop(0.58, selectedColors[1]);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < barCount; i++) {
          const lane = i / Math.max(1, barCount - 1);
          const leftRightCurve = Math.sin(lane * Math.PI);
          const harmonic = Math.abs(Math.sin(phase + i * 0.48) * 0.62 + Math.sin(phase * 0.5 - i * 0.21) * 0.28);
          const barHeight = Math.max(5, (harmonic * 0.62 + beatPulse * 0.38) * leftRightCurve * canvas.height * 0.5);
          const x = 22 + i * (barWidth + barGap);
          const y = barBaseY - barHeight;
          const barGradient = ctx.createLinearGradient(0, y, 0, barBaseY);
          barGradient.addColorStop(0, selectedColors[0]);
          barGradient.addColorStop(0.55, selectedColors[1]);
          barGradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
          ctx.fillStyle = barGradient;
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(timeMs / 1800);
        ctx.strokeStyle = selectedColors[0];
        ctx.lineWidth = 2;
        ctx.shadowColor = selectedColors[0];
        ctx.shadowBlur = 12 + beatPulse * 16;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius + beatPulse * 15, 0.2, Math.PI * 1.66);
        ctx.stroke();
        ctx.strokeStyle = selectedColors[2];
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.62 + beatPulse * 9, Math.PI * 0.28, Math.PI * 1.08);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8 + beatPulse * 10;
        for (let x = 0; x < canvas.width; x += 3) {
          const lane = x / Math.max(1, canvas.width);
          const envelope = Math.sin(lane * Math.PI);
          const wave = Math.sin(lane * Math.PI * 8 + phase) * 12 + Math.sin(lane * Math.PI * 17 - phase * 0.7) * 5;
          const y = centerY + wave * envelope * (0.72 + beatPulse * 0.38);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        const strokeColor = selectedColors[0];
        const barCount = 42;
        const barGap = 3;
        const barWidth = Math.max(3, (canvas.width - 44 - barGap * (barCount - 1)) / barCount);
        const barBaseY = canvas.height - 18;

        ctx.save();
        ctx.globalAlpha = 0.28;
        for (let i = 0; i < barCount; i++) {
          const x = 22 + i * (barWidth + barGap);
          ctx.fillStyle = i % 4 === 0 ? selectedColors[1] : 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(x, barBaseY - 5, barWidth, 5);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(24, centerY);
        ctx.lineTo(canvas.width - 24, centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = strokeColor.replace(/[\d.]+\)$/, '0.22)');
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [frequencyType, isPlaying, bpm, analyser, ytPlayerRef, audioElementRef, syncSource]);

  return (
    <div className="w-full h-28 sm:h-36 bg-black/40 rounded-xl relative overflow-hidden border border-white/5 flex flex-col justify-end p-2 shadow-inner">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <span className="relative font-mono text-[9px] uppercase text-zinc-500 tracking-wider flex items-center gap-1">
        <Radio size={10} className={isPlaying ? 'text-red-500 animate-pulse' : ''} />
        {isPlaying ? (analyser ? "Music Wave Sync Active" : syncSource === 'youtube' ? "YouTube Playback Sync" : "Waiting for music wave") : 'Ready to stream'}
      </span>
    </div>
  );
}
