import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, User, MessageSquare, Sparkles, Plus, X, Link as LinkIcon, Music, Video, Image as ImageIcon, Phone, AlertCircle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { Program } from '../types';

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function IdeaForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    participants: [''],
    group_type: 'Single' as 'Single' | 'Duo' | 'Group',
    category: [] as string[],
    media_url: '',
    media_type: 'link' as 'link' | 'mp3' | 'mp4' | 'image',
    contact_info: '',
    programId: '',
    programName: ''
  });
  const [activePrograms, setActivePrograms] = useState<Program[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'invalid_phone'>('idle');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'programs'), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Program[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Program);
      });
      setActivePrograms(list);
      if (list.length > 0) {
        setFormData(prev => {
          if (!prev.programId || !list.some(p => p.id === prev.programId)) {
            return {
              ...prev,
              programId: list[0].id,
              programName: list[0].name
            };
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/public/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, media_url: data.url }));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to upload file');
      }
    } catch (err) {
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Indian Phone Number (10 digits)
    if (!/^\d{10}$/.test(formData.contact_info)) {
      setStatus('invalid_phone');
      return;
    }

    setStatus('loading');

    try {
      const path = 'participations';
      const submissionData = {
        title: formData.title,
        description: formData.description,
        participants: formData.participants.filter(p => p.trim() !== ''),
        performer: formData.participants.filter(p => p.trim() !== '').join(', '),
        group_type: formData.group_type,
        category: formData.category,
        media_url: formData.media_url,
        media_type: formData.media_type,
        contact_info: `+91 ${formData.contact_info}`,
        program: formData.programName || 'N/A',
        program_id: formData.programId || 'default',
        created_at: new Date().toISOString()
      };

      // Submit to SQLite for Approval Workflow
      await fetch('/api/public/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      // Also keep Firestore for backup/history as it was before
      try {
        await addDoc(collection(db, 'participations'), {
          ...submissionData,
          createdAt: serverTimestamp(),
          uid: auth.currentUser?.uid || null
        });
      } catch (fErr) {
        console.warn('Firestore backup failed:', fErr);
      }

      // Sync to Google Sheets automatically
      try {
        await fetch('/api/public/sync-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Participation Request',
            data: submissionData
          })
        });
      } catch (syncErr) {
        console.warn('Auto-sync to Google Sheets failed:', syncErr);
      }

      setStatus('success');
      setFormData({ 
        title: '', 
        description: '', 
        participants: [''],
        group_type: 'Single',
        category: [],
        media_url: '',
        media_type: 'link',
        contact_info: '',
        programId: activePrograms[0]?.id || '',
        programName: activePrograms[0]?.name || ''
      });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error submitting idea:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'participations');
      } catch (e) {
        // Error already logged
      }
      setStatus('error');
    }
  };

  const handleAddParticipant = () => {
    if (formData.group_type === 'Duo' && formData.participants.length >= 2) return;
    setFormData({ ...formData, participants: [...formData.participants, ''] });
  };

  const handleRemoveParticipant = (index: number) => {
    if (formData.group_type === 'Duo' && formData.participants.length <= 2) return;
    const newParticipants = formData.participants.filter((_, i) => i !== index);
    setFormData({ ...formData, participants: newParticipants });
  };

  const handleParticipantChange = (index: number, value: string) => {
    const newParticipants = [...formData.participants];
    newParticipants[index] = value;
    setFormData({ ...formData, participants: newParticipants });
  };

  const categories = ['Singing', 'Dance', 'Recitation', 'Speech', 'Videography', 'Photography', 'Sketch', 'Other'];
  const performanceTypes = ['Classical', 'Indian', 'Western', 'Fusion', 'Other'];

  if (activePrograms.length === 0) {
    return (
      <div className="space-y-6">
        <div id="no-event-running-banner" className="bg-amber-50/60 border border-amber-250 border-dashed rounded-[2rem] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto animate-bounce">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Opps! No Event is running now</h3>
            <p className="text-amber-800/80 text-xs sm:text-sm font-semibold leading-relaxed">
              Registrations and creative submissions are currently offline because there is no active program configured by the administrators. Please check back later!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link 
        to="/demanding"
        className="block group relative overflow-hidden bg-white hover:bg-red-50 border-2 border-red-100 p-3 md:p-4 rounded-2xl md:rounded-[2rem] transition-all shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-3 md:gap-4 relative z-10">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-red-50 rounded-xl md:rounded-2xl flex items-center justify-center text-red-600 shadow-sm transition-transform group-hover:scale-110">
              <Flame className="w-4 h-4 md:w-5 md:h-5 fill-red-600" />
            </div>
            <div>
              <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-0.5">Need Inspiration?</div>
              <div className="font-black text-sm md:text-base text-zinc-900 tracking-tight flex items-center gap-1.5 md:gap-2">
                Check <span className="text-red-600">Demanding Chillies</span>
                <Music size={12} className="md:w-3.5 md:h-3.5 text-zinc-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
          </div>
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-red-600 group-hover:text-white transition-all">
            <Plus size={14} className="md:w-4 md:h-4" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-red-500/5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/10 transition-colors" />
      </Link>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-black/5 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-2 bg-ig-gradient" />
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-ig-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-ig-pink/20 shrink-0">
          <Sparkles size={20} className="md:hidden" />
          <Sparkles size={24} className="hidden md:block" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-ig-gradient">Participation Form</h2>
          <p className="text-zinc-500 text-xs md:text-sm">Join the event lineup. Share your performance details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Sparkles size={16} className="text-ig-pink" /> Select Target Program
          </label>
          <select
            required
            value={formData.programId}
            onChange={(e) => {
              const pId = e.target.value;
              const selectedProg = activePrograms.find(p => p.id === pId);
              setFormData(prev => ({
                ...prev,
                programId: pId,
                programName: selectedProg ? selectedProg.name : ''
              }));
            }}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-ig-pink/20 focus:border-ig-pink font-bold text-zinc-800 transition-all cursor-pointer"
          >
            {activePrograms.length === 0 ? (
              <option value="" disabled>No active programs open for registration</option>
            ) : (
              activePrograms.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700">Participation Type</label>
          <div className="flex gap-2">
            {['Single', 'Duo', 'Group'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  let newParticipants = [...formData.participants];
                  if (type === 'Single') {
                    newParticipants = [formData.participants[0] || ''];
                  } else if (type === 'Duo') {
                    newParticipants = [
                      formData.participants[0] || '',
                      formData.participants[1] || ''
                    ];
                  }
                  setFormData({ ...formData, group_type: type as any, participants: newParticipants });
                }}
                className={cn(
                  "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                  formData.group_type === type 
                    ? "bg-black text-white border-black shadow-lg" 
                    : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <User size={16} /> {formData.group_type === 'Single' ? 'Participant Name' : 'Participants'}
          </label>
          
          <div className="space-y-3">
            {formData.participants.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  required
                  type="text"
                  value={p}
                  onChange={(e) => handleParticipantChange(idx, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder={formData.group_type === 'Single' ? "Enter your full name" : `Participant ${idx + 1} Name`}
                />
                {formData.group_type === 'Group' && formData.participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(idx)}
                    className="p-3 text-zinc-400 hover:text-red-600 bg-zinc-50 border border-zinc-200 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            
            {formData.group_type === 'Group' && (
              <button
                type="button"
                onClick={handleAddParticipant}
                className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-500 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Participant
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Phone size={16} className="text-ig-pink" /> Contact Information (10-digit Phone)
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm border-r border-zinc-200 pr-3">
              +91
            </div>
            <input
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={formData.contact_info}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, contact_info: val });
                if (status === 'invalid_phone') setStatus('idle');
              }}
              className={cn(
                "w-full pl-16 pr-4 py-3 rounded-xl bg-zinc-50 border focus:outline-none focus:ring-2 transition-all",
                status === 'invalid_phone' 
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" 
                  : "border-zinc-200 focus:ring-ig-pink/20 focus:border-ig-pink"
              )}
              placeholder="10-digit mobile number"
            />
          </div>
          {status === 'invalid_phone' && (
            <p className="text-red-500 text-[10px] font-bold uppercase ml-1">Please enter a valid 10-digit Indian phone number</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <MessageSquare size={16} className="text-ig-pink" /> Type of your performance
          </label>
          <div className="flex flex-wrap gap-2">
            {performanceTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, title: type })}
                className={cn(
                  "px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                  formData.title === type 
                    ? "bg-ig-pink text-white border-ig-pink shadow-md" 
                    : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <input
            required
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-ig-pink/20 focus:border-ig-pink transition-all"
            placeholder="Select or type your performance style..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700">Categories</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.category.includes(cat)}
                  onChange={e => {
                    const newCats = e.target.checked 
                      ? [...formData.category, cat]
                      : formData.category.filter(c => c !== cat);
                    setFormData({ ...formData, category: newCats });
                  }}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                />
                <span className="text-xs font-medium text-zinc-600 group-hover:text-black transition-colors">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700">Media Attachment (Optional)</label>
          <div className="flex gap-2 mb-2">
            {[
              { id: 'link', icon: LinkIcon },
              { id: 'mp3', icon: Music },
              { id: 'mp4', icon: Video },
              { id: 'image', icon: ImageIcon }
            ].map(mType => (
              <button
                key={mType.id}
                type="button"
                onClick={() => setFormData({ ...formData, media_type: mType.id as any })}
                className={cn(
                  "flex-1 py-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                  formData.media_type === mType.id 
                    ? "bg-zinc-800 text-white border-zinc-800 shadow-md" 
                    : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300"
                )}
              >
                <mType.icon size={14} />
                <span className="text-[10px] font-black uppercase">{mType.id}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="url"
              placeholder={formData.media_type === 'link' ? "Paste URL here..." : "Media URL or path..."} 
              value={formData.media_url} 
              onChange={e => setFormData({ ...formData, media_url: e.target.value })} 
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all" 
            />
            <label className="shrink-0 cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-3 rounded-xl transition-all flex items-center justify-center border border-zinc-200">
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
              />
              {uploading ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <MessageSquare size={16} /> Description
          </label>
          <textarea
            required
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
            placeholder="Tell us more about your performance..."
          />
        </div>

        {status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle size={18} />
            <span>Something went wrong. Please try again later.</span>
          </div>
        )}

        <button
          disabled={status === 'loading'}
          type="submit"
          className="w-full bg-ig-gradient text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-ig-pink/20"
        >
          {status === 'loading' ? (
            'Submitting...'
          ) : status === 'success' ? (
            'Application Sent!'
          ) : (
            <>
              Submit Application <Send size={18} />
            </>
          )}
        </button>
      </form>
      </div>
    </div>
  );
}
