import React, { useState, useEffect, useRef } from 'react';
import { 
  Library, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Upload, 
  Download,
  Search, 
  ArrowLeft, 
  User, 
  Activity, 
  HeartPulse, 
  FlaskConical, 
  Microscope, 
  Dna, 
  ShieldAlert, 
  Brain, 
  Check, 
  AlertCircle, 
  Calendar,
  Lock,
  ChevronRight,
  ChevronLeft,
  BookCheck,
  Award,
  FileText,
  Presentation,
  Eye,
  Loader2,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PdfJsViewer } from './PdfJsViewer';

// Local fetch wrapper to ensure cookies/credentials are always passed in sandboxes
const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const mergedInit = { ...init };
  if (!mergedInit.credentials) {
    mergedInit.credentials = 'include';
  }
  const token = localStorage.getItem('medex_student_token');
  if (token) {
    mergedInit.headers = {
      ...mergedInit.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return window.fetch(input, mergedInit);
};

// Mapping icons dynamically based on name stored in DB
const IconMap: { [key: string]: React.ComponentType<any> } = {
  Library: Library,
  BookOpen: BookOpen,
  Activity: Activity,
  HeartPulse: HeartPulse,
  FlaskConical: FlaskConical,
  Microscope: Microscope,
  Dna: Dna,
  ShieldAlert: ShieldAlert,
  Brain: Brain
};

// Map keywords in the book's title to high-fidelity clinical and lab illustration icons
const getBookLogoIcon = (title: string, className?: string) => {
  const t = title.toLowerCase();
  const size = 18;
  if (t.includes('blood') || t.includes('hematology') || t.includes('transfusion') || t.includes('cardio') || t.includes('heart') || t.includes('coagulation')) {
    return <HeartPulse size={size} className={className || "text-rose-500"} />;
  }
  if (t.includes('microscope') || t.includes('pathology') || t.includes('cell') || t.includes('histology') || t.includes('tissue') || t.includes('parasitology') || t.includes('urine') || t.includes('semen') || t.includes('body fluid')) {
    return <Microscope size={size} className={className || "text-emerald-500"} />;
  }
  if (t.includes('chemistry') || t.includes(' biochem') || t.includes('lab') || t.includes('clinical') || t.includes('assay') || t.includes('fluid') || t.includes('test') || t.includes('analyte') || t.includes('hormone')) {
    return <FlaskConical size={size} className={className || "text-teal-500"} />;
  }
  if (t.includes('dna') || t.includes('microbi') || t.includes('bacteria') || t.includes('virus') || t.includes('virol') || t.includes('genetics') || t.includes('culture') || t.includes('fungal') || t.includes('mycol')) {
    return <Dna size={size} className={className || "text-indigo-500"} />;
  }
  if (t.includes('immuno') || t.includes('defense') || t.includes('serology') || t.includes('safety') || t.includes('prevent') || t.includes('infection') || t.includes('hiv')) {
    return <ShieldAlert size={size} className={className || "text-amber-600"} />;
  }
  if (t.includes('neuro') || t.includes('brain') || t.includes('psycho') || t.includes('cogni')) {
    return <Brain size={size} className={className || "text-violet-500"} />;
  }
  if (t.includes('exam') || t.includes('mcq') || t.includes('qna') || t.includes('question') || t.includes('guide') || t.includes('manual') || t.includes('syllabus')) {
    return <BookCheck size={size} className={className || "text-sky-505"} />;
  }
  // Default to a generic beautiful textbook icon:
  return <BookOpen size={size} className={className || "text-teal-600"} />;
};

// Generate beautiful premium gradient backgrounds for books aligning with the Academic or Instagram palette
const getBookCardGradient = (coverColor: string) => {
  switch (coverColor) {
    case 'teal': // Cyber Teal & Sea Foam
      return 'bg-gradient-to-br from-teal-50/95 via-cyan-50/60 to-teal-150/80 border-teal-200/90 hover:border-teal-400 shadow-[inset_0_-4px_12px_rgba(13,148,136,0.05)]';
    case 'indigo': // Dark Royalty Indigo & Lavender
      return 'bg-gradient-to-br from-indigo-50/95 via-purple-50/60 to-indigo-150/80 border-indigo-200/90 hover:border-indigo-400 shadow-[inset_0_-4px_12px_rgba(79,70,229,0.05)]';
    case 'emerald': // Fresh Mint & Sage Forest
      return 'bg-gradient-to-br from-emerald-50/95 via-teal-50/60 to-emerald-150/80 border-emerald-200/90 hover:border-emerald-400 shadow-[inset_0_-4px_12px_rgba(16,185,129,0.05)]';
    case 'rose': // Instagram Sunrise/Fuchsia
      return 'bg-gradient-to-br from-purple-50/90 via-pink-50/60 to-orange-50/70 border-rose-200/90 hover:border-rose-400 shadow-[inset_0_-4px_12px_rgba(244,63,94,0.05)]';
    case 'amber': // Hot Sunset Orange and Gold
      return 'bg-gradient-to-br from-amber-50/90 via-orange-50/65 to-red-50/70 border-amber-200/90 hover:border-amber-400 shadow-[inset_0_-4px_12px_rgba(245,158,11,0.05)]';
    case 'violet': // Deep Purple Velvet & Plum
      return 'bg-gradient-to-br from-violet-50/95 via-fuchsia-50/60 to-indigo-150/80 border-violet-200/90 hover:border-violet-400 shadow-[inset_0_-4px_12px_rgba(139,92,246,0.05)]';
    case 'sky': // Ocean Breeze Azure & Mint
      return 'bg-gradient-to-br from-sky-50/95 via-cyan-50/60 to-blue-150/80 border-sky-200/90 hover:border-sky-400 shadow-[inset_0_-4px_12px_rgba(14,165,233,0.05)]';
    default:
      return 'bg-gradient-to-br from-zinc-50 via-white to-zinc-100 border-zinc-200 hover:border-zinc-350';
  }
};

interface Subject {
  id: number;
  name: string;
  logo: string;
  created_at?: string;
}

interface Topic {
  id: number;
  subject_id: number;
  name: string;
  created_at?: string;
}

interface StandaloneBook {
  id: number;
  title: string;
  author_name: string;
  cover_color: string;
  created_at?: string;
  document_count?: number;
  allow_download?: number;
}

interface BookDocument {
  id: number;
  book_id: number;
  title: string;
  file_path: string;
  author_name: string;
  created_at?: string;
  allow_download?: number;
}


interface Article {
  id: number;
  topic_id: number;
  headline: string;
  content: string;
  author_name: string;
  is_ai_generated: number;
  created_at?: string;
  subject_id?: number | null;
  section?: string | null;
  file_path?: string | null;
  allow_download?: number;
}

// Inline lightweight Markdown renderer to support beautiful styled academic rendering of AI medical notes
// Inline lightweight Markdown renderer to support beautiful styled academic rendering of AI medical notes
function SimpleMarkdownRenderer({ content, isDark = false }: { content: string, isDark?: boolean }) {
  if (!content) return null;
  
  const rawLines = content.split('\n');
  
  interface GroupedBlock {
    type: 'table' | 'line';
    rows?: string[];
    content?: string;
  }
  
  const blocks: GroupedBlock[] = [];
  let currentTableRows: string[] = [];
  
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      currentTableRows.push(trimmed);
    } else {
      if (currentTableRows.length > 0) {
        blocks.push({ type: 'table', rows: [...currentTableRows] });
        currentTableRows = [];
      }
      blocks.push({ type: 'line', content: line });
    }
  }
  if (currentTableRows.length > 0) {
    blocks.push({ type: 'table', rows: currentTableRows });
  }

  return (
    <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-250' : 'text-zinc-800'}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'table' && block.rows && block.rows.length > 0) {
          const parsedRows = block.rows
            .map(row => {
              const parts = row.split('|').map(c => c.trim());
              return parts.slice(1, parts.length - 1);
            })
            .filter(cells => {
              const joined = cells.join('');
              return joined.replace(/[\s:-]/g, '').length > 0;
            });

          if (parsedRows.length === 0) return null;

          const hasDivider = block.rows.some(r => r.includes('---'));
          const headerRow = hasDivider ? parsedRows[0] : null;
          const bodyRows = hasDivider ? parsedRows.slice(1) : parsedRows;

          return (
            <div key={idx} className="my-4 space-y-1 animate-smooth-fade">
              <div className={`overflow-x-auto border rounded-xl shadow-sm max-w-full ${
                isDark ? 'border-zinc-800 bg-zinc-950/20' : 'border-zinc-200/80 bg-zinc-50/20'
              }`}>
                <table className="w-full table-auto divide-y divide-zinc-200 border-collapse">
                  {headerRow && (
                    <thead>
                      <tr className={isDark ? "bg-zinc-900/60" : "bg-zinc-100/65"}>
                        {headerRow.map((cell, cIdx) => (
                          <th key={cIdx} className={`px-2 py-2 text-left text-[9.5px] sm:text-xs font-black uppercase tracking-wider border-r border-b ${
                            isDark ? 'border-zinc-800 text-teal-400' : 'border-zinc-200 text-teal-950'
                          } whitespace-normal break-words max-w-[120px]`}>
                            {parseBoldText(cell, isDark)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-850' : 'divide-zinc-150'}`}>
                    {bodyRows.map((row, rIdx) => (
                      <tr key={rIdx} className={
                        isDark 
                          ? "hover:bg-zinc-900/40 text-zinc-300 text-xs transition-colors" 
                          : "hover:bg-zinc-50/50 text-zinc-750 text-xs transition-colors"
                      }>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className={`px-2 py-2 border-r font-medium leading-relaxed font-sans ${
                            isDark ? 'border-zinc-850 text-zinc-300' : 'border-zinc-150 text-zinc-700'
                          } text-[9.5px] sm:text-xs whitespace-normal break-words max-w-[120px]`}>
                            {parseBoldText(cell, isDark)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold tracking-wider px-1.5 font-mono select-none uppercase">
                <span>Optimized Table Column View</span>
                <span>← Swipe to inspect more →</span>
              </div>
            </div>
          );
        }

        const trimmed = (block.content || '').trim();
        if (trimmed === '') {
          return null;
        }

        // Skip slide divider indicator lines in continuous document rendering
        if (trimmed.startsWith('--- [slide] ---')) {
          return <div key={idx} className={`my-6 border-b border-dashed ${isDark ? 'border-zinc-805' : 'border-zinc-200'}`} />;
        }

        // Custom [image: URL | caption] parser
        if (trimmed.startsWith('[image:') && trimmed.endsWith(']')) {
          const inner = trimmed.substring(7, trimmed.length - 1);
          const barIndex = inner.indexOf('|');
          let url = inner.trim();
          let caption = 'Clinical Micrograph / Illustration';
          if (barIndex !== -1) {
            url = inner.substring(0, barIndex).trim();
            caption = inner.substring(barIndex + 1).trim();
          }
          return (
            <div key={idx} className={`my-4 overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm animate-smooth-fade ${
              isDark ? 'border-zinc-805 bg-zinc-900/40' : 'border-zinc-200/80 bg-zinc-50'
            }`}>
              <img 
                src={url} 
                alt={caption} 
                className="w-full h-auto max-h-[220px] sm:max-h-[320px] md:max-h-[420px] object-cover hover:scale-[1.01] transition-transform duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = `https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80`;
                }}
              />
              <div className={`p-3 border-t flex items-center justify-between text-xs font-bold font-sans ${
                isDark ? 'bg-zinc-900/80 border-zinc-805 text-zinc-400' : 'bg-zinc-100/70 border-zinc-150 text-zinc-650'
              }`}>
                <span className="flex items-center gap-1.5 truncate">
                  <BookOpen size={13} className="text-teal-500 shrink-0" />
                  <span className="truncate">{caption}</span>
                </span>
                <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border tracking-wider shrink-0 ${
                  isDark ? 'bg-zinc-950 text-teal-400 border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200'
                }`}>HIGH RESOLUTION STUDY</span>
              </div>
            </div>
          );
        }

        // Custom Markdown native images: ![caption](url)
        if (trimmed.startsWith('![') && trimmed.includes('](') && trimmed.endsWith(')')) {
          const closeBracketIndex = trimmed.indexOf('](');
          const caption = trimmed.substring(2, closeBracketIndex).trim();
          const url = trimmed.substring(closeBracketIndex + 2, trimmed.length - 1).trim();
          return (
            <div key={idx} className={`my-4 overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm animate-smooth-fade ${
              isDark ? 'border-zinc-805 bg-zinc-900/40' : 'border-zinc-200/80 bg-zinc-50'
            }`}>
              <img 
                src={url} 
                alt={caption} 
                className="w-full h-auto max-h-[220px] sm:max-h-[320px] md:max-h-[420px] object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = `https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=800&q=80`;
                }}
              />
              <div className={`p-3 border-t text-xs font-bold flex items-center gap-1.5 ${
                isDark ? 'bg-zinc-900/80 border-zinc-805 text-zinc-400' : 'bg-zinc-100/70 border-zinc-150 text-zinc-650'
              }`}>
                <BookOpen size={13} className="text-teal-500 shrink-0" />
                <span className="truncate">{caption}</span>
              </div>
            </div>
          );
        }

        // Custom [smartart: type | config] parser
        if (trimmed.startsWith('[smartart:') && trimmed.endsWith(']')) {
          const inner = trimmed.substring(10, trimmed.length - 1);
          const barIndex = inner.indexOf('|');
          let type = 'process';
          let artData = '';
          if (barIndex !== -1) {
            type = inner.substring(0, barIndex).trim().toLowerCase();
            artData = inner.substring(barIndex + 1).trim();
          } else {
            artData = inner.trim();
          }

          // Operational Progress list / Flow diagram
          if (type === 'process') {
            const steps = artData.split('->').map(s => s.trim()).filter(s => s);
            return (
              <div key={idx} className="my-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="text-teal-400 animate-pulse" />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-teal-300' : 'text-teal-800'}`}>Operational Process Flow (MS Presentation Style)</span>
                </div>
                <div className="flex flex-col md:flex-row items-stretch gap-3 md:items-center">
                  {steps.map((step, sIdx) => {
                    const hasSub = step.includes(':');
                    const title = hasSub ? step.split(':')[0].trim() : step;
                    const desc = hasSub ? step.split(':').slice(1).join(':').trim() : '';
                    return (
                      <React.Fragment key={sIdx}>
                        <div className={`flex-1 p-4 rounded-xl border shadow-sm relative group transition-all ${
                          isDark 
                            ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-teal-500' 
                            : 'bg-gradient-to-br from-white to-zinc-50/50 border-zinc-200 hover:border-teal-400 hover:shadow'
                        }`}>
                          <div className={`absolute top-3 right-3 w-5 h-5 rounded-full text-[9px] font-mono font-black flex items-center justify-center border ${
                            isDark ? 'bg-teal-950 text-teal-300 border-teal-900' : 'bg-teal-50 text-teal-800 border-teal-100'
                          }`}>
                            0{sIdx + 1}
                          </div>
                          <h5 className={`font-extrabold text-xs uppercase tracking-wider pr-6 ${isDark ? 'text-teal-400' : 'text-zinc-905'}`}>{title}</h5>
                          {desc && <p className={`text-[11px] font-medium leading-relaxed mt-2 font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{desc}</p>}
                        </div>
                        {sIdx < steps.length - 1 && (
                          <div className="flex items-center justify-center text-teal-500 self-center shrink-0">
                            <ChevronRight className="rotate-90 md:rotate-0" size={16} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Bento-grid comparison Cards
          if (type === 'grid' || type === 'cards') {
            const items = artData.split('||').map(i => i.trim()).filter(i => i);
            return (
              <div key={idx} className="my-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((item, iIdx) => {
                    const hasSub = item.includes(':');
                    const title = hasSub ? item.split(':')[0].trim() : `Component Index ${iIdx + 1}`;
                    const desc = hasSub ? item.split(':').slice(1).join(':').trim() : item;
                    return (
                      <div key={iIdx} className={`p-4.5 rounded-xl border shadow-sm flex flex-col justify-between ${
                        isDark 
                          ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800' 
                          : 'bg-gradient-to-br from-zinc-50 to-white/10 border-zinc-150/80'
                      }`}>
                        <div>
                          <span className={`text-[8px] font-bold uppercase mb-1.5 block ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Scientific Category {iIdx + 1}</span>
                          <h5 className={`font-black text-xs tracking-wide uppercase ${isDark ? 'text-white' : 'text-zinc-955'}`}>{title}</h5>
                        </div>
                        <p className={`text-[11px] font-semibold leading-relaxed mt-3.5 border-t pt-2.5 font-sans ${
                          isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100/80 text-zinc-650'
                        }`}>{desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Clinical Alarm / Warning block
          if (type === 'alert' || type === 'warning' || type === 'highlight') {
            const parts = artData.split(':');
            const badge = parts.length > 1 ? parts[0].trim() : 'DIAGNOSTIC CRITICAL ACTION WARNING';
            const msg = parts.length > 1 ? parts.slice(1).join(':').trim() : artData;
            const isCritical = badge.toLowerCase().includes('crit') || badge.toLowerCase().includes('danger') || badge.toLowerCase().includes('alert');
            return (
              <div key={idx} className={`my-4 border rounded-xl overflow-hidden shadow-sm animate-smooth-fade ${
                isCritical 
                  ? (isDark ? 'border-rose-900 bg-rose-950/40 text-rose-100' : 'border-rose-200 bg-rose-50/40 text-rose-950')
                  : (isDark ? 'border-amber-900 bg-amber-950/40 text-amber-100' : 'border-amber-200 bg-amber-50/40 text-amber-950')
              }`}>
                <div className={`px-4 py-2 flex items-center justify-between border-b gap-3 ${
                  isCritical 
                    ? (isDark ? 'bg-rose-900/60 border-rose-800 text-rose-100' : 'bg-rose-100 border-rose-200') 
                    : (isDark ? 'bg-amber-900/60 border-amber-800 text-amber-100' : 'bg-amber-100 border-amber-200')
                }`}>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={13} className={isCritical ? 'text-rose-450 animate-pulse' : 'text-amber-450'} />
                    <span className="text-[9px] font-black tracking-wider uppercase font-mono">{badge}</span>
                  </div>
                  <span className={`text-[7.5px] font-bold font-mono tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>LAB PROTOCOL ENFORCED</span>
                </div>
                <div className="p-4 text-xs font-bold leading-relaxed font-sans">
                  {msg}
                </div>
              </div>
            );
          }

          // Progress Milestone timeline structure
          if (type === 'timeline') {
            const events = artData.split('->').map(e => e.trim()).filter(e => e);
            return (
              <div key={idx} className="my-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-indigo-400 animate-bounce" />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Lab Procedure Phase Chronology</span>
                </div>
                <div className={`space-y-4 relative pl-8.5 before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 ${
                  isDark ? 'before:bg-zinc-800' : 'before:bg-indigo-100'
                }`}>
                  {events.map((evt, eIdx) => {
                    const hasSub = evt.includes(':');
                    const time = hasSub ? evt.split(':')[0].trim() : `Phase 0{eIdx + 1}`;
                    const action = hasSub ? evt.split(':').slice(1).join(':').trim() : evt;
                    return (
                      <div key={eIdx} className="relative group animate-fade-in">
                        <div className={`absolute -left-[27px] top-1.5 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shadow-sm z-10 transition-colors ${
                          isDark 
                            ? 'border-zinc-700 bg-zinc-900 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' 
                            : 'border-indigo-300 bg-white text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          {eIdx + 1}
                        </div>
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider block ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{time}</span>
                          <p className={`text-xs font-bold mt-1 font-sans ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{action}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Cycle Diagram circular feedback path
          if (type === 'cycle') {
            const sequence = artData.split('->').map(s => s.trim()).filter(s => s);
            return (
              <div key={idx} className={`my-4 p-5 rounded-2xl border flex flex-col lg:flex-row items-center justify-around gap-6 ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-teal-50/20 border-teal-100/70'
              }`}>
                <div className="text-center lg:text-left shrink-0 max-w-xs">
                  <span className={`text-[8px] font-black tracking-widest uppercase font-mono ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Loop Feedback Pathway</span>
                  <h5 className={`font-extrabold text-xs uppercase tracking-wide leading-snug ${isDark ? 'text-white' : 'text-zinc-955'}`}>Metabolic / Biochemical Cycle</h5>
                  <p className={`text-[10.5px] font-semibold leading-relaxed mt-1 font-sans ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>This biochemical interaction iterates repeating regulatory loops continuously.</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {sequence.map((node, nIdx) => (
                    <React.Fragment key={nIdx}>
                      <div className={`px-3.5 py-2 rounded-full border flex items-center gap-1.5 shadow-sm text-xs font-bold transition-all select-none ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-850 text-teal-300 hover:bg-zinc-90 w-auto' 
                          : 'bg-white border-teal-150 text-teal-950 hover:bg-teal-55'
                      }`}>
                        <span className={`w-4 h-4 text-[8px] font-black rounded-full flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-teal-955/80 text-teal-450' : 'bg-teal-100 text-teal-800'
                        }`}>{nIdx + 1}</span>
                        <span>{node}</span>
                      </div>
                      {nIdx < sequence.length - 1 ? (
                        <div className="text-teal-500 font-bold shrink-0">
                          <ChevronRight size={13} />
                        </div>
                      ) : (
                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border tracking-wider ${
                          isDark ? 'bg-teal-955/55 text-teal-450 border-teal-900/60' : 'bg-teal-100/50 text-teal-800 border-teal-150'
                        }`}>LOOPBACK</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          }
        }

        // H3 heading
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className={`text-lg sm:text-xl font-black font-sans mt-5 mb-2 border-b pb-1.5 tracking-tight uppercase ${
              isDark ? 'text-white border-zinc-800' : 'text-zinc-955 border-zinc-150'
            }`}>
              {trimmed.substring(4)}
            </h3>
          );
        }
        
        // H4 heading
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className={`text-base font-bold font-sans mt-4 mb-2 uppercase tracking-wide ${
              isDark ? 'text-teal-400' : 'text-teal-700'
            }`}>
              {trimmed.substring(5)}
            </h4>
          );
        }

        // Bold lists or lines
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const rawText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-4 my-1.5">
              <span className="text-teal-500 mt-1.5 font-bold">•</span>
              <p className={`flex-1 font-sans text-xs sm:text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-705'}`}>
                {parseBoldText(rawText, isDark)}
              </p>
            </div>
          );
        }

        // Default paragraph
        return (
          <p key={idx} className={`font-sans text-xs sm:text-sm font-semibold leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-650'}`}>
            {parseBoldText(trimmed, isDark)}
          </p>
        );
      })}
    </div>
  );
}

// Convert **text** to bold markup
function parseBoldText(text: string, isDark = false) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => 
    index % 2 === 1 ? <strong key={index} className={`font-extrabold font-sans ${isDark ? 'text-teal-400' : 'text-zinc-950'}`}>{part}</strong> : part
  );
}

// Extract Presentation Slides elegantly from Markdown content
interface SlideItem {
  title: string;
  bullets: string[];
  visualElement: string | null;
}

function getSlidesFromContent(content: string): SlideItem[] {
  if (!content) return [];
  
  // Method 1: Split explicitly by slide break --- [slide] ---
  if (content.includes('--- [slide] ---')) {
    const slideChunks = content.split('--- [slide] ---');
    return slideChunks.map((chunk, idx) => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(l => l);
      let title = `Section ${idx + 1}`;
      const bullets: string[] = [];
      let visualElement: string | null = null;
      
      lines.forEach(line => {
        if (line.startsWith('### ') || line.startsWith('#### ') || line.startsWith('# ')) {
          title = line.replace(/^#+\s+/, '');
        } else if (line.startsWith('[image:') || line.startsWith('[smartart:') || line.startsWith('![')) {
          visualElement = line;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          bullets.push(line.substring(2));
        } else {
          bullets.push(line);
        }
      });
      return { title, bullets, visualElement };
    }).filter(s => s.title || s.bullets.length > 0 || s.visualElement);
  }

  // Method 2: Split by standard h3 headings (### )
  const sections = content.split('\n### ');
  const slides: SlideItem[] = [];
  
  sections.forEach((sect, idx) => {
    const lines = sect.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    
    let title = idx === 0 ? "Introduction & Overview" : lines[0].replace(/^###\s+/, '');
    const bulletLines = idx === 0 ? lines : lines.slice(1);
    const bullets: string[] = [];
    let visualElement: string | null = null;
    
    bulletLines.forEach(line => {
      if (line.startsWith('#### ')) {
        bullets.push(`**${line.substring(5)}**`);
      } else if (line.startsWith('[image:') || line.startsWith('[smartart:') || line.startsWith('![')) {
        visualElement = line;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        bullets.push(line.substring(2));
      } else if (line.length > 0) {
        bullets.push(line);
      }
    });
    
    slides.push({ title, bullets, visualElement });
  });
  
  return slides.filter(s => s.title || s.bullets.length > 0 || s.visualElement);
}

export function ContentLibrary() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'document' | 'presentation'>('document');
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [pdfInAppView, setPdfInAppView] = useState<'canvas' | 'text' | 'original'>('canvas');
  const [bypassSandboxWarning, setBypassSandboxWarning] = useState(false);
  const [proseZoom, setProseZoom] = useState<number>(1.0);

  const proseTouchStartDistRef = useRef<number | null>(null);
  const proseTouchStartZoomRef = useRef<number>(1.0);

  const handleProseTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      proseTouchStartDistRef.current = dist;
      proseTouchStartZoomRef.current = proseZoom;
    }
  };

  const handleProseTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && proseTouchStartDistRef.current !== null) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / proseTouchStartDistRef.current;
      const newZoom = Math.max(0.8, Math.min(2.5, proseTouchStartZoomRef.current * factor));
      setProseZoom(Number(newZoom.toFixed(2)));
    }
  };

  const handleProseTouchEnd = () => {
    proseTouchStartDistRef.current = null;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleDetailLoading, setArticleDetailLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Administrative / Simulator Modes
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mode Selection State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);

  // Input states for form additions
  const [subjectForm, setSubjectForm] = useState({ name: '', logo: 'BookOpen' });
  const [topicForm, setTopicForm] = useState({ name: '' });
  const [articleForm, setArticleForm] = useState({ headline: '', content: '', author_name: '' });
  
  // Standalone Books States
  const [books, setBooks] = useState<StandaloneBook[]>([]);
  const [activeBook, setActiveBook] = useState<StandaloneBook | null>(null);
  const [activeBookDoc, setActiveBookDoc] = useState<BookDocument | null>(null);
  const [bookDocuments, setBookDocuments] = useState<BookDocument[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookDocsLoading, setBookDocsLoading] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showBookDocUploadModal, setShowBookDocUploadModal] = useState(false);
  const [bookModalSuccess, setBookModalSuccess] = useState(false);
  const [docModalSuccess, setDocModalSuccess] = useState(false);
  const [editingBook, setEditingBook] = useState<StandaloneBook | null>(null);
  const [bookForm, setBookForm] = useState({ title: '', author_name: '', cover_color: 'teal' });
  const [bookDocForm, setBookDocForm] = useState({ title: '', author_name: '' });
  const [uploadingBookDoc, setUploadingBookDoc] = useState(false);
  const [selectedBookFile, setSelectedBookFile] = useState<File | null>(null);

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [insertMode, setInsertMode] = useState<'upload' | 'manual'>('upload');
  const [ownedArticleIds, setOwnedArticleIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('my_owned_article_ids') || '[]');
    } catch (e) {
      return [];
    }
  });

  const registerOwnedArticle = (id: number, authorName?: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem('my_owned_article_ids') || '[]');
      const updated = [...new Set([...stored, id])] as number[];
      setOwnedArticleIds(updated);
      localStorage.setItem('my_owned_article_ids', JSON.stringify(updated));
      if (authorName) {
        localStorage.setItem('my_author_name', authorName.trim());
      }
    } catch (e) {
      console.warn("localStorage sync error:", e);
    }
  };

  const [activeSection, setActiveSection] = useState<'textbook' | 'notes' | 'mcq'>('textbook');
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const [consoleSectionFilter, setConsoleSectionFilter] = useState<'all' | 'textbook' | 'notes' | 'mcq'>('all');
  const [consoleDeptFilter, setConsoleDeptFilter] = useState<string>('all');
  const [consoleSearchTerm, setConsoleSearchTerm] = useState<string>('');
  const [subjectArticles, setSubjectArticles] = useState<Article[]>([]);
  const [authorPrompt, setAuthorPrompt] = useState('');
  const [generatingMcq, setGeneratingMcq] = useState(false);
  const [quizUserAnswers, setQuizUserAnswers] = useState<{ [qIdx: number]: number }>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Custom user suggested AI headline prompt
  const [customAiHeadline, setCustomAiHeadline] = useState('');

  // Dynamic custom deletion state (Aesthetic replacement for confirm/prompt)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'subject' | 'topic' | 'article';
    id: number;
    title: string;
    authorName?: string;
  } | null>(null);
  const [deleteVerificationInput, setDeleteVerificationInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Global search & sequential data cache states
  const [globalArticles, setGlobalArticles] = useState<Article[]>([]);
  const [globalBookDocs, setGlobalBookDocs] = useState<BookDocument[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [textbookFilterType, setTextbookFilterType] = useState<'all' | 'pdf' | 'office'>('all');
  const [notesFilterAuthor, setNotesFilterAuthor] = useState('all');
  const [notesFilterType, setNotesFilterType] = useState<'all' | 'pdf' | 'office' | 'manual'>('all');

  // Client-Side MCQ Database Bank integration states
  const [libraryMcqs, setLibraryMcqs] = useState<any[]>([]);
  const [libraryMcqsLoading, setLibraryMcqsLoading] = useState(false);
  const [libraryMcqTab, setLibraryMcqTab] = useState<'lectures' | 'mcqs'>('lectures');
  const [mcqViewMode, setMcqViewMode] = useState<'interactive' | 'static'>('interactive');
  const [mcqCompletedAnswers, setMcqCompletedAnswers] = useState<{ [key: number]: string }>({});
  const [showStaticAnswers, setShowStaticAnswers] = useState(false);
  const [localNavbarHidden, setLocalNavbarHidden] = useState(false);
  const [readerToolbarHidden, setReaderToolbarHidden] = useState(false);
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);

  const fetchGlobalData = () => {
    fetch('/api/content/all-articles')
      .then(res => res.json())
      .then(data => setGlobalArticles(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching global articles:', err));

    fetch('/api/content/all-book-documents')
      .then(res => res.json())
      .then(data => setGlobalBookDocs(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error fetching global book docs:', err));
  };

  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = { ...additionalHeaders };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch subjects and verify admin role
  useEffect(() => {
    fetchSubjects();
    checkAdminStatus();
    fetchBooks();
    fetchGlobalData();
  }, []);

  const fetchBooks = () => {
    setBooksLoading(true);
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(Array.isArray(data) ? data : []);
        setBooksLoading(false);
      })
      .catch(err => {
        console.error('Error fetching books:', err);
        setBooksLoading(false);
      });
  };

  const fetchBookDocuments = (bookId: number) => {
    setBookDocsLoading(true);
    fetch(`/api/books/${bookId}/documents`)
      .then(res => res.json())
      .then(data => {
        setBookDocuments(Array.isArray(data) ? data : []);
        setBookDocsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching book documents:', err);
        setBookDocsLoading(false);
      });
  };

  const handleOpenBook = (book: StandaloneBook) => {
    setActiveBook(book);
    fetchBookDocuments(book.id);
  };

  const handleViewBookDocInApp = (doc: BookDocument) => {
    setActiveBookDoc(doc);
  };

  const handleCreateOrUpdateBook = () => {
    if (!bookForm.title) {
      setErrorMsg('Book title is required');
      return;
    }
    const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
    const method = editingBook ? 'PUT' : 'POST';
    const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';

    fetch(url, {
      method,
      headers,
      body: JSON.stringify(bookForm)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setBookModalSuccess(true);
          setSuccessMsg(editingBook ? 'Book updated successfully!' : 'Book created successfully!');
          fetchBooks();
          fetchGlobalData();
          
          setTimeout(() => {
            setBookForm({ title: '', author_name: '', cover_color: 'teal' });
            setEditingBook(null);
            setShowBookModal(false);
            setBookModalSuccess(false);
            setErrorMsg('');
            setSuccessMsg('');
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Error saving book:', err);
        setErrorMsg('Failed to save book');
      });
  };

  const handleDeleteBook = (bookId: number) => {
    const headers = getAuthHeaders();
    if (!window.confirm('Are you sure you want to delete this book? This will also remove all its uploaded documents.')) return;
    
    fetch(`/api/books/${bookId}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setSuccessMsg('Book deleted successfully');
          fetchBooks();
          fetchGlobalData();
          if (activeBook?.id === bookId) {
            setActiveBook(null);
          }
          setTimeout(() => { setErrorMsg(''); setSuccessMsg(''); }, 3000);
        }
      })
      .catch(err => {
        console.error('Error deleting book:', err);
        setErrorMsg('Failed to delete book');
      });
  };

  const handleUploadBookDoc = () => {
    if (!selectedBookFile) {
      setErrorMsg('Please select a file to upload');
      return;
    }
    if (!activeBook) return;

    // Enforce "only author can upload the documents"
    const storedAuthor = localStorage.getItem('my_author_name');
    const isBookAuthor = isAdmin || (storedAuthor && storedAuthor.toLowerCase().trim() === activeBook.author_name.toLowerCase().trim());
    if (!isBookAuthor) {
      setErrorMsg('Unauthorized: Only the author of this book is allowed to upload documents.');
      return;
    }

    setUploadingBookDoc(true);
    const formData = new FormData();
    formData.append('file', selectedBookFile);
    formData.append('title', bookDocForm.title || selectedBookFile.name);
    formData.append('author_name', bookDocForm.author_name || 'BMLT Scholar');

    const headers = getAuthHeaders();

    fetch(`/api/books/${activeBook.id}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.error);
          setUploadingBookDoc(false);
        } else {
          setDocModalSuccess(true);
          setSuccessMsg('Document uploaded successfully into book!');
          fetchBookDocuments(activeBook.id);
          fetchBooks();
          fetchGlobalData();
          
          setTimeout(() => {
            setSelectedBookFile(null);
            setBookDocForm({ title: '', author_name: '' });
            setShowBookDocUploadModal(false);
            setDocModalSuccess(false);
            setErrorMsg('');
            setSuccessMsg('');
            setUploadingBookDoc(false);
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Error uploading book document:', err);
        setErrorMsg('Failed to upload document');
        setUploadingBookDoc(false);
      });
  };

  const handleDeleteBookDoc = (docId: number) => {
    const headers = getAuthHeaders();
    if (!window.confirm('Are you sure you want to delete this document from the book?')) return;

    fetch(`/api/books/documents/${docId}`, {
      method: 'DELETE',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setSuccessMsg('Document deleted successfully');
          if (activeBook) {
            fetchBookDocuments(activeBook.id);
            fetchBooks();
            fetchGlobalData();
          }
          setTimeout(() => { setErrorMsg(''); setSuccessMsg(''); }, 3000);
        }
      })
      .catch(err => {
        console.error('Error deleting book document:', err);
        setErrorMsg('Failed to delete book document');
      });
  };

  const fetchSubjects = () => {
    setLoading(true);
    fetch('/api/content/subjects')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setSubjects(list);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching subjects:', err);
        setLoading(false);
      });
  };

  const checkAdminStatus = () => {
    const headers = getAuthHeaders();
    fetch('/api/admin/me', { headers })
      .then(res => res.json())
      .then(data => {
        if (data && data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  };

  // Refresh helpers for Textbook / Notes / MCQ
  const refreshSubjectArticles = (subjId: number) => {
    fetch(`/api/content/subjects/${subjId}/articles`)
      .then(res => res.json())
      .then(data => {
        setSubjectArticles(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error refreshing subject articles:', err));
  };

  const refreshTopicArticles = (topId: number) => {
    setArticlesLoading(true);
    fetch(`/api/content/topics/${topId}/articles`)
      .then(res => res.json())
      .then(data => {
        setArticles(Array.isArray(data) ? data : []);
        setArticlesLoading(false);
      })
      .catch(err => {
        console.error('Error refreshing topic articles:', err);
        setArticlesLoading(false);
      });
  };

  // Fetch topics when subject changes
  const handleSelectSubject = (subj: Subject | null) => {
    setActiveSubject(subj);
    setActiveTopic(null);
    setActiveArticle(null);
    setTopics([]); // CLEAR TOPICS OF PREVIOUS SUBJECT IMMEDIATELY
    setArticles([]); // CLEAR ARTICLES OF PREVIOUS SUBJECT IMMEDIATELY
    setSubjectArticles([]); // CLEAR ARTICLES OF PREVIOUS SUBJECT IMMEDIATELY
    setMcqCompletedAnswers({});
    setShowStaticAnswers(false);
    setLocalNavbarHidden(false);
    setReaderToolbarHidden(false);
    setMobileHeaderHidden(false);
    window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
    
    if (!subj) {
      setTopicsLoading(false);
      return;
    }

    setTopicsLoading(true);
    
    fetch(`/api/content/subjects/${subj.id}/topics`)
      .then(res => res.json())
      .then(data => {
        setTopics(Array.isArray(data) ? data : []);
        setTopicsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching topics:', err);
        setTopicsLoading(false);
      });

    // Also load subject-level articles
    refreshSubjectArticles(subj.id);
    fetchLibraryMcqs(subj.id, null);

    // Scroll smoothly to selected department section with a short retry helper if not mounted instantly
    setTimeout(() => {
      const el = document.getElementById('active-department-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setTimeout(() => {
          const elRetry = document.getElementById('active-department-section');
          if (elRetry) {
            elRetry.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 500, behavior: 'smooth' });
          }
        }, 150);
      }
    }, 120);
  };

  // Fetch articles when topic changes
  const handleSelectTopic = (top: Topic | null) => {
    setActiveTopic(top);
    setActiveArticle(null);
    setArticles([]); // CLEAR ARTICLES OF PREVIOUS TOPIC IMMEDIATELY
    setMcqCompletedAnswers({});
    setShowStaticAnswers(false);
    setLocalNavbarHidden(false);
    window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
    
    if (!top) {
      setArticlesLoading(false);
      return;
    }

    // Scroll immediately to workspace area
    setTimeout(() => {
      const el = document.getElementById('active-topic-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback scrolling down past the top header elements
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    }, 50);

    setArticlesLoading(true);
    fetch(`/api/content/topics/${top.id}/articles`)
      .then(res => res.json())
      .then(data => {
        setArticles(Array.isArray(data) ? data : []);
        setArticlesLoading(false);
        setTimeout(() => {
          const el = document.getElementById('active-topic-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      })
      .catch(err => {
        console.error('Error fetching articles:', err);
        setArticlesLoading(false);
      });

    if (activeSubject) {
      fetchLibraryMcqs(activeSubject.id, top.id);
    }
  };

  const fetchLibraryMcqs = (subjectId?: number | null, topicId?: number | null) => {
    setLibraryMcqsLoading(true);
    let url = '/api/public/mcqs';
    if (topicId) {
      url += `?topic_id=${topicId}`;
    } else if (subjectId) {
      url += `?subject_id=${subjectId}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setLibraryMcqs(Array.isArray(data) ? data : []);
        setLibraryMcqsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching library MCQs:', err);
        setLibraryMcqsLoading(false);
      });
  };

  // View individual article
  const handleSelectArticle = (artShort: Article) => {
    setArticleDetailLoading(true);
    setBypassSandboxWarning(false);
    fetch(`/api/content/articles/${artShort.id}`)
      .then(res => res.json())
      .then(data => {
        setActiveArticle(data);
        setArticleDetailLoading(false);
      })
      .catch(err => {
        console.error('Error fetching article content:', err);
        setArticleDetailLoading(false);
      });
  };

  // Subject Administration Functions
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name) return;
    setErrorMsg('');
    
    fetch('/api/content/subjects', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(subjectForm)
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to add subject');
        }
        return res.json();
      })
      .then(() => {
        setSubjectForm({ name: '', logo: 'BookOpen' });
        setShowSubjectModal(false);
        setSuccessMsg('Subject successfully created!');
        fetchSubjects();
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch(err => setErrorMsg(err.message));
  };

  const triggerDeleteSubject = (id: number, name: string) => {
    setDeleteConfirmTarget({ type: 'subject', id, title: name });
    setDeleteVerificationInput('');
    setDeleteError('');
  };

  // Topic Administration Functions
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicForm.name || !activeSubject) return;
    setErrorMsg('');

    fetch('/api/content/topics', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: topicForm.name, subject_id: activeSubject.id })
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to add topic');
        }
        return res.json();
      })
      .then(() => {
        setTopicForm({ name: '' });
        setShowTopicModal(false);
        setSuccessMsg('Topic successfully added!');
        if (activeSubject) handleSelectSubject(activeSubject);
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch(err => setErrorMsg(err.message));
  };

  const triggerDeleteTopic = (id: number, name: string) => {
    setDeleteConfirmTarget({ type: 'topic', id, title: name });
    setDeleteVerificationInput('');
    setDeleteError('');
  };

  // Article Contribution Functions (Authors and Admins)
  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.headline || !articleForm.content || !articleForm.author_name || !activeSubject) {
      setErrorMsg('Please populate all fields (author name, headline, and body).');
      return;
    }
    setErrorMsg('');

    const payload = {
      subject_id: activeSubject.id,
      topic_id: activeTopic ? activeTopic.id : null,
      section: activeSection,
      headline: articleForm.headline,
      content: articleForm.content,
      author_name: articleForm.author_name
    };

    fetch('/api/content/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to publish material');
        }
        return res.json();
      })
      .then((newArt) => {
        registerOwnedArticle(newArt.id, newArt.author_name);
        setArticleForm({ headline: '', content: '', author_name: '' });
        setShowArticleModal(false);
        setSuccessMsg('Academic material posted successfully!');
        fetchGlobalData();
        
        if (activeTopic) {
          refreshTopicArticles(activeTopic.id);
        } else {
          refreshSubjectArticles(activeSubject.id);
        }
        
        handleSelectArticle(newArt);
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch(err => setErrorMsg(err.message));
  };

  const handleUploadDocumentDoc = async (fileToUpload: File) => {
    if (!fileToUpload || !activeSubject) return;
    setUploadingDoc(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('subjectId', activeSubject.id.toString());
    formData.append('section', activeSection);
    formData.append('headline', articleForm.headline || fileToUpload.name);
    formData.append('author_name', articleForm.author_name || 'Academic Scholar');
    if (activeTopic) {
      formData.append('topicId', activeTopic.id.toString());
    }

    try {
      const res = await fetch('/api/content/articles/upload-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload document');
      }

      const newArt = await res.json();
      registerOwnedArticle(newArt.id, newArt.author_name);
      setSuccessMsg('Successfully uploaded and attached your educational document!');
      fetchGlobalData();
      
      if (activeTopic) {
        refreshTopicArticles(activeTopic.id);
      } else {
        refreshSubjectArticles(activeSubject.id);
      }
      
      handleSelectArticle(newArt);
      setShowArticleModal(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while loading file');
    } finally {
      setUploadingDoc(false);
    }
  };

  const triggerDeleteArticle = (id: number, headline: string, authorName?: string) => {
    setDeleteConfirmTarget({ type: 'article', id, title: headline, authorName });
    setDeleteVerificationInput('');
    setDeleteError('');
  };

  const executeDeleteAction = () => {
    if (!deleteConfirmTarget) return;

    const { type, id, title, authorName } = deleteConfirmTarget;

    // Call endpoints
    if (type === 'subject') {
      fetch(`/api/content/subjects/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error('Failed to delete subject');
          }
          if (activeSubject?.id === id) {
            setActiveSubject(null);
            setTopics([]);
            setArticles([]);
          }
          setSuccessMsg('Subject deleted successfully.');
          fetchSubjects();
          setDeleteConfirmTarget(null);
          setTimeout(() => setSuccessMsg(''), 4000);
        })
        .catch(err => {
          setDeleteError(err.message || 'Error occurred while deleting subject.');
        });
    } else if (type === 'topic') {
      fetch(`/api/content/topics/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error('Failed to delete topic');
          }
          if (activeTopic?.id === id) {
            setActiveTopic(null);
            setArticles([]);
          }
          if (activeSubject) {
            handleSelectSubject(activeSubject);
          }
          setSuccessMsg('Topic deleted successfully.');
          setDeleteConfirmTarget(null);
          setTimeout(() => setSuccessMsg(''), 4000);
        })
        .catch(err => {
          setDeleteError(err.message || 'Error occurred while deleting topic.');
        });
    } else if (type === 'article') {
      const storedAuthor = localStorage.getItem('my_author_name');
      const isOwner = ownedArticleIds.includes(id);
      const isNameMatch = !!(storedAuthor && authorName && 
        storedAuthor.toLowerCase().trim() === authorName.toLowerCase().trim());
      const isPermitted = isAdmin || isOwner || isNameMatch;

      if (!isPermitted && authorName) {
        if (deleteVerificationInput.toLowerCase().trim() !== authorName.toLowerCase().trim()) {
          setDeleteError(`Verification failed. Please enter the exact author name ("${authorName}").`);
          return;
        }
      }

      fetch(`/api/content/articles/${id}`, { method: 'DELETE' })
        .then(async res => {
          if (!res.ok) {
            throw new Error('Failed to delete article');
          }
          setSuccessMsg('Lecture Article deleted successfully.');
          fetchGlobalData();
          if (activeArticle?.id === id) {
            setActiveArticle(null);
          }
          if (activeTopic) refreshTopicArticles(activeTopic.id);
          if (activeSubject) refreshSubjectArticles(activeSubject.id);
          
          // Remove from local storage list
          try {
            const stored = JSON.parse(localStorage.getItem('my_owned_article_ids') || '[]');
            const updated = stored.filter((x: number) => x !== id);
            setOwnedArticleIds(updated);
            localStorage.setItem('my_owned_article_ids', JSON.stringify(updated));
          } catch (_) {}

          setDeleteConfirmTarget(null);
          setTimeout(() => setSuccessMsg(''), 4000);
        })
        .catch((err) => {
          setDeleteError('Failed to delete article.');
        });
    }
  };

  const handleStartEdit = (art: Article) => {
    setEditingArticle(art);
    setArticleForm({
      headline: art.headline,
      content: art.content,
      author_name: art.author_name
    });
    setShowEditModal(true);
  };

  const handleSaveArticleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !activeSubject) return;
    if (!articleForm.headline || !articleForm.content || !articleForm.author_name) {
      setErrorMsg('Please populate all fields to save.');
      return;
    }

    const payload = {
      headline: articleForm.headline,
      content: articleForm.content,
      author_name: articleForm.author_name,
      section: editingArticle.section || 'textbook',
      file_path: editingArticle.file_path || null
    };

    fetch(`/api/content/articles/${editingArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update article');
        }
        return res.json();
      })
      .then(() => {
        setSuccessMsg('Material customized and updated successfully!');
        fetchGlobalData();
        const updatedArt = { ...editingArticle, ...payload };
        
        if (activeSection === 'mcq' && activeTopic) {
          refreshTopicArticles(activeTopic.id);
        } else {
          refreshSubjectArticles(activeSubject.id);
        }

        setActiveArticle(updatedArt);
        setShowEditModal(false);
        setEditingArticle(null);
        setArticleForm({ headline: '', content: '', author_name: '' });
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg(err.message || 'Failed to update article');
      });
  };

  const handleGenerateMcqAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !activeTopic || !authorPrompt) {
      setErrorMsg('Please select a topic and enter instructions for the MCQ.');
      return;
    }
    setGeneratingMcq(true);
    setErrorMsg('');
    setSuccessMsg('');

    fetch('/api/content/mcq/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId: activeTopic.id,
        subjectId: activeSubject.id,
        authorPrompt: authorPrompt,
        authorName: 'AI MCQ Instructor',
        subjectName: activeSubject.name,
        topicName: activeTopic.name
      })
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to generate MCQs');
        }
        return res.json();
      })
      .then(newArt => {
        setSuccessMsg('Successfully created interactive MCQs!');
        refreshTopicArticles(activeTopic.id);
        handleSelectArticle(newArt);
        setAuthorPrompt('');
        setQuizFinished(false);
        setQuizUserAnswers({});
        setTimeout(() => setSuccessMsg(''), 4000);
      })
      .catch(err => {
        setErrorMsg(err.message || 'Error generating MCQs');
      })
      .finally(() => {
        setGeneratingMcq(false);
      });
  };

  // AI-Powered Article Generator Integration
  const handleBuildWithAI = (customHeadline?: string) => {
    const headlineToUse = customHeadline || customAiHeadline || 'Comprehensive Lab Diagnostic Guidelines';
    if (!activeTopic || !activeSubject) return;
    
    setGeneratingAI(true);
    setErrorMsg('');

    fetch('/api/content/articles/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId: activeTopic.id,
        headline: headlineToUse,
        topicName: activeTopic.name,
        subjectName: activeSubject.name
      })
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gemini AI was unable to compile the article');
        }
        return res.json();
      })
      .then((generatedArticle) => {
        registerOwnedArticle(generatedArticle.id, generatedArticle.author_name);
        setCustomAiHeadline('');
        setSuccessMsg('AI successfully constructed a complete 0-to-Hero Note!');
        if (activeTopic) handleSelectTopic(activeTopic);
        handleSelectArticle(generatedArticle);
        setTimeout(() => setSuccessMsg(''), 3000);
      })
      .catch(err => {
        setErrorMsg(err.message);
      })
      .finally(() => {
        setGeneratingAI(false);
      });
  };

  const renderActiveArticleContent = () => {
    if (!activeArticle) return null;

    // Check if it's a file upload (PDF/Word/PPTX)
    if (activeArticle.file_path) {
      const isPdf = activeArticle.file_path.toLowerCase().endsWith('.pdf');
      const isWord = activeArticle.file_path.toLowerCase().endsWith('.docx') || activeArticle.file_path.toLowerCase().endsWith('.doc');
      const isPpt = activeArticle.file_path.toLowerCase().endsWith('.pptx') || activeArticle.file_path.toLowerCase().endsWith('.ppt');

      // Check if text is actually extracted/parsed or has been uploaded
      const hasExtractedText = activeArticle.content && !activeArticle.content.startsWith('Document Attachment:');

      return (
        <div className="w-full h-full flex flex-col space-y-5 font-sans max-w-none min-h-[500px]" id="academic-attachment-container">
          {/* Document View Control Dashboard */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm select-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 border border-teal-150 rounded-xl flex items-center justify-center text-teal-600 font-bold shadow-sm shrink-0">
                {isPdf ? <FileText size={20} /> : isWord ? <FileText className="text-blue-600" size={20} /> : <Presentation className="text-amber-600" size={20} />}
              </div>
              <div className="text-left">
                <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-teal-700 leading-none mb-1">
                  ATTACHMENT & ACADEMIC DOCUMENT
                </span>
                <h4 className="text-xs sm:text-sm font-black text-zinc-950 font-display line-clamp-1 max-w-[250px] sm:max-w-md">
                  {activeArticle.headline}
                </h4>
              </div>
            </div>

            {/* Selector tabs for PDF/Word/PPT / Extracted Text view formats */}
            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center font-sans">
              {(isPdf || isWord || isPpt) && (
                <button
                  type="button"
                  onClick={() => setPdfInAppView(isPdf ? 'canvas' : 'original')}
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    pdfInAppView === (isPdf ? 'canvas' : 'original') || (!isPdf && pdfInAppView === 'canvas')
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                  }`}
                >
                  Document Viewer
                </button>
              )}

              {hasExtractedText && (
                <button
                  type="button"
                  onClick={() => setPdfInAppView('text')}
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    pdfInAppView === 'text'
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                  }`}
                >
                  Extracted Lectures
                </button>
              )}

              {isPdf && (
                <button
                  type="button"
                  onClick={() => setPdfInAppView('original')}
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    pdfInAppView === 'original'
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                  }`}
                >
                  Browser Embed
                </button>
              )}
            </div>
          </div>

          {/* Active View Display Panel */}
          <div className="flex-1 w-full flex justify-center items-start min-h-[550px]">
            {isPdf && pdfInAppView === 'canvas' && (
              <PdfJsViewer url={activeArticle.file_path} title={activeArticle.headline} allowDownload={activeArticle.allow_download !== 0} />
            )}

            {/* In-app preview for Office Word / PowerPoint documents */}
            {(isWord || isPpt) && (pdfInAppView === 'canvas' || pdfInAppView === 'original') && (
              <div className="w-full h-full flex flex-col space-y-4 font-sans max-w-none min-h-[500px]" id="office-document-preview-block">
                <div className="flex items-center justify-between text-white bg-zinc-900 px-3.5 py-2.5 rounded-xl border border-zinc-800 shrink-0 select-none">
                  <span className="text-xs font-bold font-mono tracking-wider text-teal-400 flex items-center gap-1.5 leading-none">
                    <FileText size={14} className={isWord ? "text-blue-400 animate-pulse" : "text-amber-400 animate-pulse"} /> 
                    <span>{isWord ? 'OFFICE MICROSOFT WORD IN-APP PREVIEW' : 'OFFICE POWERPOINT SLIDESHOW IN-APP PREVIEW'}</span>
                  </span>
                  {activeArticle.allow_download !== 0 && (
                    <div className="flex gap-2">
                      <a 
                        href={activeArticle.file_path} 
                        download={activeArticle.headline}
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-330 border border-zinc-750 font-bold uppercase tracking-wider px-3 py-1 rounded transition cursor-pointer"
                      >
                        Download ↓
                      </a>
                      <a 
                        href={activeArticle.file_path} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase tracking-wider px-3 py-1 rounded transition cursor-pointer"
                      >
                        Open Original ↗
                      </a>
                    </div>
                  )}
                </div>
                <div className="relative w-full flex-1 sm:rounded-xl sm:border border-zinc-300 overflow-hidden bg-white" style={{ minHeight: '620px' }}>
                  {(() => {
                    const isSandboxHost = window.location.hostname === 'localhost' || 
                                          window.location.hostname === '127.0.0.1' || 
                                          window.location.hostname.includes('run.app') || 
                                          window.location.hostname.includes('google.com') ||
                                          window.location.hostname.includes('ais-dev') || 
                                          window.location.hostname.includes('ais-pre');
                    
                    if (isSandboxHost && !bypassSandboxWarning) {
                      return (
                        <div className="absolute inset-0 bg-zinc-55/60 flex items-center justify-center p-6 text-zinc-900 select-text overflow-y-auto">
                          <div className="max-w-xl w-full bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-5 text-left">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                                <AlertCircle size={24} className="animate-pulse" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono font-extrabold tracking-wider text-amber-600 uppercase">
                                  Sandbox File Security Notice
                                </span>
                                <h3 className="text-md font-bold text-zinc-955 font-display">
                                  Why does Microsoft say "File not found"?
                                </h3>
                              </div>
                            </div>

                            <div className="text-xs text-zinc-650 leading-relaxed space-y-3 font-medium">
                              <p>
                                You are viewing this application inside a **secure, sandboxed preview container** (<code className="bg-zinc-100 px-1 py-0.5 rounded font-mono text-[10px] text-zinc-800">{window.location.hostname}</code>).
                              </p>
                              <p>
                                Microsoft Office's online viewer servers attempt to call your environment to download this file. Because your developer sandbox setup is private and password-protected, external Microsoft datacenters cannot access your files, resulting in Microsoft displaying a <strong>"File not found / not publicly accessible"</strong> message.
                              </p>
                              <p className="text-zinc-500 text-[11px] italic bg-teal-50/40 p-3 rounded-lg border border-teal-100/50">
                                <strong>Production Ready:</strong> Once this app is deployed or synced publicly, Microsoft's cloud servers will fetch the file cleanly and displays it flawlessly.
                              </p>
                            </div>

                            <div className="pt-3 border-t border-zinc-150 flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row gap-2">
                              {activeArticle.allow_download !== 0 ? (
                                <a
                                  href={activeArticle.file_path}
                                  download={activeArticle.headline}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 shadow-sm cursor-pointer select-none"
                                >
                                  <Download size={13} />
                                  <span>Download Document ↓</span>
                                </a>
                              ) : (
                                <div className="flex-1 p-2.5 bg-zinc-100 border border-zinc-250 text-zinc-500 text-[10px] font-bold uppercase tracking-widest text-center rounded-xl font-sans">
                                  🛡️ Direct Download Restricted
                                </div>
                              )}

                                {hasExtractedText && (
                                  <button
                                    type="button"
                                    onClick={() => setPdfInAppView('text')}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 border border-zinc-250 cursor-pointer select-none"
                                  >
                                    <FileText size={13} className="text-blue-600" />
                                    <span>Read Study Transcript</span>
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setBypassSandboxWarning(true)}
                                className="w-full text-center text-[10px] text-zinc-400 hover:text-teal-600 font-semibold underline py-1 transition cursor-pointer select-none"
                              >
                                Try loading viewer inside iframe anyway
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <iframe 
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                          activeArticle.file_path.startsWith('http') ? activeArticle.file_path : `${window.location.origin}${activeArticle.file_path}`
                        )}`} 
                        className="w-full h-full absolute inset-0 bg-white shadow-inner" 
                        referrerPolicy="no-referrer"
                        style={{ border: 'none' }}
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {hasExtractedText && pdfInAppView === 'text' && (
              <div className="w-full max-w-3xl bg-white sm:border border-zinc-200/80 sm:rounded-2xl p-2.5 sm:p-10 sm:shadow-sm text-left font-sans space-y-6">
                <div className="border-b border-zinc-150 pb-4 mb-2">
                  <div className="text-[10px] font-mono tracking-wider font-extrabold text-teal-700 uppercase mb-1">Extracted Textbook Study Transcript</div>
                  <h3 className="text-lg sm:text-2xl font-black text-zinc-955 font-display leading-tight">{activeArticle.headline}</h3>
                </div>
                <div className="text-zinc-850 text-[12.5px] sm:text-[14.5px] leading-relaxed whitespace-pre-line font-medium space-y-4">
                  {activeArticle.content}
                </div>
              </div>
            )}

            {isPdf && pdfInAppView === 'original' && (
              <div className="w-full h-full flex flex-col space-y-4 font-sans max-w-none min-h-[500px]">
                <div className="flex items-center justify-between text-white bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-800">
                  <span className="text-xs font-bold font-mono tracking-wider text-teal-400 flex items-center gap-1.5 leading-none">
                    <FileText size={14} /> STANDARD BROWSER PDF PLUGIN IFRAME
                  </span>
                  <div className="flex gap-2">
                    <a 
                      href={activeArticle.file_path} 
                      download={activeArticle.headline}
                      className="text-[10px] bg-zinc-855 hover:bg-zinc-700 text-zinc-350 border border-zinc-700 font-bold uppercase tracking-wider px-3 py-1 rounded transition cursor-pointer"
                    >
                      Download ↓
                    </a>
                    <a 
                      href={activeArticle.file_path} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] bg-teal-650 hover:bg-teal-500 text-white font-bold uppercase tracking-wider px-3 py-1 rounded transition cursor-pointer"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
                <div className="relative w-full flex-1 sm:rounded-xl sm:border border-zinc-300 overflow-hidden bg-white" style={{ minHeight: '620px' }}>
                  <iframe 
                    src={activeArticle.file_path} 
                    className="w-full h-full absolute inset-0 bg-white shadow-inner" 
                    referrerPolicy="no-referrer"
                    style={{ border: 'none' }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/95 text-zinc-300 p-3 rounded-xl border border-zinc-805 text-[10px] text-center leading-normal md:bottom-6 z-10">
                    <strong className="text-white block font-sans mb-0.5">⚠️ Frame Blocked or Loading Grey?</strong>
                    Chrome & Safari block nested PDF plug-ins inside sandboxed learning editors. Click <strong>Download</strong> or <strong>Open</strong> above, or toggle the <strong>Canvas Reader</strong> tab for an instant in-app view.
                  </div>
                </div>
              </div>
            )}

            {/* General Fallback layout for other types */}
            {(!isPdf && !isWord && !isPpt && (!hasExtractedText || pdfInAppView !== 'text')) && (
              <div className="w-full max-w-xl mx-auto space-y-6 bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 sm:p-8 font-sans text-center my-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                  <FileText size={36} className="text-zinc-500" />
                </div>
                <div className="space-y-1.5 text-center">
                  <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight leading-snug">
                    {activeArticle.headline}
                  </h3>
                  <p className="text-[10px] tracking-widest text-[#0ea5e9] font-black uppercase">
                    Document Attachment File
                  </p>
                </div>
                
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-left space-y-3">
                  <div className="text-xs text-zinc-650 leading-relaxed font-semibold">
                    <span className="block text-[9px] font-black uppercase text-zinc-400 mb-1 leading-none">Classroom Reference</span>
                    {activeArticle.content && activeArticle.content !== `Document Attachment: ${activeArticle.headline}` && !activeArticle.content.startsWith('Document Attachment:') ? (
                      <p className="line-clamp-4 italic text-zinc-500">{activeArticle.content}</p>
                    ) : (
                      "This original course file has been successfully attached. Use the secure download link below to explore."
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-zinc-200/60 pt-2.5 text-zinc-500 leading-none">
                    <div><strong>By:</strong> {activeArticle.author_name || 'Academic Scholar'}</div>
                    <div><strong>Unit:</strong> {activeSection ? activeSection.toUpperCase() : 'BMLT_DEPT'}</div>
                  </div>
                </div>

                {activeArticle.allow_download !== 0 && (
                  <div className="pt-2">
                    <a 
                      href={activeArticle.file_path} 
                      download={activeArticle.headline}
                      className="inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 transition-all text-sans cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download File</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Check if it's an MCQ section
    if (activeArticle.section === 'mcq') {
      let questions: Array<{
        question: string;
        options: string[];
        answerIndex: number;
        explanation: string;
      }> = [];

      try {
        questions = typeof activeArticle.content === 'string' 
          ? JSON.parse(activeArticle.content) 
          : activeArticle.content;
      } catch (e) {
        // Fallback below
      }

      if (Array.isArray(questions) && questions.length > 0) {
        return (
          <div className="w-full max-w-2xl mx-auto space-y-6 font-sans py-4">
            <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-2xl text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-500 text-black font-extrabold rounded-lg flex items-center justify-center text-xs shadow">?</div>
                <div className="text-left font-sans">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-teal-400 leading-none mb-0.5">Interactive Student Quiz Room</span>
                  <h4 className="text-xs font-bold truncate max-w-[200px] sm:max-w-xs">{activeArticle.headline}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuizUserAnswers({});
                  setQuizFinished(false);
                }}
                className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-zinc-700 transition active:scale-95"
              >
                Reset Quiz
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => {
                const selectedOption = quizUserAnswers[qIdx];
                const hasAnswered = selectedOption !== undefined;
                const isCorrect = hasAnswered && selectedOption === q.answerIndex;

                return (
                  <div key={qIdx} className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-sm space-y-4 text-left">
                    <div className="flex items-start gap-2.5">
                      <span className="bg-teal-50 text-teal-700 border border-teal-150 font-mono text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <h4 className="text-zinc-950 font-extrabold text-[12px] sm:text-[13.5px] leading-relaxed">
                        {q.question}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pl-0 sm:pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isThisSelected = selectedOption === optIdx;
                        const isCorrectAnswer = optIdx === q.answerIndex;

                        let borderStyle = "border-zinc-200 hover:border-zinc-300 bg-zinc-50";
                        let badge = null;

                        if (hasAnswered) {
                          if (isThisSelected) {
                            if (isCorrectAnswer) {
                              borderStyle = "border-emerald-500 bg-emerald-50 text-emerald-955";
                              badge = "✓ Selected";
                            } else {
                              borderStyle = "border-rose-400 bg-rose-50 text-rose-955";
                              badge = "✗ Incorrect";
                            }
                          } else if (isCorrectAnswer) {
                            borderStyle = "border-emerald-500 bg-emerald-50/40 text-emerald-955";
                            badge = "Correct Ans";
                          } else {
                            borderStyle = "border-zinc-200 opacity-60 bg-zinc-50";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={hasAnswered}
                            type="button"
                            onClick={() => {
                              setQuizUserAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                            }}
                            className={`w-full p-2.5 px-3.5 rounded-xl text-left text-xs font-semibold leading-normal transition-all border block ${borderStyle}`}
                          >
                            <div className="flex items-center justify-between gap-3 font-sans">
                              <span className="flex-1">{opt}</span>
                              {badge && (
                                <span className="text-[8px] uppercase font-black tracking-wider shrink-0 font-mono">
                                  {badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {hasAnswered && (
                      <div className={`p-4 rounded-xl border pl-10 relative font-sans animate-fade-in ${
                        isCorrect 
                          ? 'bg-emerald-50/50 border-emerald-150 text-emerald-955' 
                          : 'bg-rose-50/50 border-rose-150 text-rose-955'
                      }`}>
                        <div className="absolute left-3.5 top-4 text-xs font-black">
                          {isCorrect ? '✓' : '✗'}
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Study Explanation</span>
                          <p className="text-[11px] sm:text-xs font-semibold leading-relaxed font-sans">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {Object.keys(quizUserAnswers).length === questions.length && (
              <div className="bg-gradient-to-tr from-zinc-900 to-teal-950 border border-teal-900 text-white p-6 rounded-2xl text-center space-y-3 shadow-xl font-sans">
                <span className="text-[8px] font-black uppercase tracking-widest text-teal-400 font-mono">Evaluation Metrics Complete</span>
                <h3 className="text-md sm:text-lg font-black tracking-tight leading-none">Diagnostic Practice Score</h3>
                
                <div className="text-3xl font-black font-mono tracking-tight text-teal-300">
                  {
                    questions.filter((q, idx) => quizUserAnswers[idx] === q.answerIndex).length
                  } / {questions.length} Correct
                </div>

                <p className="text-zinc-400 text-xs font-semibold max-w-sm mx-auto leading-relaxed">
                  Review the rationales above to solidify your clinical diagnostics knowledge!
                </p>
              </div>
            )}
          </div>
        );
      }
    }

    // Default Slide Reader presentation mode
    if (viewMode === 'presentation') {
      const slides = getSlidesFromContent(activeArticle.content);
      if (slides.length === 0) return <p className="text-zinc-400 font-medium italic p-10">No slide splits detected. View as Document instead.</p>;
      const currentSlide = slides[Math.min(currentSlideIdx, slides.length - 1)] || slides[0];
      return (
        <div className="w-full max-w-xl space-y-4 font-sans py-4">
          <div className="flex items-center justify-between text-[11px] text-zinc-300 bg-zinc-900 border border-zinc-700 p-3 rounded-xl font-mono">
            <span className="font-bold text-teal-400 flex items-center gap-1"><Presentation size={12} /> INTERACTIVE ACADEMIC BENCH SLIDEWALK</span>
            <span className="font-extrabold">SLIDE {currentSlideIdx + 1} OF {slides.length}</span>
          </div>

          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-400 to-indigo-400 h-full transition-all duration-300"
              style={{ width: `${((currentSlideIdx + 1) / slides.length) * 105}%` }}
            />
          </div>

          <motion.div
            key={currentSlideIdx}
            initial={{ opacity: 0, scale: 0.99, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-9 min-h-[340px] flex flex-col justify-between border-2 border-zinc-800 shadow-2xl relative overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-4">
              <h4 className="text-sm font-black text-teal-400 uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
                {currentSlide.title}
              </h4>

              {currentSlide.visualElement ? (
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-white">
                  <SimpleMarkdownRenderer content={currentSlide.visualElement} isDark={true} />
                </div>
              ) : null}

              {currentSlide.bullets.length > 0 ? (
                <ul className="space-y-3 mt-1.5">
                  {currentSlide.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-1.5 text-xs text-zinc-300 leading-relaxed font-semibold font-sans">
                      <span className="text-teal-400 mt-1 shrink-0">&bull;</span>
                      <span className="flex-1">{parseBoldText(bullet, true)}</span>
                    </li>
                  ))}
                </ul>
              ) : !currentSlide.visualElement ? (
                <p className="text-zinc-500 italic text-xs leading-normal">Refer to document view for complete tables and academic reference appendix.</p>
              ) : null}
            </div>

            <div className="pt-4 border-t border-zinc-900 text-[8px] font-mono tracking-widest text-zinc-500 flex items-center justify-between uppercase mt-4">
              <span>B.Sc. MLT BENCH REFERENCE</span>
              <span>PAGE {currentSlideIdx + 1} OF {slides.length}</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              disabled={currentSlideIdx === 0}
              onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
              className="flex items-center justify-center gap-1.5 p-3.5 border border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 active:scale-97"
            >
              <ChevronLeft size={14} />
              <span>Previous Slide</span>
            </button>
            <button
              type="button"
              disabled={currentSlideIdx === slides.length - 1}
              onClick={() => setCurrentSlideIdx(prev => Math.min(slides.length - 1, prev + 1))}
              className="flex items-center justify-center gap-1.5 p-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 active:scale-97 shadow-lg"
            >
              <span>Next Slide</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      );
    }

    // Otherwise Document View (A4 sheet paper)
    return (
      <div className="space-y-4 w-full max-w-5xl mx-auto self-start font-sans">
        {/* Navigation & Zoom Bar */}
        <div className="flex items-center justify-between pb-1 select-none flex-wrap gap-2">
          {!isMobile ? (
            <button
              onClick={() => setActiveArticle(null)}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-600 hover:text-teal-800 bg-white border border-zinc-200 hover:bg-zinc-50 px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Close Reader & Return</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setProseZoom(z => Math.max(0.7, z - 0.1))}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-650 hover:text-black transition active:scale-90"
              title="Zoom Out Notes"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono font-black text-zinc-650 w-12 text-center select-none">
              {Math.round(proseZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setProseZoom(z => Math.min(2.5, z + 0.1))}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-650 hover:text-black transition active:scale-90"
              title="Zoom In Notes"
            >
              <ZoomIn size={13} />
            </button>
            {proseZoom !== 1.0 && (
              <button
                type="button"
                onClick={() => setProseZoom(1.0)}
                className="text-[9px] font-black text-teal-600 hover:text-teal-800 ml-1 border-l pl-2 cursor-pointer uppercase"
              >
                Fit
              </button>
            )}
          </div>
        </div>

        <div 
          className="bg-white text-zinc-900 sm:shadow-2xl w-full px-3 sm:px-10 sm:py-12 select-text relative sm:border border-zinc-300 sm:rounded-lg text-left overflow-x-hidden"
          style={{ minHeight: isMobile ? 'auto' : '680px' }}
          onTouchStart={handleProseTouchStart}
          onTouchMove={handleProseTouchMove}
          onTouchEnd={handleProseTouchEnd}
          onTouchCancel={handleProseTouchEnd}
        >
        <div className="border border-double border-zinc-800 p-2 text-center mb-6 bg-zinc-50/50 select-none">
          <div className="text-[8px] sm:text-[9px] tracking-[0.25em] font-black uppercase text-zinc-500 mb-0.5 font-mono">
            DEPARTMENT OF {activeSubject ? activeSubject.name.toUpperCase() : 'MEDICAL LABORATORY TECHNOLOGY'}
          </div>
          <div className="w-12 h-[1px] bg-zinc-400 mx-auto my-1" />
          <div className="text-[10px] sm:text-[11px] font-extrabold uppercase text-teal-800 tracking-wider">
            SECTION DIRECTORY: {activeSection ? activeSection.toUpperCase() : 'TEXTBOOK'}
          </div>
          <div className="text-[8px] text-zinc-400 font-semibold font-mono tracking-wide mt-1">
            DIAGNOSTIC & ACADEMIC HUB MANUALS SERIES &bull; CLASSIFIED ACADEMIC STUDY NOTE &bull; 2-FINGER TOUCH PINCH TO ZOOM SUPPORTED
          </div>
        </div>

        <div className="absolute right-8 top-20 pointer-events-none select-none opacity-[0.06] text-zinc-850 border-2 border-dashed border-zinc-850 p-2 rotate-12 shrink-0">
          <div className="text-[8px] font-black uppercase tracking-wider text-center">Departmental</div>
          <div className="text-[12px] font-black uppercase tracking-widest text-center">BMLT ASSAY</div>
          <div className="text-[6px] font-bold tracking-wider text-center">VERIFIED NOTE</div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-y border-zinc-800 py-2.5 mb-6 font-mono text-[9px] text-zinc-650 tracking-tight leading-relaxed select-none">
          <div>
            <span className="font-extrabold text-zinc-900 font-mono">DOCUMENT ID:</span> #BMLT-{activeArticle.id}-{(activeArticle.headline || '').substring(0,3).toUpperCase()}
          </div>
          <div className="text-right">
            <span className="font-extrabold text-zinc-900 font-mono">ACADEMIC AUTHOR:</span> {activeArticle.author_name || 'FACULTY'}
          </div>
          <div>
            <span className="font-extrabold text-zinc-900 font-mono">PROGRAM SERIES:</span> B.Sc. MEDICAL LAB TECHNOLOGY
          </div>
          <div className="text-right">
            <span className="font-extrabold text-[#0d9488] font-mono">VERIFICATION:</span> {activeArticle.is_ai_generated === 1 ? 'GEMINI ACTIVE' : 'PEER DECLARED'}
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-black text-zinc-900 font-sans tracking-tight leading-snug border-l-4 border-teal-650 pl-3.5 py-0.5">
            {activeArticle.headline}
          </h1>
        </div>

        <div 
          id="academic-pdf-prose-content" 
          className="prose prose-zinc max-w-none text-zinc-950 space-y-4 leading-relaxed select-text font-sans break-words"
          style={{ 
            fontSize: `${proseZoom * 13.5}px`,
            lineHeight: 1.6
          }}
        >
          <SimpleMarkdownRenderer content={activeArticle.content} />
        </div>

        <div className="mt-12 pt-4 border-t border-zinc-200 flex items-center justify-between text-[8px] sm:text-[9px] text-zinc-400 font-mono tracking-wider select-none">
          <span>BMLT CAMPUS DESK NOTES &middot; EDUCATIONAL MATERIAL &middot; FONT SIZE ADJUSTED</span>
          <span>PAGE 1 OF 1</span>
        </div>
      </div>
    </div>
    );
  };

  const renderAdminConsoleDashboard = () => {
    // Collect all database rows
    const rows: {
      uniqueKey: string;
      id: number;
      title: string;
      author: string;
      type: string;
      section: 'textbook' | 'notes' | 'mcq';
      department: string;
      createdAt: string;
      originalItem: any;
    }[] = [];

    // Add textbook chapters
    globalBookDocs.forEach(d => {
      const parentBook = books.find(b => b.id === d.book_id);
      rows.push({
        uniqueKey: `bookdoc-${d.id}`,
        id: d.id,
        title: d.title,
        author: d.author_name || 'Generic Author',
        type: 'Textbook Chapter',
        section: 'textbook',
        department: parentBook ? parentBook.title : 'General Textbook',
        createdAt: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent',
        originalItem: d
      });
    });

    // Add lecture notes / MCQs
    globalArticles.forEach(a => {
      const parentSubject = subjects.find(s => s.id === a.subject_id);
      const isMcq = a.section === 'mcq';
      rows.push({
        uniqueKey: `article-${a.id}`,
        id: a.id,
        title: a.headline,
        author: a.author_name || 'Dr. S. K. Safin',
        type: isMcq ? 'MCQ Practice Sheet' : 'Lecture Note',
        section: isMcq ? 'mcq' : 'notes',
        department: parentSubject ? parentSubject.name : 'General Syllabus',
        createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent',
        originalItem: a
      });
    });

    // Arrange sequentially by Section respected orders (1. Textbooks, 2. Lecture Notes, 3. MCQs), then by ID descending (newest first)
    const sortedRawRows = rows.sort((a, b) => {
      const sectionOrder = { 'textbook': 1, 'notes': 2, 'mcq': 3 };
      if (sectionOrder[a.section] !== sectionOrder[b.section]) {
        return sectionOrder[a.section] - sectionOrder[b.section];
      }
      return b.id - a.id;
    });

    // Apply Filters
    const filteredRows = sortedRawRows.filter(row => {
      // 1. Section Filter
      if (consoleSectionFilter !== 'all' && row.section !== consoleSectionFilter) {
        return false;
      }
      // 2. Department Filter
      if (consoleDeptFilter !== 'all' && row.department !== consoleDeptFilter) {
        return false;
      }
      // 3. Search Term Filter
      if (consoleSearchTerm) {
        const needle = consoleSearchTerm.toLowerCase();
        return row.title.toLowerCase().includes(needle) || row.author.toLowerCase().includes(needle);
      }
      return true;
    });

    // Extract dynamic unique departments for filtering options
    const uniqueDepartments = Array.from(new Set(sortedRawRows.map(r => r.department)));

    // Textbook Document rename inline logic
    const handleRenameBookDocInline = async (docId: number, currentTitle: string) => {
      const newTitle = prompt("Enter new title for this Textbook Document:", currentTitle);
      if (newTitle && newTitle.trim()) {
        try {
          const res = await fetch(`/api/content/book-document/${docId}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle.trim() })
          });
          if (res.ok) {
            setSuccessMsg("Document title updated successfully!");
            setTimeout(() => setSuccessMsg(''), 4000);
            fetchGlobalData(); // Sync live cache
          } else {
            setErrorMsg("Failed to rename document.");
            setTimeout(() => setErrorMsg(''), 4000);
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Error renaming document.");
          setTimeout(() => setErrorMsg(''), 4000);
        }
      }
    };

    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-4 sm:p-8 text-left space-y-6 shadow-lg max-w-7xl mx-auto mb-10 animate-fade-in font-sans">
        
        {/* Console Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                Author & Editor Panel
              </span>
              <span className="text-xs text-zinc-400 font-mono">Sequential Database Sync: Active</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 mt-1 flex items-center gap-2">
              🛠️ Academic Database Console
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Consolidated view of all uploads arranged sequentially by respected sections. Total entries: <span className="font-bold text-zinc-850">{sortedRawRows.length}</span>
            </p>
          </div>
          
          {/* Quick Create Buttons directly inside console for true full CRUD access */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingBook(null);
                setBookForm({ title: '', author_name: 'Dr. S. K. Safin', cover_color: 'teal' });
                setShowBookModal(true);
              }}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Plus size={11} /> Create Book
            </button>
            <button
              onClick={() => {
                if (books.length === 0) {
                  alert("Please create a Book volume before uploading chapters.");
                  return;
                }
                if (!activeBook) {
                  setActiveBook(books[0]);
                }
                setShowBookDocUploadModal(true);
              }}
              className="px-3 py-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Plus size={11} /> Upload Book Doc
            </button>
            <button
              onClick={() => {
                alert("To draft or write a new lecture note or MCQ practice sheet, select any department or folder from the 'Syllabus Departments' section below, choose a topic, and click '+ Add Document'. This guarantees correct syllabus categorization!");
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Plus size={11} /> Write note
            </button>
          </div>
        </div>

        {/* Dynamic Section Filters */}
        <div className="bg-zinc-50 border border-zinc-200/60 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Search Box */}
          <div className="space-y-1.5 font-sans">
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Search Title & Author</label>
            <input
              type="text"
              value={consoleSearchTerm}
              onChange={(e) => setConsoleSearchTerm(e.target.value)}
              placeholder="e.g. hematology, Dr. Safin..."
              className="w-full bg-white border border-zinc-200 p-2 text-xs rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
            />
          </div>

          {/* 2. Respected Section Dropdown Filter */}
          <div className="space-y-1.5 font-sans">
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Respected Section Filter</label>
            <select
              value={consoleSectionFilter}
              onChange={(e: any) => setConsoleSectionFilter(e.target.value)}
              className="w-full bg-white border border-zinc-200 p-2 text-xs rounded-xl focus:outline-none focus:border-teal-500 font-semibold text-zinc-800"
            >
              <option value="all">All Sections (Arranged Sequentially)</option>
              <option value="textbook">📙 Textbook Reference Chapters</option>
              <option value="notes">📝 Lecture Notes & Brief Slides</option>
              <option value="mcq">❓ MCQ Test Practice Boards</option>
            </select>
          </div>

          {/* 3. Department Volume Dropdown Filter */}
          <div className="space-y-1.5 font-sans">
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Department or Book context</label>
            <select
              value={consoleDeptFilter}
              onChange={(e) => setConsoleDeptFilter(e.target.value)}
              className="w-full bg-white border border-zinc-200 p-2 text-xs rounded-xl focus:outline-none focus:border-teal-500 font-semibold text-zinc-800"
            >
              <option value="all">All Syllabus Divisions & Volumes</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Database List rendering */}
        {filteredRows.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-200 bg-zinc-50 rounded-2xl select-none">
            <p className="text-zinc-400 font-bold text-xs">No sequential documents found matching the designated filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-zinc-150 rounded-2xl shadow-xs">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase font-black tracking-wider text-zinc-500 select-none">
                  <th className="p-3 w-12 text-center">ID</th>
                  <th className="p-3 w-36">Respected Section</th>
                  <th className="p-3">Document Title</th>
                  <th className="p-3 w-40">Author</th>
                  <th className="p-3 w-48 font-sans">Scope Context</th>
                  <th className="p-3 w-28 text-center">Date</th>
                  <th className="p-3 w-36 text-center">CRUD Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRows.map((row) => (
                  <tr key={row.uniqueKey} className="hover:bg-zinc-50/70 transition">
                    <td className="p-3 text-center text-zinc-400 font-mono text-[10px] font-bold">#{row.id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider font-extrabold ${
                        row.section === 'textbook' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        row.section === 'notes' ? 'bg-teal-50 text-teal-650 border border-teal-150' :
                        'bg-purple-50 text-purple-650 border border-purple-150'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-zinc-800 break-words max-w-[280px]">
                      {row.title}
                    </td>
                    <td className="p-3 text-zinc-500 font-semibold">{row.author}</td>
                    <td className="p-3 truncate max-w-[170px] text-zinc-650 font-medium">
                      {row.department}
                    </td>
                    <td className="p-3 text-center text-zinc-400 font-mono text-[9px]">{row.createdAt}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Edit Button */}
                        <button
                          onClick={() => {
                            if (row.section === 'textbook') {
                              handleRenameBookDocInline(row.id, row.title);
                            } else {
                              handleStartEdit(row.originalItem);
                            }
                          }}
                          className="px-2 py-1 border border-zinc-200 hover:border-teal-300 hover:bg-teal-50 text-zinc-650 hover:text-teal-700 rounded-md text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-inner transition"
                          title="Modify Document"
                        >
                          Modify
                        </button>

                        {/* 2. Delete Button */}
                        <button
                          onClick={async () => {
                            if (row.section === 'textbook') {
                              if (confirm(`Are you absolutely sure you want to delete Textbook Document "${row.title}"?`)) {
                                try {
                                  await handleDeleteBookDoc(row.id);
                                  fetchGlobalData();
                                } catch (e) {
                                  setErrorMsg("Failed to delete.");
                                  setTimeout(() => setErrorMsg(''), 4000);
                                }
                              }
                            } else {
                              triggerDeleteArticle(row.originalItem.id, row.originalItem.headline, row.originalItem.author_name);
                            }
                          }}
                          className="px-2 py-1 border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-md text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-inner transition"
                          title="Delete Document"
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-zinc-150">
              {filteredRows.map((row) => (
                <div key={row.uniqueKey} className="p-4 space-y-3 hover:bg-zinc-50/50 transition bg-white text-left font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-zinc-400">ID: #{row.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-mono uppercase tracking-wider font-extrabold ${
                      row.section === 'textbook' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      row.section === 'notes' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                      'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      {row.type}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-800 leading-snug">{row.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Author: {row.author} &bull; Scope: {row.department}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-[9px] text-zinc-400">
                    <span>Uploaded: {row.createdAt}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (row.section === 'textbook') {
                            handleRenameBookDocInline(row.id, row.title);
                          } else {
                            handleStartEdit(row.originalItem);
                          }
                        }}
                        className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-[9.5px] font-bold text-zinc-600 cursor-pointer"
                      >
                        Modify
                      </button>
                      <button
                        onClick={async () => {
                          if (row.section === 'textbook') {
                            if (confirm(`Remove textbook document "${row.title}" permanently?`)) {
                              await handleDeleteBookDoc(row.id);
                              fetchGlobalData();
                            }
                          } else {
                            triggerDeleteArticle(row.originalItem.id, row.originalItem.headline, row.originalItem.author_name);
                          }
                        }}
                        className="px-2 py-1 bg-rose-50 border border-rose-100 rounded text-[9.5px] font-bold text-rose-600 cursor-pointer"
                      >
                        Purge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSearchResults = () => {
    const q = librarySearchQuery.toLowerCase().trim();
    if (!q) return null;

    // Filter Books
    const matchedBooks = books.filter(
      b => b.title.toLowerCase().includes(q) || b.author_name.toLowerCase().includes(q)
    );

    // Filter Book Docs
    const matchedBookDocs = globalBookDocs.filter(
      d => d.title.toLowerCase().includes(q) || d.author_name.toLowerCase().includes(q)
    );

    // Filter Articles / Notes / MCQs
    const matchedArticles = globalArticles.filter(
      a => a.headline.toLowerCase().includes(q) || 
           a.author_name.toLowerCase().includes(q) || 
           (a.content || '').toLowerCase().includes(q)
    );

    const totalResults = matchedBooks.length + matchedBookDocs.length + matchedArticles.length;

    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 text-left space-y-8 shadow-xl animate-fade-in max-w-7xl mx-auto mb-10">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 select-none">
          <div>
            <h2 className="text-sm font-black uppercase text-teal-600 tracking-wider">
              Search Results
            </h2>
            <p className="text-xs text-zinc-500 font-semibold">
              Found {totalResults} matching item(s) for "<span className="text-zinc-800 font-bold">{librarySearchQuery}</span>"
            </p>
          </div>
          <button
            onClick={() => setLibrarySearchQuery('')}
            className="px-3.5 py-1.5 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
          >
            ✕ Clear Search
          </button>
        </div>

        {totalResults === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-sm font-black text-zinc-800">No matching documents or textbooks found</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Try searching for common medical lab terms like "hematology", "biochemistry", "pathology", or general guidelines.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* MATCHED BOOKS (TEXTBOOKS) */}
            {matchedBooks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  📚 Reference Volumes ({matchedBooks.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {matchedBooks.map(b => (
                    <div
                      key={b.id}
                      onClick={() => {
                        handleOpenBook(b);
                        setLibrarySearchQuery(''); // Clear search on open to read
                      }}
                      className="p-4 rounded-2xl bg-zinc-50 hover:bg-teal-50 border border-zinc-200 hover:border-teal-300 transition duration-250 cursor-pointer flex gap-3 items-center"
                    >
                      <div className="w-9 h-11 bg-teal-650 rounded-lg flex items-center justify-center text-white text-md shadow-xs shrink-0 select-none font-bold">
                        📖
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-zinc-900 truncate leading-snug">{b.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">By {b.author_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MATCHED BOOK DOCUMENTS (CHAPTERS) */}
            {matchedBookDocs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  📁 Book Chapters & Files ({matchedBookDocs.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedBookDocs.map(d => (
                    <div
                      key={d.id}
                      onClick={() => {
                        // Find the book containing this document to set open states properly
                        const parentBook = books.find(b => b.id === d.book_id);
                        if (parentBook) {
                          handleSelectSubject(null as any); // Clear drill down to prevent overlay clash
                          handleOpenBook(parentBook);
                          handleViewBookDocInApp(d);
                          setLibrarySearchQuery('');
                        } else {
                          // Fallback to viewing in app directly
                          handleViewBookDocInApp(d);
                          setLibrarySearchQuery('');
                        }
                      }}
                      className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-teal-550 hover:bg-teal-50 border border-zinc-200 hover:border-teal-300 transition duration-250 cursor-pointer flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 font-sans">
                        <div className="w-8 h-8 bg-zinc-150 rounded-lg flex items-center justify-center text-teal-650 shrink-0 font-bold text-xs select-none">
                          📄
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-zinc-850 truncate leading-snug">{d.title}</h4>
                          <p className="text-[9.5px] text-zinc-500 font-medium">BMLT Textbook Document</p>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-mono tracking-wider font-extrabold text-teal-650 uppercase bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md shrink-0 select-none">
                        Open Chapter
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MATCHED ARTICLES (NOTES, MCQS) */}
            {matchedArticles.length > 0 && (
              <div className="space-y-3 font-sans">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  📝 Lecture Slides & Academic Sheets ({matchedArticles.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedArticles.map(a => {
                    const isMcq = a.section === 'mcq';
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          // Resolve activeSubject/activeTopic so that layout compiles standard reading mode
                          const subjectObj = subjects.find(s => s.id === a.subject_id);
                          if (subjectObj) {
                            setActiveSubject(subjectObj);
                            // Set list so previous/next pagination works natively
                            refreshSubjectArticles(subjectObj.id);

                            // Fetch the topics of this subject to resolve activeTopic!
                            fetch(`/api/content/subjects/${subjectObj.id}/topics`)
                              .then(r => r.json())
                              .then(topicsList => {
                                setTopics(Array.isArray(topicsList) ? topicsList : []);
                                if (Array.isArray(topicsList)) {
                                  const topicObj = topicsList.find(t => t.id === a.topic_id);
                                  if (topicObj) {
                                    setActiveTopic(topicObj);
                                  }
                                }
                              })
                              .catch(err => console.error('Error auto-resolving search topic:', err));
                          }
                          handleSelectArticle(a);
                          setLibrarySearchQuery('');
                        }}
                        className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-teal-550 hover:bg-teal-50 border border-zinc-200 hover:border-teal-300 transition duration-250 cursor-pointer flex items-center justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none ${isMcq ? 'bg-amber-100' : 'bg-teal-50'}`}>
                            {isMcq ? '❓' : '📄'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-zinc-850 truncate leading-snug">{a.headline}</h4>
                            <p className="text-[9.5px] text-zinc-500 font-medium">
                              Author: {a.author_name} &bull; SECTION: {isMcq ? 'MCQ PRACTICE' : 'LECTURE DECK'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[8.5px] font-mono tracking-wider font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 border select-none ${
                          isMcq 
                            ? 'bg-amber-50 text-amber-500 border-amber-200' 
                            : 'bg-teal-50 text-teal-650 border-teal-150'
                        }`}>
                          Read Note
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={activeArticle ? "min-h-screen bg-zinc-50/50 pb-24 pt-0 sm:pt-8 font-sans" : "min-h-screen bg-zinc-50/50 pb-24 pt-4 sm:pt-8 font-sans"}>
      
      {/* MOBILE FULLSCREEN BOOK VIEW OVERLAY */}
      {isMobile && activeBook && (
        <div className="fixed inset-0 z-[65] w-screen h-screen flex flex-col font-sans bg-zinc-50 select-none overflow-hidden" id="mobile-fullscreen-book-view-container" style={{ margin: 0, padding: 0 }}>
          {/* Mobile top header navigation bar */}
          <div className="bg-zinc-950 px-2 py-1.5 flex items-center justify-between gap-2 text-xs text-white shrink-0 shadow-md">
            <div className="flex items-center gap-1.5 max-w-[62%]">
              <button
                type="button"
                onClick={() => {
                  setActiveBook(null);
                  setActiveBookDoc(null);
                }}
                className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-wider px-1.5 py-1 rounded-lg border border-zinc-700 cursor-pointer text-[8.5px]"
              >
                <ArrowLeft size={10} className="text-teal-400" />
                <span>Back</span>
              </button>
              <div className="text-left min-w-0">
                <span className="block text-[6.5px] font-mono font-black tracking-widest text-[#2dd4bf] uppercase leading-none mb-0.5 truncate">
                  {activeBook.author_name.toUpperCase()}'S BOOK
                </span>
                <h4 className="text-[9.5px] font-black text-white truncate leading-none">
                  {activeBook.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Only admin can add documents, managed in the Admin panel or for administrative users */}
              {isAdmin && !activeBookDoc && (
                <button
                  type="button"
                  onClick={() => setShowBookDocUploadModal(true)}
                  className="bg-teal-650 hover:bg-teal-560 text-white px-1.5 py-1 rounded-lg border border-teal-500 text-[8px] uppercase font-black cursor-pointer transition select-none leading-none flex items-center gap-0.5 shadow-sm"
                >
                  <Plus size={8} /> docs
                </button>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto bg-zinc-100 p-4">
            {activeBookDoc ? (
              /* MOBILE DOCUMENT READER WINDOW IN-APP WITH NO MARGINS */
              <div className="h-full flex flex-col space-y-3">
                <div className="bg-white border border-zinc-200 p-3 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                  <div className="min-w-0">
                    <span className="block text-[7px] font-mono tracking-wider font-extrabold text-teal-650 uppercase">Reading inside Book</span>
                    <h5 className="text-[10.5px] font-bold text-zinc-850 truncate leading-tight">{activeBookDoc.title}</h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={activeBookDoc.file_path}
                      download={activeBookDoc.title}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold rounded-lg"
                      title="Download"
                    >
                      <Download size={11} />
                    </a>
                    <button
                      onClick={() => setActiveBookDoc(null)}
                      className="px-2 py-1 bg-zinc-900 text-white text-[9px] font-extrabold uppercase rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Chapter Navigation Controls for Mobile Book Doc Reader */}
                {(() => {
                  const currentIdx = bookDocuments.findIndex(d => d.id === activeBookDoc?.id);
                  if (currentIdx === -1 || bookDocuments.length <= 1) return null;

                  return (
                    <div className="flex items-center justify-between bg-zinc-900 text-white p-2.5 rounded-xl border border-zinc-805 text-[10px] font-sans shadow-md select-none">
                      <button
                        disabled={currentIdx <= 0}
                        onClick={() => setActiveBookDoc(bookDocuments[currentIdx - 1])}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 disabled:pointer-events-none rounded-lg text-teal-400 font-extrabold uppercase transition-all flex items-center gap-1"
                      >
                        <ChevronLeft size={11} />
                        <span>Prev</span>
                      </button>
                      <span className="text-zinc-400 font-mono text-[9px]">
                        Chapter <strong className="text-teal-400">{currentIdx + 1}</strong> / <strong className="text-white">{bookDocuments.length}</strong>
                      </span>
                      <button
                        disabled={currentIdx >= bookDocuments.length - 1}
                        onClick={() => setActiveBookDoc(bookDocuments[currentIdx + 1])}
                        className="px-2 py-1 bg-teal-650 hover:bg-teal-555 disabled:opacity-25 disabled:pointer-events-none rounded-lg text-white font-extrabold uppercase transition-all flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight size={11} />
                      </button>
                    </div>
                  );
                })()}

                {/* Full Screen Iframe Reader Viewport */}
                <div className="flex-1 w-full bg-zinc-900 rounded-xl overflow-hidden relative shadow-inner" style={{ minHeight: '380px' }}>
                  {(() => {
                    const fileUrl = activeBookDoc.file_path.startsWith('http') 
                      ? activeBookDoc.file_path 
                      : `${window.location.origin}${activeBookDoc.file_path}`;
                    const isPdf = activeBookDoc.file_path.toLowerCase().endsWith('.pdf');
                    const isWord = activeBookDoc.file_path.toLowerCase().endsWith('.docx') || activeBookDoc.file_path.toLowerCase().endsWith('.doc');
                    const isPpt = activeBookDoc.file_path.toLowerCase().endsWith('.pptx') || activeBookDoc.file_path.toLowerCase().endsWith('.ppt');

                    if (isPdf) {
                      return <PdfJsViewer url={activeBookDoc.file_path} title={activeBookDoc.title} allowDownload={activeBookDoc.allow_download !== 0} />;
                    } else if (isWord || isPpt) {
                      return (
                        <iframe 
                          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} 
                          className="w-full h-full absolute inset-0 bg-white" 
                          style={{ border: 'none' }}
                        />
                      );
                    } else {
                      return (
                        <iframe 
                          src={activeBookDoc.file_path} 
                          className="w-full h-full absolute inset-0 bg-white" 
                          style={{ border: 'none' }}
                        />
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              /* MOBILE DOCUMENTS LISTING */
              <div className="space-y-4">
                <div className="text-left py-1">
                  <h4 className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.1em]">Volume Chapters ({bookDocuments.length})</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Click on any files inside this textbook to study in detail.</p>
                </div>

                {bookDocsLoading ? (
                  <div className="space-y-2 py-4">
                    <div className="h-14 bg-zinc-200/60 rounded-xl animate-pulse" />
                    <div className="h-14 bg-zinc-200/60 rounded-xl animate-pulse" />
                  </div>
                ) : bookDocuments.length === 0 ? (
                  <div className="py-12 text-center bg-white border border-dashed border-zinc-200 rounded-xl">
                    <FileText size={32} className="text-zinc-350 mx-auto mb-1 animate-pulse" />
                    <span className="block text-xs text-zinc-500 font-bold">No documents inside this book</span>
                    <span className="block text-[10px] text-zinc-400 mt-1">Author should upload PDF/DOCX textbook material.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookDocuments.map((doc) => {
                      const isOwner = isAdmin || (localStorage.getItem('my_author_name')?.toLowerCase().trim() === doc.author_name.toLowerCase().trim());
                      return (
                        <div key={doc.id} className="p-3 bg-white border border-zinc-150 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                          <button 
                            className="flex items-center gap-2.5 min-w-0 text-left flex-1" 
                            onClick={() => handleViewBookDocInApp(doc)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
                              <FileText size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-bold text-zinc-850 truncate leading-snug">{doc.title}</h4>
                              <p className="text-[9px] text-zinc-400 font-medium mt-0.5">By {doc.author_name}</p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleViewBookDocInApp(doc)}
                              className="p-1.5 text-teal-700 bg-teal-50 border border-teal-100 rounded-lg cursor-pointer transition shadow-xs"
                              title="Read in App"
                            >
                              <Eye size={12} />
                            </button>
                            {doc.allow_download !== 0 && (
                              <a
                                href={doc.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-650 bg-zinc-50 border border-zinc-200 rounded-lg shadow-xs"
                                title="Download File"
                              >
                                <Download size={12} />
                              </a>
                            )}
                            {isOwner && (
                              <button
                                onClick={() => handleDeleteBookDoc(doc.id)}
                                className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg cursor-pointer shadow-xs"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={activeArticle ? "w-full max-w-none px-0 sm:px-4 lg:px-6 transition-all duration-300" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300"}>
        {/* HEADER BRANDING */}
        {!activeArticle && !activeBook && (
        <div className="flex flex-col border-b border-zinc-150 pb-3 sm:pb-8 mb-4 sm:mb-10 gap-2.5 sm:gap-6">
          {isMobile ? (
            /* MOBILE SPECIFIC ACADEMIC HEADER */
            <div className="bg-gradient-to-r from-teal-900 to-indigo-950 text-white rounded-xl p-3 sm:p-5 shadow-md border border-teal-800/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-2">
                <div className="flex items-center justify-between sm:items-center">
                  <span className="inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-[0.2em] text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-900/60 font-mono select-none">
                    <Library size={11} className="animate-pulse text-teal-400" /> B.Sc MLT Academy Hub
                  </span>
                  
                  {isAdmin && (
                    <span className="text-[10px] bg-teal-500/10 text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-500/20">
                      🛡️ Admin Mode
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight leading-tight">
                    Academic <span className="text-teal-400">Content Library</span>
                  </h1>

                  {/* Public Library Mobile Search */}
                  <div className="relative w-full max-w-xs shrink-0 select-none">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400/80">
                      <Search size={12} />
                    </div>
                    <input
                      type="text"
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      placeholder="Search books, docs, slides..."
                      className="pl-8 py-1.5 w-full bg-zinc-900/90 border border-teal-800/40 text-[11px] rounded-xl focus:outline-teal-500 font-semibold text-white placeholder:text-zinc-500 z-10 shadow-inner"
                    />
                    {librarySearchQuery && (
                      <button
                        onClick={() => setLibrarySearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-white cursor-pointer text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                
                {/* HORIZONTAL DEPARTMENT BOOKS CAROUSEL */}
                <div className="pt-1.5 pb-1 select-none">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {subjects.map((sub) => {
                      const isSelected = activeSubject?.id === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectSubject(sub)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10.5px] font-extrabold transition-all shrink-0 active:scale-95 cursor-pointer border snap-start ${
                            isSelected
                              ? "bg-teal-400 text-zinc-950 border-teal-300 shadow-md font-black"
                              : "bg-teal-950/55 text-teal-200 border-teal-800/40 hover:bg-teal-900/40"
                          }`}
                        >
                          <BookOpen size={11.5} className={isSelected ? "text-zinc-950" : "text-teal-400"} />
                          <span className="leading-none">{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ACTIVE PATHWAY STEPPING BREADCRUMB */}
                <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-white/10 text-[9px] font-mono text-zinc-400 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubject(null);
                      setActiveTopic(null);
                      setActiveArticle(null);
                      setLocalNavbarHidden(false);
                      window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
                    }}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition ${!activeSubject ? 'text-teal-300 bg-teal-950 font-bold border border-teal-900/50' : 'text-zinc-400 hover:text-white font-semibold'}`}
                  >
                    1. Depts
                  </button>
                  <ChevronRight size={10} className="text-white/20" />
                  <button
                    type="button"
                    disabled={!activeSubject}
                    onClick={() => {
                      setActiveTopic(null);
                      setActiveArticle(null);
                      setLocalNavbarHidden(false);
                      window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
                    }}
                    className={`px-1.5 py-0.5 rounded max-w-[80px] truncate transition ${!activeSubject ? 'text-zinc-600 cursor-not-allowed' : activeSubject && !activeTopic ? 'text-teal-300 bg-teal-950 font-bold border border-teal-900/50 cursor-pointer' : 'text-zinc-400 hover:text-white font-semibold cursor-pointer'}`}
                  >
                    2. {activeSubject ? activeSubject.name : "Units"}
                  </button>
                  <ChevronRight size={10} className="text-white/20" />
                  <button
                    type="button"
                    disabled={!activeTopic}
                    onClick={() => {
                      setActiveArticle(null);
                      setLocalNavbarHidden(false);
                      window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
                    }}
                    className={`px-1.5 py-0.5 rounded max-w-[80px] truncate transition ${!activeTopic ? 'text-zinc-600 cursor-not-allowed' : activeTopic && !activeArticle ? 'text-teal-300 bg-teal-950 font-bold border border-teal-900/50 cursor-pointer' : 'text-zinc-400 hover:text-white font-semibold cursor-pointer'}`}
                  >
                    3. {activeTopic ? activeTopic.name : "Lectures"}
                  </button>
                  <ChevronRight size={10} className="text-white/20" />
                  <span className={`px-1.5 py-0.5 rounded max-w-[80px] truncate ${activeArticle ? 'text-teal-300 bg-teal-950 font-bold border border-teal-900/50' : 'text-zinc-500 font-semibold'}`}>
                    4. Readings
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* DESKTOP BRANDING BAR */
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-teal-600">
                  <Library size={15} className="animate-pulse" /> Diagnostic & Academic Hub
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-zinc-950 font-display tracking-tight leading-[1.1]">
                  The Scholar's <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600">Content Library</span>
                </h1>
                <p className="text-zinc-500 max-w-xl text-xs sm:text-sm font-medium">
                  A responsive, customizable library for medical laboratory sciences.
                </p>

                {/* HORIZONTAL DEPARTMENT BOOKS FOR DESKTOP */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {subjects.map((sub) => {
                    const isSelected = activeSubject?.id === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubject(sub)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border shadow-sm cursor-pointer ${
                          isSelected
                            ? "bg-teal-650 text-white border-teal-600 font-black shadow-md scale-102"
                            : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        <BookOpen size={13} className={isSelected ? "text-teal-300" : "text-zinc-400"} />
                        <span className="leading-none">{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
                {/* Public Library Desktop Search */}
                <div className="relative w-full min-w-[220px] max-w-[260px] shrink-0 select-none">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-650">
                    <Search size={13} />
                  </div>
                  <input
                    type="text"
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    placeholder="Search library notes, books..."
                    className="pl-8 pr-8 py-2 w-full bg-white border border-zinc-200 text-xs rounded-xl focus:outline-none focus:border-teal-500 font-semibold text-zinc-900 placeholder:text-zinc-400 shadow-sm"
                  />
                  {librarySearchQuery && (
                    <button
                      onClick={() => setLibrarySearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-650 cursor-pointer text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3.5 py-2.5 rounded-xl">
                    🛡️ Admin Mode
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* FEEDBACK STATUS */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2 mb-6 shadow-sm"
            >
              <Check size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2 mb-6 shadow-sm animate-shake"
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {librarySearchQuery && renderSearchResults()}
        {isAdmin && showAdminConsole && renderAdminConsoleDashboard()}

        {/* DESKTOP FULL-PAGE BOOK WORKSPACE (REPLACING THE REST OF DIRECTORY FOR TRUE SUB-PAGE FEEL) */}
        {!librarySearchQuery && !(isAdmin && showAdminConsole) && !isMobile && activeBook && !activeArticle && (
          <div className="w-full bg-white rounded-3xl border border-zinc-200/90 shadow-md p-8 sm:p-10 space-y-8 animate-fade-in text-left relative overflow-hidden mb-12">
            
            {/* Elegant Background Accents with Instagram & Academic blended theme */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-purple-500 via-pink-500 to-amber-500 opacity-90" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-24 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Premium Header of the Book */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-6 relative z-10">
              <div className="flex items-start gap-5">
                <div className={`w-18 h-18 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border text-3xl font-black ${
                  activeBook.cover_color === 'teal' ? 'bg-teal-50 border-teal-200 text-teal-650' :
                  activeBook.cover_color === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-650' :
                  activeBook.cover_color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-650' :
                  activeBook.cover_color === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-650' :
                  activeBook.cover_color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-750' :
                  activeBook.cover_color === 'violet' ? 'bg-violet-50 border-violet-200 text-violet-650' :
                  activeBook.cover_color === 'sky' ? 'bg-sky-50 border-sky-200 text-sky-650' :
                  'bg-zinc-50 border-zinc-200 text-zinc-650'
                }`}>
                  {getBookLogoIcon(activeBook.title, "w-9 h-9")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-650 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-150 font-sans">
                      Academic Volume Textbook
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-sans">
                      ID: #BMLT-BK-{activeBook.id}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-955 font-display tracking-tight leading-tight mt-1.5">
                    {activeBook.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium font-sans mt-1">
                    Compiled by <span className="font-bold text-zinc-805">{activeBook.author_name}</span> &bull; Reference volume & Guidelines for B.Sc. Medical Laboratory Technology.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Upload Action for Admin only */}
                {!activeBookDoc && isAdmin && (
                  <button
                    onClick={() => setShowBookDocUploadModal(true)}
                    className="px-4 py-2.5 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-900 rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 cursor-pointer text-xs font-sans"
                  >
                    <Plus size={13} />
                    <span>Upload Document</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setActiveBook(null);
                    setActiveBookDoc(null);
                  }}
                  className="px-4 py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-650 hover:text-black rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 cursor-pointer text-xs font-sans"
                >
                  <ArrowLeft size={13} />
                  <span>Exit To Library</span>
                </button>
              </div>
            </div>

            {/* Split Screen Document Workspace or Full List of Documents */}
            {activeBookDoc ? (
              /* TWO COLUMN PREMIER DOCUMENT SYSTEM - LEFT COLUMN BOOK CHAPTERS, RIGHT COLUMN EMBED VIEWER */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 animate-fade-in font-sans">
                {/* Book Navigation Panel on Left (Spans 4 columns) */}
                <div className="lg:col-span-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4 max-h-[720px] overflow-y-auto text-left">
                  <div className="border-b border-zinc-200 pb-3">
                    <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest font-mono">Book Chapters</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">Explore all published documents loaded inside this reference textbook.</p>
                  </div>
                  
                  {bookDocuments.length === 0 ? (
                    <div className="py-6 text-center text-zinc-400 text-xs font-medium font-sans">No documents uploaded</div>
                  ) : (
                    <div className="space-y-1.5 font-sans">
                      {bookDocuments.map((doc) => {
                        const isSelectedDoc = activeBookDoc.id === doc.id;
                        const isOwner = isAdmin || (localStorage.getItem('my_author_name')?.toLowerCase().trim() === doc.author_name.toLowerCase().trim());
                        return (
                          <div 
                            key={doc.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all select-none ${
                              isSelectedDoc 
                                ? 'bg-teal-50 border-teal-200 text-teal-900 shadow-xs' 
                                : 'bg-white hover:bg-zinc-100 border-zinc-150'
                            }`}
                          >
                            <button 
                              onClick={() => setActiveBookDoc(doc)}
                              className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer font-sans"
                            >
                              <FileText size={14} className={isSelectedDoc ? 'text-teal-650' : 'text-zinc-400'} />
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-[11px] font-black leading-tight truncate ${isSelectedDoc ? 'text-teal-955 font-black' : 'text-zinc-700'}`}>
                                  {doc.title}
                                </h4>
                                <p className="text-[8.5px] text-zinc-450 truncate">By {doc.author_name}</p>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              {isOwner && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBookDoc(doc.id);
                                  }}
                                  className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md border border-rose-100 text-[10px] cursor-pointer transition shadow-xs font-sans"
                                  title="Delete Document"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reader viewport slot on Right (Spans 8 columns) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Embedded document title & toolbar */}
                  <div className="bg-zinc-900 text-white border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-750 flex items-center justify-center shrink-0 text-teal-400">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono font-black text-teal-400 uppercase tracking-widest leading-none mb-1">
                          Now reading book page
                        </span>
                        <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                          {activeBookDoc.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeBookDoc.allow_download !== 0 && (
                        <a
                          href={activeBookDoc.file_path}
                          download={activeBookDoc.title}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-extrabold rounded-xl border border-zinc-700 text-[10.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow animate-fade-in"
                          title="Download file"
                        >
                          <Download size={11} />
                          <span>Download</span>
                        </a>
                      )}

                      <button
                        onClick={() => setActiveBookDoc(null)}
                        className="px-3 py-1.5 bg-teal-650 hover:bg-teal-555 text-white font-extrabold rounded-xl text-[10.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow-md font-sans"
                      >
                        <ArrowLeft size={11} />
                        <span>Close</span>
                      </button>
                    </div>
                  </div>

                  {/* Chapter Navigation Controls for Desktop Book Doc Reader */}
                  {(() => {
                    const currentIdx = bookDocuments.findIndex(d => d.id === activeBookDoc?.id);
                    if (currentIdx === -1 || bookDocuments.length <= 1) return null;

                    return (
                      <div className="flex items-center justify-between bg-zinc-900 text-white p-3 rounded-2xl border border-zinc-800 text-xs font-sans shadow-md select-none">
                        <button
                          disabled={currentIdx <= 0}
                          onClick={() => setActiveBookDoc(bookDocuments[currentIdx - 1])}
                          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 disabled:pointer-events-none rounded-xl text-teal-400 font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:text-white"
                        >
                          <ChevronLeft size={13} />
                          <span>Previous Chapter</span>
                        </button>
                        <span className="text-zinc-400 font-mono text-[10.5px]">
                          Chapter <strong className="text-teal-400 font-bold">{currentIdx + 1}</strong> of <strong className="text-white font-bold">{bookDocuments.length}</strong>
                        </span>
                        <button
                          disabled={currentIdx >= bookDocuments.length - 1}
                          onClick={() => setActiveBookDoc(bookDocuments[currentIdx + 1])}
                          className="px-3 py-2 bg-teal-650 hover:bg-teal-555 disabled:opacity-25 disabled:pointer-events-none rounded-xl text-white font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>Next Chapter</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Document container block */}
                  <div className="w-full bg-zinc-850 rounded-2xl border border-zinc-700 overflow-hidden flex flex-col shadow-inner" style={{ height: '620px', minHeight: '520px' }}>
                    {(() => {
                      const fileUrl = activeBookDoc.file_path.startsWith('http') 
                        ? activeBookDoc.file_path 
                        : `${window.location.origin}${activeBookDoc.file_path}`;
                      const isPdf = activeBookDoc.file_path.toLowerCase().endsWith('.pdf');
                      const isWord = activeBookDoc.file_path.toLowerCase().endsWith('.docx') || activeBookDoc.file_path.toLowerCase().endsWith('.doc');
                      const isPpt = activeBookDoc.file_path.toLowerCase().endsWith('.pptx') || activeBookDoc.file_path.toLowerCase().endsWith('.ppt');

                      if (isPdf) {
                        return (
                          <PdfJsViewer url={activeBookDoc.file_path} title={activeBookDoc.title} allowDownload={activeBookDoc.allow_download !== 0} />
                        );
                      } else if (isWord || isPpt) {
                        return (
                          <iframe 
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} 
                            className="w-full h-full bg-white" 
                            referrerPolicy="no-referrer"
                            style={{ border: 'none', height: '100%', minHeight: '620px' }}
                          />
                        );
                      } else {
                        return (
                          <iframe 
                            src={activeBookDoc.file_path} 
                            className="w-full h-full bg-white" 
                            referrerPolicy="no-referrer"
                            style={{ border: 'none', height: '100%', minHeight: '620px' }}
                          />
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* GRID OF DOCUMENTS VIEW ALONE (NO ACTIVE DOC PREVIEW SHOWN YET) */
              <div className="space-y-6 relative z-10 animate-fade-in font-sans">
                <div className="border-b border-zinc-100 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-500 font-mono">Published Guidelines & Reading Sheets ({bookDocuments.length})</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-sans font-sans">Access any chapters loaded inside this academic study textbook.</p>
                </div>

                {bookDocsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
                    <div className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
                  </div>
                ) : bookDocuments.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center space-y-3 bg-zinc-50/50">
                    <FileText size={48} className="text-zinc-350 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-zinc-800 font-sans">No documents inside this volume volume yet</p>
                      <p className="text-xs text-zinc-400 mt-1 font-sans">If you are the book author, use the upload button above to add documents.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookDocuments.map((doc) => {
                      const isOwner = isAdmin || (localStorage.getItem('my_author_name')?.toLowerCase().trim() === doc.author_name.toLowerCase().trim());
                      return (
                        <div key={doc.id} className="p-4 rounded-xl border border-zinc-205 bg-zinc-50/50 hover:bg-zinc-100/50 hover:-translate-y-0.5 transition-all flex items-center justify-between gap-4 shadow-xs text-left">
                          <button 
                            className="flex items-center gap-3.5 min-w-0 text-left flex-1 cursor-pointer" 
                            onClick={() => handleViewBookDocInApp(doc)}
                          >
                            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 text-teal-750 font-sans">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-extrabold text-zinc-850 leading-snug truncate font-sans">
                                {doc.title}
                              </h4>
                              <p className="text-[10.5px] text-zinc-500 mt-0.5 font-medium font-sans">By {doc.author_name}</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0 font-sans">
                            <button
                              onClick={() => handleViewBookDocInApp(doc)}
                              className="p-2 bg-white hover:bg-teal-55 text-teal-700 hover:text-teal-900 border border-teal-200 hover:border-teal-300 rounded-xl transition duration-200 shadow-xs flex items-center gap-1 text-[11px] font-bold cursor-pointer font-sans"
                            >
                              <Eye size={12} />
                              <span className="hidden sm:inline font-sans font-semibold">Read</span>
                            </button>

                            <a
                              href={doc.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black border border-zinc-200 rounded-xl transition duration-200 shadow-xs"
                              title="Download file"
                            >
                              <Download size={12} />
                            </a>
                            
                            {isOwner && (
                              <button
                                onClick={() => handleDeleteBookDoc(doc.id)}
                                className="p-2 bg-white hover:bg-rose-50 text-rose-550 hover:text-rose-700 border border-rose-100 w-9 h-9 flex items-center justify-center rounded-xl transition duration-200 shadow-xs cursor-pointer"
                                title="Delete document as Owner"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STANDALONE BOOKS LISTING (SLIDING SYSTEM / CAROUSEL MODE ABOVE NOTES SECTION) */}
        {!activeArticle && !activeBook && (
          <div 
            className="mb-10 p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-indigo-50/15 via-white via-rose-50/10 via-amber-200/5 to-teal-50/15 border border-zinc-200 shadow-sm text-left relative overflow-hidden" 
            id="standalone-books-section"
          >
            {/* Soft Instagram/Academic sunset-glow gradient header bar overlay on top edge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 via-rose-500 via-amber-500 to-teal-400 opacity-90" />
            
            {/* Ambient radiant color blobs to boost attraction */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-pink-300/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-12 w-44 h-44 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

            {activeBook ? (
              // INSIDE AN OPENED BOOK
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in text-left">
                {/* Header of opened book */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border text-2xl font-black ${
                      activeBook.cover_color === 'teal' ? 'bg-teal-50 border-teal-200 text-teal-650' :
                      activeBook.cover_color === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-650' :
                      activeBook.cover_color === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-650' :
                      activeBook.cover_color === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-650' :
                      activeBook.cover_color === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-750' :
                      activeBook.cover_color === 'violet' ? 'bg-violet-50 border-violet-200 text-violet-650' :
                      activeBook.cover_color === 'sky' ? 'bg-sky-50 border-sky-200 text-sky-650' :
                      'bg-zinc-50 border-zinc-200 text-zinc-650'
                    }`}>
                      {getBookLogoIcon(activeBook.title, "w-7 h-7")}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 font-display tracking-tight leading-snug">
                        {activeBook.title}
                      </h2>
                      <p className="text-xs text-zinc-500 font-medium font-sans mt-0.5">
                        By {activeBook.author_name} &bull; Separately uploaded volume
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Only admin can upload documents */}
                    {!activeBookDoc && isAdmin && (
                      <button
                        onClick={() => setShowBookDocUploadModal(true)}
                        className="px-2.5 sm:px-3 text-[10.5px] sm:text-xs py-1.5 sm:py-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-97 cursor-pointer font-sans"
                      >
                        <Plus size={11} />
                        <span className="hidden xs:inline font-sans">Upload Document</span>
                        <span className="inline xs:hidden font-sans">Upload</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveBook(null);
                        setActiveBookDoc(null);
                      }}
                      className="px-2.5 sm:px-3 text-[10.5px] sm:text-xs py-1.5 sm:py-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-97 cursor-pointer font-sans"
                    >
                      <ArrowLeft size={11} />
                      <span className="hidden xs:inline font-sans font-semibold">Back to Books</span>
                      <span className="inline xs:hidden font-sans font-semibold">Back</span>
                    </button>
                  </div>
                </div>

                {activeBookDoc ? (
                  /* BEAUTIFUL IN-APP DOCUMENT READER THAT STAYS INSIDE THE BOOK'S CONTEXT! */
                  <div className="space-y-4 animate-fade-in">
                    {/* Header bar of document reader */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 border border-zinc-150 p-4 rounded-xl shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-150 flex items-center justify-center shrink-0 text-teal-800">
                          {getBookLogoIcon(activeBook.title, "w-5 h-5")}
                        </div>
                        <div>
                          <div className="text-[9px] font-mono font-black uppercase text-teal-650 tracking-wider">
                            Now Reading Document
                          </div>
                          <h3 className="text-xs sm:text-sm font-black text-zinc-950 font-sans leading-tight">
                            {activeBookDoc.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeBookDoc.allow_download !== 0 && (
                          <a
                            href={activeBookDoc.file_path}
                            download={activeBookDoc.title}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-55 text-zinc-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Download file"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>
                        )}

                        <button
                          onClick={() => setActiveBookDoc(null)}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white font-extrabold rounded-xl text-[10.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shadow"
                        >
                          <ArrowLeft size={12} />
                          <span>Close Reader</span>
                        </button>
                      </div>
                    </div>

                    {/* Reader viewport slot */}
                    <div className="w-full bg-zinc-850 rounded-2xl border border-zinc-700 overflow-hidden flex flex-col shadow-inner" style={{ height: '620px', minHeight: '520px' }}>
                      {(() => {
                        const fileUrl = activeBookDoc.file_path.startsWith('http') 
                          ? activeBookDoc.file_path 
                          : `${window.location.origin}${activeBookDoc.file_path}`;
                        const isPdf = activeBookDoc.file_path.toLowerCase().endsWith('.pdf');
                        const isWord = activeBookDoc.file_path.toLowerCase().endsWith('.docx') || activeBookDoc.file_path.toLowerCase().endsWith('.doc');
                        const isPpt = activeBookDoc.file_path.toLowerCase().endsWith('.pptx') || activeBookDoc.file_path.toLowerCase().endsWith('.ppt');

                        if (isPdf) {
                          return (
                            <PdfJsViewer url={activeBookDoc.file_path} title={activeBookDoc.title} allowDownload={activeBookDoc.allow_download !== 0} />
                          );
                        } else if (isWord || isPpt) {
                          const isSandboxHost = window.location.hostname === 'localhost' || 
                                                window.location.hostname === '127.0.0.1' || 
                                                window.location.hostname.includes('run.app') || 
                                                window.location.hostname.includes('google.com') ||
                                                window.location.hostname.includes('ais-dev') || 
                                                window.location.hostname.includes('ais-pre');
                          if (isSandboxHost && !bypassSandboxWarning) {
                            return (
                              <div className="w-full h-full bg-zinc-900 flex items-center justify-center p-6 text-white text-center">
                                <div className="max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4 text-left">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                                      <AlertCircle size={20} className="animate-pulse" />
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-mono tracking-wider font-extrabold text-amber-500 uppercase">Sandbox Environment Check</span>
                                      <h3 className="text-sm font-bold text-zinc-100 font-sans leading-tight">Secure Sandbox Notice</h3>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                                    Microsoft's cloud viewer service requires an external public URL to show DOCX/PPTX files. Because this developer workspace runs on private container port routing, fallback local downloading or browser tab viewing is recommended.
                                  </p>
                                  <div className="flex flex-col gap-2 pt-2">
                                    <a
                                      href={activeBookDoc.file_path}
                                      download={activeBookDoc.title}
                                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-sm transition"
                                    >
                                      <Download size={12} />
                                      <span>Download File Directly</span>
                                    </a>
                                    <button
                                      onClick={() => setBypassSandboxWarning(true)}
                                      className="text-[10px] text-zinc-400 hover:text-teal-400 underline py-1"
                                    >
                                      Attempt iframe preview anyway
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <iframe 
                              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} 
                              className="w-full h-full bg-white" 
                              referrerPolicy="no-referrer"
                              style={{ border: 'none', height: '100%', minHeight: '620px' }}
                            />
                          );
                        } else {
                          return (
                            <iframe 
                              src={activeBookDoc.file_path} 
                              className="w-full h-full bg-white" 
                              referrerPolicy="no-referrer"
                              style={{ border: 'none', height: '100%', minHeight: '620px' }}
                            />
                          );
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* List of documents within this book */}
                    {bookDocsLoading ? (
                      <div className="space-y-3 py-10">
                        <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                        <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                      </div>
                    ) : bookDocuments.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
                        <FileText size={40} className="text-zinc-300 animate-pulse" />
                        <p className="text-sm font-bold text-zinc-500 font-sans">No documents in this book</p>
                        <p className="text-xs text-zinc-400 font-sans">Click upload as the author to add textbooks or notes.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto max-w-full text-left font-sans" id="book-documents-container">
                        {bookDocuments.map((doc) => {
                          const isOwner = isAdmin || (localStorage.getItem('my_author_name')?.toLowerCase().trim() === doc.author_name.toLowerCase().trim());
                          return (
                            <div key={doc.id} className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/50 hover:bg-zinc-100/40 flex items-center justify-between gap-3 shadow-xs transition-all text-left">
                              <div className="flex items-start gap-3 min-w-0 text-left">
                                <div className="w-10 h-10 rounded-lg bg-teal-55/15 border border-teal-100 flex items-center justify-center shrink-0 text-teal-750">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 text-left flex-1">
                                  <h4 className="text-xs font-extrabold text-zinc-805 leading-tight truncate text-left font-sans" title={doc.title}>
                                    {doc.title}
                                  </h4>
                                  <p className="text-[10px] text-zinc-500 font-semibold mt-1 text-left font-sans">
                                    By {doc.author_name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* In-app Reader Button - fixes "there is no option to read or view the books in app" */}
                                <button
                                  onClick={() => handleViewBookDocInApp(doc)}
                                  className="p-2 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 hover:text-teal-900 rounded-lg transition-all cursor-pointer shadow-xs font-sans"
                                  title="Read document inside the app"
                                >
                                  <Eye size={13} />
                                </button>

                                {doc.allow_download !== 0 && (
                                  <a
                                    href={doc.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-705 hover:text-teal-700 rounded-lg transition-all shadow-xs"
                                    title="Download document file"
                                  >
                                    <Download size={13} />
                                  </a>
                                )}
                                
                                {isOwner && (
                                  <button
                                    onClick={() => handleDeleteBookDoc(doc.id)}
                                    className="p-2 bg-white border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all shadow-xs cursor-pointer"
                                    title="Delete Document"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Sliding system (Horizontal scrolling) of Book Cards */
              <div className="space-y-4 text-left font-sans">
                <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5">
                  <div className="text-left">
                    <h2 className="text-md sm:text-lg font-black text-zinc-900 font-display tracking-tight flex items-center gap-2">
                      📙 Books
                    </h2>
                    <p className="text-[11px] sm:text-xs text-zinc-500 font-medium mt-0.5 font-sans">
                      Verify guidelines, manuals, and reference publications uploaded by department authors.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingBook(null);
                          setBookForm({ title: '', author_name: 'Dr. S. K. Safin', cover_color: 'teal' });
                          setShowBookModal(true);
                        }}
                        className="px-2.5 sm:px-3 text-[10px] sm:text-xs py-1.5 sm:py-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-97 cursor-pointer font-sans"
                      >
                        <Plus size={11} />
                        <span>Create Book</span>
                      </button>
                    )}

                    <div className="hidden sm:flex items-center gap-1 select-none">
                      <button
                        onClick={() => {
                          const container = document.getElementById('standalone-books-slider');
                          if (container) container.scrollBy({ left: -240, behavior: 'smooth' });
                        }}
                        className="p-1 px-1.5 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition cursor-pointer"
                        title="Scroll Left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const container = document.getElementById('standalone-books-slider');
                          if (container) container.scrollBy({ left: 240, behavior: 'smooth' });
                        }}
                        className="p-1 px-1.5 border border-zinc-200 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition cursor-pointer"
                        title="Scroll Right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {booksLoading ? (
                  <div className="flex gap-4 overflow-x-hidden py-2">
                    <div className="w-[155px] h-[155px] sm:w-[185px] sm:h-[185px] bg-zinc-100 rounded-2xl animate-pulse shrink-0" />
                    <div className="w-[155px] h-[155px] sm:w-[185px] sm:h-[185px] bg-zinc-100 rounded-2xl animate-pulse shrink-0" />
                    <div className="w-[155px] h-[155px] sm:w-[185px] sm:h-[185px] bg-zinc-100 rounded-2xl animate-pulse shrink-0" />
                  </div>
                ) : books.length === 0 ? (
                  <div className="py-8 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-150 text-center text-zinc-450 text-xs font-bold font-sans uppercase tracking-wider">
                    No reference volumes or textbooks listed yet.
                  </div>
                ) : (
                  <div 
                    id="standalone-books-slider" 
                    className="flex gap-4 overflow-x-auto py-2.5 px-0.5 scrollbar-none snap-x scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {books.map((book) => {
                      const isBookAuthor = isAdmin || (localStorage.getItem('my_author_name')?.toLowerCase().trim() === book.author_name.toLowerCase().trim());
                      return (
                        <div
                          key={book.id}
                          className={`relative w-[155px] h-[155px] sm:w-[185px] sm:h-[185px] rounded-2xl overflow-hidden border cursor-pointer group hover:scale-[1.015] hover:shadow-lg transition-all flex flex-col justify-between p-3.5 pl-5.5 text-left active:scale-98 select-none shrink-0 snap-start ${getBookCardGradient(book.cover_color)}`}
                          onClick={() => handleOpenBook(book)}
                        >
                          {/* Aesthetic book left spine / bookmark bar matching cover color */}
                          <div className={`absolute top-0 left-0 bottom-0 w-3 shadow-md z-1 ${
                            book.cover_color === 'teal' ? 'bg-gradient-to-b from-teal-600 via-teal-750 to-teal-850' :
                            book.cover_color === 'indigo' ? 'bg-gradient-to-b from-indigo-600 via-indigo-750 to-indigo-850' :
                            book.cover_color === 'emerald' ? 'bg-gradient-to-b from-emerald-600 via-emerald-750 to-emerald-850' :
                            book.cover_color === 'rose' ? 'bg-gradient-to-b from-rose-500 via-pink-650 to-rose-750' :
                            book.cover_color === 'amber' ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-705' :
                            book.cover_color === 'violet' ? 'bg-gradient-to-b from-violet-600 via-fuchsia-700 to-violet-850' :
                            book.cover_color === 'sky' ? 'bg-gradient-to-b from-sky-500 via-blue-600 to-sky-750' :
                            'bg-zinc-500'
                          }`} />
                          
                          {/* Book spine decorative vertical lines for realistic 3D feel */}
                          <div className="absolute top-0 left-[3px] bottom-0 w-[0.5px] bg-black/15 z-1" />
                          <div className="absolute top-0 left-[7px] bottom-0 w-[0.5px] bg-white/10 z-1" />

                          {/* Glossy sheen overlay */}
                          <div className="absolute inset-0 opacity-45 mix-blend-overlay pointer-events-none bg-gradient-to-tr from-white/15 via-transparent to-black/10 z-0" />

                          {/* Cover Top Emblem */}
                          <div className="flex items-start justify-between z-10">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                              book.cover_color === 'teal' ? 'bg-teal-50/90 text-teal-650 border border-teal-150' :
                              book.cover_color === 'indigo' ? 'bg-indigo-50/90 text-indigo-650 border border-indigo-150' :
                              book.cover_color === 'emerald' ? 'bg-emerald-50/90 text-emerald-650 border border-emerald-150' :
                              book.cover_color === 'rose' ? 'bg-rose-50/90 text-rose-650 border border-rose-150' :
                              book.cover_color === 'amber' ? 'bg-amber-50/90 text-amber-750 border border-amber-150' :
                              book.cover_color === 'violet' ? 'bg-violet-50/90 text-violet-650 border border-violet-150' :
                              book.cover_color === 'sky' ? 'bg-sky-50/90 text-sky-650 border border-sky-150' :
                              'bg-zinc-50/90 text-zinc-650 border border-zinc-150'
                            }`}>
                              {getBookLogoIcon(book.title, "w-4 h-4")}
                            </div>
                            
                            {isBookAuthor && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBook(book);
                                    setBookForm({ title: book.title, author_name: book.author_name, cover_color: book.cover_color });
                                    setShowBookModal(true);
                                  }}
                                  className="p-1 px-1.5 bg-white/80 hover:bg-white text-zinc-700 hover:text-black rounded transition-all cursor-pointer shadow-xs border border-zinc-150"
                                  title="Edit Book"
                                >
                                  <Edit size={10} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBook(book.id);
                                  }}
                                  className="p-1 px-1.5 bg-rose-50/95 hover:bg-rose-100 text-rose-600 rounded transition-all cursor-pointer shadow-xs border border-rose-100"
                                  title="Delete Book"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Title and indicators */}
                          <div className="space-y-1 z-10">
                            <p className="text-[10.5px] sm:text-xs font-black text-zinc-950 tracking-tight leading-snug line-clamp-3 font-sans">
                              {book.title}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-widest font-sans pt-1">
                              <span className="truncate max-w-[70px] sm:max-w-[100px] text-left">{book.author_name}</span>
                              <span className="text-teal-650 bg-teal-50/80 border border-teal-100 px-1 py-0.2 rounded shrink-0">
                                {book.document_count || 0} docs
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEPPED INTERACTIVE GRID SYSTEM */}
        {!librarySearchQuery && !(isAdmin && showAdminConsole) && !activeBook && (isMobile ? (
          // MOBILE SYSTEM DRILL-DOWN FLOW
          <div className="space-y-6">
            {!activeSubject ? (
              // 1. MOBILE SUBJECTS LIST SELECT VIEW
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.15em] text-teal-600">
                      Syllabus Departments
                    </h2>
                    <p className="text-[11px] text-zinc-500 font-medium font-sans">Select a department to study</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="p-1.5 px-3 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <Plus size={10} /> Add Dept
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-2 py-4">
                    <div className="h-12 bg-zinc-150 rounded-xl animate-pulse" />
                    <div className="h-12 bg-zinc-150 rounded-xl animate-pulse" />
                    <div className="h-12 bg-zinc-150 rounded-xl animate-pulse" />
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="p-10 text-center border border-dashed border-zinc-200 rounded-2xl">
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">No Subjects Added Yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {subjects.map((sub) => {
                      const TargetIcon = IconMap[sub.logo] || BookOpen;
                      return (
                        <div key={sub.id} className="relative group/sub flex items-center justify-between">
                          <button
                            onClick={() => handleSelectSubject(sub)}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all border text-sm bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-150 shadow-sm active:scale-98 animate-fade-in"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-teal-50 text-teal-700 border-teal-100">
                              <TargetIcon size={16} />
                            </div>
                            <span className="font-bold tracking-tight truncate flex-1">{sub.name}</span>
                            <ChevronRight size={16} className="text-zinc-400" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDeleteSubject(sub.id, sub.name);
                              }}
                              className="absolute right-10 p-2 text-zinc-400 hover:text-rose-500 rounded-lg bg-zinc-50 border border-zinc-200 transition-all z-10"
                              title="Delete Subject"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !activeTopic ? (
              // 2. MOBILE TOPICS LIST SELECT VIEW
              <div id="active-department-section" className="space-y-4">
                <button
                  onClick={() => setActiveSubject(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                >
                  <ArrowLeft size={13} />
                  <span>Departments</span>
                </button>

                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-600 text-white rounded-lg flex items-center justify-center shrink-0 border border-teal-500">
                    {React.createElement(IconMap[activeSubject.logo] || BookOpen, { size: 16 })}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900 leading-tight">{activeSubject.name}</h2>
                    <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">Syllabus Lecture Topics / Units</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                      Syllabus Topics Checkpoint
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => setShowTopicModal(true)}
                        className="p-1 px-2.5 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-750 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <Plus size={10} /> Add Unit
                      </button>
                    )}
                  </div>

                  {topicsLoading ? (
                    <div className="space-y-2 py-2">
                      <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                      <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-zinc-150 rounded-xl">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase">No Topics Configured</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {topics.map((top) => {
                        return (
                          <div key={top.id} className="relative group/top flex items-center justify-between">
                            <button
                              onClick={() => handleSelectTopic(top)}
                              className="w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all border text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-100 shadow-sm active:scale-98 animate-fade-in"
                            >
                              <span className="font-bold leading-tight pr-6 truncate flex-1">{top.name}</span>
                              <ChevronRight size={14} className="text-teal-600 shrink-0" />
                            </button>

                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteTopic(top.id, top.name);
                                }}
                                className="absolute right-10 p-2 text-zinc-400 hover:text-rose-500 rounded-lg bg-white border border-zinc-200 z-10"
                                title="Delete Topic"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : !activeArticle ? (
              // 3. MOBILE ARTICLES CONTROLLER SCREEN
              <div className="space-y-4">
                <button
                  onClick={() => setActiveTopic(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                >
                  <ArrowLeft size={13} />
                  <span>Subject Units</span>
                </button>

                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {activeSubject.name} &bull; Unit Topic
                    </span>
                    <h2 className="text-md sm:text-lg font-black text-zinc-900 leading-snug">
                      {activeTopic.name}
                    </h2>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                    Uploaded Lectures ({articles.length})
                  </h3>

                  {articlesLoading ? (
                    <div className="space-y-2 py-4 animate-pulse">
                      <div className="h-12 bg-zinc-50 rounded-xl" />
                      <div className="h-12 bg-zinc-50 rounded-xl" />
                    </div>
                  ) : articles.length === 0 ? (
                    <div className="py-10 text-center px-4 border border-dashed border-zinc-100 rounded-xl animate-smooth-fade">
                      <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
                        No notes uploaded under this unit topic yet. Use the option above to publish.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {articles.map((art) => {
                        return (
                          <button
                            key={art.id}
                            onClick={() => handleSelectArticle(art)}
                            className="w-full p-4 rounded-xl text-left transition-all border bg-white hover:bg-zinc-50 border-zinc-150 shadow-sm active:scale-98 block space-y-2.5"
                          >
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-xs font-black text-zinc-955 leading-tight block">
                                {art.headline}
                              </span>
                              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100/50 text-[9px] font-bold text-zinc-450 font-mono">
                              <span className="flex items-center gap-1 select-none">
                                <User size={10} className="text-zinc-550 mr-0.5" />
                                <span>{art.author_name}</span>
                              </span>
                              {art.is_ai_generated === 1 && (
                                <span className="inline-flex items-center gap-0.5 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150 uppercase tracking-widest font-black text-[7px]">
                                  <Sparkles size={8} /> AI Note
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* No Gemini compilation section as per requested content build removal */}
              </div>
            ) : (
              // 4. MOBILE HIGH OPTIMIZED READING VIEW (Standard clean reading card optimal for small touchscreens)
              <div className="w-full font-sans">
                {activeArticle?.file_path ? (
                  /* EXTREMELY CLEAN FULL SCREEN MOBILE DOCUMENT READER WITH NO SIDE MARGINS */
                  <div className="fixed inset-0 z-[60] w-screen h-screen flex flex-col font-sans bg-zinc-950 text-white select-none overflow-hidden" id="mobile-fullscreen-document-view-container" style={{ margin: 0, padding: 0 }}>
                    
                    {/* Sleek, full screen mobile toolbar */}
                    {!mobileHeaderHidden ? (
                      <div className="bg-zinc-900 border-b border-zinc-800 px-2 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0 select-none z-20 shadow-md animate-fade-in-down">
                        <div className="flex items-center gap-1.5 max-w-[55%]">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveArticle(null);
                              setMobileHeaderHidden(false);
                            }}
                            className="inline-flex items-center gap-0.5 bg-zinc-805 hover:bg-zinc-700 active:scale-95 text-white font-bold uppercase tracking-wider px-1.5 py-1 rounded-lg transition-all cursor-pointer border border-zinc-700 text-[8px]"
                          >
                            <ArrowLeft size={9} className="text-teal-400" />
                            <span>Back</span>
                          </button>
                          <div className="text-left min-w-0 flex-1">
                            <span className="block text-[6px] font-mono font-black tracking-widest text-[#2dd4bf] uppercase leading-none mb-0.5 truncate">
                              {activeSubject?.name.toUpperCase()}
                            </span>
                            <h4 className="text-[8.5px] font-black text-white truncate leading-none">
                              {activeArticle.headline}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {activeArticle.content && !activeArticle.content.startsWith('Document Attachment:') && (
                            <button
                              type="button"
                              onClick={() => {
                                // Toggle to Text view format internally inside App
                                setPdfInAppView(pdfInAppView === 'text' ? 'canvas' : 'text');
                              }}
                              className="bg-zinc-800 text-zinc-300 px-1.5 py-1 rounded-lg border border-zinc-700 text-[8px] uppercase font-black cursor-pointer transition select-none leading-none"
                            >
                              {pdfInAppView === 'text' ? 'Doc' : 'Txt'}
                            </button>
                          )}
                          <a 
                            href={activeArticle.file_path} 
                            download={activeArticle.headline}
                            className="text-[8px] bg-teal-650 hover:bg-teal-555 active:scale-95 text-white font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border border-teal-550 cursor-pointer shadow-sm leading-none shrink-0"
                          >
                            Save
                          </a>
                          <button
                            type="button"
                            onClick={() => setMobileHeaderHidden(true)}
                            className="text-[8px] bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-teal-400 font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border border-zinc-700 cursor-pointer shadow-sm leading-none shrink-0 flex items-center gap-0.5"
                            title="Scroll Up to Hide Black Bar"
                          >
                            <ArrowUp size={9} />
                            <span>Hide</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Floating pull down button for mobile reader */
                      <button
                        type="button"
                        onClick={() => setMobileHeaderHidden(false)}
                        className="absolute top-2 right-2 z-50 px-2.5 py-1.5 bg-zinc-900/95 hover:bg-zinc-800 text-teal-400 border border-zinc-750 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer select-none shadow-md"
                        title="Restore Header Bar"
                      >
                        <span>Show Header</span>
                        <ArrowDown size={9} />
                      </button>
                    )}

                    {/* True Full Screen Marginless Interactive Iframe/Viewer Container */}
                    <div className="flex-1 w-full bg-white relative overflow-hidden">
                      {(() => {
                        const isPdf = activeArticle.file_path.toLowerCase().endsWith('.pdf');
                        const isWord = activeArticle.file_path.toLowerCase().endsWith('.docx') || activeArticle.file_path.toLowerCase().endsWith('.doc');
                        const isPpt = activeArticle.file_path.toLowerCase().endsWith('.pptx') || activeArticle.file_path.toLowerCase().endsWith('.ppt');
                        const fileUrl = activeArticle.file_path.startsWith('http') 
                          ? activeArticle.file_path 
                          : `${window.location.origin}${activeArticle.file_path}`;

                        if (pdfInAppView === 'text' && activeArticle.content && !activeArticle.content.startsWith('Document Attachment:')) {
                          return (
                            <div className="w-full h-full p-4 overflow-y-auto bg-white text-zinc-900 text-left select-text scrollbar-thin">
                              <div className="border-b border-zinc-150 pb-3 mb-4 select-none">
                                <span className="text-[8.5px] font-mono tracking-wider font-extrabold text-teal-600 uppercase">IN-APP ACADEMIC TEXTBOOK TRANSCRIPT</span>
                                <h1 className="text-md font-black leading-tight mt-0.5">{activeArticle.headline}</h1>
                              </div>
                              <div className="text-zinc-850 text-xs leading-relaxed whitespace-pre-line font-medium pb-8">
                                {activeArticle.content}
                              </div>
                            </div>
                          );
                        }

                        if (isPdf) {
                          return (
                            <PdfJsViewer url={activeArticle.file_path} title={activeArticle.headline} allowDownload={activeArticle.allow_download !== 0} />
                          );
                        } else if (isWord || isPpt) {
                          const isSandboxHost = window.location.hostname === 'localhost' || 
                                                window.location.hostname === '127.0.0.1' || 
                                                window.location.hostname.includes('run.app') || 
                                                window.location.hostname.includes('google.com') ||
                                                window.location.hostname.includes('ais-dev') || 
                                                window.location.hostname.includes('ais-pre');
                          
                          if (isSandboxHost && !bypassSandboxWarning) {
                            return (
                              <div className="absolute inset-0 bg-zinc-55 flex items-center justify-center p-3 sm:p-5 text-zinc-900 select-text overflow-y-auto">
                                <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-md space-y-4 text-left">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                      <AlertCircle size={20} className="animate-pulse" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[8px] font-mono font-extrabold tracking-wider text-amber-600 uppercase">
                                        Sandbox Access Notice
                                      </span>
                                      <h3 className="text-sm font-bold text-zinc-955 font-display leading-tight">
                                        Why does Microsoft show "File not found"?
                                      </h3>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-zinc-650 leading-relaxed space-y-2 font-medium">
                                    <p>
                                      Microsoft's online web viewer requests document files from outside. Since your environment is a **private, secure developer container**, Microsoft's public servers cannot reach back to pull the file, causing their <strong>"File not found"</strong> screen.
                                    </p>
                                    <p className="text-zinc-500 text-[10px] italic bg-teal-50/40 p-2.5 rounded-lg border border-teal-100/40">
                                      <strong>Note:</strong> On final public URL deployment, Microsoft's cloud servers easily fetch the files to show them flawlessly!
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-zinc-150 flex flex-col gap-2">
                                    <div className="flex flex-col gap-1.5">
                                      <a
                                        href={activeArticle.file_path}
                                        download={activeArticle.headline}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[10.5px] font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer select-none"
                                      >
                                        <Download size={12} />
                                        <span>Download Document ↓</span>
                                      </a>

                                      {activeArticle.content && !activeArticle.content.startsWith('Document Attachment:') && (
                                        <button
                                          type="button"
                                          onClick={() => setPdfInAppView('text')}
                                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10.5px] font-bold uppercase tracking-wider rounded-xl border border-zinc-250 cursor-pointer select-none"
                                        >
                                          <FileText size={12} className="text-blue-600" />
                                          <span>Read Text Transcript</span>
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setBypassSandboxWarning(true)}
                                      className="w-full text-center text-[9.5px] text-zinc-400 hover:text-teal-600 font-semibold underline py-1 transition cursor-pointer select-none"
                                    >
                                      Try opening iframe anyway
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <iframe 
                              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} 
                              className="w-full h-full absolute inset-0 bg-white" 
                              referrerPolicy="no-referrer"
                              style={{ border: 'none' }}
                            />
                          );
                        } else {
                          return (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 p-6 text-center bg-zinc-50 select-text">
                              <FileText size={32} className="text-zinc-300 mb-2" />
                              <p className="font-extrabold text-xs text-zinc-800">{activeArticle.headline}</p>
                              <a href={fileUrl} className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] uppercase font-black tracking-wider rounded-xl shadow cursor-pointer no-underline" download>Download File Directly</a>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Standard mobile layout for non-file academic notes */
                  <div className="fixed inset-0 z-[60] w-screen h-screen flex flex-col font-sans bg-zinc-50 text-zinc-900 select-none overflow-hidden" id="mobile-fullscreen-notes-view-container" style={{ margin: 0, padding: 0 }}>
                    
                    {/* Sleek, full screen mobile toolbar */}
                    <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center justify-between gap-2.5 text-xs shrink-0 select-none z-20 shadow-md text-white">
                      <div className="flex items-center gap-2 max-w-[62%]">
                        <button
                          type="button"
                          onClick={() => setActiveArticle(null)}
                          className="inline-flex items-center gap-1 bg-zinc-805 hover:bg-zinc-700 active:scale-95 text-white font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg transition-all cursor-pointer border border-zinc-700"
                        >
                          <ArrowLeft size={11} className="text-teal-400" />
                          <span className="text-[9.5px]">Back</span>
                        </button>
                        <div className="text-left min-w-0 flex-1">
                          <span className="block text-[7px] font-mono font-black tracking-widest text-[#2dd4bf] uppercase leading-none mb-0.5 truncate">
                            {activeSubject?.name.toUpperCase()}
                          </span>
                          <h4 className="text-[9.5px] font-black text-white truncate leading-none">
                            {activeArticle.headline}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeArticle && (
                          <>
                            <button
                              onClick={() => handleStartEdit(activeArticle)}
                              className="bg-zinc-805 hover:bg-zinc-700 text-teal-400 px-2 py-1.5 rounded-lg border border-zinc-700 text-[8.5px] uppercase font-black transition-all flex items-center gap-0.5 shadow-sm mr-1 leading-none cursor-pointer"
                              title="Customize note"
                            >
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => triggerDeleteArticle(activeArticle.id, activeArticle.headline, activeArticle.author_name)}
                              className="bg-rose-950 hover:bg-rose-900 text-rose-400 px-2 py-1.5 rounded-lg border border-rose-900/40 text-[8.5px] uppercase font-black transition-all flex items-center gap-0.5 shadow-sm leading-none cursor-pointer"
                              title="Delete note"
                            >
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Scrollable text/slide view format */}
                    <div className="flex-1 w-full bg-white relative overflow-hidden flex flex-col select-text">
                      {articleDetailLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3">
                          <div className="w-8 h-8 border-3 border-zinc-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider font-sans">Loading detailed lecture...</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto" id="mobile-reading-container-element">
                          <div className="bg-zinc-50 border-b border-zinc-150 px-4 py-2 flex items-center justify-between gap-3 text-xs select-none">
                            <div className="flex items-center gap-2">
                              <BookCheck size={14} className="text-teal-600 shrink-0 animate-pulse" />
                              <span className="font-mono text-[9px] font-black uppercase text-zinc-500">
                                verified academic deck
                              </span>
                            </div>

                            <div className="flex bg-zinc-200/60 p-0.5 rounded-lg border border-zinc-250/20">
                              <button
                                type="button"
                                onClick={() => setViewMode('document')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  viewMode === 'document' ? 'bg-white text-teal-850 shadow-sm border border-zinc-200/30' : 'text-zinc-500'
                                }`}
                              >
                                <FileText size={10} />
                                <span>Document</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode('presentation');
                                  setCurrentSlideIdx(0);
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  viewMode === 'presentation' ? 'bg-white text-teal-850 shadow-sm border border-zinc-200/30' : 'text-zinc-500'
                                }`}
                              >
                                <Presentation size={10} />
                                <span>Slideshow</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-4 sm:p-7 space-y-6 max-w-3xl mx-auto pb-24">
                            <div className="space-y-2 border-b border-zinc-100 pb-4">
                              <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono tracking-wider text-zinc-400">
                                <span className="bg-zinc-100 px-2 py-0.5 rounded font-bold uppercase text-zinc-650">
                                  {activeSubject?.name || 'Department'}
                                </span>
                                <span>&bull;</span>
                                <span className="text-teal-650 font-bold uppercase">
                                  {activeTopic?.name || 'Unit Topic'}
                                </span>
                              </div>

                              <h1 className="text-lg sm:text-xl font-black text-zinc-955 tracking-tight leading-snug">
                                {activeArticle.headline}
                              </h1>

                              <div className="flex flex-wrap gap-2 pt-2 text-[9.5px] font-mono text-zinc-500 font-bold justify-between items-center">
                                <div className="flex items-center gap-1 text-zinc-600">
                                  <User size={11} className="text-teal-600 shrink-0" />
                                  <span>Author: {activeArticle.author_name}</span>
                                </div>
                                <div className="text-zinc-400">
                                  <span>ID: #BMLT-{activeArticle.id}</span>
                                  {activeArticle.is_ai_generated === 1 && (
                                    <span className="ml-2 text-indigo-600 font-extrabold uppercase animate-pulse">
                                      &bull; Gemini AI Compiled
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="w-full text-left">
                              {renderActiveArticleContent()}
                            </div>

                            {/* Document Navigation Controls for Mobile Article Reader */}
                            {(() => {
                              const currentList = activeTopic ? articles : subjectArticles;
                              const currentIdx = currentList.findIndex(a => a.id === activeArticle?.id);
                              if (currentIdx === -1 || currentList.length <= 1) return null;

                              return (
                                <div className="mt-4 mb-4 flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-lg select-none">
                                  <button
                                    disabled={currentIdx <= 0}
                                    onClick={() => {
                                      const prevArt = currentList[currentIdx - 1];
                                      handleSelectArticle(prevArt);
                                    }}
                                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-20 disabled:pointer-events-none rounded-lg text-teal-400 font-extrabold text-[9.5px] uppercase tracking-wide transition-all flex items-center gap-1 cursor-pointer border border-zinc-700 hover:border-zinc-500 hover:text-white"
                                  >
                                    <ChevronLeft size={11} />
                                    <span>Prev</span>
                                  </button>

                                  <div className="text-center font-mono text-[8px] text-zinc-400 font-semibold">
                                    <strong className="text-teal-450">{currentIdx + 1}</strong> / <strong className="text-white">{currentList.length}</strong>
                                  </div>

                                  <button
                                    disabled={currentIdx >= currentList.length - 1}
                                    onClick={() => {
                                      const nextArt = currentList[currentIdx + 1];
                                      handleSelectArticle(nextArt);
                                    }}
                                    className="px-2.5 py-1.5 bg-teal-650 hover:bg-teal-555 disabled:opacity-20 disabled:pointer-events-none rounded-lg text-white font-extrabold text-[9.5px] uppercase tracking-wide transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Next</span>
                                    <ChevronRight size={11} />
                                  </button>
                                </div>
                              );
                            })()}

                            <div className="pt-6 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono tracking-wider text-center select-none italic">
                              B.Sc. Medical Laboratory Technology (BMLT) Scholars Program Note
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // DESKTOP SYSTEM FULL WORKSPACE LAYOUT
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* NAVIGATION SIDEBAR OR COLUMN FOR SUBJECTS (Spans 4 cols on Desktop) */}
            {!activeArticle && (
              <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                      Syllabus Departments
                    </h2>
                    <p className="text-[9px] text-zinc-400 font-medium">Select a field of study</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="p-1 px-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <Plus size={9} /> Add
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-2 py-3">
                    <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
                    <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-zinc-200 rounded-lg">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">No Subjects Added</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {subjects.map((sub) => {
                      const TargetIcon = IconMap[sub.logo] || BookOpen;
                      const isActive = activeSubject?.id === sub.id;

                      return (
                        <div key={sub.id} className="relative group/sub flex items-center justify-between">
                          <button
                            onClick={() => handleSelectSubject(sub)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all border text-xs ${
                              isActive
                                ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm font-bold'
                                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-100'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                              isActive ? 'bg-zinc-800 text-teal-400 border-zinc-700' : 'bg-teal-50 text-teal-700 border-teal-100'
                            }`}>
                              <TargetIcon size={12} />
                            </div>
                            <span className="font-semibold tracking-tight truncate flex-1">{sub.name}</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteSubject(sub.id, sub.name);
                              }}
                              className="absolute right-2 opacity-0 group-hover/sub:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded bg-zinc-50 border border-zinc-200 scale-90 hover:scale-100 transition-all z-10"
                              title="Delete Subject"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TOPICS SECTION (Only appears after a subject is selected) */}
              {activeSubject && (
                <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-sm animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-teal-600 tracking-wider block">
                        {activeSubject.name} Units
                      </span>
                      <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                        Syllabus Lecture Topics
                      </h2>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowTopicModal(true)}
                        className="p-1 px-2 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-750 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <Plus size={9} /> Unit
                      </button>
                    )}
                  </div>

                  {topicsLoading ? (
                    <div className="space-y-1.5 py-2">
                      <div className="h-7 bg-zinc-100 rounded-md animate-pulse" />
                      <div className="h-7 bg-zinc-100 rounded-md animate-pulse" />
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-100 rounded-lg">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase">No Topics Configured</p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
                      {topics.map((top) => {
                        const isActive = activeTopic?.id === top.id;
                        return (
                          <div key={top.id} className="relative group/top flex items-center justify-between">
                            <button
                              onClick={() => handleSelectTopic(top)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border text-xs ${
                                isActive
                                  ? 'bg-teal-50 border-teal-200 text-teal-950 font-bold'
                                  : 'bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-650 border-transparent'
                              }`}
                            >
                              <span className="font-semibold leading-tight pr-4 truncate flex-1">{top.name}</span>
                              <ChevronRight size={12} className={isActive ? 'text-teal-600' : 'text-zinc-300'} />
                            </button>

                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDeleteTopic(top.id, top.name);
                                }}
                                className="absolute right-6 opacity-0 group-hover/top:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded bg-white border border-zinc-200 z-10"
                                title="Delete Topic"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* MAIN WORKSPACE FOR ARTICLES AND DETAIL CONTROLS (Spans 8 cols or 12 cols based on reading mode) */}
            <div className={`${activeArticle ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
              
              {!activeSubject ? (
                /* LANDING SCREEN INITIAL VISUALIZATION */
                <div className="bg-white p-12 rounded-[2rem] border border-zinc-200/80 text-center shadow-sm flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 rotate-6 hover:rotate-12 transition-transform duration-300">
                    <Library size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
                    Academic Lecture & Paper Repository
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-semibold mb-6">
                    Select a subject on the left to start browsing. Inside each subject, students and faculty can write custom medical manuals, clinical assays, and review handbooks.
                  </p>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm border-t border-zinc-100 pt-6">
                    <div className="text-left">
                      <span className="block text-teal-600 font-extrabold text-lg sm:text-xl font-mono">100%</span>
                      <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Department Focused</span>
                    </div>
                    <div className="text-left font-sans">
                      <span className="block text-indigo-600 font-extrabold text-lg sm:text-xl font-mono">Interactive</span>
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#4b5563]">Learning Engine</span>
                    </div>
                  </div>
                </div>
              ) : !activeTopic ? (
                /* SUBJECT LEVEL SYLLABUS DIRECTORY MAP */
                <div id="active-department-section" className="bg-white p-12 rounded-[2rem] border border-zinc-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 bg-teal-500/10 p-4 rounded-2xl border border-teal-500/10">
                    <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow">
                      {React.createElement(IconMap[activeSubject.logo] || BookOpen, { size: 18 })}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-950 font-display">{activeSubject.name} Directory</h2>
                      <p className="text-zinc-550 text-[11px] font-semibold">Select a topic unit on the left to review its medical texts.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Featured Laboratory Units</h3>
                    {topics.length === 0 ? (
                      <p className="text-zinc-400 text-xs font-medium">No topics under this subject unit yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topics.map(t => (
                          <button
                            key={t.id}
                            onClick={() => handleSelectTopic(t)}
                            className="flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100/75 rounded-xl border border-zinc-150 text-left transition-all font-sans"
                          >
                            <div>
                              <span className="block text-xs text-teal-600 font-black uppercase tracking-wider font-mono">Syllabus unit</span>
                              <span className="text-sm font-bold text-zinc-900 leading-tight block mt-0.5">{t.name}</span>
                            </div>
                            <ChevronRight size={16} className="text-zinc-400 ml-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ARTICLES CONTROLLER */
                <div id="active-topic-section" className="space-y-6">
                  
                  {/* ACTIVE TOPIC BANNER */}
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-teal-600 bg-teal-55/15 px-2.5 py-0.5 rounded-full border border-teal-150">
                          {activeSubject.name}
                        </span>
                        <ChevronRight size={12} className="text-zinc-400" />
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                          Active Unit
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                        {activeTopic.name}
                      </h2>
                    </div>
                  </div>

                  {/* DOUBLE ACTION CORE AREA: LIST ARTICLES + THE CHOSEN DETAILED READ VIEW */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* LEFT HAND ARTICLE LIST OF THIS TOPIC UNIT (Spans 5 Columns) */}
                    {!activeArticle && (
                    <div className="md:col-span-5 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
                      {/* Sub tab selectors for study notes vs mcq tests */}
                      <div className="flex bg-zinc-150/65 p-1 rounded-xl mb-4 text-[10px] font-black uppercase tracking-wider gap-1 select-none">
                        <button
                          type="button"
                          onClick={() => setLibraryMcqTab('lectures')}
                          className={`flex-1 py-2 rounded-lg text-center transition-all ${
                            libraryMcqTab === 'lectures'
                              ? 'bg-white text-zinc-950 shadow'
                              : 'text-zinc-500 hover:text-zinc-850'
                          }`}
                        >
                          📚 lectures ({articles.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibraryMcqTab('mcqs')}
                          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                            libraryMcqTab === 'mcqs'
                              ? 'bg-white text-zinc-950 shadow'
                              : 'text-zinc-500 hover:text-zinc-850'
                          }`}
                        >
                          ❓ MCQs ({libraryMcqs.length})
                        </button>
                      </div>

                      {libraryMcqTab === 'lectures' ? (
                        <>
                          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-zinc-455 px-1 mb-2">
                            Uploaded Lectures ({articles.length})
                          </h3>

                          {articlesLoading ? (
                            <div className="space-y-2 py-4">
                              <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
                              <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
                            </div>
                          ) : articles.length === 0 ? (
                            <div className="py-8 text-center px-1.5">
                              <p className="text-zinc-400 text-xs font-semibold leading-relaxed">
                                No notes have been uploaded by Authors or Faculty for this unit yet.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                              {articles.map((art) => {
                                const isShowing = activeArticle?.id === art.id;
                                return (
                                  <button
                                    key={art.id}
                                    onClick={() => handleSelectArticle(art)}
                                    className={`w-full p-3 rounded-lg text-left transition-all border block ${
                                      isShowing
                                        ? 'bg-zinc-50 border-zinc-300 shadow-sm font-bold text-zinc-950'
                                        : 'bg-white hover:bg-zinc-50/75 border-zinc-100 text-zinc-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 justify-between">
                                      <span className="text-xs font-extrabold group-hover:text-teal-600 leading-tight block line-clamp-1">
                                        {art.headline}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-50 text-[9px] font-bold text-zinc-400 font-mono">
                                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                                        <User size={10} className="text-zinc-400 shrink-0" />
                                        <span className="truncate">{art.author_name}</span>
                                      </span>
                                      {art.is_ai_generated === 1 && (
                                        <span className="inline-flex items-center gap-0.5 text-indigo-650 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 uppercase tracking-widest font-black text-[7px]" style={{ fontSize: '7px' }}>
                                          <Sparkles size={8} /> AI Note
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3.5 pt-1 text-left font-sans animate-fade-in select-none">
                          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 px-1">
                            MCQ Question Bank
                          </h3>
                          <p className="text-zinc-500 text-[11px] font-bold leading-normal px-1">
                            Interactive practice test is active. Standard evaluation sheets are loaded on the right-hand panel.
                          </p>
                          <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl space-y-2 text-teal-900">
                            <span className="text-[8px] font-black uppercase tracking-wider block bg-teal-200/50 text-teal-950 px-2 rounded-md w-max">Active Exam Panel</span>
                            <div className="text-[11px] leading-relaxed font-bold">
                              There are <span className="font-extrabold text-teal-950">{libraryMcqs.length} multiple-choice questions</span> published under this department.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* RIGHT HAND VIEW CONTAINING STANDARD PDF-STYLE PREVIEW READER */}
                    <div className={activeArticle ? "md:col-span-12" : "md:col-span-7"}>
                      
                      {articleDetailLoading ? (
                        <div className="bg-white p-10 rounded-xl border border-zinc-200 text-center py-24 shadow-sm space-y-3">
                          <div className="w-8 h-8 border-3 border-zinc-250 border-t-teal-600 rounded-full animate-spin mx-auto" />
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Loading academic paper layout...</p>
                        </div>
                      ) : !activeArticle ? (
                        libraryMcqTab === 'mcqs' ? (
                          /* DYNAMIC MCQ WORKSPACE */
                          <div className="bg-zinc-100 p-6 md:p-8 rounded-[2rem] border border-zinc-200 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/60 pb-4">
                              <div className="text-left font-sans">
                                <span className="text-[9px] font-black uppercase tracking-widest text-teal-750 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100 mb-1.5 inline-block">
                                  {activeSubject?.name || 'Academic'} Directory
                                </span>
                                <h3 className="text-sm sm:text-base font-black text-zinc-905 tracking-tight leading-tight">
                                  {activeTopic?.name || 'Unit Practice'}
                                </h3>
                                <p className="text-[10px] sm:text-xs font-bold text-zinc-400 mt-0.5">Select layout below or check answer sheet directly</p>
                              </div>

                              {/* Toggle layout mode button */}
                              <div className="flex bg-zinc-200 p-1 rounded-xl self-start sm:self-center font-sans shadow-inner border border-zinc-300/40 select-none">
                                <button
                                  type="button"
                                  onClick={() => setMcqViewMode('interactive')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                    mcqViewMode === 'interactive' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-500 hover:text-zinc-900'
                                  }`}
                                >
                                  Interactive Quiz
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMcqViewMode('static')}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                    mcqViewMode === 'static' ? 'bg-white text-zinc-950 shadow' : 'text-zinc-500 hover:text-zinc-900'
                                  }`}
                                >
                                  Static Print
                                </button>
                              </div>
                            </div>

                            {libraryMcqsLoading ? (
                              <div className="py-20 text-center space-y-3 font-sans">
                                <div className="w-8 h-8 border-3 border-zinc-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
                                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Compiling MCQ test sheet...</p>
                              </div>
                            ) : libraryMcqs.length === 0 ? (
                              <div className="py-16 text-center bg-white border border-zinc-150 rounded-2xl text-zinc-400 font-bold font-sans">
                                No MCQ practice sheets have been posted for this topic yet.
                              </div>
                            ) : mcqViewMode === 'static' ? (
                              /* STATIC PRINT SHEET LAYOUT */
                              <div className="bg-white p-6 md:p-10 rounded-[1.5rem] border border-zinc-300 shadow-md space-y-6 text-left max-h-[60vh] overflow-y-auto font-sans relative">
                                <div className="border border-zinc-950 p-4 rounded text-center space-y-1">
                                  <h4 className="text-xs font-black tracking-widest uppercase text-zinc-900">College of Medical Laboratory Technology</h4>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono">Academic Board Practice 2026</p>
                                  <div className="border-t border-zinc-200 my-2" />
                                  <div className="grid grid-cols-2 text-[8px] uppercase font-bold text-zinc-500 text-left">
                                    <div>Dept: {activeSubject?.name}</div>
                                    <div className="text-right">Unit: {activeTopic?.name}</div>
                                  </div>
                                </div>

                                <div className="space-y-6 pt-2 select-text">
                                  {libraryMcqs.map((mcq, idx) => (
                                    <div key={mcq.id} className="space-y-2.5 border-b border-zinc-100 pb-4">
                                      <h5 className="font-extrabold text-zinc-950 text-xs sm:text-sm">
                                        Q{idx + 1}. {mcq.question}
                                      </h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-xs font-semibold text-zinc-700">
                                        <div>A) {mcq.option_a}</div>
                                        <div>B) {mcq.option_b}</div>
                                        {mcq.option_c && <div>C) {mcq.option_c}</div>}
                                        {mcq.option_d && <div>D) {mcq.option_d}</div>}
                                        {mcq.option_e && <div>E) {mcq.option_e}</div>}
                                      </div>
                                      {showStaticAnswers && (
                                        <div className="mt-2.5 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1 w-max">
                                          ✓ Correct Option Marker: {mcq.correct_option}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-4 border-t border-zinc-200 flex justify-between items-center bg-white sticky bottom-0">
                                  <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                  >
                                    Print Paper
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowStaticAnswers(!showStaticAnswers)}
                                    className="px-3.5 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                  >
                                    {showStaticAnswers ? 'Hide Answer Key' : 'Reveal Answer Key'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* INTERACTIVE QUIZ LAYOUT */
                              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                {libraryMcqs.map((mcq, idx) => {
                                  const selectedAnswer = mcqCompletedAnswers[mcq.id];
                                  const isCorrect = selectedAnswer === mcq.correct_option;
                                  return (
                                    <div key={mcq.id} className="bg-white p-5 rounded-2xl border border-zinc-250 text-left space-y-4 shadow-sm font-sans">
                                      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2">
                                        <h5 className="font-extrabold text-zinc-900 text-xs sm:text-sm">
                                          Q{idx + 1}. {mcq.question}
                                        </h5>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {[
                                          { key: 'A', val: mcq.option_a },
                                          { key: 'B', val: mcq.option_b },
                                          { key: 'C', val: mcq.option_c },
                                          { key: 'D', val: mcq.option_d },
                                          { key: 'E', val: mcq.option_e }
                                        ].filter(o => o.val).map(o => {
                                          const optionSelected = selectedAnswer === o.key;
                                          return (
                                            <button
                                              key={o.key}
                                              type="button"
                                              onClick={() => {
                                                if (selectedAnswer === o.key) {
                                                  // deselect
                                                  const copy = { ...mcqCompletedAnswers };
                                                  delete copy[mcq.id];
                                                  setMcqCompletedAnswers(copy);
                                                } else {
                                                  // select / modify
                                                  setMcqCompletedAnswers({
                                                    ...mcqCompletedAnswers,
                                                    [mcq.id]: o.key
                                                  });
                                                  // If correct, reward points!
                                                  if (o.key === mcq.correct_option) {
                                                    fetch('/api/student/earn-points', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ pointsToAdd: 10, mcqId: mcq.id, isBmlt: false }),
                                                      credentials: 'include'
                                                    }).catch(err => console.error("Error earning student points:", err));
                                                  } else {
                                                    // Incorrect answer - deduct 2.5 points
                                                    fetch('/api/student/earn-points', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ pointsToAdd: -2.5, mcqId: mcq.id, isBmlt: false }),
                                                      credentials: 'include'
                                                    }).catch(err => console.error("Error deducting student points:", err));
                                                  }
                                                }
                                              }}
                                              className={`w-full px-4 py-3 rounded-xl border text-xs text-left transition-all ${
                                                selectedAnswer
                                                  ? optionSelected
                                                    ? isCorrect
                                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-extrabold shadow-sm'
                                                      : 'bg-red-50 border-red-300 text-red-950 font-bold'
                                                    : o.key === mcq.correct_option
                                                      ? 'bg-emerald-55/40 border-emerald-250 text-emerald-950 font-bold'
                                                      : 'bg-zinc-50 border-zinc-100 opacity-60'
                                                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 select-none'
                                              }`}
                                            >
                                              <span className="font-bold mr-1">({o.key})</span> {o.val}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {selectedAnswer && (
                                        <div className={`text-[10px] font-black p-3 rounded-xl flex items-center justify-between border ${
                                          isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-805' : 'bg-red-50 border-red-100 text-red-805'
                                        }`}>
                                          <span>
                                            {isCorrect ? '✓ Correct Answer!' : `✗ Incorrect option selected. Answer: (Option ${mcq.correct_option})`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* NOTHING SELECTED - EMPTY WORKSPACE PREVIEWER */
                          <div className="bg-white p-10 rounded-xl border border-zinc-200 text-center py-20 text-zinc-400 shadow-sm flex flex-col items-center justify-center space-y-3">
                            <BookCheck size={30} className="text-zinc-300 animate-bounce" />
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                              Select Lecture Deck
                            </p>
                            <p className="text-zinc-555 text-xs max-w-xs leading-relaxed font-semibold">
                              Click any textbook guideline, student note, or research paper on the left directory index to view standard academic PDF print layout.
                            </p>
                          </div>
                        )
                      ) : (
                        /* STANDARDIZED PDF PREVIEWER CONTAINER FRAME */
                        <div className={`bg-zinc-800 text-zinc-200 shadow-md overflow-hidden flex flex-col transition-all duration-500 font-sans ${localNavbarHidden ? "fixed inset-0 z-[52] w-screen h-screen rounded-none border-none" : "relative rounded-xl border border-zinc-700 max-h-[640px] h-[640px]"}`}>
                          
                          {/* Floating pull down button for toolbar hidden state */}
                          {readerToolbarHidden && (
                            <button
                              type="button"
                              onClick={() => setReaderToolbarHidden(false)}
                              className="absolute top-2.5 right-2.5 z-50 px-3 py-1.5 bg-zinc-900/95 hover:bg-zinc-800 text-teal-400 border border-zinc-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none shadow-md animate-pulse"
                              title="Show Reader Toolbar"
                            >
                              <span>Pull Down Toolbar</span>
                              <ArrowDown size={10} />
                            </button>
                          )}

                          {/* Chrome/Adobe Acrobat styled top dark header tool bar */}
                          {!readerToolbarHidden && (
                            <div className="bg-zinc-900 border-b border-zinc-700/85 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300 font-mono shrink-0 select-none">
                              <div className="flex items-center gap-2 font-semibold text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveArticle(null);
                                    setLocalNavbarHidden(false);
                                    window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: false }));
                                  }}
                                  className="px-2.5 py-1 hover:bg-zinc-800 text-teal-400 hover:text-teal-300 rounded text-[10px] font-black uppercase tracking-wider border border-zinc-700 bg-zinc-950/80 transition-all flex items-center gap-1.5 shrink-0 mr-1.5 cursor-pointer animate-pulse"
                                  title="Close Reader"
                                >
                                  <ArrowLeft size={11} className="text-teal-400" />
                                  <span>Close</span>
                                </button>
                                <BookCheck size={13} className="text-teal-400 shrink-0 select-none" />
                                <span className="truncate max-w-[120px] sm:max-w-[210px] select-none">
                                  bmlt_arch_{activeArticle.id}_{activeArticle.headline.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15)}.pdf
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-zinc-850 px-2 py-0.5 rounded border border-zinc-700/60 text-[9px] font-bold text-zinc-350">
                                  <span>Pg 1 / 1</span>
                                </div>

                                <div className="flex bg-zinc-850 p-0.5 rounded border border-zinc-700/60 text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => setViewMode('document')}
                                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all ${
                                      viewMode === 'document' ? 'bg-zinc-700 text-teal-400 shadow' : 'text-zinc-400 hover:text-zinc-250'
                                    }`}
                                  >
                                    Document
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewMode('presentation');
                                      setCurrentSlideIdx(0);
                                    }}
                                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all ${
                                      viewMode === 'presentation' ? 'bg-zinc-700 text-teal-400 shadow' : 'text-zinc-400 hover:text-zinc-250'
                                    }`}
                                  >
                                    Slideshow
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState = !localNavbarHidden;
                                    setLocalNavbarHidden(nextState);
                                    window.dispatchEvent(new CustomEvent('toggle-global-navbar', { detail: nextState }));
                                  }}
                                  className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border transition-all flex items-center gap-1 cursor-pointer select-none ${
                                    localNavbarHidden 
                                      ? 'bg-amber-600/20 border-amber-500/40 text-amber-400' 
                                      : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                                  }`}
                                  title="Slide Top Navbar Up/Down"
                                >
                                  {localNavbarHidden ? (
                                    <>
                                      <span>Pull Down Nav Bar</span>
                                      <ArrowDown size={9} />
                                    </>
                                  ) : (
                                    <>
                                      <span>Pull Up Nav Bar</span>
                                      <ArrowUp size={9} />
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setReaderToolbarHidden(true)}
                                  className="px-2.5 py-1 rounded text-[9px] font-black uppercase border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white transition-all flex items-center gap-1 cursor-pointer select-none"
                                  title="Pull Up Reader Toolbar"
                                >
                                  <span>Pull Up Reader Toolbar</span>
                                  <ArrowUp size={9} />
                                </button>
                                
                                <button
                                  onClick={() => {
                                  const printWindow = window.open('', '_blank');
                                  if (printWindow) {
                                    printWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>${activeArticle.headline}</title>
                                          <style>
                                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181b; }
                                            .paper-decor { border: 2px solid #000; padding: 12px; margin-bottom: 24px; text-align: center; }
                                            .topic-sub { text-transform: uppercase; font-size: 11px; font-weight: bold; font-family: monospace; letter-spacing: 0.1em; color: #4b5563; }
                                            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #18181b; padding-bottom: 8px; margin-bottom: 24px; font-size: 11px; font-family: monospace; }
                                            .title { font-size: 26px; font-weight: 800; line-height: 1.3; color: #000; margin-top: 15px; margin-bottom: 20px; }
                                            .simple-md-content { line-height: 1.6; font-size: 14.5px; }
                                            h3 { font-size: 18px; font-weight: bold; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; margin-top: 24px; margin-bottom: 8px; }
                                            h4 { font-size: 15px; font-weight: bold; color: #0f766e; margin-top: 16px; margin-bottom: 8px; }
                                            p { margin-bottom: 12px; }
                                            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                                            th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-size: 13px; }
                                            th { background-color: #f3f4f6; }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="paper-decor">
                                            <div class="topic-sub">B.Sc. Medical Laboratory Technology (BMLT) Scholars Program</div>
                                            <div style="font-weight: 800; text-transform: uppercase; font-size: 15px; margin: 4px 0;">SUBJECT DEPARTMENT: ${activeSubject?.name || 'Department'}</div>
                                            <div style="font-size: 12px; font-weight: bold; color: #0f766e;">TOPIC SYLLABUS UNIT: ${activeTopic?.name || 'Academic Unit'}</div>
                                          </div>
                                          <div class="meta-grid">
                                            <div><strong>DOCUMENT ASSAY:</strong> #BMLT-${activeArticle.id}</div>
                                            <div style="text-align: right;"><strong>ACADEMIC AUTHOR:</strong> ${activeArticle.author_name}</div>
                                            <div><strong>COMPILATION MODE:</strong> ${activeArticle.is_ai_generated === 1 ? 'INTELLIGENT EMBED (AI)' : 'STUDENT SUBMISSION'}</div>
                                            <div style="text-align: right;">Verified Academic Sheet</div>
                                          </div>
                                          <div class="title">${activeArticle.headline}</div>
                                          <div class="simple-md-content">
                                            ${document.getElementById('academic-pdf-prose-content')?.innerHTML || ''}
                                          </div>
                                        </body>
                                      </html>
                                    `);
                                    printWindow.document.close();
                                    printWindow.print();
                                  }
                                }}
                                className="hover:text-white px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-700 border border-zinc-705 hover:border-zinc-500 text-[10px] uppercase font-bold items-center gap-1.5 inline-flex transition-all active:scale-95 text-teal-400"
                                title="Print A4 Paper"
                              >
                                <Upload size={11} className="rotate-180 text-teal-350" />
                                <span>Print PDF</span>
                              </button>

                              {activeArticle && (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(activeArticle)}
                                    className="p-1 px-2.5 hover:bg-teal-950 text-teal-400 hover:text-teal-200 rounded text-[9px] uppercase font-bold border border-teal-900/60 transition-all flex items-center gap-1 shadow-sm mr-1"
                                    title="Customize this study material"
                                  >
                                    Customize
                                  </button>
                                  <button
                                    onClick={() => triggerDeleteArticle(activeArticle.id, activeArticle.headline, activeArticle.author_name)}
                                    className="p-1 px-2.5 hover:bg-rose-950 text-rose-405 hover:text-rose-300 rounded text-[9px] uppercase font-bold border border-rose-900/60 transition-all flex items-center gap-1 shadow-sm"
                                    title="Delete this lecture note as author or admin"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                          {/* Centered PDF Document Canvas space */}
                          <div className="bg-zinc-700/60 p-3 sm:p-5 flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center h-full">
                            {/* Document Navigation Controls for Desktop Article Reader */}
                            {(() => {
                              const currentList = activeTopic ? articles : subjectArticles;
                              const currentIdx = currentList.findIndex(a => a.id === activeArticle?.id);
                              if (currentIdx === -1 || currentList.length <= 1) return null;

                              return (
                                <div className="w-full max-w-4xl mb-4 flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-md select-none font-sans">
                                  <button
                                    disabled={currentIdx <= 0}
                                    onClick={() => {
                                      const prevArt = currentList[currentIdx - 1];
                                      handleSelectArticle(prevArt);
                                    }}
                                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 disabled:opacity-20 disabled:pointer-events-none rounded-xl text-teal-400 font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700 hover:border-zinc-500 hover:text-white"
                                    title="Load previous note/chapter sequentially"
                                  >
                                    <ChevronLeft size={14} />
                                    <span>Previous Page</span>
                                  </button>

                                  <div className="text-center font-mono text-[10.5px] text-zinc-400 font-semibold">
                                    Notes Sequence: <strong className="text-teal-400 font-bold">{currentIdx + 1}</strong> of <strong className="text-white font-bold">{currentList.length}</strong>
                                  </div>

                                  <button
                                    disabled={currentIdx >= currentList.length - 1}
                                    onClick={() => {
                                      const nextArt = currentList[currentIdx + 1];
                                      handleSelectArticle(nextArt);
                                    }}
                                    className="px-3.5 py-2 bg-teal-650 hover:bg-teal-555 disabled:opacity-20 disabled:pointer-events-none rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                                    title="Load next note/chapter sequentially"
                                  >
                                    <span>Next Page</span>
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              );
                            })()}

                            <div className="w-full flex-1 flex justify-center items-start">
                              {renderActiveArticleContent()}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>
        ))}

        {/* STANDALONE BOOKS LISTING AND INTERACTIVE OVERLAYS MOVED ABOVE */}
        {false && !activeArticle && (
          <div className="mt-8 border-t border-zinc-200 pt-8" id="standalone-books-section text-left">
            {activeBook ? (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in text-left">
                {/* Header of opened book */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border text-white text-2xl font-black ${
                      activeBook.cover_color === 'teal' ? 'bg-teal-600 border-teal-500' :
                      activeBook.cover_color === 'indigo' ? 'bg-indigo-600 border-indigo-500' :
                      activeBook.cover_color === 'emerald' ? 'bg-emerald-600 border-emerald-500' :
                      activeBook.cover_color === 'rose' ? 'bg-rose-600 border-rose-500' :
                      activeBook.cover_color === 'amber' ? 'bg-amber-500 border-amber-400' :
                      activeBook.cover_color === 'violet' ? 'bg-violet-600 border-violet-500' :
                      activeBook.cover_color === 'sky' ? 'bg-sky-500 border-sky-400' :
                      'bg-zinc-650 border-zinc-550'
                    }`}>
                      📖
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 tracking-tight leading-snug">
                        {activeBook.title}
                      </h2>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        By {activeBook.author_name} &bull; Separately uploaded volume
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setShowBookDocUploadModal(true)}
                        className="px-3.5 py-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-97 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Upload Document</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveBook(null)}
                      className="px-3.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-97 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Books</span>
                    </button>
                  </div>
                </div>

                {/* List of documents within this book */}
                {bookDocsLoading ? (
                  <div className="space-y-3 py-10">
                    <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                    <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
                  </div>
                ) : bookDocuments.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <FileText size={40} className="text-zinc-300" />
                    <p className="text-sm font-bold text-zinc-500">No documents in this book</p>
                    <p className="text-xs text-zinc-400">Click the upload button to add guidelines, handwritten files, or textbooks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto max-w-full text-left" id="book-documents-container">
                    {bookDocuments.map((doc) => (
                      <div key={doc.id} className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/50 hover:bg-zinc-50 flex items-center justify-between gap-3 shadow-xs transition-all text-left">
                        <div className="flex items-start gap-3 min-w-0 text-left">
                          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 text-teal-750">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-extrabold text-zinc-800 leading-tight truncate text-left" title={doc.title}>
                              {doc.title}
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-semibold mt-1 text-left">
                              By {doc.author_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 hover:text-teal-700 rounded-lg transition-all"
                            title="Open Document File"
                          >
                            <Download size={14} />
                          </a>
                          
                          <button
                            onClick={() => handleDeleteBookDoc(doc.id)}
                            className="p-2 bg-white border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all"
                            title="Delete File"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Grid of 1:1 Book Cards */
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div className="text-left">
                    <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
                       Books
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      Upload and read textbook guidelines, reference handbooks, and documents separately managed by professors.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBook(null);
                      setBookForm({ title: '', author_name: 'Dr. S. K. Safin', cover_color: 'teal' });
                      setShowBookModal(true);
                    }}
                    className="px-3.5 py-2 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-97 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create Book</span>
                  </button>
                </div>

                {booksLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="aspect-square bg-zinc-100 rounded-2xl animate-pulse" />
                    <div className="aspect-square bg-zinc-100 rounded-2xl animate-pulse" />
                    <div className="aspect-square bg-zinc-100 rounded-2xl animate-pulse" />
                  </div>
                ) : books.length === 0 ? (
                  <div className="py-12 bg-white rounded-2xl border border-dashed border-zinc-200 text-center text-zinc-450 text-xs font-bold uppercase tracking-wider">
                     No separate books listed yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" id="standalone-books-grid">
                    {books.map((book) => {
                      return (
                        <div
                          key={book.id}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200/90 shadow-xs cursor-pointer group hover:shadow-md transition-all flex flex-col justify-between p-4 text-left active:scale-98 select-none bg-white"
                          onClick={() => handleOpenBook(book)}
                        >
                          <div className={`absolute inset-0 opacity-[0.04] pointer-events-none ${
                            book.cover_color === 'teal' ? 'bg-teal-600' :
                            book.cover_color === 'indigo' ? 'bg-indigo-600' :
                            book.cover_color === 'emerald' ? 'bg-emerald-600' :
                            book.cover_color === 'rose' ? 'bg-rose-600' :
                            book.cover_color === 'amber' ? 'bg-amber-400' :
                            book.cover_color === 'violet' ? 'bg-violet-600' :
                            book.cover_color === 'sky' ? 'bg-sky-400' :
                            'bg-zinc-650'
                          }`} />

                          {/* Cover Top Emblem */}
                          <div className="flex items-start justify-between">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 text-sm shadow-xs ${
                              book.cover_color === 'teal' ? 'bg-teal-600' :
                              book.cover_color === 'indigo' ? 'bg-indigo-600' :
                              book.cover_color === 'emerald' ? 'bg-emerald-600' :
                              book.cover_color === 'rose' ? 'bg-rose-600' :
                              book.cover_color === 'amber' ? 'bg-amber-500' :
                              book.cover_color === 'violet' ? 'bg-violet-600' :
                              book.cover_color === 'sky' ? 'bg-sky-500' :
                              'bg-zinc-650'
                            }`}>
                              📖
                            </div>
                            
                            <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBook(book);
                                  setBookForm({ title: book.title, author_name: book.author_name, cover_color: book.cover_color });
                                  setShowBookModal(true);
                                }}
                                className="p-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-all"
                                title="Edit Book"
                              >
                                <Edit size={10} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBook(book.id);
                                }}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-all"
                                title="Delete Book"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>

                          {/* Title and indicators */}
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-zinc-900 tracking-tight leading-snug line-clamp-3">
                              {book.title}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono pt-1">
                              <span className="truncate max-w-[80px] text-left">{book.author_name}</span>
                              <span className="text-teal-650 bg-teal-50/80 border border-teal-100 px-1 py-0.2 rounded shrink-0">
                                {book.document_count || 0} files
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- ADD / EDIT STANDALONE BOOK MODAL --- */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-md w-full rounded-3xl border border-zinc-150 p-6 shadow-2xl space-y-5 text-left max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black font-display text-zinc-950 flex items-center gap-2">
                📖 {editingBook ? 'Edit Standalone Book Accent' : 'Create Standalone Book'}
              </h3>
              <button 
                onClick={() => {
                  setShowBookModal(false);
                  setEditingBook(null);
                }}
                className="text-zinc-400 hover:text-black font-extrabold text-sm p-1.5 hover:bg-zinc-105 rounded-full"
              >
                ✕
              </button>
            </div>

            {bookModalSuccess ? (
              /* High-fidelity custom success animation */
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-[fade-in_0.3s_ease-out] text-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 animate-ping duration-1000" />
                  <div className="absolute w-18 h-18 rounded-full bg-emerald-500/20 blur-md" />
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin duration-700 pointer-events-none absolute" />
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center z-10 bg-white shadow-md animate-[bounce_0.6s_ease-out]">
                    <svg className="w-8 h-8 text-emerald-600 animate-[bounce_0.6s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1 z-10">
                  <h4 className="text-sm font-black text-emerald-950 tracking-tight uppercase">Successfully Published!</h4>
                  <p className="text-xs text-zinc-500 font-medium font-sans">The textbook is now cataloged in the academic repository.</p>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateOrUpdateBook();
                }} 
                className="space-y-4 font-sans"
              >
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Book Title</label>
                  <input
                    type="text"
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    placeholder="e.g. Textbook of Clinical Parasitology"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-xs focus:outline-teal-500 font-semibold text-zinc-900 bg-zinc-50/55"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Author Name</label>
                  <input
                    type="text"
                    value={bookForm.author_name}
                    onChange={(e) => setBookForm({ ...bookForm, author_name: e.target.value })}
                    placeholder="e.g. Dr. S. K. Safin"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-xs focus:outline-teal-500 font-semibold text-zinc-900 bg-zinc-50/55"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Theme / Color Accent</label>
                  <select
                    value={bookForm.cover_color}
                    onChange={(e) => setBookForm({ ...bookForm, cover_color: e.target.value })}
                    className="w-full border border-zinc-200 bg-white rounded-xl p-3 text-xs focus:outline-teal-500 font-semibold text-zinc-900 bg-zinc-50/55 shadow-xs"
                  >
                    <option value="teal">Teal</option>
                    <option value="indigo">Indigo</option>
                    <option value="emerald">Emerald</option>
                    <option value="rose">Rose</option>
                    <option value="amber">Amber</option>
                    <option value="violet">Violet</option>
                    <option value="sky">Sky Blue</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-97 cursor-pointer hover:shadow-lg border border-teal-400/20"
                >
                  {editingBook ? '✓ Save Accent Changes' : '✦ Publish Clinical Textbook'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- UPLOAD BOOK DOCUMENT MODAL --- */}
      {showBookDocUploadModal && activeBook && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-md w-full rounded-3xl border border-zinc-150 p-6 shadow-2xl space-y-5 text-left max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black font-display text-zinc-950 flex items-center gap-2">
                📤 Upload to {activeBook.title}
              </h3>
              <button 
                onClick={() => {
                  setShowBookDocUploadModal(false);
                  setSelectedBookFile(null);
                  setBookDocForm({ title: '', author_name: '' });
                }}
                className="text-zinc-400 hover:text-black font-extrabold text-xs p-1.5 hover:bg-zinc-100 rounded-full"
              >
                ✕
              </button>
            </div>

            {docModalSuccess ? (
              /* Document Success Animation Overlay */
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-[fade-in_0.3s_ease-out] text-center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 rounded-full bg-teal-500/15 animate-ping duration-1000" />
                  <div className="absolute w-18 h-18 rounded-full bg-teal-300/20 blur-md" />
                  <div className="w-16 h-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin duration-700 pointer-events-none absolute" />
                  <div className="w-16 h-16 rounded-full border-4 border-teal-500 flex items-center justify-center z-10 bg-white shadow-md animate-[bounce_0.6s_ease-out]">
                    <svg className="w-8 h-8 text-teal-600 animate-[bounce_0.6s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1 z-10">
                  <h4 className="text-sm font-black text-teal-950 tracking-tight uppercase">Chapter Added!</h4>
                  <p className="text-xs text-zinc-500 font-medium">Your document was compiled and attached into this volume.</p>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUploadBookDoc();
                }}
                className="space-y-4 font-sans"
              >
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Select Document File</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedBookFile(file);
                        if (!bookDocForm.title) {
                          setBookDocForm(prev => ({ ...prev, title: file.name }));
                        }
                      }
                    }}
                    className="w-full border border-dashed border-zinc-200 rounded-xl p-4 text-xs font-mono file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Document / Chapter Label</label>
                  <input
                    type="text"
                    value={bookDocForm.title}
                    onChange={(e) => setBookDocForm({ ...bookDocForm, title: e.target.value })}
                    placeholder="e.g. Chapter 4: Antigens and Antibodies"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-xs focus:outline-teal-500 font-semibold text-zinc-900 bg-zinc-50/55"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500">Contributor / Academic Author</label>
                  <input
                    type="text"
                    value={bookDocForm.author_name}
                    onChange={(e) => setBookDocForm({ ...bookDocForm, author_name: e.target.value })}
                    placeholder="e.g. Dr. S. K. Safin"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-xs focus:outline-teal-500 font-semibold text-zinc-900 bg-zinc-50/55"
                  />
                </div>

                {uploadingBookDoc ? (
                  <div className="w-full py-3 bg-zinc-100 border border-zinc-200 text-zinc-505 rounded-xl font-bold text-center flex items-center justify-center gap-2.5">
                    <Loader2 className="w-4 h-4 text-teal-650 animate-spin" />
                    <span className="text-xs uppercase tracking-wider font-mono">Uploading Digital Assets...</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!selectedBookFile}
                    className={`w-full py-3 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-97 shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      selectedBookFile 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-emerald-400/20' 
                        : 'bg-zinc-300 hover:bg-zinc-350 cursor-not-allowed text-zinc-500 border border-zinc-200 pointer-events-none'
                    }`}
                  >
                    🚀 {selectedBookFile ? 'Publish to Textbook Outline' : 'Select a File to Activate'}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- ADD SUBJECT DIALOG DICTIONARY MODAL --- */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-md w-full rounded-2xl border border-zinc-150 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display text-zinc-950 flex items-center gap-2">
                <Plus size={20} className="text-teal-600 animate-pulse" /> Add Subject Department
              </h3>
              <button 
                onClick={() => setShowSubjectModal(false)}
                className="text-zinc-400 hover:text-black font-extrabold text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Subject Name</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Medical Microbiology or Serology"
                  className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Subject Logo Accent</label>
                <select
                  value={subjectForm.logo}
                  onChange={(e) => setSubjectForm({ ...subjectForm, logo: e.target.value })}
                  className="w-full border border-zinc-300 bg-white rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                >
                  <option value="Microscope">🔬 Microscope (Pathogens/Microbiology)</option>
                  <option value="HeartPulse">🩸 HeartPulse (Hematology)</option>
                  <option value="FlaskConical">🧪 FlaskConical (Biochemistry)</option>
                  <option value="Dna">🧬 DNA (Histopathology)</option>
                  <option value="Activity">⚡ Activity (Clinical Immunology)</option>
                  <option value="Brain">🧠 Brain (Clinical Neuro/Advanced)</option>
                  <option value="ShieldAlert">⚠️ ShieldAlert (Biosafety Guidelines)</option>
                  <option value="BookOpen">📖 BookOpen (General Diagnostics)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs uppercase shadow-sm"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DYNAMIC CUSTOM DELETION DIALOG OVERLAY MODERN MODAL --- */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-center justify-center p-4 backdrop-blur-md animate-smooth-fade font-sans">
          <div className="relative bg-zinc-950 max-w-md w-full rounded-3xl border-2 border-rose-900 p-6 sm:p-8 shadow-2xl space-y-6 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-zinc-850 pb-4">
              <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 text-rose-405 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 font-mono">
                  SECURITY CLEARANCE SENSITIVE
                </h3>
                <h4 className="text-md font-bold tracking-tight text-white leading-tight">
                  Confirm Deletion Pathway
                </h4>
              </div>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-zinc-350 leading-relaxed font-semibold">
                Are you absolutely sure you want to delete this <span className="text-rose-455 uppercase font-mono font-black">{deleteConfirmTarget.type}</span>?
              </p>
              <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-2xl">
                <h5 className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">Target Title</h5>
                <p className="text-xs font-bold text-white leading-normal mt-1">{deleteConfirmTarget.title}</p>
                {deleteConfirmTarget.type === 'article' && deleteConfirmTarget.authorName && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <span>Authorized Author:</span>
                    <span className="text-teal-400 font-bold font-mono">{deleteConfirmTarget.authorName}</span>
                  </div>
                )}
              </div>

              {deleteConfirmTarget.type === 'article' && deleteConfirmTarget.authorName && (
                (() => {
                  const isOwner = ownedArticleIds.includes(deleteConfirmTarget.id);
                  const storedAuthor = localStorage.getItem('my_author_name');
                  const isNameMatch = !!(storedAuthor && 
                    storedAuthor.toLowerCase().trim() === deleteConfirmTarget.authorName.toLowerCase().trim());
                  const isPermitted = isAdmin || isOwner || isNameMatch;

                  if (!isPermitted) {
                    return (
                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-teal-950/20 border border-teal-905 rounded-xl text-[11px] text-teal-350 font-medium leading-normal">
                          🛡️ You are not recognized as the creator of this note or an admin. Please type the exact author name to verify safety.
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-450">
                            Enter Author Name to Verify:
                          </label>
                          <input
                            type="text"
                            value={deleteVerificationInput}
                            onChange={(e) => {
                              setDeleteVerificationInput(e.target.value);
                              setDeleteError('');
                            }}
                            placeholder={deleteConfirmTarget.authorName}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-850 text-white rounded-xl p-3 text-xs font-bold focus:outline-none placeholder-zinc-600 transition-colors"
                          />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-rose-955/20 border border-rose-900/60 rounded-xl text-[11px] text-rose-300 font-semibold leading-normal">
                      ✓ Author Ownership Verified. Click Execute below to commit changes.
                    </div>
                  );
                })()
              )}

              {deleteConfirmTarget.type === 'subject' && (
                <p className="text-[10px] font-semibold text-rose-455 bg-rose-955/10 p-3 rounded-xl border border-rose-900/40">
                  ⚠️ WARNING: This will immediately purge all associated topic syllabus units and academic lecture notes permanently from the database.
                </p>
              )}

              {deleteConfirmTarget.type === 'topic' && (
                <p className="text-[10px] font-semibold text-rose-455 bg-rose-955/10 p-3 rounded-xl border border-rose-900/40">
                  ⚠️ WARNING: This will permanently remove all laboratory lecture articles and student notes within this syllabus unit.
                </p>
              )}

              {deleteError && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-900 text-rose-200 rounded-xl text-xs font-bold leading-normal">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold rounded-xl text-xs uppercase cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAction}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md active:scale-97 hover:shadow-lg"
              >
                Execute Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD TOPIC DIALOG DICTIONARY MODAL --- */}
      {showTopicModal && activeSubject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-md w-full rounded-2xl border border-zinc-150 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display text-zinc-950 flex items-center gap-2">
                <Plus size={20} className="text-teal-600" /> Add Topic Syllabus Unit
              </h3>
              <button 
                onClick={() => setShowTopicModal(false)}
                className="text-zinc-400 hover:text-black font-extrabold text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-semibold">
              You are adding a topic unit under the subject department: <strong className="text-zinc-800">{activeSubject.name}</strong>
            </p>

            <form onSubmit={handleAddTopic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Topic Title Name</label>
                <input
                  type="text"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm({ name: e.target.value })}
                  placeholder="e.g. Parasitology and Helminthes Study"
                  className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs uppercase shadow-sm"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPLOAD CUSTOM PAPER / LECTURE ARTICLE MODAL --- */}
      {showArticleModal && activeTopic && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-2xl w-full rounded-2xl border border-zinc-205 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display text-zinc-955 flex items-center gap-2">
                <Upload size={18} className="text-teal-600 animate-bounce" /> Upload Laboratory Notes
              </h3>
              <button 
                onClick={() => setShowArticleModal(false)}
                className="text-zinc-400 hover:text-black font-extrabold text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-semibold">
              Posting notes to syllabus topic unit: <strong className="text-zinc-805">{activeTopic.name}</strong>
            </p>

            {/* TABS HEADER */}
            <div className="flex border-b border-zinc-200">
              <button
                type="button"
                onClick={() => setInsertMode('upload')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  insertMode === 'upload'
                    ? 'border-teal-650 text-teal-850 font-black'
                    : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                📁 Auto-compile Word / PPT / PDF
              </button>
              <button
                type="button"
                onClick={() => setInsertMode('manual')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  insertMode === 'manual'
                    ? 'border-teal-650 text-teal-850 font-black'
                    : 'border-transparent text-zinc-400 hover:text-zinc-650'
                }`}
              >
                ✍️ Manual Rich Draft
              </button>
            </div>

            {insertMode === 'upload' ? (
              <div className="space-y-4 animate-fade-in text-left">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Your Name (Author)</label>
                  <input
                    type="text"
                    value={articleForm.author_name}
                    onChange={(e) => setArticleForm({ ...articleForm, author_name: e.target.value })}
                    placeholder="e.g. SK Safin, Med Lab Scholar"
                    className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Attach Document File</label>
                  
                  {uploadingDoc ? (
                    <div className="border border-dashed border-teal-300 bg-teal-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      <p className="text-sm font-black text-teal-950">Uploading document securely...</p>
                      <p className="text-xs text-zinc-400 font-semibold max-w-sm">
                        Saving file directly to study board for instant viewer access.
                      </p>
                    </div>
                  ) : (
                    <label className="border border-dashed border-zinc-300 hover:border-teal-500 bg-zinc-50/50 hover:bg-teal-50/10 cursor-pointer rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2 transition-all group">
                      <input 
                        type="file" 
                        accept=".docx,.pptx,.ppt,.pdf,.txt,.md"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadDocumentDoc(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <div className="p-3 bg-zinc-100 rounded-full group-hover:bg-teal-100 text-zinc-500 group-hover:text-teal-600 transition-colors">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm font-black text-zinc-800">
                        Click to browse or drop your lecture file
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">
                        Supports Word (.docx), PowerPoint (.pptx, .ppt), PDF, Text (.txt, .md)
                      </p>
                    </label>
                  )}
                </div>

                <div className="p-4 bg-zinc-100/80 rounded-xl space-y-2 text-xs font-semibold text-zinc-500">
                  <p className="font-extrabold text-zinc-750">📁 How direct attachment works:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Uploaded files are securely saved directly in the syllabus content library.</li>
                    <li>PDF files are displayed in an interactive paper preview canvas inline.</li>
                    <li>Word documents and PowerPoint presentations are available for instant classroom download.</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowArticleModal(false)}
                    className="px-4 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-650 font-bold rounded-xl text-xs uppercase"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddArticle} className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Your Name (Author)</label>
                    <input
                      type="text"
                      value={articleForm.author_name}
                      onChange={(e) => setArticleForm({ ...articleForm, author_name: e.target.value })}
                      placeholder="e.g. SK Safin, Med Lab Scholar"
                      className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Article Headline / Subtitle</label>
                    <input
                      type="text"
                      value={articleForm.headline}
                      onChange={(e) => setArticleForm({ ...articleForm, headline: e.target.value })}
                      placeholder="e.g. Complete Gram Staining Protocols and Control Checks"
                      className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900"
                      required
                    />
                  </div>
                </div>

              <div className="space-y-2 select-none">
                <span className="block text-xs font-black uppercase tracking-wider text-zinc-500">Quick Academic Templates (Pre-populate with Layouts)</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArticleForm({
                        author_name: articleForm.author_name || 'Academic Scholar',
                        headline: 'Quantitative Enzymatic ELISAs and Calibration Protocol',
                        content: `### 1. Specimen Guidelines & Setup
Ensure you calibrate the biosensor spectrophotometer and prepare all analytical controls before incubation.

[smartart: alert | CRITICAL: Wear safety goggles, full lab coat, and check calibrator expiration dates before assaying!]

- **Specimen Needed**: Fluoride Oxalate Plasma
- **Storage Condition**: Stable at 2-8°C for up to 48 hours

--- [slide] ---

### 2. Analytical Diagnostic Process Flow
This step-by-step flowchart represents the exact clinical sequence required.

[smartart: process | 1. Pipette Sample: Place 100uL reagent in wells -> 2. Inoculate Target: Add 10uL of patient serum sample -> 3. Standard Incubator: Incubation at 37°C for 30 minutes -> 4. Read Absorbance: Measure absorbance at 450nm via spectrophotometer]

--- [slide] ---

### 3. Biological Pathway Iterative Loops
Study the circular cellular regulation feedback mechanism here.

[smartart: cycle | Substrate Activation -> Antigen Adsorption -> Antibody Complexing -> Enzymatic Clearing -> back to Substrate Activation]

[image: https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80 | Figure 1: Real-time high absorption spectroscopy analyzer calibrations]`
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-850 text-[10px] font-bold uppercase transition-all"
                  >
                    📝 Assay Guideline Template
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArticleForm({
                        author_name: articleForm.author_name || 'Laboratory Assistant',
                        headline: 'Gram Differentiation & Microbacteriology Isolation Techniques',
                        content: `### 1. Microbiological Cell Wall Classifications
Diagnostic microbiology groups clinical bacteria isolates based on their peptidoglycan membrane properties.

[smartart: grid | Gram Positive: Holds Violet Lugols Complex owing to active cross-linked outer peptidoglycan || Gram Negative: Counterstained Pink-Red due to outer lipoprotein lipid barrier bilayer structure]

- **Key Identification**: Helps clinicians initiate target-specific empirical antibiotic therapy.

--- [slide] ---

### 2. Clinical Incubation Development Timeline
Follow this milestone progression for active strain growth and taxonomic isolation.

[smartart: timeline | Hour 0: Preparation - Sterilize loop and inoculate Sheep Blood Agar -> Hour 12: Germination - Incubate at 35°C in custom CO2 environment -> Hour 24: Colonisation - Map hemolysis forms (Alpha, Beta, Gamma) -> Hour 48: Characterisation - Perform catalase, coagulase, or Gram test confirmation]

[image: https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=800&q=80 | Figure 2: Microbe morphology inspection under selective nutrient incubation]`
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-850 text-[10px] font-bold uppercase transition-all"
                  >
                    🔬 Pathology Lecture Template
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArticleForm({
                        author_name: articleForm.author_name || 'Senior Research Scientist',
                        headline: 'PowerPoint-Style presentation on Polymerase RNA Amplification Assays',
                        content: `### Welcome Scholars: PCR Assays
**Molecular Lab Presentation Deck**
A clinical walk-through illustrating rapid gene amplification techniques.

- Discover how PCR replicates target nucleotide blocks.
- Optimized for horizontal slideshow mobile views.

--- [slide] ---

### Thermocycling Phases
Key molecular events during temperature cycling.

[smartart: process | 1. Denaturation: 95°C breaks DNA double strands -> 2. Annealing: 58°C binds specific primer pairs -> 3. Extension: 72°C Taq polymerase assembles complementary bases]

--- [slide] ---

### Isolated Outcomes
Review isolated diagnostic RNA strains under fluorescent visualization tracking.

[image: https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=800&q=80 | Microscope View: RNA electrophoresis gel visualization results]`
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-850 text-[10px] font-bold uppercase transition-all"
                  >
                    📊 Slide Deck PPT Template
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Article Body / Textbook Notes</label>
                  <span className="text-[10px] text-zinc-400 font-bold">MS Word & slide element generator toolbar</span>
                </div>

                {/* WORD-LIKE FORMATTING HELP TOOLBAR */}
                <div className="flex flex-wrap gap-1 bg-zinc-50 border border-zinc-200 p-1.5 rounded-xl text-zinc-700">
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + ' **BoldText**' })}
                    className="p-1 px-2.5 rounded bg-white border border-zinc-200 font-extrabold hover:bg-zinc-100 text-[10px] uppercase shadow-sm transition-all"
                    title="Insert Bold"
                  >
                    📌 B
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n- Bullet Point Details' })}
                    className="p-1 px-2.5 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-[10px] font-bold uppercase shadow-sm transition-all"
                    title="Insert List"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[smartart: process | Step 1: Details -> Step 2: Details -> Step 3: Details]' })}
                    className="p-1 px-2 rounded bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Flowchart"
                  >
                    📈 Process Flow
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[smartart: grid | Title A: Definition A || Title B: Definition B]' })}
                    className="p-1 px-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Bento Cards Grid"
                  >
                    📊 Grid Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[smartart: timeline | Phase 1: Description -> Phase 2: Description]' })}
                    className="p-1 px-2 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 hover:bg-cyan-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Timeline"
                  >
                    🕒 Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[smartart: cycle | Step 1 -> Step 2 -> Step 3 -> back to 1]' })}
                    className="p-1 px-2 rounded bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Cycle Diagram"
                  >
                    🔄 Cycle
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[smartart: alert | CRITICAL: Verify safety compliance measurements immediately!]' })}
                    className="p-1 px-2 rounded bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Biohazard Alert Box"
                  >
                    ⚠️ Warning Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n[image: https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=800&q=80 | Figure: High Resolution Microscopic View]' })}
                    className="p-1 px-2 rounded bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-[10.5px] font-bold uppercase cursor-pointer"
                    title="Insert Clinical Illustration Image"
                  >
                    🖼️ Lab Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setArticleForm({ ...articleForm, content: articleForm.content + '\n--- [slide] ---\n' })}
                    className="p-1 px-2 rounded bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[10.5px] font-bold uppercase cursor-pointer animate-pulse"
                    title="Add Slide Break"
                  >
                    📄 Slide Break
                  </button>
                </div>

                <textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Insert Word tools above, customize text, or select one of our template presets to populate a complete high-quality lecture note automatically!"
                  className="w-full h-44 border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-medium text-zinc-900 resize-none font-mono mt-1"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs uppercase shadow-sm"
                >
                  Publish Article Note
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* --- CUSTOMIZE / EDIT DOCUMENT LEVEL MATERIAL MODAL --- */}
      {showEditModal && editingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-white max-w-2xl w-full rounded-2xl border border-zinc-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display text-zinc-900 flex items-center gap-2">
                ✍️ Customize Study Material
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingArticle(null);
                  setArticleForm({ headline: '', content: '', author_name: '' });
                }}
                className="text-zinc-400 hover:text-black font-extrabold text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
              You are customizing: <strong className="text-teal-700">{editingArticle.headline}</strong>
            </p>

            <form onSubmit={handleSaveArticleEdit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Headline Title</label>
                  <input
                    type="text"
                    value={articleForm.headline}
                    onChange={(e) => setArticleForm({ ...articleForm, headline: e.target.value })}
                    placeholder="e.g. Parasitology Lab Diagnostic Manual"
                    className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900 mt-1"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">Author Name</label>
                  <input
                    type="text"
                    value={articleForm.author_name}
                    onChange={(e) => setArticleForm({ ...articleForm, author_name: e.target.value })}
                    placeholder="e.g. Prof. R. K. Sharma"
                    className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-semibold text-zinc-900 mt-1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500">
                  {editingArticle.section === 'mcq' ? 'MCQ Practice JSON content data' : 'Study Notes Content (Slide splits via "---")'}
                </label>
                <textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Enter notes markdown text here..."
                  className="w-full h-60 border border-zinc-300 rounded-xl p-3 text-sm focus:outline-teal-500 font-medium text-zinc-900 font-mono mt-1"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingArticle(null);
                    setArticleForm({ headline: '', content: '', author_name: '' });
                  }}
                  className="px-4 py-2 border border-zinc-350 hover:bg-zinc-50 text-zinc-650 font-bold rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs uppercase shadow"
                >
                  Apply & Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
