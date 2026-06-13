import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HeroSlider } from './components/HeroSlider';
import { IdeaForm } from './components/IdeaForm';
import { MediaGallery } from './components/MediaGallery';
import { PerformanceList } from './components/PerformanceList';
import { AdminPanel } from './components/AdminPanel';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { UdaanEvent } from './components/UdaanEvent';
import { DemandingChillies } from './components/DemandingChillies';
import { ContactUs } from './components/ContactUs';
import { BatchMemories } from './components/BatchMemories';
import { BmltHub } from './components/BmltHub';
import { ContentLibrary } from './components/ContentLibrary';
import { NewsUpdates } from './components/NewsUpdates';
import { StudentPortal } from './components/StudentPortal';
import { UserManual } from './components/UserManual';
import { ProgramProvider, useProgram } from './lib/ProgramContext';
import { BreakingNewsBar } from './components/BreakingNewsBar';
import { motion } from 'motion/react';
import { Sparkles, Image, List, ArrowRight, GraduationCap, Archive, ArrowUpRight, Compass, Activity, HeartPulse, BookOpen, FileText, Library, Microscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MedexLogo } from './components/MedexLogo';

function Home() {
  const { activeProgram } = useProgram();
  const [featuredMedia, setFeaturedMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customSettings, setCustomSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/media')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError('Non-JSON response');
        }
        return res.json();
      })
      .then((data) => {
        setFeaturedMedia(Array.isArray(data) ? data.slice(0, 3) : []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Unable to fetch media for showcase:", err.message || err);
        setLoading(false);
      });

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
          if (data.custom_app_logo_svg !== undefined) {
            localStorage.setItem('custom_app_logo_svg', data.custom_app_logo_svg || '');
            window.dispatchEvent(new Event('custom-logo-updated'));
          }
        }
      })
      .catch((err) => console.warn("Unable to fetch homepage settings:", err.message || err));
  }, []);

  const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    if (url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
      return url;
    }
    return '';
  };

  const useCustomBranding = !activeProgram;
  
  const imgPolaroid1 = (useCustomBranding && customSettings.polaroid_image_1) 
    ? customSettings.polaroid_image_1 
    : "/images/polaroid_1.png";
    
  const imgPolaroid2 = (useCustomBranding && customSettings.polaroid_image_2) 
    ? customSettings.polaroid_image_2 
    : "/images/polaroid_2.png";
    
  const imgPolaroid3 = (useCustomBranding && customSettings.polaroid_image_3) 
    ? customSettings.polaroid_image_3 
    : "/images/polaroid_3.png";

  const imgShowcase1 = (useCustomBranding && customSettings.showcase_image_1) 
    ? customSettings.showcase_image_1 
    : "/images/legacy_1.png";
    
  const imgShowcase2 = (useCustomBranding && customSettings.showcase_image_2) 
    ? customSettings.showcase_image_2 
    : "/images/legacy_2.png";
  
  return (
    <div className="space-y-12 md:space-y-24 pb-12 md:pb-24">
      <HeroSlider />
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-8 mb-10 md:mb-14">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-[0.25em]">
              <Sparkles size={14} className="text-[#ee2a7b] animate-pulse" /> Welcome to MEDex
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-zinc-950 tracking-tight leading-[1.05]">
              {activeProgram ? (
                <>Next Showcase: <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ee2a7b] via-[#6228d7] to-[#f9ce34]">{activeProgram.name}</span></>
              ) : (
                <>Where Every Diagnostic <br /> Finds Its Desk.</>
              )}
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm md:text-base font-medium max-w-lg pt-1">
              Collaborate on MEDex, share snapshots of innovative clinical lab cases, and analyze microscope slides.
            </p>
          </div>
          {activeProgram && (
            <Link to="/participate" className="group flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-wider text-black bg-zinc-950 hover:bg-[#ee2a7b] text-white hover:text-white px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all shadow-md hover:shadow-[#ee2a7b]/10 active:scale-95 shrink-0">
              <span>Participate Now</span> <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {activeProgram && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 md:gap-8">
            {/* TILE 1: Creative Hub (Submit Ideas) - For active event */}
            <Link 
              to="/participate" 
              className="group relative md:col-span-5 flex flex-col justify-between overflow-hidden p-5 sm:p-8 bg-zinc-950 text-white rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-900 shadow-2xl hover:border-amber-400/30 -translate-y-0 hover:-translate-y-1.5 transition-all duration-500"
            >
              {/* Visual ambient glowing accent background */}
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500" />
              
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <span className="text-[9px] uppercase font-black tracking-[0.22em] text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-sans">
                    Creative Hub
                  </span>
                </div>
                
                <h3 className="font-display text-xl sm:text-2xl font-black text-white mb-2 group-hover:text-amber-300 transition-colors">
                  Submit Ideas
                </h3>
                
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-sm mb-6 sm:mb-8 font-medium">
                  Got a performance act or an innovative event concept? Stake your claim on the official layout.
                </p>
              </div>

              {/* Collage Feature List */}
              <div className="relative z-10 w-full mt-auto">
                <div className="flex flex-wrap gap-1.5 mb-4 opacity-90">
                  <span className="text-[8.5px] font-black px-2 py-0.5 rounded bg-zinc-900 text-amber-400 tracking-wider font-mono">#Bands</span>
                  <span className="text-[8.5px] font-black px-2 py-0.5 rounded bg-zinc-900 text-purple-400 tracking-wider font-mono">#Dances</span>
                  <span className="text-[8.5px] font-black px-2 py-0.5 rounded bg-zinc-900 text-teal-400 tracking-wider font-mono">#Ideas</span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4 font-sans">
                  <div>
                    <span className="block text-zinc-500 text-[8.5px] font-black uppercase tracking-widest mb-0.5">Process</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-300">Submit & Perform</span>
                  </div>
                  <div className="text-right flex items-end justify-end">
                    <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] text-[#f9ce34] group-hover:underline">
                      <span>Pitch Now</span>
                      <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* TILE 2: Stage Agenda Running Showcase */}
            <Link 
              to="/performances" 
              className="group relative md:col-span-7 overflow-hidden p-4 sm:p-5 bg-zinc-50 hover:bg-white rounded-xl sm:rounded-2xl border border-zinc-100 hover:border-black/5 hover:shadow-lg -translate-y-0 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Visual ambient glowing accent background */}
              <div className="absolute -right-32 -bottom-32 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center relative z-10">
                <div className="lg:col-span-7 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-all duration-500">
                      <List size={14} />
                    </div>
                    <span className="text-[8.5px] uppercase font-black tracking-[0.2em] text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-sans">
                      Stage Agenda
                    </span>
                  </div>
                  
                  <h3 className="font-display text-base sm:text-lg font-bold text-zinc-905 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                    <span>View Approved Performance Lineup</span>
                    <ArrowRight size={15} className="text-zinc-350 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </h3>
                  
                  <p className="text-zinc-500 text-[11px] leading-relaxed max-w-xl font-medium font-sans">
                    Check which bands, dancers, and creative artists are taking the mic. Updates dynamically with select approved performers.
                  </p>
                </div>

                {/* Decorative mini agenda collage / dashboard preview */}
                <div className="lg:col-span-5 grid grid-cols-3 gap-1.5 w-full bg-zinc-950/5 p-1.5 rounded-xl border border-zinc-950/5">
                  <div className="bg-white p-1.5 rounded-lg border border-zinc-10 md:border-zinc-100 shadow-sm text-center">
                    <span className="text-[7.5px] font-black tracking-wider text-[#ee2a7b] uppercase block mb-0.5 font-mono">07:00 PM</span>
                    <p className="text-[9.5px] font-extrabold text-zinc-805 line-clamp-1">Opening</p>
                    <p className="text-[8px] text-zinc-400 font-bold font-sans">MEDex Team</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-zinc-10 md:border-zinc-100 shadow-sm text-center">
                    <span className="text-[7.5px] font-black tracking-wider text-[#6228d7] uppercase block mb-0.5 font-mono">08:15 PM</span>
                    <p className="text-[9.5px] font-extrabold text-zinc-855 line-clamp-1">EDM</p>
                    <p className="text-[8px] text-zinc-400 font-bold font-sans">Dj Spark</p>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-zinc-10 md:border-zinc-100 shadow-sm text-center">
                    <span className="text-[7.5px] font-black tracking-wider text-emerald-600 uppercase block mb-0.5 font-mono">09:30 PM</span>
                    <p className="text-[9.5px] font-extrabold text-zinc-850 line-clamp-1">Finale</p>
                    <p className="text-[8px] text-zinc-400 font-bold font-sans">Batch '26</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </section>

      {/* Dynamic App Features Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
        <div className="pt-4 md:pt-6">
          {/* Instagram-style Colorful Gradient Bar on top of Core Resources section */}
          <div className="h-[5.5px] w-full bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] via-[#6228d7] to-[#2575fc] rounded-full mb-8 sm:mb-12 shadow-[0_2px_8px_rgba(238,42,123,0.15)]" />
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider font-sans border border-indigo-150">
              <Sparkles size={11} className="text-indigo-600 animate-pulse" /> Core Resources & Academic Features
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 tracking-tight leading-tight">
              Powerful Academic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">Utilities & Archives</span>
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm md:text-base font-medium">
              Access premium tools and high-fidelity educational medical materials crafted for students, professionals, and lab diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
            {/* Feature 1: Free Books */}
            <Link
              to="/library"
              className="group relative flex flex-col justify-between bg-gradient-to-b from-white to-zinc-50/50 p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] border border-zinc-150 hover:border-indigo-500/30 shadow-sm hover:shadow-xl transition-all duration-300 -translate-y-0 hover:-translate-y-1.5"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-3 sm:space-y-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-50/80 border border-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                  <Library size={18} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="text-xs sm:text-base md:text-lg font-black text-zinc-900 group-hover:text-indigo-600 transition-colors">Free Books</h3>
                    <span className="self-start sm:self-auto text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100/50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm">Free</span>
                  </div>
                  <p className="text-zinc-500 text-[10px] sm:text-xs leading-relaxed mt-1 sm:mt-2 font-medium">
                    Dive into our premium digital lab library. Read and download top textbooks in hematology, clinical pathology, and biochemistry.
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-2 sm:pt-4 border-t border-zinc-100/80 flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-indigo-600 group-hover:text-indigo-800">
                <span>Browse Ebooks</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform sm:w-3.5 sm:h-3.5" />
              </div>
            </Link>

            {/* Feature 2: Free Notes */}
            <Link
              to="/library"
              className="group relative flex flex-col justify-between bg-gradient-to-b from-white to-zinc-50/50 p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] border border-zinc-150 hover:border-[#ee2a7b]/30 shadow-sm hover:shadow-xl transition-all duration-300 -translate-y-0 hover:-translate-y-1.5"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-[#ee2a7b]/5 rounded-full blur-2xl group-hover:bg-[#ee2a7b]/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-3 sm:space-y-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-pink-50/80 border border-pink-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-[#ee2a7b] group-hover:scale-110 transition-transform duration-300">
                  <FileText size={18} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="text-xs sm:text-base md:text-lg font-black text-zinc-900 group-hover:text-[#ee2a7b] transition-colors">Academic Notes</h3>
                    <span className="self-start sm:self-auto text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-[#ee2a7b] bg-pink-100/50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm">PDF</span>
                  </div>
                  <p className="text-zinc-500 text-[10px] sm:text-xs leading-relaxed mt-1 sm:mt-2 font-medium">
                    Master key laboratory disciplines with structured, concise lecture notes, summaries, reference templates, and guides.
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-2 sm:pt-4 border-t border-zinc-100/80 flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-[#ee2a7b] group-hover:text-pink-700">
                <span>Access Notes</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform sm:w-3.5 sm:h-3.5" />
              </div>
            </Link>

            {/* Feature 3: Virtual Microscope */}
            <Link
              to="/bmlt"
              className="group relative flex flex-col justify-between bg-gradient-to-b from-white to-zinc-50/50 p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] border border-zinc-150 hover:border-emerald-500/30 shadow-sm hover:shadow-xl transition-all duration-300 -translate-y-0 hover:-translate-y-1.5"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-3 sm:space-y-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-50/80 border border-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                  <Microscope size={18} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="text-xs sm:text-base md:text-lg font-black text-zinc-900 group-hover:text-emerald-600 transition-colors">Microscope Lab</h3>
                    <span className="self-start sm:self-auto text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100/50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm">Slides</span>
                  </div>
                  <p className="text-zinc-500 text-[10px] sm:text-xs leading-relaxed mt-1 sm:mt-2 font-medium">
                    Simulate real microscope analysis. Inspect blood cells, tissue structures, parasitology, and identify abnormal profiles.
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-2 sm:pt-4 border-t border-zinc-100/80 flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-emerald-600 group-hover:text-emerald-800">
                <span>Start Simulator</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform sm:w-3.5 sm:h-3.5" />
              </div>
            </Link>

            {/* Feature 4: Reference Index & Others */}
            <Link
              to="/bmlt"
              className="group relative flex flex-col justify-between bg-gradient-to-b from-white to-zinc-50/50 p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-[2rem] border border-zinc-150 hover:border-teal-500/30 shadow-sm hover:shadow-xl transition-all duration-300 -translate-y-0 hover:-translate-y-1.5"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-3 sm:space-y-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-teal-50/80 border border-teal-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
                  <Activity size={18} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="text-xs sm:text-base md:text-lg font-black text-zinc-900 group-hover:text-teal-600 transition-colors">Reference Desk</h3>
                    <span className="self-start sm:self-auto text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-teal-600 bg-teal-100/50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm">Values</span>
                  </div>
                  <p className="text-zinc-500 text-[10px] sm:text-xs leading-relaxed mt-1 sm:mt-2 font-medium">
                    Search and analyze normal or pathological ranges of biological markers and laboratory biochemistry parameters in real-time.
                  </p>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-2 sm:pt-4 border-t border-zinc-100/80 flex items-center justify-between text-[9px] sm:text-xs font-black uppercase tracking-wider text-teal-600 group-hover:text-teal-800">
                <span>Explore Index</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform sm:w-3.5 sm:h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* NEW BMLT Core Department Student Hub Segment (Active 365 Days) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/bmlt"
          className="group relative block overflow-hidden rounded-3xl border border-teal-200/60 bg-gradient-to-br from-zinc-950 via-zinc-900 to-teal-980 p-6 sm:p-10 md:p-12 shadow-xl hover:-translate-y-1 transition-all duration-500"
        >
          {/* Subtle responsive glowing color backdrop overlays dedicated to BMLT */}
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl group-hover:bg-teal-500/25 transition-all duration-700 pointer-events-none" />
          <div className="absolute -left-24 -top-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3.5 max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 text-[9.5px] sm:text-xs font-black text-teal-300 bg-teal-500/15 px-3 py-1 rounded-full border border-teal-500/20 uppercase tracking-[0.2em] font-sans">
                <Activity size={13} className="text-teal-400 animate-pulse" /> B.Sc. Medical Lab Technology Corner (MLT)
              </div>
              
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-all">
                The 365-Day Academic & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-350">Diagnostic Lab Desk</span>
              </h2>
              
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-semibold font-sans">
                No active program today? No problem! Test your lab identification skills on the Virtual Microscope Challenge, enter diagnostics inside our Reference Index Analyzer, or step through pathology Case Simulator modules. Built explicitly for our department.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg font-mono tracking-wider">🔬 VIRTUAL MICROSCOPE</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-mono tracking-wider">🩸 LAB PARAMETERS</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-mono tracking-wider">🩺 CLINICAL CASES</span>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 mt-2 md:mt-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-teal-500 text-black flex items-center justify-center shadow-md group-hover:scale-105 group-hover:rotate-12 transition-all duration-300">
                <Compass size={20} />
              </div>
              <span className="text-[10.5px] sm:text-xs font-black uppercase tracking-wider text-teal-400 group-hover:text-teal-300 transition-colors mt-0 md:mt-3 font-sans">
                Launch Student Desk &rarr;
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* NEW Lab memories Block - Repositioned and Named 'Lab memories', view only no upload */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <Link
          to="/gallery"
          className="group relative block overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 hover:bg-white p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300"
        >
          {/* Subtle responsive glowing color backdrop overlays dedicated to Lab memories */}
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />
          <div className="absolute -left-24 -top-24 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-all duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <div className="inline-flex items-center gap-1.5 text-[8.5px] sm:text-xs font-black text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest font-sans">
                <Image size={11} className="text-emerald-600" /> Lab Archives
              </div>
              
              <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-snug">
                Lab <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">memories</span>
              </h2>
              
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed font-semibold font-sans">
                Browse through student-contributed microscopic images, clinical pathology slides, and memorable classroom captures. Explore shared visual moments of our laboratory learning journeys.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1 font-mono">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg tracking-wider">🔬 SLIDESHOW</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg tracking-wider">📸 ACADEMICS</span>
              </div>
            </div>

            {/* Two realistic beautiful Polaroid picture frames */}
            <div className="flex items-center gap-4 my-2 md:my-0 select-none">
              <div className="relative w-24 h-28 sm:w-28 sm:h-32 bg-white p-1.5 rounded-lg shadow-md border border-zinc-200 -rotate-3 group-hover:rotate-0 hover:scale-105 transition-all duration-300 shrink-0">
                <img 
                  src={imgPolaroid1} 
                  className="w-full h-[75%] object-cover rounded border border-zinc-100" 
                  alt="Microscope Frame" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-[6.5px] sm:text-[7.5px] font-black text-center mt-1 text-emerald-600 tracking-wider font-mono uppercase">
                  HEMA SCAN
                </div>
              </div>
              <div className="relative w-24 h-28 sm:w-28 sm:h-32 bg-white p-1.5 rounded-lg shadow-md border border-zinc-200 rotate-6 group-hover:rotate-0 hover:scale-105 transition-all duration-300 shrink-0">
                <img 
                  src={imgPolaroid2} 
                  className="w-full h-[75%] object-cover rounded border border-zinc-100" 
                  alt="Lab Culture Frame" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-[6.5px] sm:text-[7.5px] font-black text-center mt-1 text-teal-600 tracking-wider font-mono uppercase">
                  LAB FUN '26
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0 mt-2 md:mt-0">
              <div className="w-10 h-10 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:rotate-12 transition-all duration-300">
                <ArrowRight size={16} />
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-600 group-hover:text-emerald-800 transition-colors mt-0 md:mt-2.5 font-sans">
                View Lab Memories &rarr;
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/batches"
          className="group relative block overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 hover:bg-white p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300"
        >
          {/* Subtle responsive glowing color backdrop overlays */}
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700 pointer-events-none" />
          <div className="absolute -left-24 -top-24 w-96 h-96 bg-[#ee2a7b]/5 rounded-full blur-3xl group-hover:bg-[#ee2a7b]/10 transition-all duration-700 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <div className="inline-flex items-center gap-1.5 text-[8.5px] sm:text-xs font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest font-sans">
                <GraduationCap size={11} className="text-indigo-600" /> Legacy Yearbook Vault
              </div>
              
              <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-snug">
                Explore Yearbooks & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-[#ee2a7b]">Class Archives</span>
              </h2>
              
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed font-semibold font-sans">
                Journey through the proud legacy of previous graduating networks. Access interactive batch portals, alumni spotlights, student-contributed yearbook media, and historic memory tracks.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg font-mono tracking-wider">BATCH 2025</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg font-mono tracking-wider">BATCH 2024</span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg font-mono tracking-wider">BATCH 2023</span>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0 mt-2 md:mt-0">
              <div className="w-10 h-10 rounded-full bg-indigo-600 group-hover:bg-indigo-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:rotate-12 transition-all duration-300">
                <ArrowRight size={16} />
              </div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-600 group-hover:text-indigo-800 transition-colors mt-0 md:mt-2.5 font-sans">
                Browse Full Archive &rarr;
              </span>
            </div>
          </div>
        </Link>
      </section>

      <section className="bg-zinc-900 py-24 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tighter">
                Relive the <br /> Magic of 2025.
              </h2>
              <p className="text-zinc-400 text-lg max-w-lg">
                Our previous events were nothing short of spectacular. Browse through our curated gallery of highlights and get inspired for what's coming next.
              </p>
              <Link to="/gallery" className="inline-flex bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-zinc-200 transition-all">
                Explore Gallery
              </Link>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 relative">
              <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full" />
              <img src={imgShowcase1} className="rounded-3xl rotate-[-4deg] relative z-10" referrerPolicy="no-referrer" />
              <img src={imgShowcase2} className="rounded-3xl translate-y-12 rotate-[4deg] relative z-10" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Participate() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12 items-start">
        {/* Heading Section: Always on top */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">
            <Sparkles size={16} fill="currentColor" /> Join the Movement
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-zinc-900 leading-tight tracking-tighter">
            Your Voice, <br className="hidden md:block" /> Our Stage.
          </h1>
        </div>

        {/* Form: order-1 on mobile, 2nd column on desktop */}
        <div className="order-1 lg:order-2">
          <IdeaForm />
        </div>

        {/* Paragraphs/Steps: order-2 on mobile, 1st column on desktop */}
        <div className="order-2 lg:order-1 space-y-8 lg:space-y-12">
          <p className="text-zinc-500 text-xl leading-relaxed max-w-lg">
            MEDex is built by students, for students. Whether you have a groundbreaking idea or a stunning performance to share, this is your place to shine.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 font-bold shrink-0">1</div>
              <div>
                <h4 className="font-bold text-lg">Submit Your Idea</h4>
                <p className="text-zinc-500">Fill out the form with your vision for the next event.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 font-bold shrink-0">2</div>
              <div>
                <h4 className="font-bold text-lg">Review Process</h4>
                <p className="text-zinc-500">Our committee reviews all submissions for the final lineup.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 font-bold shrink-0">3</div>
              <div>
                <h4 className="font-bold text-lg">Take the Stage</h4>
                <p className="text-zinc-500">If selected, your idea or performance will be featured live!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-32">
      <div className="text-center mb-16 space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">
          <Image size={16} fill="currentColor" /> Visual Archives
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">
          Moments in Motion.
        </h1>
        <p className="text-zinc-500 text-xl max-w-2xl mx-auto">
          A curated collection of photos and videos from our previous college programs.
        </p>
      </div>
      <MediaGallery />
    </div>
  );
}

function Performances() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-32">
      <div className="text-center mb-16 space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">
          <List size={16} fill="currentColor" /> Event Lineup
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">
          The Final List.
        </h1>
        <p className="text-zinc-500 text-xl max-w-2xl mx-auto">
          Behold the selected performances that will grace our stage this year.
        </p>
      </div>
      <div className="max-w-4xl mx-auto">
        <PerformanceList />
      </div>
    </div>
  );
}

export default function App() {
  const [navbarHidden, setNavbarHidden] = useState(false);

  useEffect(() => {
    const handleToggle = (e: any) => {
      if (e.detail !== undefined) {
        setNavbarHidden(e.detail);
      } else {
        setNavbarHidden(prev => !prev);
      }
    };
    window.addEventListener('toggle-global-navbar', handleToggle);
    return () => {
      window.removeEventListener('toggle-global-navbar', handleToggle);
    };
  }, []);

  return (
    <ProgramProvider>
      <Router>
        <div className={`min-h-screen bg-white font-sans selection:bg-black selection:text-white transition-all duration-500 ease-in-out ${navbarHidden ? 'pt-0' : 'pt-16'}`}>
          <Navbar />
          <BreakingNewsBar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/participate" element={<Participate />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/performances" element={<Performances />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/udaan" element={<UdaanEvent />} />
              <Route path="/demanding" element={<DemandingChillies />} />
              <Route path="/batches" element={<BatchMemories />} />
              <Route path="/bmlt" element={<BmltHub />} />
              <Route path="/library" element={<ContentLibrary />} />
              <Route path="/news" element={<NewsUpdates />} />
              <Route path="/student" element={<StudentPortal />} />
              <Route path="/manual" element={<UserManual />} />
              <Route path="/contact" element={<ContactUs />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </ProgramProvider>
  );
}

function Footer() {
  const { activeProgram } = useProgram();
  
  return (
    <footer className="bg-zinc-50 border-t border-zinc-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <MedexLogo size="sm" showSubtitle={true} />
        </div>
        <p className="text-zinc-400 text-sm">© 2026 MEDex. Built for the medical and laboratory sciences community.</p>
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="flex gap-8 flex-wrap justify-center">
            <Link to="/" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Home</Link>
            {activeProgram && (
              <Link to="/udaan" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">{activeProgram.name}</Link>
            )}
            <Link to="/gallery" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Gallery</Link>
            <Link to="/batches" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Graduating alumni</Link>
            <Link to="/privacy" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Privacy</Link>
            <Link to="/admin" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Author Login</Link>
            <Link to="/contact" className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">Contact</Link>
          </div>
          <a href="mailto:sksafin361@gmail.com" className="text-xs font-bold text-zinc-400 hover:text-black transition-colors">sksafin361@gmail.com</a>
        </div>
      </div>
    </footer>
  );
}

