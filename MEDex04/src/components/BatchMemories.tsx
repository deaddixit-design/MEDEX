import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { BatchMemory } from '../types';
import { 
  GraduationCap, 
  Image as ImageIcon, 
  Play, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Upload, 
  Check, 
  AlertCircle, 
  Heart, 
  X, 
  Video, 
  Sparkles,
  Eye,
  Trash
} from 'lucide-react';

export function BatchMemories() {
  const location = useLocation();
  const [memories, setMemories] = useState<BatchMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [batchOptions, setBatchOptions] = useState<string[]>(['Batch 2023', 'Batch 2024', 'Batch 2025', 'Batch 2026']);
  const [cohorts, setCohorts] = useState<{ id: number; name: string; cover_url?: string; avatar_url?: string; motto?: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [batchSuccess, setBatchSuccess] = useState('');
  const [allowViewerUploads, setAllowViewerUploads] = useState<boolean>(true);
  
  // Modal & form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<BatchMemory | null>(null);
  
  // New memory states
  const [batchName, setBatchName] = useState('Batch 2025');
  const [title, setTitle] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
  const [directUrl, setDirectUrl] = useState('');
  
  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Love counts tracker from localstorage for interactive engagement
  const [likedMemories, setLikedMemories] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('vibe_loved_memories');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loveCounts, setLoveCounts] = useState<Record<number, number>>(() => {
    try {
      const stored = localStorage.getItem('vibe_love_counts');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchMemories();
    fetchBatches();
    checkAdminStatus();
    fetchViewerUploadSettings();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const batchParam = params.get('batch');
    const stateBatch = location.state?.selectedBatch;
    const initialBatch = batchParam || stateBatch;
    if (initialBatch) {
      setSelectedBatch(initialBatch);
    }
  }, [location]);

  const fetchViewerUploadSettings = () => {
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
        if (data && typeof data.allow_viewer_uploads === 'boolean') {
          setAllowViewerUploads(data.allow_viewer_uploads);
        }
      })
      .catch((err) => {
        console.warn('Failed to load viewer uploads settings:', err.message || err);
      });
  };

  const fetchBatches = () => {
    fetch('/api/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCohorts(data);
          if (data.length > 0) {
            const names = data.map((b: { name: string }) => b.name);
            setBatchOptions(names);
            if (names.length > 0) {
              setBatchName(names[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load batches:', err);
      });
  };

  const checkAdminStatus = () => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    fetch('/api/admin/me', { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch((err) => {
        console.error('Failed to check admin status:', err);
      });
  };

  const fetchMemories = () => {
    setLoading(true);
    fetch('/api/batch-memories')
      .then((res) => res.json())
      .then((data) => {
        setMemories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load batch memories:', err);
        setLoading(false);
      });
  };

  const handleLove = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedLikes: number[];
    const isLiked = likedMemories.includes(id);

    if (isLiked) {
      updatedLikes = likedMemories.filter(item => item !== id);
      setLoveCounts(prev => {
        const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) };
        localStorage.setItem('vibe_love_counts', JSON.stringify(next));
        return next;
      });
    } else {
      updatedLikes = [...likedMemories, id];
      setLoveCounts(prev => {
        const next = { ...prev, [id]: (prev[id] || 0) + 1 };
        localStorage.setItem('vibe_love_counts', JSON.stringify(next));
        return next;
      });
    }

    setLikedMemories(updatedLikes);
    localStorage.setItem('vibe_loved_memories', JSON.stringify(updatedLikes));
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileType = e.dataTransfer.files[0].type;
      if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
        setFile(e.dataTransfer.files[0]);
        if (fileType.startsWith('video/')) {
          setMediaType('video');
        } else {
          setMediaType('photo');
        }
      } else {
        setErrorMessage('Invalid file type! Please upload an image or video.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (selectedFile.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('photo');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setErrorMessage('Please add a memory caption/title!');
      return;
    }

    setUploadingStatus('uploading');
    setErrorMessage('');

    let finalUrl = directUrl;

    if (uploadMethod === 'upload') {
      if (!file) {
        setUploadingStatus('error');
        setErrorMessage('Please select a file to upload!');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const uploadRes = await fetch('/api/public/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Upload request failed on server');
        }

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalUrl = uploadData.url;
        } else {
          throw new Error(uploadData.error || 'Server failed to process uploaded file');
        }
      } catch (err: any) {
        setUploadingStatus('error');
        setErrorMessage(err.message || 'File upload failed. Please try providing a web url instead.');
        return;
      }
    }

    if (!finalUrl) {
      setUploadingStatus('error');
      setErrorMessage('A valid photo or video link is required!');
      return;
    }

    // Submit memory
    try {
      const submitRes = await fetch('/api/public/batch-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          batch_name: batchName,
          title,
          url: finalUrl,
          type: mediaType,
          uploaded_by: uploadedBy || 'Anonymous Senior'
        })
      });

      if (!submitRes.ok) {
        let serverError = 'Failed to submit memory record to database.';
        try {
          const errData = await submitRes.json();
          if (errData && errData.error) {
            serverError = errData.error;
          }
        } catch (_) {}
        throw new Error(serverError);
      }

      setUploadingStatus('success');
      setTimeout(() => {
        setShowUploadModal(false);
        // Reset states
        setFile(null);
        setTitle('');
        setUploadedBy('');
        setDirectUrl('');
        setUploadingStatus('idle');
        fetchMemories();
      }, 1500);

    } catch (err: any) {
      setUploadingStatus('error');
      setErrorMessage(err.message || 'Error occurred while saving memory.');
    }
  };

  // Helper selectors
  const getDirectUrl = (url: string) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://drive.google.com/uc?id=${driveMatch[1]}`;
    }
    return url;
  };

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

  // Filter memories
  const filteredMemories = memories.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.uploaded_by && item.uploaded_by.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedBatch === 'All') return matchesSearch;
    
    // Support exact matches or matches against the year suffix (e.g. "Batch 2024" or just "2024")
    const yearMatch = selectedBatch.match(/\d+/)?.[0];
    if (yearMatch) {
      return matchesSearch && (item.batch_name.includes(selectedBatch) || item.batch_name.includes(yearMatch));
    }
    return matchesSearch && item.batch_name.includes(selectedBatch);
  });

  // Get active cohort details of the currently selected batch
  const activeCohort = cohorts.find(c => c.name === selectedBatch);

  // Decide Cover Image
  const getCoverImage = () => {
    if (selectedBatch === 'All') {
      return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1200'; // Campus
    }
    if (activeCohort && activeCohort.cover_url) {
      return activeCohort.cover_url;
    }
    // Beautiful default cover based on batch code
    const defaultCovers = [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200', // Graduation diplomas/cap
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=1200', // Group study/happy
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200', // Library book desk
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=1200', // School board classroom
    ];
    // Hash based on name length or content to keep it stable
    const index = Math.abs(selectedBatch.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultCovers.length;
    return defaultCovers[index];
  };

  // Decide Avatar
  const getAvatarImage = () => {
    if (selectedBatch === 'All') {
      return null;
    }
    if (activeCohort && activeCohort.avatar_url) {
      return activeCohort.avatar_url;
    }
    return null;
  };

  // Decide Motto
  const getMottoText = () => {
    if (selectedBatch === 'All') {
      return 'Treasuring the collective pathways of our outstanding alumni networks.';
    }
    if (activeCohort && activeCohort.motto) {
      return activeCohort.motto;
    }
    return 'Making incredible graduation memories that stand the test of time.';
  };

  // Directory Helpers for individual Cohorts when listing all covers
  const getCohortCover = (cohort: { name: string; cover_url?: string }) => {
    if (cohort.cover_url) return cohort.cover_url;
    const defaultCovers = [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200', // Graduation diplomas/cap
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=1200', // Group study/happy
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200', // Library book desk
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=1200', // School board classroom
    ];
    const index = Math.abs(cohort.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % defaultCovers.length;
    return defaultCovers[index];
  };

  const getCohortAvatar = (cohort: { name: string; avatar_url?: string }) => {
    return cohort.avatar_url || null;
  };

  const getCohortMotto = (cohort: { name: string; motto?: string }) => {
    return cohort.motto || 'Making incredible graduation memories that stand the test of time.';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 space-y-12">
      {/* Intro Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-neutral-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20 shrink-0">
            <GraduationCap size={22} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block mb-0.5">Memory Lane</span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-serif">
              The Graduating Alumni Memory Book
            </h1>
          </div>
        </div>

        {allowViewerUploads && (
          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer shadow-lg shadow-emerald-500/15"
            >
              <Plus size={16} /> Add Memory Moment
            </button>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div id="gallerySection" className="bg-zinc-50 rounded-2xl p-3 md:p-6 border border-zinc-200/60 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          <input
            type="text"
            placeholder="Search captions or alum names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white hover:bg-zinc-50/55 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm transition-all shadow-sm outline-none font-medium text-zinc-800 placeholder-zinc-400"
          />
        </div>

        {/* Batch filters */}
        <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto subtle-scrollbar pb-2.5 w-full md:w-auto md:flex-wrap md:justify-end md:overflow-x-visible">
          {['All', ...batchOptions].map((batch) => (
            <button
              key={batch}
              onClick={() => setSelectedBatch(batch)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                selectedBatch === batch
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-650'
              }`}
            >
              {batch === 'All' ? 'All Alumni' : batch}
            </button>
          ))}
        </div>
      </div>

      {/* All Cohorts Directory Showcase (visible only when 'All' is selected) */}
      {selectedBatch === 'All' && cohorts.length > 0 && (
        <div className="space-y-6 pt-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500 shrink-0" /> Explore Cohort Yearbooks
              </h3>
              <p className="text-zinc-500 text-xs sm:text-sm font-semibold">
                Compare or select any alumni class to view their custom-branded memories, files, and milestones.
              </p>
            </div>
            <span className="text-[10px] sm:text-xs bg-zinc-150 text-zinc-650 px-3 py-1.5 rounded-full font-extrabold uppercase tracking-widest border border-zinc-250/70 select-none self-start sm:self-auto transition-colors">
              {cohorts.length} Batch Cohorts Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort) => {
              const coverImg = getCohortCover(cohort);
              const avatarImg = getCohortAvatar(cohort);
              const mottoText = getCohortMotto(cohort);

              // Calculate how many memories are uploaded for this particular cohort
              const cohortMemoriesCount = memories.filter(m => {
                const yearMatch = cohort.name.match(/\d+/)?.[0];
                if (yearMatch) {
                  return m.batch_name.includes(cohort.name) || m.batch_name.includes(yearMatch);
                }
                return m.batch_name.includes(cohort.name);
              }).length;

              return (
                <motion.div
                  key={cohort.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setSelectedBatch(cohort.name);
                    const el = document.getElementById('cohortProfileSection');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white rounded-[1.8rem] border border-zinc-200 hover:border-black/20 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col group relative"
                >
                  {/* Miniature Cover Image */}
                  <div className="relative h-24 sm:h-28 w-full bg-slate-950 overflow-hidden">
                    <img 
                      src={coverImg} 
                      alt={`${cohort.name} Cover banner`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Floating Batch Year Label */}
                    <span className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider uppercase font-mono shadow-sm">
                      {cohort.name.replace('Batch ', 'Class of ')}
                    </span>
                  </div>

                  {/* Overlapping Profile Photo and Metadata */}
                  <div className="px-5 pb-5 pt-2 flex-grow flex flex-col relative bg-white">
                    {/* Miniature Avatar overlapping the cover */}
                    <div className="absolute -top-7 left-4 w-12 h-12 rounded-full border-3 border-white bg-zinc-100 shadow-md overflow-hidden shrink-0 z-10 flex items-center justify-center">
                      {avatarImg ? (
                        <img 
                          src={avatarImg} 
                          alt={`${cohort.name} badge`} 
                          className="w-full h-full object-cover animate-none" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-amber-500 flex flex-col items-center justify-center text-white relative">
                          <GraduationCap size={16} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Adjusted layout for batch title right of overlapping avatar */}
                    <div className="pl-14 min-h-[1.25rem] -mt-1 flex items-center">
                      <h4 className="text-sm font-black text-zinc-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                        {cohort.name}
                      </h4>
                    </div>

                    <div className="mt-4 flex-grow flex flex-col justify-between space-y-4 pt-1">
                      <p className="text-zinc-600 text-[11px] leading-relaxed italic line-clamp-2">
                        "{mottoText}"
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500 pt-2.5 border-t border-zinc-150/60 mt-1.5 font-sans">
                        <span className="text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/40">
                          {cohortMemoriesCount} {cohortMemoriesCount === 1 ? 'Media file' : 'Media files'}
                        </span>
                        <span className="text-zinc-400 group-hover:text-black transition-colors flex items-center gap-0.5 font-bold">
                          Enter Vault →
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="border-b border-zinc-200/80 my-8 pt-4"></div>
        </div>
      )}

      {/* Facebook-style Batch Cover & Profile Banner */}
      <div id="cohortProfileSection" className={`bg-white rounded-2xl md:rounded-3xl border border-zinc-200/90 shadow-md overflow-hidden transition-all duration-300 ${selectedBatch === 'All' ? 'hidden md:block' : ''}`}>
        {/* Cover Image */}
        <div className="relative h-32 sm:h-48 md:h-64 lg:h-72 w-full bg-zinc-900 overflow-hidden">
          <img 
            src={getCoverImage()} 
            alt={`${selectedBatch} Cover Banner`} 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-[9px] sm:text-[10px] md:text-xs font-black tracking-wider uppercase flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400 shrink-0" />
            <span>{selectedBatch === 'All' ? 'Alumni Registry' : `${selectedBatch} Profile`}</span>
          </div>
        </div>

        {/* Profile Avatar and Information Area */}
        <div className="relative px-4 sm:px-8 pb-4 sm:pb-6 flex flex-col md:flex-row items-center md:items-end gap-3.5 md:gap-5">
          {/* Overlapping Profile Photo */}
          <div className="relative -mt-12 sm:-mt-16 md:-mt-20 w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 sm:border-[5px] border-white bg-zinc-50 shadow-lg overflow-hidden shrink-0 z-10 flex items-center justify-center">
            {getAvatarImage() ? (
              <img 
                src={getAvatarImage()!} 
                alt={`${selectedBatch} Badge`} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-emerald-600 via-teal-700 to-amber-500 flex flex-col items-center justify-center text-white text-center p-2 relative">
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                <GraduationCap size={selectedBatch === 'All' ? 32 : 38} className="text-white drop-shadow-md mb-0.5 sm:mb-1" />
                <span className="font-extrabold text-[8px] sm:text-[10px] md:text-sm tracking-widest uppercase drop-shadow font-mono">
                  {selectedBatch === 'All' ? 'ALUMNI' : selectedBatch.replace('Batch ', '')}
                </span>
              </div>
            )}
          </div>

          {/* Texts (Batch title, slogan, stats) */}
          <div className="flex-1 text-center md:text-left space-y-1.5 md:pb-1 pb-1 pt-1 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-1 sm:gap-2.5">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-zinc-950 tracking-tight leading-none">
                {selectedBatch === 'All' ? 'Alumni Memory Book' : selectedBatch}
              </h2>
              <span className="inline-flex self-center items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100/60 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-none w-fit">
                <GraduationCap size={10} className="text-emerald-500 shrink-0" />
                Validated Cohort
              </span>
            </div>
            
            <p className="text-zinc-650 text-[10px] sm:text-xs md:text-sm italic font-bold md:max-w-2xl px-2 md:px-0">
              "{getMottoText()}"
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4 text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest pt-1 border-t border-zinc-100 mt-1">
              <span className="flex items-center gap-1 font-bold">
                <strong className="text-zinc-850 font-black">{filteredMemories.length}</strong> {filteredMemories.length === 1 ? 'Media Memory' : 'Media Memories'}
              </span>
              <span className="text-zinc-350">•</span>
              <span className="flex items-center gap-1 font-bold">
                <strong className="text-zinc-850 font-black">
                  {new Set(filteredMemories.map(m => m.uploaded_by || 'Anonymous')).size}
                </strong> {new Set(filteredMemories.map(m => m.uploaded_by || 'Anonymous')).size === 1 ? 'Contributor' : 'Contributors'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-4 md:gap-6 lg:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-zinc-100 rounded-lg sm:rounded-2xl md:rounded-3xl animate-pulse border border-zinc-200/50" />
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="text-center py-16 md:py-24 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
          <div className="max-w-md mx-auto space-y-4 px-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
              <ImageIcon size={28} />
            </div>
            <h3 className="text-base md:text-xl font-bold text-zinc-900">No memories found</h3>
            <p className="text-zinc-500 text-xs md:text-sm leading-relaxed">
              No photo or video records match your current filter. Be the first to start the memory book by uploading a nostalgic moment!
            </p>
            {allowViewerUploads && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex bg-black hover:bg-zinc-800 text-white font-bold px-5 py-2 rounded-xl text-xs md:text-sm items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={14} /> Upload Now
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-4 md:gap-6 lg:gap-8 border-t border-zinc-100/50 pt-4">
          {filteredMemories.map((item, idx) => {
            const hasLofiThumbnail = getThumbnailUrl(item.url);
            const loveCount = (loveCounts[item.id] || 0) + (item.id % 4) + 1; // Base engagement
            const isLoved = likedMemories.includes(item.id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                onClick={() => setSelectedMedia(item)}
                className="group bg-white rounded-md sm:rounded-2xl md:rounded-3xl border border-zinc-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer flex flex-col relative"
              >
                {/* Media Container */}
                <div className="aspect-square sm:aspect-[4/3] relative overflow-hidden bg-zinc-50 shrink-0 border-b border-zinc-100">
                  {item.type === 'video' ? (
                    hasLofiThumbnail ? (
                      <img
                        src={hasLofiThumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-2">
                        <Video size={14} className="text-white/40 sm:w-8 sm:h-8" />
                        <span className="text-[8px] sm:text-[10px] text-white/40 mt-1 font-mono text-center">Video</span>
                      </div>
                    )
                  ) : (
                    <img
                      src={getDirectUrl(item.url)}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Play / View Hover Shield Overlay */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10">
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-lg"
                    >
                      {item.type === 'video' ? (
                        <Play size={10} fill="currentColor" className="ml-0.5 sm:w-5 sm:h-5" />
                      ) : (
                        <Eye size={10} className="sm:w-5 sm:h-5" />
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-1 sm:p-3 md:p-5 flex-grow flex flex-col justify-between space-y-1 sm:space-y-2">
                  <div className="space-y-0.5 sm:space-y-1">
                    {/* Year Label - Now positioned below the media container */}
                    <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-emerald-50 text-emerald-700/90 px-1 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[10px] md:text-xs font-black shadow-none w-fit">
                      <GraduationCap size={7} className="text-emerald-500 shrink-0 sm:w-3 sm:h-3" />
                      <span className="truncate max-w-[28px] sm:max-w-none">{item.batch_name}</span>
                    </div>

                    <p className="text-zinc-850 text-[8px] sm:text-xs md:text-sm font-bold leading-tight line-clamp-1 sm:line-clamp-2">
                      "{item.title}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 sm:pt-2 border-t border-zinc-100 mt-auto gap-0.5 sm:gap-1.5">
                    <div className="flex items-center gap-0.5 sm:gap-1 text-zinc-700 overflow-hidden min-w-0 flex-1">
                      <User size={8} className="text-zinc-400 shrink-0 sm:w-3 sm:h-3" />
                      <span className="text-[7.5px] sm:text-xs font-bold truncate" title={item.uploaded_by}>
                        {item.uploaded_by || 'Anonymous'}
                      </span>
                    </div>

                    {/* Love trigger */}
                    <button
                      onClick={(e) => handleLove(item.id, e)}
                      className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[10px] font-black transition-all cursor-pointer shrink-0 ${
                        isLoved
                        ? 'bg-rose-50 text-rose-600 border border-rose-100 scale-105 animate-pulse'
                        : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <Heart size={7} fill={isLoved ? "currentColor" : "none"} className="sm:w-2.5 sm:h-2.5" />
                      <span>{loveCount}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setSelectedMedia(null)}
          >
            <div 
              className="relative w-full max-w-4xl bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Banner Control */}
              <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-xs">
                    {selectedMedia.batch_name}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                    <User size={12} /> By {selectedMedia.uploaded_by || 'AnonymousSenior'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-1 px-2.5 rounded-xl hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Close media"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Media viewer */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                {selectedMedia.type === 'video' ? (
                  selectedMedia.url.includes('youtube.com') || selectedMedia.url.includes('youtu.be') ? (
                    <iframe
                      src={getDirectUrl(selectedMedia.url)}
                      title={selectedMedia.title}
                      className="w-full h-full border-0 absolute inset-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={getDirectUrl(selectedMedia.url)}
                      className="max-h-full max-w-full rounded-lg"
                      controls
                      autoPlay
                    />
                  )
                ) : (
                  <img
                    src={getDirectUrl(selectedMedia.url)}
                    alt={selectedMedia.title}
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Bottom Caption Box */}
              <div className="bg-zinc-900 p-6 md:p-8 space-y-3">
                <p className="text-white text-base md:text-lg leading-relaxed font-medium">
                  "{selectedMedia.title}"
                </p>
                <div className="text-zinc-400 text-xs flex items-center gap-2">
                  <Calendar size={13} /> Archived on {new Date(selectedMedia.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload/Submission Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
            onClick={() => {
              if (uploadingStatus !== 'uploading') setShowUploadModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-100 flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 bg-zinc-950 text-white flex items-center justify-between">
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-400" /> Archiving Senior Memory
                </h3>
                {uploadingStatus !== 'uploading' && (
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto max-h-[80vh]">
                
                {/* Batch Selector */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                      Target Batch
                    </label>
                  </div>
                  <select
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 focus:border-black rounded-xl text-sm transition-colors outline-none cursor-pointer text-zinc-800 font-bold"
                  >
                    {batchOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Method Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                    Submission Medium
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadMethod('upload')}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        uploadMethod === 'upload'
                        ? 'bg-black text-white'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                      }`}
                    >
                      Drag & Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMethod('url')}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        uploadMethod === 'url'
                        ? 'bg-black text-white'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                      }`}
                    >
                      Provide Web Link
                    </button>
                  </div>
                </div>

                {/* Local Multer Upload Drag/Drop Box */}
                {uploadMethod === 'upload' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                      Local Image or Video File
                    </label>
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                        dragActive 
                        ? 'border-emerald-500 bg-emerald-50/20' 
                        : file 
                          ? 'border-emerald-500/50 bg-emerald-50/5' 
                          : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        className="hidden" 
                      />
                      
                      {file ? (
                        <>
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            {mediaType === 'video' ? <Play size={24} /> : <ImageIcon size={24} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 truncate max-w-[250px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500">
                            <Upload size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">
                              Drag and drop your asset here
                            </p>
                            <p className="text-xs text-zinc-500">
                              Accepts photographs or short memory clips
                            </p>
                          </div>
                          <span className="text-xs bg-white border border-zinc-200 px-3 py-1 rounded-lg text-zinc-500 font-extrabold shadow-sm">
                            Or Select File
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Web URL Input block */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                        Media Web URL
                      </label>
                      <input
                        type="url"
                        placeholder="e.g., https://youtube.com/watch?... or https://unspl..."
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-black rounded-xl text-sm transition-colors outline-none font-medium text-zinc-800"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                        Media Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMediaType('photo')}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            mediaType === 'photo'
                            ? 'bg-zinc-800 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                          }`}
                        >
                          Photograph
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaType('video')}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            mediaType === 'video'
                            ? 'bg-zinc-800 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                          }`}
                        >
                          Video Stream
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Caption Description Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                    Caption/Memory Note
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    placeholder="We loved doing group presentations in Room 402..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-black rounded-xl text-sm transition-colors outline-none font-medium text-zinc-800 placeholder-zinc-400 resize-none"
                  />
                  <div className="text-right text-[10px] font-bold text-zinc-400">
                    {title.length}/300 characters
                  </div>
                </div>

                {/* Contributor Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-wider block">
                      Contributor Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Sourav Ganguly (CSE '24)"
                      value={uploadedBy}
                      onChange={(e) => setUploadedBy(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-black rounded-xl text-sm transition-colors outline-none font-medium text-zinc-800 placeholder-zinc-400"
                    />
                  </div>
                </div>

                {/* Status Messages */}
                {errorMessage && (
                  <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold leading-snug">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {uploadingStatus === 'success' && (
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                    <Check size={16} className="shrink-0" />
                    <span>Memory archived successfully! Re-routing...</span>
                  </div>
                )}

                {/* Action CTA Buttons */}
                <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={uploadingStatus === 'uploading'}
                    onClick={() => setShowUploadModal(false)}
                    className="px-5 py-3 rounded-xl text-sm font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingStatus === 'uploading'}
                    className="px-6 py-3 rounded-xl text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 min-w-[120px]"
                  >
                    {uploadingStatus === 'uploading' ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Save Memory'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
