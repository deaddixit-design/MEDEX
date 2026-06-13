import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Performance } from '../types';
import { User, Sparkles, ExternalLink } from 'lucide-react';

export function PerformanceList() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformances = async () => {
      try {
        const res = await fetch('/api/performances');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Received non-JSON response from server');
        }
        const data = await res.json();
        setPerformances(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching performances:', error);
        setLoading(false);
      }
    };

    fetchPerformances();
    // Refresh every 30 seconds to catch updates
    const interval = setInterval(fetchPerformances, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (performances.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[3rem] border border-zinc-100 shadow-sm">
        <Sparkles size={48} className="mx-auto text-zinc-200 mb-4" />
        <h3 className="text-2xl font-black text-zinc-900 mb-2">No Performances Yet</h3>
        <p className="text-zinc-500">The lineup is currently being finalized. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Title</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Performer</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {performances.map((perf, index) => (
                <motion.tr
                  key={perf.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-zinc-50/50 transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="font-black text-zinc-900 text-lg group-hover:text-emerald-600 transition-colors">
                      {perf.title}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-zinc-600 font-bold">
                      <User size={14} className="text-zinc-400" />
                      {perf.performer}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-zinc-100 text-zinc-900 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-zinc-200">
                      {perf.group_type || 'Single'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(perf.category) ? perf.category : (perf.category || '').split(', ')).filter(Boolean).map(c => (
                        <span key={c} className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-zinc-500 text-sm line-clamp-2 max-w-xs leading-relaxed">
                      {perf.description}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {perf.media_url ? (
                      <a 
                        href={perf.media_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-black rounded-xl hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest"
                      >
                        <ExternalLink size={14} /> View
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-300 italic">No media</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {performances.map((perf, index) => (
          <motion.div
            key={perf.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h3 className="font-black text-zinc-900 text-xl leading-tight">{perf.title}</h3>
                <div className="flex items-center gap-2 text-zinc-500 font-bold text-sm">
                  <User size={14} />
                  {perf.performer}
                </div>
              </div>
              <span className="bg-zinc-100 text-zinc-900 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-zinc-200 shrink-0">
                {perf.group_type || 'Single'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(perf.category) ? perf.category : (perf.category || '').split(', ')).filter(Boolean).map(c => (
                <span key={c} className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">
                  {c}
                </span>
              ))}
            </div>

            <p className="text-zinc-500 text-sm leading-relaxed">
              {perf.description}
            </p>

            {perf.media_url && (
              <a 
                href={perf.media_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-100 text-zinc-900 text-xs font-black rounded-xl hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest"
              >
                <ExternalLink size={14} /> View Media
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
