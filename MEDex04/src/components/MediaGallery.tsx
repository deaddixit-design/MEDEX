import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Media } from '../types';
import { Image as ImageIcon, Play, Calendar, X, ExternalLink } from 'lucide-react';

export function MediaGallery() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  useEffect(() => {
    fetch('/api/media')
      .then((res) => res.json())
      .then((data) => {
        setMedia(data);
        setLoading(false);
      });
  }, []);

  const getDirectUrl = (url: string) => {
    if (!url) return '';
    // Handle YouTube links
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
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
      // Use hqdefault as it's more reliable than maxresdefault which might not exist
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    
    // Google Drive thumbnail
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
    }
    
    // If it's a direct image link
    if (url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
      return url;
    }

    return '';
  };

  const isYoutube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-video bg-zinc-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-8 max-w-4xl mx-auto px-1 sm:px-0">
        {media.slice(0, 8).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedMedia(item)}
            className="group relative bg-white rounded-xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-black/5 cursor-pointer flex flex-col"
          >
            <div className="aspect-video overflow-hidden relative bg-zinc-100">
              {item.type === 'video' ? (
                getThumbnailUrl(item.url) ? (
                  <img
                    src={getThumbnailUrl(item.url)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <Play size={24} className="text-white/50 group-hover:text-white transition-colors sm:w-12 sm:h-12" />
                  </div>
                )
              ) : (
                <img
                  src={getDirectUrl(item.url)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                {item.type === 'video' ? (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-black">
                    <Play size={14} className="sm:w-6 sm:h-6" fill="currentColor" />
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center text-black">
                    <ImageIcon size={14} className="sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-2 sm:p-6 bg-white flex-grow">
              <div className="flex items-center gap-1 sm:gap-2 text-[7px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-0.5 sm:mb-2">
                <Calendar size={8} className="sm:w-3 sm:h-3" /> {item.year}
              </div>
              <h3 className="text-[10px] sm:text-lg font-bold text-zinc-900 group-hover:text-black transition-colors leading-tight line-clamp-2">
                {item.title}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedMedia(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <div className="aspect-video w-full bg-black flex items-center justify-center">
                {selectedMedia.type === 'video' ? (
                  isYoutube(selectedMedia.url) ? (
                    <iframe
                      src={getDirectUrl(selectedMedia.url)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={getDirectUrl(selectedMedia.url)}
                      controls
                      autoPlay
                      className="max-w-full max-h-full"
                    />
                  )
                ) : (
                  <img
                    src={getDirectUrl(selectedMedia.url)}
                    alt={selectedMedia.title}
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="p-6 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      <Calendar size={12} /> {selectedMedia.year}
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-900">{selectedMedia.title}</h2>
                  </div>
                  <a
                    href={selectedMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-bold transition-colors"
                  >
                    <ExternalLink size={18} />
                    Original Link
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
