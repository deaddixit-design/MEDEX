import { useState, useEffect } from 'react';
import { Newspaper, Search, Calendar, User, Tag, ExternalLink, ArrowRight, NotebookTabs, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category: string;
  image_url?: string;
  file_path?: string;
  created_at: string;
}

export function NewsUpdates() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  const fetchNews = () => {
    setLoading(true);
    fetch('/api/public/news')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setNews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load news:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const categories = ['All', ...Array.from(new Set(news.map((item) => item.category || 'General')))];

  const filteredNews = news.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || (item.category || 'General') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 font-sans text-left">
      {/* Header and Branding */}
      <div className="text-center mb-12 space-y-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 font-mono">
          <Newspaper size={13} className="text-teal-500 animate-pulse" /> Bulletins & Announcements
        </span>
        <h1 className="text-3.5xl sm:text-5xl font-black text-zinc-950 tracking-tighter leading-none">
          NEWS / <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-indigo-600">Updates Room</span>
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-2xl mx-auto font-medium">
          Stay informed about clinical lab seminars, syllabus changes, event schedules, and batch announcements.
        </p>
      </div>

      {/* Control Actions / Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 pb-6 border-b border-zinc-150">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news, topics, and authors..."
            className="pl-10 pr-4 py-2.5 w-full bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-inner placeholder:text-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.slice(0, 7).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow'
                  : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchNews}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition"
            title="Refresh News"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* News Feed Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-10 h-10 border-4 border-teal-555 border-t-transparent rounded-full animate-spin text-teal-600" />
          <p className="text-sm font-bold text-zinc-555">Syncing bulletins...</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-20 bg-zinc-50/50 rounded-3xl border border-zinc-150">
          <NotebookTabs size={44} className="mx-auto text-zinc-300 mb-3" />
          <h3 className="font-extrabold text-sm text-zinc-800 uppercase tracking-widest leading-none mb-1">Silence inside the Feed</h3>
          <p className="text-zinc-500 text-xs font-semibold">No announcements matched your current query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredNews.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group bg-white rounded-2xl border border-zinc-200/80 p-3 sm:p-4 overflow-hidden shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all cursor-pointer flex gap-3 sm:gap-4 relative text-left"
            >
              {/* Left side Image - optimized size */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-50 shrink-0 border border-zinc-100">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-50/50 to-indigo-50/50 flex items-center justify-center">
                    <Newspaper className="text-teal-200 w-8 h-8 sm:w-12 sm:h-12" />
                  </div>
                )}
              </div>

              {/* Right side Text content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-teal-50 text-teal-750 border border-teal-100 px-1.5 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black uppercase tracking-widest font-mono">
                      {item.category || 'General'}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                      {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-zinc-900 group-hover:text-teal-600 transition-colors leading-tight line-clamp-1 sm:line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-semibold leading-relaxed line-clamp-2">
                    {item.content}
                  </p>
                </div>

                {/* Small Author Info */}
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-bold text-zinc-400 border-t border-zinc-50 pt-2 mt-1 shrink-0">
                  <span className="text-zinc-600 truncate max-w-[70%]">By {item.author_name}</span>
                  <span className="text-teal-600 font-black uppercase tracking-wider group-hover:translate-x-0.5 transition-transform shrink-0 flex items-center gap-0.5">
                    Read More <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal Overlays */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative aspect-video w-full bg-zinc-100 overflow-hidden border-b border-zinc-100 shrink-0">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="object-cover w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-50 to-indigo-50 flex items-center justify-center">
                    <Newspaper size={48} className="text-teal-300" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center font-bold text-sm cursor-pointer border border-white/10 z-10"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span className="bg-teal-50 text-teal-750 border border-teal-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    {selectedItem.category || 'General'}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar size={12} />
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <User size={12} />
                    {selectedItem.author_name}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-tight">
                  {selectedItem.title}
                </h2>

                <p className="text-sm text-zinc-700 leading-relaxed font-semibold whitespace-pre-wrap">
                  {selectedItem.content}
                </p>

                {/* Optional attached files */}
                {selectedItem.file_path && (
                  <div className="pt-4 border-t border-zinc-100">
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 font-mono">Attachments</h4>
                    <a
                      href={selectedItem.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-extrabold rounded-xl transition border border-zinc-200 shadow-xs"
                    >
                      <ExternalLink size={13} fill="currentColor" /> View Attached Syllabus/Notice (PDF)
                    </a>
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-150 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow"
                >
                  Close Bulletin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
