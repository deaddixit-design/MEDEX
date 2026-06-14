import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Sparkles, Image, List, ShieldAlert, LogOut, UserPlus, Key, User, CheckCircle2, XCircle, X, FileSpreadsheet, RefreshCw, Settings, Copy, Check, Eye, EyeOff, ExternalLink, MessageSquare, Phone, Music, Video, Edit, Link as LinkIcon, Flame, Disc, Play, GraduationCap, BookOpen, Beaker, FileText, Layers, Activity, ChevronLeft, ChevronRight, Presentation, Newspaper, HelpCircle, Microscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MedexLogo } from './MedexLogo';

// Local fetch wrapper to ensure cookies/credentials are always passed in sandboxes
const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const mergedInit = { ...init };
  if (!mergedInit.credentials) {
    mergedInit.credentials = 'include';
  }
  return window.fetch(input, mergedInit);
};

const MediaPreviewModal = ({ url, type, title, onClose }: { url: string, type: string, title: string, onClose: () => void }) => {
  const isAudio = url.match(/\.(mp3|wav|ogg|m4a)$/i) || type === 'song';
  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || type === 'videography';
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || type === 'photography';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-2xl w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
            className="p-2.5 bg-black/50 hover:bg-black text-white rounded-full transition-all border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-2 text-left">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2 mb-4">
            {isAudio ? <Music size={20} className="text-red-500" /> : isVideo ? <Video size={20} className="text-red-500" /> : <Image size={20} className="text-red-500" />}
            {title}
          </h3>
          
          <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center min-h-[250px]">
            {isAudio && (
              <div className="w-full p-8 md:p-12 space-y-6 flex flex-col items-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-red-600/30 flex items-center justify-center text-red-600 shadow-[0_0_40px_rgba(220,38,38,0.2)]"
                >
                  <Disc size={40} />
                </motion.div>
                <audio controls autoPlay className="w-full">
                  <source src={url} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            
            {isVideo && (
              <video controls autoPlay className="max-h-[60vh] w-full">
                <source src={url} />
                Your browser does not support the video element.
              </video>
            )}

            {isImage && (
              <img 
                src={url} 
                alt={title} 
                className="max-h-[60vh] w-full object-contain"
                referrerPolicy="no-referrer"
              />
            )}

            {!isAudio && !isVideo && !isImage && (
              <div className="p-20 text-center">
                <p className="text-zinc-400 mb-6">This media format might not be supported for inline playback.</p>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-700 text-white font-bold rounded-xl"
                >
                  Open in New Tab <LinkIcon size={18} />
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="p-8 pt-4 text-center">
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest italic">Admin Media Center</p>
        </div>
      </motion.div>
    </motion.div>
  );
};
import { Idea, Media, Performance, DemandingItem, Program, BatchMemory, Wish, VipPass } from '../types';
import { cn } from '../lib/utils';
import { db, auth, signInWithGoogle, onAuthStateChanged, User as FirebaseUser } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, updateDoc, setDoc, serverTimestamp, addDoc, where } from 'firebase/firestore';

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  role?: string;
  created_at: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: any;
  status: 'unread' | 'read';
}

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string; role?: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({ username: '', recoveryKey: '', newPassword: '' });
  const [recoveryError, setRecoveryError] = useState('');

  const [activeTab, setActiveTab] = useState<'database' | 'media' | 'performances' | 'admins' | 'messages' | 'settings' | 'demanding' | 'programs' | 'batches' | 'vip_passes' | 'news' | 'mcqs' | 'mlt_desk' | 'students'>('database');
  const [adminNews, setAdminNews] = useState<any[]>([]);
  const [adminMcqs, setAdminMcqs] = useState<any[]>([]);
  const [mcqSubjects, setMcqSubjects] = useState<any[]>([]);
  const [mcqTopics, setMcqTopics] = useState<any[]>([]);
  const [editingMcq, setEditingMcq] = useState<any | null>(null);
  const [newMcqForm, setNewMcqForm] = useState({
    subject_id: '',
    topic_id: '',
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    correct_option: 'A'
  });
  const [newNewsForm, setNewNewsForm] = useState({
    title: '',
    content: '',
    author_name: 'Admin',
    category: 'General',
    image_url: '',
    file_path: ''
  });
  const [editingNewsItem, setEditingNewsItem] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  // MLT Desk Admin states
  const [mltSlides, setMltSlides] = useState<any[]>([]);
  const [mltLabParams, setMltLabParams] = useState<any[]>([]);
  const [mltMcqs, setMltMcqs] = useState<any[]>([]);
  const [mltCases, setMltCases] = useState<any[]>([]);
  const [mltSubTab, setMltSubTab] = useState<'slides' | 'lab_params' | 'cases' | 'mcqs'>('slides');
  const [mltLoading, setMltLoading] = useState<boolean>(false);

  // Forms
  const [slideForm, setSlideForm] = useState({
    id: null as number | null,
    name: '',
    description: '',
    targetCell: '',
    hint: '',
    imageUrl: '',
    fact: '',
    options: '',
    hotspots: '[]'
  });
  const [labForm, setLabForm] = useState({
    id: null as number | null,
    name: '',
    unit: '',
    normalMinMale: '',
    normalMaxMale: '',
    normalMinFemale: '',
    normalMaxFemale: '',
    category: '',
    description: ''
  });
  const [mltMcqForm, setMltMcqForm] = useState({
    id: null as number | null,
    question: '',
    options: '',
    correct: '',
    imageUrl: '',
    explanation: ''
  });
  const [mltCaseForm, setMltCaseForm] = useState({
    id: null as number | null,
    type: 'mcq' as 'mcq' | 'paragraph',
    title: '',
    scenario: '',
    question: '',
    options: '',
    correct: '',
    explanation: '',
    normalParams: ''
  });

  const [showMltForm, setShowMltForm] = useState<boolean>(false);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; spreadsheetId: string }>({ connected: false, spreadsheetId: '' });
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string; title: string } | null>(null);
  const [editingDemanding, setEditingDemanding] = useState<DemandingItem | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(false);
  
  const [participations, setParticipations] = useState<Idea[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [batchMemories, setBatchMemories] = useState<BatchMemory[]>([]);
  const [batches, setBatches] = useState<{ id: number; name: string; cover_url?: string; avatar_url?: string; motto?: string }[]>([]);
  const [selectedAdminBatch, setSelectedAdminBatch] = useState<string>('All');
  const [adminNewBatchName, setAdminNewBatchName] = useState('');
  const [showAdminAddBatchInline, setShowAdminAddBatchInline] = useState(false);
  const [allowViewerUploads, setAllowViewerUploads] = useState<boolean>(true);
  const [isUpdatingUploadSettings, setIsUpdatingUploadSettings] = useState<boolean>(false);
  const [breakingNewsEnabled, setBreakingNewsEnabled] = useState<boolean>(false);
  const [breakingNewsText, setBreakingNewsText] = useState<string>('');
  const [customAppLogoSvg, setCustomAppLogoSvg] = useState<string>('');
  const [homeImage1, setHomeImage1] = useState<string>('');
  const [homeImage2, setHomeImage2] = useState<string>('');
  const [homeImage3, setHomeImage3] = useState<string>('');
  const [polaroidImage1, setPolaroidImage1] = useState<string>('');
  const [polaroidImage2, setPolaroidImage2] = useState<string>('');
  const [polaroidImage3, setPolaroidImage3] = useState<string>('');
  const [showcaseImage1, setShowcaseImage1] = useState<string>('');
  const [showcaseImage2, setShowcaseImage2] = useState<string>('');
  const [isUpdatingCustomSettings, setIsUpdatingCustomSettings] = useState<boolean>(false);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [allPerformances, setAllPerformances] = useState<Performance[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentForm, setStudentForm] = useState({ username: '', password: '', display_name: '', roll_no: '', reg_no: '', points: 0, session: '2023-2026', section: 'A' });
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentSessionFilter, setStudentSessionFilter] = useState<string>('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState<string>('All');
  const [academicSessions, setAcademicSessions] = useState<any[]>([]);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingSessionName, setEditingSessionName] = useState<string>('');
  const [showSessionsModal, setShowSessionsModal] = useState<boolean>(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [demandingItems, setDemandingItems] = useState<DemandingItem[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  // VIP Pass and wishing wall states
  const [vipPasses, setVipPasses] = useState<VipPass[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [newVipName, setNewVipName] = useState('');
  const [isGeneratingVip, setIsGeneratingVip] = useState(false);
  const [scanInputCode, setScanInputCode] = useState('');
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string; pass?: VipPass } | null>(null);

  // Library Database Content Manager states
  const [dbSubTab, setDbSubTab] = useState<'records' | 'library' | 'mlt_desk'>('records');
  const [eventsSubTab, setEventsSubTab] = useState<'programs' | 'performances' | 'demanding'>('programs');
  const [libraryManageSection, setLibraryManageSection] = useState<'subjects' | 'topics' | 'articles' | 'books' | 'bookdocs'>('subjects');

  const [libSubjects, setLibSubjects] = useState<any[]>([]);
  const [libTopics, setLibTopics] = useState<any[]>([]);
  const [libArticles, setLibArticles] = useState<any[]>([]);
  const [libBooks, setLibBooks] = useState<any[]>([]);
  const [libBookDocs, setLibBookDocs] = useState<any[]>([]);

  // Selected contexts for drill-down filters
  const [selectedLibSubjectId, setSelectedLibSubjectId] = useState<string>('');
  const [selectedLibTopicId, setSelectedLibTopicId] = useState<string>('');
  const [selectedLibBookId, setSelectedLibBookId] = useState<string>('');

  // Creation Form States
  const [newSubjectForm, setNewSubjectForm] = useState({ name: '', logo: 'BookOpen' });
  const [newTopicForm, setNewTopicForm] = useState({ name: '', subject_id: '' });
  const [newArticleForm, setNewArticleForm] = useState({ 
    headline: '', 
    content: '', 
    author_name: '', 
    section: 'textbook',
    file: null as File | null,
    allow_download: 1
  });
  const [newBookForm, setNewBookForm] = useState({ title: '', author_name: 'BMLT Director', cover_color: 'teal', allow_download: 1 });
  const [newBookDocForm, setNewBookDocForm] = useState({ 
    title: '', 
    author_name: 'BMLT Scholar', 
    file: null as File | null,
    allow_download: 1
  });

  const [isSavingLibraryItem, setIsSavingLibraryItem] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editingTopic, setEditingTopic] = useState<any | null>(null);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [editingBookDoc, setEditingBookDoc] = useState<any | null>(null);

  const loadLibraryAdminData = async () => {
    try {
      const [subjRes, bookRes, artRes, bdocRes] = await Promise.all([
        fetch('/api/content/subjects'),
        fetch('/api/books'),
        fetch('/api/content/all-articles'),
        fetch('/api/content/all-book-documents')
      ]);

      if (subjRes.ok) {
        const subjs = await subjRes.json();
        setLibSubjects(Array.isArray(subjs) ? subjs : []);
      }
      if (bookRes.ok) {
        const bks = await bookRes.json();
        setLibBooks(Array.isArray(bks) ? bks : []);
      }
      if (artRes.ok) {
        const arts = await artRes.json();
        setLibArticles(Array.isArray(arts) ? arts : []);
      }
      if (bdocRes.ok) {
        const bdocs = await bdocRes.json();
        setLibBookDocs(Array.isArray(bdocs) ? bdocs : []);
      }
    } catch (err) {
      console.error('Error fetching admin library data:', err);
    }
  };

  useEffect(() => {
    if (dbSubTab === 'library') {
      loadLibraryAdminData();
    }
  }, [dbSubTab]);

  useEffect(() => {
    if (!selectedLibSubjectId) {
      setLibTopics([]);
      return;
    }
    fetch(`/api/content/subjects/${selectedLibSubjectId}/topics`)
      .then(res => res.json())
      .then(data => setLibTopics(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading selected subject topics:", err));
  }, [selectedLibSubjectId]);

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectForm.name) {
      showNotification('Subject name is required', 'error');
      return;
    }
    setIsSavingLibraryItem(true);
    try {
      const isEdit = editingSubject !== null;
      const url = isEdit ? `/api/content/subjects/${editingSubject.id}` : '/api/content/subjects';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubjectForm)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save subject department');
      }
      showNotification(isEdit ? 'Subject Department updated successfully!' : 'Subject Department added successfully!', 'success');
      setNewSubjectForm({ name: '', logo: 'BookOpen' });
      setEditingSubject(null);
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message || 'Error occurred', 'error');
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subject department? This will cascade-delete all its child topics and lecture notes from the database.')) return;
    try {
      const res = await authenticatedFetch(`/api/content/subjects/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete subject');
      showNotification('Subject department deleted successfully', 'success');
      setSelectedLibSubjectId('');
      setSelectedLibTopicId('');
      setEditingSubject(null);
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const subId = selectedLibSubjectId || newTopicForm.subject_id;
    const isEdit = editingTopic !== null;
    if (!newTopicForm.name || (!isEdit && !subId)) {
      showNotification('Topic name and parent Subject Department are required', 'error');
      return;
    }
    setIsSavingLibraryItem(true);
    try {
      const url = isEdit ? `/api/content/topics/${editingTopic.id}` : '/api/content/topics';
      const method = isEdit ? 'PUT' : 'POST';
      const bodyObj = isEdit 
        ? { name: newTopicForm.name }
        : { name: newTopicForm.name, subject_id: parseInt(subId) };

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save unit topic');
      }
      showNotification(isEdit ? 'Syllabus unit topic updated successfully!' : 'Syllabus unit topic added successfully!', 'success');
      setNewTopicForm({ name: '', subject_id: '' });
      setEditingTopic(null);
      // Reload topics
      if (subId) {
        const topicRes = await fetch(`/api/content/subjects/${subId}/topics`);
        if (topicRes.ok) setLibTopics(await topicRes.json());
      }
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleDeleteTopic = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this syllabus unit topic? This will cascade-delete its lecture files from the database.')) return;
    try {
      const res = await authenticatedFetch(`/api/content/topics/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete topic');
      showNotification('Syllabus topic deleted successfully', 'success');
      setSelectedLibTopicId('');
      setEditingTopic(null);
      if (selectedLibSubjectId) {
        const topicRes = await fetch(`/api/content/subjects/${selectedLibSubjectId}/topics`);
        if (topicRes.ok) setLibTopics(await topicRes.json());
      }
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = editingArticle !== null;
    if (!newArticleForm.headline || (!isEdit && !selectedLibSubjectId)) {
      showNotification('Headline and Parent Subject are required', 'error');
      return;
    }
    setIsSavingLibraryItem(true);
    try {
      const url = isEdit ? `/api/content/articles/${editingArticle.id}` : '/api/content/articles';
      const method = isEdit ? 'PUT' : 'POST';

      if (newArticleForm.file) {
        const formData = new FormData();
        formData.append('file', newArticleForm.file);
        if (!isEdit && selectedLibSubjectId) {
          formData.append('subjectId', selectedLibSubjectId);
        }
        formData.append('section', newArticleForm.section || 'textbook');
        formData.append('headline', newArticleForm.headline);
        formData.append('author_name', newArticleForm.author_name || 'Academic Scholar');
        formData.append('allow_download', String(newArticleForm.allow_download));
        if (!isEdit && selectedLibTopicId) {
          formData.append('topicId', selectedLibTopicId);
        }

        const token = localStorage.getItem('admin_token');
        const res = await fetch(url, {
          method,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to upload lecture notes document');
        }
      } else {
        const bodyPayload: any = {
          section: newArticleForm.section || 'textbook',
          headline: newArticleForm.headline,
          content: newArticleForm.content || 'Standard Textbook Note',
          author_name: newArticleForm.author_name || 'Academic Scholar',
          allow_download: newArticleForm.allow_download
        };
        if (!isEdit) {
          bodyPayload.subject_id = parseInt(selectedLibSubjectId);
          if (selectedLibTopicId) {
            bodyPayload.topic_id = parseInt(selectedLibTopicId);
          }
        } else {
          bodyPayload.file_path = editingArticle.file_path || null;
        }

        const res = await authenticatedFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to save notes');
        }
      }

      showNotification(isEdit ? 'Lecture notes updated successfully!' : 'Lecture notes published successfully!', 'success');
      setNewArticleForm({ headline: '', content: '', author_name: '', section: 'textbook', file: null, allow_download: 1 });
      setEditingArticle(null);
      const fileInput = document.getElementById('lib-article-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this lecture notes/file entry?')) return;
    try {
      const res = await authenticatedFetch(`/api/content/articles/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete lecture notes');
      showNotification('Lecture notes deleted successfully', 'success');
      setEditingArticle(null);
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookForm.title) {
      showNotification('Book title is required', 'error');
      return;
    }
    setIsSavingLibraryItem(true);
    try {
      const isEdit = editingBook !== null;
      const url = isEdit ? `/api/books/${editingBook.id}` : '/api/books';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBookForm)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save reference book');
      }
      showNotification(isEdit ? 'Reference book updated successfully!' : 'Reference book created successfully!', 'success');
      setNewBookForm({ title: '', author_name: 'BMLT Director', cover_color: 'teal', allow_download: 1 });
      setEditingBook(null);
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this reference book? This will permanently remove all child chapters and PDF volumes.')) return;
    try {
      const res = await authenticatedFetch(`/api/books/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete reference book');
      showNotification('Reference book deleted successfully', 'success');
      setSelectedLibBookId('');
      setEditingBook(null);
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveBookDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = editingBookDoc !== null;
    if (!isEdit && (!selectedLibBookId || !newBookDocForm.file)) {
      showNotification('Please select a parent Reference Book and choose a PDF/Word file to upload.', 'error');
      return;
    }
    if (isEdit && !newBookDocForm.title) {
      showNotification('Chapter title is required.', 'error');
      return;
    }
    setIsSavingLibraryItem(true);
    try {
      const url = isEdit ? `/api/books/documents/${editingBookDoc.id}` : `/api/books/${selectedLibBookId}/documents/upload`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const formData = new FormData();
      if (newBookDocForm.file) {
        formData.append('file', newBookDocForm.file);
      }
      formData.append('title', newBookDocForm.title || (newBookDocForm.file ? newBookDocForm.file.name : ''));
      formData.append('author_name', newBookDocForm.author_name || 'BMLT Scholar');
      formData.append('allow_download', String(newBookDocForm.allow_download !== undefined ? newBookDocForm.allow_download : 1));
      if (isEdit) {
        formData.append('file_path', editingBookDoc.file_path || '');
      }

      const token = localStorage.getItem('admin_token');
      const res = await fetch(url, {
        method,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save chapter file');
      }
      showNotification(isEdit ? 'Book chapter updated successfully!' : 'Book chapter uploaded successfully!', 'success');
      setNewBookDocForm({ title: '', author_name: 'BMLT Scholar', file: null, allow_download: 1 });
      setEditingBookDoc(null);
      const docInput = document.getElementById('lib-bookdoc-file-input') as HTMLInputElement;
      if (docInput) docInput.value = '';
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const handleDeleteBookDoc = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this chapter document from this book?')) return;
    try {
      const res = await authenticatedFetch(`/api/books/documents/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete chapter document');
      showNotification('Book chapter deleted successfully', 'success');
      loadLibraryAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const dataFetchedRef = useRef(false);

  // Form states
  const [mediaForm, setMediaForm] = useState({ title: '', url: '', type: 'photo', year: new Date().getFullYear() });
  const [perfForm, setPerfForm] = useState({ 
    title: '', 
    description: '', 
    participants: [''], 
    group_type: 'Single' as 'Single' | 'Duo' | 'Group',
    category: [] as string[],
    media_url: '',
    media_type: 'link' as 'link' | 'mp3' | 'mp4' | 'image',
    contact_info: ''
  });
  const [demandingForm, setDemandingForm] = useState({
    title: '',
    link: '',
    type: 'song' as 'song' | 'videography' | 'photography',
    description: '',
    category: 'Trending'
  });
  const [adminForm, setAdminForm] = useState({ username: '', password: '', display_name: '', role: 'author' });
  const [programForm, setProgramForm] = useState({
    name: '',
    subtitle: '',
    gifUrl: '',
    invitationUrl: '',
    invitationPdfUrl: '',
    date: '',
    location: '',
    time: '',
    department: '',
    description: '',
    highlights: '',
    dressCode: '',
    footerText: '',
    countdownDate: ''
  });
  const [showCreateProgramForm, setShowCreateProgramForm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'participations' | 'media' | 'performances' | 'admins' | 'messages' | 'programs' | 'cohorts' | null;
    id: string | number | null;
    title: string;
  }>({ show: false, type: null, id: null, title: '' });

  const [editingCohort, setEditingCohort] = useState<{ id: number; name: string; cover_url?: string; avatar_url?: string; motto?: string } | null>(null);
  const [cohortCoverUrl, setCohortCoverUrl] = useState('');
  const [cohortAvatarUrl, setCohortAvatarUrl] = useState('');
  const [cohortMotto, setCohortMotto] = useState('');

  const [editIdea, setEditIdea] = useState<Idea | null>(null);
  const [editPerformance, setEditPerformance] = useState<Performance | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const categories = ['Singing', 'Dance', 'Recitation', 'Speech', 'Videography', 'Photography', 'Sketch', 'Other'];
  const performanceTypes = ['Classical', 'Indian', 'Western', 'Fusion', 'Other'];

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('admin_token');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const checkAuth = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/me');
      if (!res.ok) {
        setIsAuthenticated(false);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        setCurrentUser(data.admin);
        fetchData();
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const fetchAdminNews = async () => {
    try {
      const res = await fetch('/api/public/news');
      if (res.ok) {
        setAdminNews(await res.json());
      }
    } catch (err) {
      console.warn("Error fetching admin news list:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/students');
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (err) {
      console.warn("Error fetching students list:", err);
    }
  };

  const fetchAcademicSessions = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/sessions');
      if (res.ok) {
        const data = await res.json();
        setAcademicSessions(data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch academic sessions:", err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    try {
      const res = await authenticatedFetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setNewSessionName('');
        fetchAcademicSessions();
        alert('Academic session added successfully!');
      } else {
        alert(data.error || 'Failed to add session');
      }
    } catch (err) {
      alert('Error adding session');
    }
  };

  const handleUpdateSession = async (id: number) => {
    if (!editingSessionName.trim()) return;
    try {
      const res = await authenticatedFetch(`/api/admin/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSessionName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingSessionId(null);
        setEditingSessionName('');
        fetchAcademicSessions();
        alert('Academic session updated successfully!');
      } else {
        alert(data.error || 'Failed to update session');
      }
    } catch (err) {
      alert('Error updating session');
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session? Warning: Any students assigned to this session will retain their session values, but the session option will no longer be available in filters or editor.')) return;
    try {
      const res = await authenticatedFetch(`/api/admin/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAcademicSessions();
        alert('Academic session deleted successfully!');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete session');
      }
    } catch (err) {
      alert('Error deleting session');
    }
  };

  const handleCreateOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudentId 
        ? `/api/admin/students/${editingStudentId}` 
        : '/api/admin/students';
      const method = editingStudentId ? 'PUT' : 'POST';

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      });
      const data = await res.json();
      if (res.ok) {
        setStudentForm({ username: '', password: '', display_name: '', roll_no: '', reg_no: '', points: 0, session: '2023-2026', section: 'A' });
        setEditingStudentId(null);
        fetchStudents();
        alert(editingStudentId ? 'Student updated successfully!' : 'Student account registered successfully!');
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err: any) {
      alert('Error saving student account.');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student account?')) return;
    try {
      const res = await authenticatedFetch(`/api/admin/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete student');
      }
    } catch (err) {
      alert('Error deleting student');
    }
  };

  const fetchAdminMcqs = async () => {
    try {
      const res = await fetch('/api/public/mcqs');
      if (res.ok) {
        setAdminMcqs(await res.json());
      }
    } catch (err) {
      console.warn("Error fetching admin MCQs list:", err);
    }
  };

  const fetchMcqSubjects = async () => {
    try {
      const res = await fetch('/api/content/subjects');
      if (res.ok) {
        setMcqSubjects(await res.json());
      }
    } catch (err) {
      console.warn('Error fetching MCQ subjects:', err);
    }
  };

  const fetchMcqTopicsForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setMcqTopics([]);
      return;
    }
    try {
      const res = await fetch(`/api/content/subjects/${subjectId}/topics`);
      if (res.ok) {
        setMcqTopics(await res.json());
      }
    } catch (err) {
      console.warn('Error fetching MCQ topics:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [mediaRes, perfRes, allPerfRes, adminsRes, googleRes, demandingRes, batchRes, batchesRes, settingsRes] = await Promise.all([
        authenticatedFetch('/api/media'),
        authenticatedFetch('/api/performances'),
        authenticatedFetch('/api/admin/performances/all'),
        authenticatedFetch('/api/admin/list'),
        authenticatedFetch('/api/admin/google-status'),
        authenticatedFetch('/api/demanding-items'),
        authenticatedFetch('/api/batch-memories'),
        fetch('/api/batches'),
        fetch('/api/public/settings').catch(() => null)
      ]);
      
      if (mediaRes.ok) setMedia(await mediaRes.json());
      if (batchRes && batchRes.ok) setBatchMemories(await batchRes.json());
      if (batchesRes && batchesRes.ok) setBatches(await batchesRes.json());
      if (perfRes.ok) setPerformances(await perfRes.json());
      if (allPerfRes.ok) setAllPerformances(await allPerfRes.json());
      if (adminsRes.ok) setAdmins(await adminsRes.json());
      if (googleRes.ok) setGoogleStatus(await googleRes.json());
      if (demandingRes.ok) setDemandingItems(await demandingRes.json());
      
      if (settingsRes && settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData) {
          if (typeof settingsData.allow_viewer_uploads === 'boolean') {
            setAllowViewerUploads(settingsData.allow_viewer_uploads);
          }
          if (typeof settingsData.breaking_news_enabled === 'boolean') {
            setBreakingNewsEnabled(settingsData.breaking_news_enabled);
          }
          setBreakingNewsText(settingsData.breaking_news_text || '');
          setHomeImage1(settingsData.home_image_1 || '');
          setHomeImage2(settingsData.home_image_2 || '');
          setHomeImage3(settingsData.home_image_3 || '');
          setPolaroidImage1(settingsData.polaroid_image_1 || '');
          setPolaroidImage2(settingsData.polaroid_image_2 || '');
          setPolaroidImage3(settingsData.polaroid_image_3 || '');
          setShowcaseImage1(settingsData.showcase_image_1 || '');
          setShowcaseImage2(settingsData.showcase_image_2 || '');
          setCustomAppLogoSvg(settingsData.custom_app_logo_svg || '');
        }
      }

      fetchAdminNews();
      fetchStudents();
      fetchAcademicSessions();
      fetchAdminMcqs();
      fetchMcqSubjects();
      setIsInitialLoading(false);

      // Fetch participations and messages from Firestore manually if already logged in
      if (auth.currentUser) {
        loadFirestoreData();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setIsInitialLoading(false);
    }
  };

  const loadFirestoreData = async () => {
    if (!auth.currentUser) return;
    setIsFirestoreLoading(true);
    
    const enum OperationType {
      LIST = 'list',
      GET = 'get'
    }

    const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
      const errInfo = {
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
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      return new Error(JSON.stringify(errInfo));
    };

    try {
      // Fetch participations
      const pPath = 'participations';
      try {
        const pq = query(collection(db, pPath), orderBy('createdAt', 'desc'));
        const pSnapshot = await getDocs(pq);
        const participationsData = pSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        })) as Idea[];
        setParticipations(participationsData);
      } catch (e) {
        throw handleFirestoreError(e, OperationType.LIST, pPath);
      }

      // Fetch messages
      const mPath = 'messages';
      try {
        const mq = query(collection(db, mPath), orderBy('created_at', 'desc'));
        const mSnapshot = await getDocs(mq);
        const messagesData = mSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ContactMessage[];
        setMessages(messagesData);
      } catch (e) {
        throw handleFirestoreError(e, OperationType.LIST, mPath);
      }

      // Fetch programs
      const progPath = 'programs';
      try {
        const progq = query(collection(db, progPath), orderBy('createdAt', 'desc'));
        const progSnapshot = await getDocs(progq);
        const programsData = progSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Program[];
        setPrograms(programsData);
      } catch (e) {
        throw handleFirestoreError(e, OperationType.LIST, progPath);
      }

      // Fetch VIP Entries
      const vipPath = 'vip_passes';
      try {
        const vipq = query(collection(db, vipPath), orderBy('createdAt', 'desc'));
        const vipSnapshot = await getDocs(vipq);
        const vipData = vipSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VipPass[];
        setVipPasses(vipData);
      } catch (e) {
        throw handleFirestoreError(e, OperationType.LIST, vipPath);
      }

      // Fetch Wishes
      const wishesPath = 'wishes';
      try {
        const wishesq = query(collection(db, wishesPath), orderBy('createdAt', 'desc'));
        const wishesSnapshot = await getDocs(wishesq);
        const wishesData = wishesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Wish[];
        setWishes(wishesData);
      } catch (e) {
        throw handleFirestoreError(e, OperationType.LIST, wishesPath);
      }
    } catch (e: any) {
      console.error('Failed to load Firestore data:', e.message);
      // If it's a JSON string from handleFirestoreError, maybe we can show a nicer message
      try {
        const info = JSON.parse(e.message);
        showNotification(`Permission Denied for ${info.path}. Check admin email authentication.`, 'error');
      } catch {
        showNotification('Failed to load data from Firestore.', 'error');
      }
    } finally {
      setIsFirestoreLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
      if (user) {
        loadFirestoreData();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, firebaseUser]);

  useEffect(() => {
    if (currentUser?.role === 'author') {
      if (activeTab !== 'database' && activeTab !== 'mcqs') {
        setActiveTab('database');
      }
      if (dbSubTab === 'records') {
        setDbSubTab('library');
      }
    }
  }, [currentUser, activeTab, dbSubTab]);

  const fetchMltDeskData = async () => {
    try {
      setMltLoading(true);
      const [resSlides, resParams, resMcqs, resCases] = await Promise.all([
        fetch('/api/bmlt/slides'),
        fetch('/api/bmlt/lab-params'),
        fetch('/api/bmlt/mcqs'),
        fetch('/api/bmlt/cases')
      ]);
      if (resSlides.ok) {
        const rawSlides = await resSlides.json();
        const normalized = Array.isArray(rawSlides) ? rawSlides.map((s: any) => ({
          ...s,
          imageUrl: s.imageUrl || s.image_url || '',
          targetCell: s.targetCell || s.target_cell || ''
        })) : [];
        setMltSlides(normalized);
      }
      if (resParams.ok) setMltLabParams(await resParams.json());
      if (resMcqs.ok) setMltMcqs(await resMcqs.json());
      if (resCases.ok) setMltCases(await resCases.json());
    } catch (err) {
      console.error("Error fetching MLT Admin data:", err);
    } finally {
      setMltLoading(false);
    }
  };

  useEffect(() => {
    if (((activeTab === 'mlt_desk' || (activeTab === 'database' && dbSubTab === 'mlt_desk'))) && isAuthenticated) {
      fetchMltDeskData();
    }
  }, [activeTab, dbSubTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'students' && isAuthenticated) {
      fetchStudents();
      fetchAcademicSessions();
    }
  }, [activeTab, isAuthenticated]);

  // Microscope Slide Helpers
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = slideForm.id !== null;
      const url = isEdit ? `/api/bmlt/slides/${slideForm.id}` : '/api/bmlt/slides';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slideForm.name,
          description: slideForm.description,
          targetCell: slideForm.targetCell,
          hint: slideForm.hint,
          imageUrl: slideForm.imageUrl,
          fact: slideForm.fact,
          options: slideForm.options,
          hotspots: slideForm.hotspots
        })
      });
      
      if (res.ok) {
        showNotification(isEdit ? 'Slide updated successfully!' : 'Slide added successfully!', 'success');
        setSlideForm({ id: null, name: '', description: '', targetCell: '', hint: '', imageUrl: '', fact: '', options: '', hotspots: '[]' });
        setShowMltForm(false);
        fetchMltDeskData();
      } else {
        showNotification('Operation failed. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Error saving slide information.', 'error');
    }
  };

  const handleDeleteSlide = async (id: number) => {
    if (!window.confirm('Are you strictly sure you want to delete this microscopic slide?')) return;
    try {
      const res = await fetch(`/api/bmlt/slides/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Microscope Slide deleted successfully!', 'success');
        fetchMltDeskData();
      } else {
        showNotification('Failed to delete slide.', 'error');
      }
    } catch (err) {
      showNotification('Error executing deletion.', 'error');
    }
  };

  // Lab Parameter Helpers
  const handleSaveLabParam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = labForm.id !== null;
      const url = isEdit ? `/api/bmlt/lab-params/${labForm.id}` : '/api/bmlt/lab-params';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: labForm.name,
          unit: labForm.unit,
          normalMinMale: parseFloat(labForm.normalMinMale) || 0,
          normalMaxMale: parseFloat(labForm.normalMaxMale) || 0,
          normalMinFemale: parseFloat(labForm.normalMinFemale) || 0,
          normalMaxFemale: parseFloat(labForm.normalMaxFemale) || 0,
          category: labForm.category,
          description: labForm.description
        })
      });
      
      if (res.ok) {
        showNotification(isEdit ? 'Parameter updated successfully!' : 'Parameter added successfully!', 'success');
        setLabForm({ id: null, name: '', unit: '', normalMinMale: '', normalMaxMale: '', normalMinFemale: '', normalMaxFemale: '', category: '', description: '' });
        setShowMltForm(false);
        fetchMltDeskData();
      } else {
        showNotification('Operation failed. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Error saving laboratory parameter.', 'error');
    }
  };

  const handleDeleteLabParam = async (id: number) => {
    if (!window.confirm('Are you strictly sure you want to delete this clinical parameter?')) return;
    try {
      const res = await fetch(`/api/bmlt/lab-params/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Laboratory parameter deleted successfully!', 'success');
        fetchMltDeskData();
      } else {
        showNotification('Failed to delete parameter.', 'error');
      }
    } catch (err) {
      showNotification('Error executing parameter deletion.', 'error');
    }
  };

  // Case Study Helpers
  const handleSaveMltCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = mltCaseForm.id !== null;
      const url = isEdit ? `/api/bmlt/cases/${mltCaseForm.id}` : '/api/bmlt/cases';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mltCaseForm.type,
          title: mltCaseForm.title,
          scenario: mltCaseForm.scenario,
          question: mltCaseForm.question,
          options: mltCaseForm.options,
          correct: mltCaseForm.correct,
          explanation: mltCaseForm.explanation,
          normalParams: mltCaseForm.normalParams
        })
      });
      
      if (res.ok) {
        showNotification(isEdit ? 'Case Study updated successfully!' : 'Case Study added successfully!', 'success');
        setMltCaseForm({ id: null, type: 'mcq', title: '', scenario: '', question: '', options: '', correct: '', explanation: '', normalParams: '' });
        setShowMltForm(false);
        fetchMltDeskData();
      } else {
        showNotification('Operation failed. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Error saving case study.', 'error');
    }
  };

  const handleDeleteMltCase = async (id: number) => {
    if (!window.confirm('Are you strictly sure you want to delete this case study?')) return;
    try {
      const res = await fetch(`/api/bmlt/cases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Clinical Case study deleted successfully!', 'success');
        fetchMltDeskData();
      } else {
        showNotification('Failed to delete case study.', 'error');
      }
    } catch (err) {
      showNotification('Error executing case study deletion.', 'error');
    }
  };

  // Practice MCQ Helpers
  const handleSaveMltMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = mltMcqForm.id !== null;
      const url = isEdit ? `/api/bmlt/mcqs/${mltMcqForm.id}` : '/api/bmlt/mcqs';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: mltMcqForm.question,
          options: mltMcqForm.options,
          correct: mltMcqForm.correct,
          imageUrl: mltMcqForm.imageUrl,
          explanation: mltMcqForm.explanation
        })
      });
      
      if (res.ok) {
        showNotification(isEdit ? 'BMLT MCQ updated successfully!' : 'BMLT MCQ added successfully!', 'success');
        setMltMcqForm({ id: null, question: '', options: '', correct: '', imageUrl: '', explanation: '' });
        setShowMltForm(false);
        fetchMltDeskData();
      } else {
        showNotification('Operation failed. Please try again.', 'error');
      }
    } catch (err) {
      showNotification('Error saving practice MCQ.', 'error');
    }
  };

  const handleDeleteMltMcq = async (id: number) => {
    if (!window.confirm('Are you strictly sure you want to delete this practice MCQ?')) return;
    try {
      const res = await fetch(`/api/bmlt/mcqs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('MCQ deleted successfully!', 'success');
        fetchMltDeskData();
      } else {
        showNotification('Failed to delete practice MCQ.', 'error');
      }
    } catch (err) {
      showNotification('Error executing MCQ deletion.', 'error');
    }
  };

  const handleFirebaseLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showNotification('Failed to connect to database', 'error');
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/google');
      const data = await res.json();
      if (data.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url, 
          'google_auth', 
          `width=${width},height=${height},left=${left},top=${top}`
        );

        const checkPopup = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            fetchData();
          }
        }, 1000);
      }
    } catch (err) {
      showNotification('Failed to initiate Google connection', 'error');
    }
  };

  const updateSpreadsheetId = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authenticatedFetch('/api/admin/spreadsheet-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: googleStatus.spreadsheetId })
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(prev => ({ ...prev, spreadsheetId: data.spreadsheetId }));
        showNotification('Spreadsheet ID updated');
      }
    } catch (err) {
      showNotification('Failed to update spreadsheet ID', 'error');
    }
  };

  const syncToSheets = async () => {
    if (!googleStatus.connected || !googleStatus.spreadsheetId) {
      showNotification('Google Sheets not configured', 'error');
      return;
    }

    if (isInitialLoading || isFirebaseLoading || isFirestoreLoading) {
      showNotification('Data is still loading. Please wait until all records are fetched.', 'error');
      return;
    }

    // Safety check: Don't sync if everything is empty (avoid accidental wipe)
    if (participations.length === 0 && allPerformances.length === 0 && demandingItems.length === 0) {
      showNotification('No data found to sync. Skipping to avoid clearing the sheets.', 'error');
      return;
    }

    setIsSyncing(true);
    showNotification('Preparing data for transfer...', 'success');
    
    try {
      const allData = [
        ...participations.map(p => ({ ...p, type: 'Participation' })),
        ...allPerformances.map(p => ({ ...p, type: 'Performance', approved: p.is_approved === 1 })),
        ...demandingItems.map(d => ({ 
          ...d, 
          type: 'Demanding Chilli',
          group_type: d.type, // song, videography, photography
          media_url: d.link
        })),
        ...media.map(m => ({ 
          ...m, 
          type: 'Gallery Media', 
          media_url: m.url, 
          media_type: m.type,
          description: `Year: ${m.year}`
        })),
        ...vipPasses.map(vp => ({
          ...vp,
          type: 'VIP_Pass'
        }))
      ];

      const res = await authenticatedFetch('/api/admin/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: allData })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Data synced to Google Sheets successfully!');
      } else {
        // Detailed error for common Sheet issues
        let errorMessage = data.error || 'Sync failed';
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          errorMessage = 'Spreadsheet ID not found. Go to Settings and verify the ID from your Sheet URL.';
        } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
          errorMessage = 'Permission denied. Ensure your Google account has access to this sheet.';
        }
        showNotification(errorMessage, 'error');
      }
    } catch (err) {
      showNotification('An error occurred during sync', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromSheets = async () => {
    console.log('Sync From Sheets started');
    if (!googleStatus.connected || !googleStatus.spreadsheetId) {
      console.log('Sync aborted: Sheets not configured', googleStatus);
      showNotification('Google Sheets not configured. Please check Settings.', 'error');
      return;
    }

    setIsSyncing(true);
    showNotification('Connecting to Google Sheets...', 'success');
    
    try {
      console.log('Fetching sheet data...');
      const res = await authenticatedFetch('/api/admin/sheet-data');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }
      
      const { data: sheetData } = await res.json();
      console.log('Sheet data received:', sheetData?.length, 'items');
      
      if (!sheetData || sheetData.length === 0) {
        showNotification('The spreadsheet appears to be empty or misconfigured.', 'error');
        setIsSyncing(false);
        return;
      }
      
      showNotification(`Processing ${sheetData.length} items...`, 'success');

      // ... rest of the function ...
      const performancesToSync: any[] = [];
      const chilliesToSync: any[] = [];
      const firestoreToSync: any[] = [];

      for (const item of sheetData) {
        // Skip empty rows or header rows accidentally included
        if (!item.title || item.title === 'N/A' || item.title === 'Title') continue;

        const rawType = (item.type || '').toLowerCase();

        if (rawType.includes('performance')) {
          performancesToSync.push({
            id: item.id,
            title: item.title,
            description: item.description || '',
            performer: Array.isArray(item.participants) ? item.participants.join(', ') : (item.performer || item.participant_name || ''),
            group_type: item.group_type || 'Single',
            category: item.category || '',
            media_url: item.media_url || '',
            media_type: item.media_type || 'link',
            contact_info: item.contact_info_time || item.contact_info || '',
            is_approved: item.approved === 'TRUE' || item.approved === true || item.approved === '1'
          });
        } else if (rawType.includes('chilli')) {
          // Normalize type for chilli
          let chilliType = (item.group_type || item.type_of_media || item.type || 'song').toLowerCase();
          if (chilliType.includes('song') || chilliType.includes('audio')) chilliType = 'song';
          if (chilliType.includes('video')) chilliType = 'videography';
          if (chilliType.includes('photo')) chilliType = 'photography';
          if (chilliType.includes('chilli')) chilliType = 'song';

          chilliesToSync.push({
            id: item.id,
            type: chilliType,
            title: item.title,
            link: item.media_url || item.link || '',
            description: item.description || '',
            category: item.style || item.category || 'Trending'
          });
        } else if (rawType.includes('participation')) {
          firestoreToSync.push(item);
        }
      }

      // 1. Bulk sync SQLite items
      if (performancesToSync.length > 0 || chilliesToSync.length > 0) {
        const bulkRes = await authenticatedFetch('/api/admin/reconcile-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            performances: performancesToSync,
            chillies: chilliesToSync
          })
        });
        if (!bulkRes.ok) throw new Error('Bulk sync of SQLite items failed');
      }

      // 2. Client-side sync for Firestore
      if (auth.currentUser && firestoreToSync.length > 0) {
        for (const sp of firestoreToSync) {
          try {
            const hasId = sp.id && sp.id !== 'N/A';
            // Use setDoc with provided ID or let Firestore generate one (via addDoc pattern)
            // To maintain sync, if no ID we generate a deterministic one from title and description to avoid duplicates
            let docId = hasId ? String(sp.id) : null;
            if (!docId) {
              const base = `${sp.title || ''}-${(sp.participants || []).join(',')}`.toLowerCase().replace(/[^a-z0-9]/g, '');
              docId = 'sheet_' + (base || Math.random().toString(36).substring(2, 9));
            }
            const docRef = doc(db, 'participations', docId);
            
            const participants = Array.isArray(sp.participants) ? sp.participants : (sp.participant_name ? [sp.participant_name] : []);
            
            await setDoc(docRef, {
              title: sp.title || 'Untitled',
              description: sp.description || '',
              participants: participants,
              group_type: sp.group_type || 'Single',
              category: Array.isArray(sp.category) ? sp.category : (sp.category ? [sp.category] : []),
              contact_info: sp.contact_info_time || sp.contact_info || '',
              media_url: sp.media_url || '',
              media_type: sp.media_type || 'link',
              approved: sp.approved === 'TRUE' || sp.approved === true || sp.approved === '1',
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (e) {
            console.warn('Failed to sync firestore item:', sp.id, e);
          }
        }
      }

      showNotification('Successfully synced from Google Sheets!', 'success');
      fetchData();
    } catch (err: any) {
      console.error('Import error:', err);
      showNotification('Failed to sync from Sheets: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCustomSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCustomSettings(true);
    try {
      const res = await authenticatedFetch('/api/admin/settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breaking_news_enabled: breakingNewsEnabled,
          breaking_news_text: breakingNewsText,
          home_image_1: homeImage1,
          home_image_2: homeImage2,
          home_image_3: homeImage3,
          polaroid_image_1: polaroidImage1,
          polaroid_image_2: polaroidImage2,
          polaroid_image_3: polaroidImage3,
          showcase_image_1: showcaseImage1,
          showcase_image_2: showcaseImage2,
          custom_app_logo_svg: customAppLogoSvg,
        })
      });
      if (res.ok) {
        localStorage.setItem('custom_app_logo_svg', customAppLogoSvg);
        window.dispatchEvent(new Event('custom-logo-updated'));
        showNotification('Public display and ticker settings successfully saved!');
        fetchData();
      } else {
        showNotification('Failed to update display settings.', 'error');
      }
    } catch (err) {
      showNotification('An error occurred while saving display settings.', 'error');
    } finally {
      setIsUpdatingCustomSettings(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        setIsAuthenticated(true);
        setCurrentUser(data.admin);
        fetchData();
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('An error occurred');
    }
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    try {
      const res = await fetch('/api/admin/recovery-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoveryForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Password reset successfully! You can now log in.');
        setIsRecoveryMode(false);
        setLoginForm({ ...loginForm, username: recoveryForm.username });
      } else {
        setRecoveryError(data.error || 'Reset failed');
      }
    } catch (err) {
      setRecoveryError('An error occurred');
    }
  };

  const handleResetAdminPassword = async (id: number) => {
    const newPassword = prompt('Enter new password for this admin:');
    if (!newPassword) return;
    
    try {
      const res = await authenticatedFetch(`/api/admin/${id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        showNotification('Password updated successfully');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to update password', 'error');
      }
    } catch (err) {
      showNotification('Network error occurred', 'error');
    }
  };

  const handleLogout = async () => {
    await authenticatedFetch('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const confirmDelete = (type: 'participations' | 'media' | 'performances' | 'admins' | 'messages' | 'programs' | 'cohorts', id: string | number, title: string) => {
    setDeleteConfirm({ show: true, type, id, title });
  };

  const executeDelete = async () => {
    const { type, id, title } = deleteConfirm;
    if (!type || id === null) return;

    if (type === 'participations' || type === 'messages') {
      try {
        await deleteDoc(doc(db, type, String(id)));
        showNotification(`${type === 'participations' ? 'Participation' : 'Message'} deleted successfully`);
        fetchData();
      } catch (err) {
        showNotification(`Failed to delete ${type === 'participations' ? 'participation' : 'message'}`, 'error');
      }
    } else if (type === 'programs') {
      try {
        await deleteDoc(doc(db, 'programs', String(id)));
        showNotification('Program deleted successfully');
        loadFirestoreData();
      } catch (err) {
        showNotification('Failed to delete program', 'error');
      }
    } else if (type === 'cohorts') {
      try {
        const res = await authenticatedFetch(`/api/admin/batches/${encodeURIComponent(title)}`, { method: 'DELETE' });
        if (res.ok) {
          showNotification(`Batch "${title}" deleted successfully`);
          const bRes = await fetch('/api/batches');
          if (bRes.ok) {
            const updated = await bRes.json();
            setBatches(updated);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          showNotification(errData.error || 'Failed to delete batch', 'error');
        }
      } catch (err) {
        showNotification('Network connection error.', 'error');
      }
    } else if (type === 'demanding' as any) {
      const res = await authenticatedFetch(`/api/admin/demanding-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showNotification(`Demanding item deleted successfully`);
      } else {
        showNotification(`Failed to delete demanding item`, 'error');
      }
    } else if (type === 'batches' as any || type === 'batch-memories' as any) {
      const res = await authenticatedFetch(`/api/admin/batch-memories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        showNotification(`Senior memory deleted successfully`);
      } else {
        showNotification(`Failed to delete senior memory`, 'error');
      }
    } else if (type === 'news' as any) {
      const res = await authenticatedFetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminNews();
        showNotification(`News bulletin deleted successfully`);
      } else {
        showNotification(`Failed to delete news bulletin`, 'error');
      }
    } else {
      const endpoint = type === 'admins' ? `/api/admin/${id}` : `/api/${type}/${id}`;
      const res = await authenticatedFetch(endpoint, { method: 'DELETE' });
      
      if (res.ok) {
        fetchData();
        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1, -1)} deleted successfully`);
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification(data.error || `Failed to delete ${type.slice(0, -1)}`, 'error');
      }
    }
    setDeleteConfirm({ show: false, type: null, id: null, title: '' });
  };

  const handleFileUpload = async (file: File, callback: (url: string) => void) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authenticatedFetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        callback(data.url);
        showNotification('File uploaded to Drive successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification(data.error || 'Failed to upload file', 'error');
      }
    } catch (err) {
      showNotification('Error uploading file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authenticatedFetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaForm)
    });
    if (res.ok) {
      const result = await res.json();
      
      // Sync to Google Sheets automatically
      try {
        await authenticatedFetch('/api/public/sync-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Gallery Media',
            data: {
              id: result.id,
              title: mediaForm.title,
              description: `Year: ${mediaForm.year}`,
              media_url: mediaForm.url,
              media_type: mediaForm.type,
              created_at: new Date().toISOString()
            }
          })
        });
      } catch (syncErr) {
        console.warn('Auto-sync to Google Sheets failed:', syncErr);
      }

      setMediaForm({ title: '', url: '', type: 'photo', year: new Date().getFullYear() });
      fetchData();
      showNotification('Media added successfully');
    } else {
      showNotification('Failed to add media', 'error');
    }
  };

  const handleAddPerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    const performanceData = {
      ...perfForm,
      performer: perfForm.participants.filter(p => p.trim()).join(', '),
      category: perfForm.category.join(', '),
      contact_info: perfForm.contact_info ? `+91 ${perfForm.contact_info}` : ''
    };

    const res = await authenticatedFetch('/api/performances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(performanceData)
    });

    if (res.ok) {
      const result = await res.json();
      
      // Sync to Google Sheets automatically
      try {
        await authenticatedFetch('/api/public/sync-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Performance',
            data: {
              id: result.id,
              ...performanceData,
              participants: perfForm.participants.filter(p => p.trim()), // Send as array for individual boxes
              created_at: new Date().toISOString()
            }
          })
        });
      } catch (syncErr) {
        console.warn('Auto-sync to Google Sheets failed:', syncErr);
      }

      setPerfForm({ 
        title: '', 
        description: '', 
        participants: [''], 
        group_type: 'Single', 
        category: [], 
        media_url: '', 
        media_type: 'link',
        contact_info: ''
      });
      fetchData();
      showNotification('Performance added successfully');
    } else {
      showNotification('Failed to add performance', 'error');
    }
  };

  const handleAddDemandingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authenticatedFetch('/api/admin/demanding-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demandingForm)
    });

    if (res.ok) {
      const result = await res.json();
      
      // Auto-sync to Google Sheets
      try {
        await authenticatedFetch('/api/public/sync-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'Demanding Chilli',
            data: {
              id: result.id,
              ...demandingForm,
              group_type: demandingForm.type,
              media_url: demandingForm.link,
              created_at: new Date().toISOString()
            }
          })
        });
      } catch (syncErr) {
        console.warn('Auto-sync to Google Sheets failed:', syncErr);
      }

      setDemandingForm({
        title: '',
        link: '',
        type: 'song',
        description: '',
        category: 'Trending'
      });
      fetchData();
      showNotification('Demanding item added successfully');
    } else {
      showNotification('Failed to add demanding item', 'error');
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'programs'), {
        ...programForm,
        highlights: programForm.highlights.split('\n').filter(h => h.trim()),
        isActive: programs.length === 0, // Mark as active if it's the first one
        createdAt: serverTimestamp()
      });
      setProgramForm({
        name: '',
        subtitle: '',
        gifUrl: '',
        invitationUrl: '',
        invitationPdfUrl: '',
        date: '',
        location: '',
        time: '',
        department: '',
        description: '',
        highlights: '',
        dressCode: '',
        footerText: '',
        countdownDate: ''
      });
      loadFirestoreData();
      setShowCreateProgramForm(false);
      showNotification('Program added successfully');
    } catch (err) {
      showNotification('Failed to add program', 'error');
    }
  };

  const handleToggleProgram = async (programId: string, currentIsActive?: boolean) => {
    try {
      if (currentIsActive) {
        // Deactivate this program
        await updateDoc(doc(db, 'programs', programId), { isActive: false });
        loadFirestoreData();
        showNotification('Program deactivated successfully!');
        return;
      }
      // 1. Deactivate all programs
      const pSnapshot = await getDocs(collection(db, 'programs'));
      const batch: Promise<void>[] = [];
      pSnapshot.forEach((pDoc) => {
        batch.push(updateDoc(doc(db, 'programs', pDoc.id), { isActive: pDoc.id === programId }));
      });
      await Promise.all(batch);
      loadFirestoreData();
      showNotification('Active program updated!');
    } catch (err) {
      showNotification('Failed to update active program', 'error');
    }
  };

  const handleApprove = async (item: Idea | Performance) => {
    try {
      const isPerformance = 'performer' in item;
      
      // If it's a Performance object (from SQLite)
      if (isPerformance && 'is_approved' in item) {
        const res = await authenticatedFetch(`/api/admin/performances/${(item as Performance).id}/approve`, {
          method: 'POST'
        });
        if (res.ok) {
          showNotification('Performance approved and added to live lineup!');
          fetchData();
        } else {
          const error = await res.json();
          showNotification(error.error || 'Failed to approve performance', 'error');
        }
        return;
      }

      // If it's an Idea object (from Firestore)
      const application = item as Idea;
      // 1. Prepare data for the performances table (SQLite)
      const performanceData = {
        title: application.title,
        description: application.description,
        performer: Array.isArray(application.participants) ? application.participants.join(', ') : (application.participant_name || 'Unknown'),
        group_type: application.group_type,
        category: Array.isArray(application.category) ? application.category.join(', ') : (application.category || ''),
        media_url: application.media_url || '',
        media_type: application.media_type || 'link',
        contact_info: application.contact_info || '',
        doc_id: application.id.toString(),
        is_approved: 1
      };

      // 2. Add to performances table
      const res = await authenticatedFetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceData)
      });

      if (res.ok) {
        // 3. Update Firestore document to mark as approved
        const docRef = doc(db, 'participations', item.id.toString());
        await updateDoc(docRef, { approved: true });
        
        showNotification('Performance approved and added to lineup!');
        fetchData(); // Refresh both lists
      } else {
        const error = await res.json();
        showNotification(error.error || 'Failed to approve performance', 'error');
      }
    } catch (err) {
      console.error('Approval error:', err);
      showNotification('An error occurred during approval', 'error');
    }
  };

  const handleDisapprove = async (item: Idea) => {
    try {
      // 1. Remove from SQLite lineup
      const res = await authenticatedFetch(`/api/performances/by-doc/${item.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // 2. Update Firestore document to mark as unapproved
        const docRef = doc(db, 'participations', item.id.toString());
        await updateDoc(docRef, { approved: false });
        
        showNotification('Performance disapproved and removed from lineup!');
        fetchData();
      } else {
        showNotification('Failed to remove from lineup', 'error');
      }
    } catch (err) {
      console.error('Disapproval error:', err);
      showNotification('An error occurred during disapproval', 'error');
    }
  };

  const handleUpdateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIdea) return;

    try {
      // 1. Update Firestore
      const docRef = doc(db, 'participations', editIdea.id.toString());
      const { id, ...updateData } = editIdea;
      await updateDoc(docRef, updateData);

      // 2. If already approved, update the SQLite entry too
      if (editIdea.approved) {
        const performanceData = {
          title: editIdea.title,
          description: editIdea.description,
          performer: Array.isArray(editIdea.participants) ? editIdea.participants.join(', ') : '',
          group_type: editIdea.group_type,
          category: Array.isArray(editIdea.category) ? editIdea.category.join(', ') : '',
          media_url: editIdea.media_url || '',
          media_type: editIdea.media_type || 'link',
          contact_info: editIdea.contact_info || ''
        };

        // Find the performance ID in the lineup
        const perf = performances.find(p => p.doc_id === editIdea.id.toString());
        if (perf) {
          await authenticatedFetch(`/api/performances/${perf.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(performanceData)
          });
        }
      }

      showNotification('Submission updated successfully!');
      setIsEditing(false);
      setEditIdea(null);
      fetchData();
    } catch (err) {
      console.error('Update error:', err);
      showNotification('Error updating submission', 'error');
    }
  };

  const handleUpdatePerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerformance) return;

    try {
      const res = await authenticatedFetch(`/api/performances/${editPerformance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPerformance)
      });

      if (res.ok) {
        showNotification('Performance updated successfully!');
        setIsEditing(false);
        setEditPerformance(null);
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to update performance', 'error');
      }
    } catch (err) {
      console.error('Update error:', err);
      showNotification('Error updating performance', 'error');
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingNewsItem;
      const url = isEditing ? `/api/admin/news/${editingNewsItem.id}` : '/api/admin/news';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNewsForm)
      });
      
      if (res.ok) {
        showNotification(isEditing ? 'News update modified successfully!' : 'News update published successfully!');
        setNewNewsForm({
          title: '',
          content: '',
          author_name: 'Admin',
          category: 'General',
          image_url: '',
          file_path: ''
        });
        setEditingNewsItem(null);
        fetchAdminNews();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save news bulletin', 'error');
      }
    } catch (err) {
      showNotification('An error occurred while saving news bulletin', 'error');
    }
  };

  const handleSaveMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcqForm.question || !newMcqForm.option_a || !newMcqForm.option_b) {
      showNotification('Question and options A and B are required', 'error');
      return;
    }
    try {
      const isEditing = !!editingMcq;
      const url = isEditing ? `/api/admin/mcqs/${editingMcq.id}` : '/api/admin/mcqs';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: newMcqForm.subject_id ? parseInt(newMcqForm.subject_id) : null,
          topic_id: newMcqForm.topic_id ? parseInt(newMcqForm.topic_id) : null,
          question: newMcqForm.question,
          option_a: newMcqForm.option_a,
          option_b: newMcqForm.option_b,
          option_c: newMcqForm.option_c || null,
          option_d: newMcqForm.option_d || null,
          option_e: newMcqForm.option_e || null,
          correct_option: newMcqForm.correct_option
        })
      });

      if (res.ok) {
        showNotification(isEditing ? 'MCQ modified successfully!' : 'MCQ published successfully!');
        setNewMcqForm({
          subject_id: '',
          topic_id: '',
          question: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          option_e: '',
          correct_option: 'A'
        });
        setEditingMcq(null);
        fetchAdminMcqs();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to save MCQ', 'error');
      }
    } catch (err) {
      showNotification('An error occurred while saving MCQ', 'error');
    }
  };

  const handleDeleteMcq = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this MCQ?')) return;
    try {
      const res = await authenticatedFetch(`/api/admin/mcqs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('MCQ deleted successfully!');
        fetchAdminMcqs();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to delete MCQ', 'error');
      }
    } catch (err) {
      showNotification('An error occurred while deleting MCQ', 'error');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authenticatedFetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      const data = await res.json();
      if (res.ok) {
        setAdminForm({ username: '', password: '', display_name: '', role: 'author' });
        fetchData();
        showNotification('Admin account created successfully!');
      } else {
        showNotification(data.error || 'Failed to add admin', 'error');
      }
    } catch (err) {
      showNotification('Network error occurred', 'error');
    }
  };

  const handleValidatePass = async (codeToValidate: string) => {
    const trimmed = codeToValidate.trim();
    if (!trimmed) return;
    
    const matched = vipPasses.find(p => p.qr_code.toUpperCase() === trimmed.toUpperCase());
    if (!matched) {
      setValidationResult({
        success: false,
        message: `KARTU TIDAK VALID! Tiket "${trimmed}" palsu atau tidak terdaftar.`
      });
      return;
    }

    if (matched.is_validated) {
      const scanTime = matched.validated_at ? new Date(matched.validated_at).toLocaleString() : 'Waktu tidak tercatat';
      setValidationResult({
        success: false,
        message: `⚠️ PERINGATAN! Tiket sudah divalidasi atas nama "${matched.name}". Check-in telah sukses dilakukan pada: ${scanTime}.`,
        pass: matched
      });
      return;
    }

    try {
      const passDocRef = doc(db, 'vip_passes', matched.id);
      const nowStr = new Date().toISOString();
      await updateDoc(passDocRef, {
        is_validated: true,
        validated_at: nowStr
      });
      
      setVipPasses(prev => prev.map(p => p.id === matched.id ? { ...p, is_validated: true, validated_at: nowStr } : p));
      
      setValidationResult({
        success: true,
        message: `✅ VALIDASI SUKSES! Selamat Datang, "${matched.name}". Silakan masuk ke dalam venue. Terimakasih telah bergabung dengan UDAAN 2.0!`,
        pass: { ...matched, is_validated: true, validated_at: nowStr }
      });

      showNotification(`VIP Pass for ${matched.name} verified successfully!`);
    } catch (err) {
      console.error("Failed to update status in firestore:", err);
      showNotification("Gagal melayani validasi check-in database.", "error");
    }
  };

  const handleDeleteVipPass = async (id: string, name: string) => {
    if (window.confirm(`Hapus VIP Pass atas nama "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await deleteDoc(doc(db, 'vip_passes', id));
        setVipPasses(prev => prev.filter(p => p.id !== id));
        showNotification(`VIP Pass for ${name} deleted successfully!`);
      } catch (err) {
        console.error(err);
        showNotification('Gagal menghapus tiket.', 'error');
      }
    }
  };

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-200"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mb-4">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter">
              {isRecoveryMode ? 'Account Recovery' : 'Admin Login'}
            </h1>
            <p className="text-zinc-500 text-center mt-2">
              {isRecoveryMode 
                ? 'Reset your password using the system recovery key.' 
                : 'Access the MEDex management system.'}
            </p>
          </div>

          {!isRecoveryMode ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <User size={16} /> Username
                </label>
                <input
                  required
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <Key size={16} /> Password
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsRecoveryMode(true)}
                    className="text-xs font-bold text-zinc-400 hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  required
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Enter password"
                />
              </div>

              {loginError && (
                <p className="text-red-500 text-sm font-medium text-center">{loginError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg"
              >
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecoveryReset} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <User size={16} /> Username
                </label>
                <input
                  required
                  type="text"
                  value={recoveryForm.username}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Admin username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <ShieldAlert size={16} /> Recovery Key
                </label>
                <input
                  required
                  type="password"
                  value={recoveryForm.recoveryKey}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, recoveryKey: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Enter system recovery key"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <Key size={16} /> New Password
                </label>
                <input
                  required
                  type="password"
                  value={recoveryForm.newPassword}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Enter new password"
                />
              </div>

              {recoveryError && (
                <p className="text-red-500 text-sm font-medium text-center">{recoveryError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecoveryMode(false)}
                  className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg"
                >
                  Reset Password
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">
              {isRecoveryMode 
                ? 'Contact system owner for the recovery key.' 
                : 'Default credentials: admin / admin123'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-20 relative">
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed top-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
            notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
          )}
        >
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <p className="font-bold">{notification.message}</p>
        </motion.div>
      )}

      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-zinc-200"
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Confirm Delete</h3>
            <p className={cn("text-zinc-500", deleteConfirm.type === 'cohorts' ? "mb-5" : "mb-8")}>
              Are you sure you want to delete <span className="font-bold text-black">"{deleteConfirm.title}"</span>? This action cannot be undone.
            </p>
            
            {deleteConfirm.type === 'cohorts' && (
              <div id="precautionary-cohort-delete-warning" className="bg-rose-55 text-rose-950 bg-rose-50 border border-rose-200/80 rounded-2xl p-4.5 text-xs font-semibold leading-relaxed mb-6 space-y-1.5 shadow-sm">
                <span className="font-black text-rose-700 block tracking-wider uppercase text-[10px]">⚠️ CRITICAL PRECAUTION:</span>
                <p>Deleting this batch cohort will <strong className="font-black text-rose-800 underline">automatically and permanently erase ALL associated gallery photos, videos, stories, and uploads</strong> related to the <span className="font-black text-zinc-950 px-1 py-0.5 bg-black/5 rounded">"{deleteConfirm.title}"</span> batch! This cannot be reverted.</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({ show: false, type: null, id: null, title: '' })}
                className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingCohort && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-1">Customize Cohort Branding</h3>
            <p className="text-zinc-500 text-xs sm:text-sm mb-6">
              Establish a custom horizontal cover photo and circular profile badge for <span className="font-extrabold text-black">"{editingCohort.name}"</span>.
            </p>

            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase ml-1 block">Cover Image URL</label>
                <input 
                  type="url" 
                  value={cohortCoverUrl}
                  onChange={(e) => setCohortCoverUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/photo-..." 
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm bg-white outline-none font-medium text-zinc-800"
                />
                <p className="text-[9px] text-zinc-400 ml-1">Provides a high-contrast horizontal background cover (recommended 1200x400 or 3:1 aspect ratio).</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase ml-1 block">Avatar / Profile Badge URL</label>
                <input 
                  type="url" 
                  value={cohortAvatarUrl}
                  onChange={(e) => setCohortAvatarUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/photo-..." 
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm bg-white outline-none font-medium text-zinc-800"
                />
                <p className="text-[9px] text-zinc-400 ml-1">Overlaps the cover. Defaults to a premium dynamic gold vector insignia if empty.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase ml-1 block">Cohort Motto or Slogan</label>
                <textarea 
                  rows={2}
                  value={cohortMotto}
                  onChange={(e) => setCohortMotto(e.target.value)}
                  placeholder="e.g. Making incredible memories that stand the test of time." 
                  className="w-full px-3.5 py-2.5 sm:py-3 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm bg-white outline-none font-medium resize-none text-zinc-800"
                />
                <p className="text-[9px] text-zinc-400 ml-1">A brief nostalgic statement representing the graduates of this year.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setEditingCohort(null)}
                className="flex-1 px-4 py-3 sm:py-3.5 bg-zinc-100 hover:bg-zinc-250 text-zinc-700 rounded-xl font-bold text-xs sm:text-sm transition-all"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const res = await authenticatedFetch(`/api/admin/batches/${editingCohort.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        cover_url: cohortCoverUrl.trim(), 
                        avatar_url: cohortAvatarUrl.trim(), 
                        motto: cohortMotto.trim() 
                      })
                    });
                    if (res.ok) {
                      showNotification('Cohort branding saved successfully');
                      setEditingCohort(null);
                      // Pull latest batches
                      const bRes = await fetch('/api/batches');
                      if (bRes.ok) {
                        const updated = await bRes.json();
                        setBatches(updated);
                      }
                    } else {
                      const errData = await res.json().catch(() => ({}));
                      showNotification(errData.error || 'Failed to update cohort branding', 'error');
                    }
                  } catch (err) {
                    showNotification('Network connection error.', 'error');
                  }
                }}
                className="flex-1 px-4 py-3 sm:py-3.5 bg-black text-white hover:bg-zinc-850 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* INSTAGRAM & OCEAN BLUE GRADIENT BAR */}
      <div 
        id="admin-author-inspiration-bar" 
        className="w-full bg-gradient-to-r from-teal-500 via-sky-500 via-[#ee2a7b] via-[#6228d7] to-indigo-600 p-0.5 rounded-[2rem] shadow-xl mb-8 relative overflow-hidden group select-none"
      >
        <div className="bg-zinc-950/95 rounded-[1.9rem] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          {/* Subtle moving light effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10 w-full sm:w-auto">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#6228d7] via-[#ee2a7b] via-sky-400 to-teal-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-[8px] font-black tracking-[0.2em] text-teal-400 uppercase font-mono leading-none mb-1">
                CREATIVE STUDIO & ACADEMY MANAGER
              </span>
              <h2 className="text-sm font-black text-white tracking-tight leading-none">
                Author & Editor <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-pink-400 to-fuchsia-400">Control Console</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right sm:w-auto w-full justify-between sm:justify-end border-t border-zinc-850 pt-3 sm:pt-0 sm:border-0 z-10">
            <div className="text-left sm:text-right">
              <span className="block text-[8px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">AUTHOR MOTIVOGRAM</span>
              <p className="text-[11px] font-bold text-zinc-300 italic max-w-sm sm:max-w-md line-clamp-1">
                "Knowledge is power. Sharing is progress. Compile contents that guide future experts."
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-black rounded-2xl flex items-center justify-center text-white shrink-0">
            <ShieldAlert size={24} className="md:hidden" />
            <ShieldAlert size={28} className="hidden md:block" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter">Admin Dashboard</h1>
            <p className="text-zinc-500 text-sm md:text-base">Welcome back, <span className="font-bold text-black">{currentUser?.displayName}</span></p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all w-full md:w-auto"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>

      <div className="relative flex flex-wrap gap-2.5 mb-6 md:mb-10 border-b border-zinc-200 pb-5">
        {(() => {
          const isAuthor = currentUser?.role === 'author';
          const allTabs = [
            { id: 'database', label: 'Database', icon: FileSpreadsheet },
            { id: 'media', label: 'Media', icon: Image },
            { id: 'batches', label: 'Graduating alumni', icon: GraduationCap },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'programs', label: 'Events', icon: Sparkles },
            { id: 'vip_passes', label: 'VIP Pass & Scanner', icon: Key },
            { id: 'admins', label: 'Admins', icon: UserPlus },
            { id: 'students', label: 'Manage Students', icon: GraduationCap },
            { id: 'news', label: 'NEWS/ Updates', icon: Newspaper },
            { id: 'mcqs', label: 'Manage MCQs', icon: HelpCircle },
            { id: 'settings', label: 'Settings', icon: Settings }
          ];
          const visibleTabs = isAuthor
            ? allTabs.filter(t => t.id === 'database' || t.id === 'mcqs')
            : allTabs;
          
          return visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex items-center gap-1.5 md:gap-2 px-3.5 md:px-5 py-2.5 md:py-3 rounded-xl font-bold transition-all text-xs md:text-sm whitespace-nowrap cursor-pointer",
                  isActive 
                    ? "text-white bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] via-[#6228d7] via-[#0d9488] to-[#10b981] bg-[size:250%_auto] animate-[textShine_5s_linear_infinite] shadow-md scale-102" 
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
                )}
              >
                <tab.icon size={13} /> {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="adminActiveTabUnderline"
                    className="absolute bottom-1 left-4 right-4 h-[2px] bg-white/80 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
              </button>
            );
          });
        })()}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'programs' && (
          <div className="space-y-8">
            {/* Events Category Selection */}
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit mb-6">
              <button
                type="button"
                onClick={() => setEventsSubTab('programs')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all",
                  eventsSubTab === 'programs'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                Events List
              </button>
              <button
                type="button"
                onClick={() => setEventsSubTab('performances')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                  eventsSubTab === 'performances'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                <List size={16} /> Performances
              </button>
              <button
                type="button"
                onClick={() => setEventsSubTab('demanding')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                  eventsSubTab === 'demanding'
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-orange-700"
                )}
              >
                <Flame size={16} /> Chillies
              </button>
            </div>

            {eventsSubTab === 'programs' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-150">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-zinc-900 font-serif">Event Management</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Configure multiple events and toggle active event.</p>
                  </div>
              <button 
                onClick={() => setShowCreateProgramForm(prev => !prev)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-200 active:scale-95 shadow-md",
                  showCreateProgramForm 
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10"
                )}
              >
                {showCreateProgramForm ? (
                  <>
                    <X size={14} /> Close Form
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Create New Program
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {showCreateProgramForm && (
                <form onSubmit={handleAddProgram} className="lg:col-span-1 bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                    <Plus className="text-emerald-500" size={16} /> Create New Program
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Program Name</label>
                      <input required value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="e.g. UDAAN 2.0" />
                    </div>
                    
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Subtitle</label>
                      <input value={programForm.subtitle} onChange={e => setProgramForm({...programForm, subtitle: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="e.g. The Induction 2026" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Hero GIF URL</label>
                        <input required value={programForm.gifUrl} onChange={e => setProgramForm({...programForm, gifUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="Direct GIF link" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Invitation URL</label>
                        <input required value={programForm.invitationUrl} onChange={e => setProgramForm({...programForm, invitationUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="Invitation img/gif" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Invitation PDF URL (Optional)</label>
                      <input value={programForm.invitationPdfUrl} onChange={e => setProgramForm({...programForm, invitationPdfUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="File download link (Optional)" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Date</label>
                        <input value={programForm.date} onChange={e => setProgramForm({...programForm, date: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="March 25, 2026" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Time</label>
                        <input value={programForm.time} onChange={e => setProgramForm({...programForm, time: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="10:00 AM" />
                      </div>
                    </div>

                    <div className="space-y-1 bg-violet-50/50 p-2.5 rounded-xl border border-violet-100">
                      <label className="text-[8.5px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-1">
                        ⏰ Custom Countdown Limit
                      </label>
                      <input 
                        value={programForm.countdownDate} 
                        onChange={e => setProgramForm({...programForm, countdownDate: e.target.value})} 
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg focus:border-violet-500 focus:bg-white transition-all outline-none font-bold text-xs" 
                        placeholder="e.g. September 05, 2026 10:00:00" 
                      />
                      <p className="text-[8px] text-zinc-400 leading-normal mt-0.5">
                        If blank, falls back to display Date &amp; Time automatically.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Location</label>
                        <input value={programForm.location} onChange={e => setProgramForm({...programForm, location: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="e.g. Auditorium" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Department</label>
                        <input value={programForm.department} onChange={e => setProgramForm({...programForm, department: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" placeholder="e.g. Dept. of MLT" />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Description (Long Message)</label>
                      <textarea value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none min-h-[70px] resize-none" placeholder="Invitation message..." />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-black text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all shadow-md active:scale-95">
                    Create Event
                  </button>
                </form>
              )}

              <div className={cn("space-y-6", showCreateProgramForm ? "lg:col-span-2" : "lg:col-span-3")}>
                <h3 className="text-base font-black text-zinc-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                  <List className="text-blue-500" size={16} /> All Events
                </h3>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", !showCreateProgramForm && "lg:grid-cols-3")}>
                  {programs.map(program => (
                    <div key={program.id} className={cn("bg-white p-6 rounded-[2rem] border-2 transition-all relative group overflow-hidden", program.isActive ? "border-emerald-500 shadow-xl shadow-emerald-500/5" : "border-zinc-100 hover:border-zinc-200")}>
                      {program.isActive && (
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest z-10">
                          <CheckCircle2 size={12} /> Active Now
                        </div>
                      )}
                      
                      <div className="flex gap-4 mb-6 relative z-10">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                          <img src={program.gifUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black tracking-tight text-zinc-900">{program.name}</h4>
                          <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{program.subtitle}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                          onClick={() => handleToggleProgram(program.id, !!program.isActive)}
                          className={cn("px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2", 
                            program.isActive 
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-md shadow-rose-100/5 cursor-pointer" 
                              : "bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10")}
                        >
                          {program.isActive ? <XCircle size={16} /> : <Play size={16} />}
                          {program.isActive ? 'Turn Off' : 'Turn On'}
                        </button>
                        <button 
                          onClick={() => { setEditingProgram(program); }}
                          className="px-4 py-3 bg-zinc-100 text-zinc-900 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit size={16} /> Edit
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {program.date || 'TBD'}
                        </span>
                        <button 
                          onClick={() => confirmDelete('programs', program.id, program.name)}
                          className="text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
         )}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Database Category Selection */}
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl w-fit mb-6">
              <button
                type="button"
                onClick={() => setDbSubTab('records')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all",
                  dbSubTab === 'records'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                Performances & Registrations
              </button>
              <button
                type="button"
                onClick={() => setDbSubTab('library')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                  dbSubTab === 'library'
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-teal-700"
                )}
              >
                <BookOpen size={16} /> BMLT Academic Library Control
              </button>
              <button
                type="button"
                onClick={() => setDbSubTab('mlt_desk')}
                className={cn(
                  "px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                  dbSubTab === 'mlt_desk'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-indigo-700"
                )}
              >
                <Microscope size={16} /> MLT Desk
              </button>
            </div>

            {dbSubTab === 'records' && (
              <>
                {!firebaseUser && !isFirebaseLoading && (
              <div className="bg-amber-50 border border-amber-200 p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                    <ShieldAlert size={20} className="md:hidden" />
                    <ShieldAlert size={24} className="hidden md:block" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-base md:text-lg">Database Access Required</h4>
                    <p className="text-amber-700 text-[10px] md:text-sm">Connect Google account to manage Firestore data.</p>
                  </div>
                </div>
                <button 
                  onClick={handleFirebaseLogin}
                  className="w-full md:w-auto px-5 py-2.5 bg-white border-2 border-amber-200 text-amber-900 rounded-xl font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Connect Google
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Database Records ({allPerformances.filter(p => !p.doc_id).length + participations.length})</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center border border-zinc-200"
                  title="Refresh Data"
                >
                  <RefreshCw size={20} />
                </button>
                {googleStatus.connected && googleStatus.spreadsheetId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={syncToSheets}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                      title="Upload all data to Google Sheets"
                    >
                      {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                      <span className="hidden lg:inline">To Sheets</span>
                      <span className="lg:hidden text-xs">To Sheets</span>
                    </button>
                    <button
                      onClick={syncFromSheets}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                      title="Download data from Google Sheets to App"
                    >
                      {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                      <span className="hidden lg:inline">From Sheets</span>
                      <span className="lg:hidden text-xs">From Sheets</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Desktop Table View (Visible on md and up) */}
              <div className="hidden md:block bg-white rounded-[2rem] border border-zinc-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-bottom border-zinc-200">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Title</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
                        {/* Dynamic Participant Columns */}
                        {Array.from({ length: Math.max(1, ...participations.map(p => Array.isArray(p.participants) ? p.participants.length : (p.participant_name ? 1 : 0))) }).map((_, i) => (
                          <th key={i} className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Participant {i + 1}</th>
                        ))}
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Program</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">Media</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right sticky right-0 bg-zinc-50 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {/* Show SQLite-only Performances (Drafts and Manual) */}
                      {allPerformances.filter(p => !p.doc_id).map(item => {
                        const maxP = Math.max(1, ...participations.map(p => Array.isArray(p.participants) ? p.participants.length : (p.participant_name ? 1 : 0)), ...allPerformances.map(p => p.performer.split(', ').length));
                        const performers = item.performer.split(', ');
                        return (
                          <tr key={`sqlite-${item.id}`} className={cn("hover:bg-zinc-50/50 transition-colors group", !item.is_approved && "bg-blue-50/30")}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {!item.is_approved ? (
                                <span className="text-xs font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded uppercase">Draft</span>
                              ) : (
                                <span className="text-xs font-black text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded uppercase">Approved</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-zinc-900 line-clamp-1 min-w-[150px]">{item.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-zinc-100 text-zinc-900 text-[10px] font-black px-2 py-1 rounded-md uppercase border border-zinc-200">
                                {item.group_type || 'Single'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 min-w-[120px]">
                                {(item.category || '').split(', ').filter(Boolean).map(c => (
                                  <span key={c} className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-ig-pink">{item.contact_info || item.time || 'N/A'}</span>
                            </td>
                            {Array.from({ length: maxP }).map((_, i) => (
                              <td key={i} className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-zinc-600">
                                  {performers[i] || '-'}
                                </span>
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wider">
                                {item.program || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.media_url ? (
                                <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-900 text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all">
                                  <ExternalLink size={12} /> View
                                </a>
                              ) : <span className="text-xs text-zinc-400 italic">No media</span>}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-zinc-50/50 transition-colors shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">
                              <div className="flex items-center justify-end gap-2">
                                {!item.is_approved && (
                                  <button 
                                    onClick={() => handleApprove(item)} 
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1.5 font-bold text-xs"
                                  >
                                    <CheckCircle2 size={18} /> Approve
                                  </button>
                                )}
                                <button 
                                  onClick={() => { setEditPerformance(item); setIsEditing(true); }} 
                                  className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Edit Record"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('performances', item.id, item.title)} 
                                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {participations.map(item => {
                        const maxP = Math.max(1, ...participations.map(p => Array.isArray(p.participants) ? p.participants.length : (p.participant_name ? 1 : 0)));
                        return (
                          <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-medium text-zinc-500">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-zinc-900 line-clamp-1 min-w-[150px]">{item.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-zinc-100 text-zinc-900 text-[10px] font-black px-2 py-1 rounded-md uppercase border border-zinc-200">
                                {item.group_type || 'Single'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 min-w-[120px]">
                                {(Array.isArray(item.category) ? item.category : (item.category || '').split(', ')).filter(Boolean).map(c => (
                                  <span key={c} className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-ig-pink">{item.contact_info || 'N/A'}</span>
                            </td>
                            {/* Render Participant Names in Individual Columns */}
                            {Array.from({ length: maxP }).map((_, i) => (
                              <td key={i} className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-zinc-600">
                                  {Array.isArray(item.participants) ? (item.participants[i] || '-') : (i === 0 ? (item.participant_name || '-') : '-')}
                                </span>
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wider">
                                {item.program || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.media_url ? (
                                <a 
                                  href={item.media_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-900 text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all"
                                >
                                  <ExternalLink size={12} /> View
                                </a>
                              ) : (
                                <span className="text-xs text-zinc-400 italic">No media</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-zinc-50/50 transition-colors shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">
                              <div className="flex items-center justify-end gap-2">
                                {!item.approved ? (
                                  <button 
                                    onClick={() => handleApprove(item)} 
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1.5 font-bold text-xs"
                                    title="Approve & Add to Lineup"
                                  >
                                    <CheckCircle2 size={18} /> Approve
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                      <Check size={12} /> Approved
                                    </span>
                                    <button 
                                      onClick={() => handleDisapprove(item)} 
                                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all flex items-center gap-1.5 font-bold text-xs"
                                      title="Disapprove & Remove from Lineup"
                                    >
                                      <XCircle size={18} /> Disapprove
                                    </button>
                                  </div>
                                )}
                                <button 
                                  onClick={() => { setEditIdea(item); setIsEditing(true); }} 
                                  className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Edit Submission"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => confirmDelete('participations', item.id, item.title)} 
                                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Delete Submission"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View (Visible below md) */}
              <div className="block md:hidden space-y-4">
                {/* SQLite-only Items */}
                {allPerformances.filter(p => !p.doc_id).map(item => (
                  <div key={`mob-sqlite-${item.id}`} className={cn("rounded-3xl p-5 border shadow-sm space-y-4", item.is_approved ? "bg-white border-zinc-200" : "bg-blue-50/50 border-blue-100")}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", item.is_approved ? "text-emerald-500" : "text-blue-400")}>
                          {item.is_approved ? <Check size={10} /> : <CheckCircle2 size={10} />}
                          {item.is_approved ? 'Approved Record' : 'Pending Draft'}
                        </div>
                        <h3 className="font-black text-zinc-900 text-lg leading-tight">{item.title}</h3>
                      </div>
                      <span className="bg-white text-zinc-900 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-zinc-200 shrink-0">
                        {item.group_type || 'Single'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(item.category || '').split(', ').filter(Boolean).map(c => (
                        <span key={c} className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {item.program && (
                        <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                           <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Selected Program</span>
                           <p className="text-xs font-bold text-indigo-700">{item.program}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Performer(s)</span>
                         <p className="text-sm font-bold text-zinc-700">{item.performer}</p>
                      </div>

                      {item.media_url && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Media Attachment</span>
                          <a 
                            href={item.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all border border-zinc-200"
                          >
                            <ExternalLink size={14} /> View Media File
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {!item.is_approved && (
                        <button 
                          onClick={() => handleApprove(item)} 
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                      )}
                      <button 
                        onClick={() => { setEditPerformance(item); setIsEditing(true); }} 
                        className="p-2.5 text-zinc-600 bg-zinc-100 rounded-xl border border-zinc-200"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => confirmDelete('performances', item.id, item.title)} 
                        className={cn("p-2.5 rounded-xl border", item.is_approved ? "text-zinc-400 bg-zinc-50 border-zinc-200" : "text-red-600 bg-red-50 border-red-100")}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {participations.map(item => (
                  <div key={item.id} className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <h3 className="font-black text-zinc-900 text-lg leading-tight">{item.title}</h3>
                      </div>
                      <span className="bg-zinc-100 text-zinc-900 text-[9px] font-black px-2 py-1 rounded-md uppercase border border-zinc-200 shrink-0">
                        {item.group_type || 'Single'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(item.category) ? item.category : (item.category || '').split(', ')).filter(Boolean).map(c => (
                        <span key={c} className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-zinc-50">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Contact</span>
                        <span className="text-xs font-bold text-ig-pink">{item.contact_info || 'N/A'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Media</span>
                        {item.media_url ? (
                          <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1">
                            <ExternalLink size={10} /> View File
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">None</span>
                        )}
                      </div>
                    </div>

                    {item.program && (
                      <div className="space-y-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                         <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Selected Program</span>
                         <p className="text-xs font-bold text-indigo-700">{item.program}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Participants</span>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(item.participants) ? (
                          item.participants.filter(Boolean).map((p, i) => (
                            <span key={i} className="text-xs font-medium text-zinc-600 bg-zinc-50 px-2 py-1 rounded-lg border border-zinc-100">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-medium text-zinc-600 bg-zinc-50 px-2 py-1 rounded-lg border border-zinc-100">
                            {item.participant_name || '-'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {!item.approved ? (
                        <button 
                          onClick={() => handleApprove(item)} 
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 flex items-center justify-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 py-2.5 rounded-xl border border-emerald-100">
                            <Check size={14} /> Approved
                          </div>
                          <button 
                            onClick={() => handleDisapprove(item)} 
                            className="p-2.5 text-amber-600 bg-amber-50 rounded-xl border border-amber-100"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => { setEditIdea(item); setIsEditing(true); }} 
                        className="p-2.5 text-zinc-600 bg-zinc-100 rounded-xl border border-zinc-200"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => confirmDelete('participations', item.id, item.title)} 
                        className="p-2.5 text-red-600 bg-red-50 rounded-xl border border-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {participations.length === 0 && (
              <div className="text-center py-20 bg-zinc-50/50">
                <Sparkles size={48} className="mx-auto text-zinc-300 mb-4" />
                <p className="text-zinc-500 font-medium">No applications submitted yet.</p>
              </div>
            )}
          </>
        )}

        {dbSubTab === 'library' && (
        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-zinc-200 p-4 sm:p-6 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-teal-900 flex items-center gap-2">
                <BookOpen className="text-teal-600" /> Academic Content Library Database
              </h3>
              <p className="text-xs md:text-sm text-zinc-500 font-sans mt-1">Manage BMLT course syllabus, departments, topics, lecture sheets, and reference volumes.</p>
            </div>
            <button
              type="button"
              onClick={loadLibraryAdminData}
              className="px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-all rounded-xl text-xs font-bold border border-zinc-200 flex items-center gap-2 self-start md:self-auto"
            >
              <RefreshCw size={14} /> Sync Library Database
            </button>
          </div>

          {/* Bento Quick Selector cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { id: 'subjects', label: 'Departments', count: libSubjects.length, icon: Layers, color: 'text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-300' },
              { id: 'topics', label: 'Syllabus Topics', count: libTopics.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300' },
              { id: 'articles', label: 'Notes & Lectures', count: libArticles.length, icon: FileText, color: 'text-teal-600 bg-teal-50 border-teal-100 hover:border-teal-300' },
              { id: 'books', label: 'Reference Books', count: libBooks.length, icon: Presentation, color: 'text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300' },
              { id: 'bookdocs', label: 'Book Chapters', count: libBookDocs.length, icon: GraduationCap, color: 'text-violet-600 bg-violet-50 border-violet-100 hover:border-violet-300' }
            ].map(sec => {
              const IconComponent = sec.icon;
              const isActive = libraryManageSection === sec.id;
              return (
                <button
                  type="button"
                  key={sec.id}
                  onClick={() => {
                    setLibraryManageSection(sec.id as any);
                    setEditingSubject(null);
                    setEditingTopic(null);
                    setEditingArticle(null);
                    setEditingBook(null);
                    setEditingBookDoc(null);
                    setNewSubjectForm({ name: '', logo: 'BookOpen' });
                    setNewTopicForm({ name: '', subject_id: '' });
                    setNewArticleForm({ headline: '', content: '', author_name: '', section: 'textbook', file: null, allow_download: 1 });
                    setNewBookForm({ title: '', author_name: 'BMLT Director', cover_color: 'teal', allow_download: 1 });
                    setNewBookDocForm({ title: '', author_name: 'BMLT Scholar', file: null, allow_download: 1 });
                  }}
                  className={cn(
                    "p-4 rounded-2xl flex flex-col items-center justify-center text-center border transition-all shadow-sm relative overflow-hidden",
                    isActive 
                      ? "ring-2 ring-teal-500 border-transparent bg-teal-950 text-white" 
                      : sec.color + " text-zinc-700"
                  )}
                >
                  <IconComponent size={24} className={cn("mb-2", isActive && "text-teal-350")} />
                  <div className="text-[11px] font-black uppercase tracking-wider">{sec.label}</div>
                  <div className={cn("text-lg font-black mt-1", isActive ? "text-teal-200" : "text-zinc-900")}>
                    {sec.count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conditional Sections */}
          <AnimatePresence mode="wait">
            <motion.div
              key={libraryManageSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 pt-4"
            >
              {/* SUBJECTS MANAGEMENT */}
              {libraryManageSection === 'subjects' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Add Form */}
                  <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                    <h4 className="text-sm font-black uppercase tracking-wider text-rose-800 mb-4 flex items-center gap-2">
                      {editingSubject ? <Edit size={16} /> : <Plus size={16} />}
                      {editingSubject ? 'Edit Department/Subject' : 'Add New Department/Subject'}
                    </h4>
                    <form onSubmit={handleSaveSubject} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Department Name *</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. Hematology & Blood Banking"
                          value={newSubjectForm.name}
                          onChange={e => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Icon Logo Marker</label>
                        <select
                          value={newSubjectForm.logo}
                          onChange={e => setNewSubjectForm({ ...newSubjectForm, logo: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm text-xs md:text-sm font-sans"
                        >
                          <option value="BookOpen">📖 Book Open</option>
                          <option value="Beaker">🔬 Lab Beaker/Microscope</option>
                          <option value="FileText">📄 Document Sheet</option>
                          <option value="Activity">⚡ ECG Activity Wave</option>
                          <option value="Layers">🥞 Stack Layers</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        {editingSubject && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubject(null);
                              setNewSubjectForm({ name: '', logo: 'BookOpen' });
                            }}
                            className="flex-1 py-3.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="flex-[2] py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : editingSubject ? 'Save Changes' : 'Add Subject Department'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Department List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                      Configured Academic Departments ({libSubjects.length})
                    </h4>
                    <div className="divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm">
                      {libSubjects.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 italic">No subject departments added yet.</div>
                      ) : (
                        libSubjects.map(sub => (
                          <div key={sub.id} className="p-4 md:px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                             <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                                {sub.logo === 'Beaker' ? <Beaker size={20} /> : sub.logo === 'Activity' ? <Activity size={20} /> : sub.logo === 'Layers' ? <Layers size={20} /> : <BookOpen size={20} />}
                              </div>
                              <div>
                                <h5 className="font-bold text-zinc-900 text-sm">{sub.name}</h5>
                                <span className="text-[10px] text-zinc-400 font-medium">Recorded: {new Date(sub.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubject(sub);
                                  setNewSubjectForm({ name: sub.name, logo: sub.logo || 'BookOpen' });
                                }}
                                className="p-2 text-zinc-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Edit Department"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub.id)}
                                className="p-2 text-zinc-405 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Department"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TOPICS MANAGEMENT */}
              {libraryManageSection === 'topics' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Add Form */}
                  <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                    <h4 className="text-sm font-black uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-2">
                      {editingTopic ? <Edit size={16} /> : <Plus size={16} />}
                      {editingTopic ? 'Edit Syllabus Unit Topic' : 'Add Syllabus Unit Topic'}
                    </h4>
                    <form onSubmit={handleSaveTopic} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Parent Department *</label>
                        <select
                          required
                          disabled={editingTopic !== null}
                          value={selectedLibSubjectId}
                          onChange={e => setSelectedLibSubjectId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-50"
                        >
                          <option value="">-- Choose a Department --</option>
                          {libSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Topic Name *</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. Unit 2: Erythrocyte Sedimenation Rate"
                          value={newTopicForm.name}
                          onChange={e => setNewTopicForm({ ...newTopicForm, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        {editingTopic && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTopic(null);
                              setNewTopicForm({ name: '', subject_id: '' });
                            }}
                            className="flex-1 py-3.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : editingTopic ? 'Save Changes' : 'Add Syllabus Topic'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Topics List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Syllabus Topics List
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-bold bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                        Selected Subject Filter: {libSubjects.find(s => s.id.toString() === selectedLibSubjectId)?.name || 'None'}
                      </span>
                    </div>
                    
                    {!selectedLibSubjectId ? (
                      <div className="p-12 text-center text-zinc-500 italic bg-zinc-50 rounded-[2rem] border border-zinc-200">
                        Please select a Parent Subject Department in the form or filter to view unit topics.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm animate-fade-in">
                        {libTopics.length === 0 ? (
                          <div className="p-8 text-center text-zinc-400 italic">No syllabus topics added under this department yet.</div>
                        ) : (
                          libTopics.map(top => (
                            <div key={top.id} className="p-4 md:px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                  <BookOpen size={16} />
                                </div>
                                <div>
                                  <h5 className="font-bold text-zinc-950 text-sm">{top.name}</h5>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTopic(top);
                                    setNewTopicForm({ name: top.name, subject_id: top.subject_id.toString() });
                                    setSelectedLibSubjectId(top.subject_id.toString());
                                  }}
                                  className="p-2 text-zinc-450 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Edit Topic"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTopic(top.id)}
                                  className="p-2 text-zinc-405 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LECTURES & NOTES MANAGEMENT */}
              {libraryManageSection === 'articles' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Add Form */}
                  <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                    <h4 className="text-sm font-black uppercase tracking-wider text-teal-800 mb-4 flex items-center gap-2">
                      {editingArticle ? <Edit size={16} /> : <Plus size={16} />}
                      {editingArticle ? 'Edit Lecture Note / Document' : 'Publish Lecture Note / Document'}
                    </h4>
                    <form onSubmit={handleSaveArticle} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Subject Department *</label>
                        <select
                          required
                          disabled={editingArticle !== null}
                          value={selectedLibSubjectId}
                          onChange={e => {
                            setSelectedLibSubjectId(e.target.value);
                            setSelectedLibTopicId('');
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-50"
                        >
                          <option value="">-- Choose Department --</option>
                          {libSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Syllabus Topic Unit (Optional)</label>
                        <select
                          disabled={editingArticle !== null}
                          value={selectedLibTopicId}
                          onChange={e => setSelectedLibTopicId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-50"
                        >
                          <option value="">-- Choose Unit Topic --</option>
                          {libTopics.map(top => (
                            <option key={top.id} value={top.id}>{top.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Lecture Headline *</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. Iron Deficiency Anemia Overview"
                          value={newArticleForm.headline}
                          onChange={e => setNewArticleForm({ ...newArticleForm, headline: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Compiler / Author Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Dr. Jane Smith"
                          value={newArticleForm.author_name}
                          onChange={e => setNewArticleForm({ ...newArticleForm, author_name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Syllabus Section</label>
                        <select
                          value={newArticleForm.section}
                          onChange={e => setNewArticleForm({ ...newArticleForm, section: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                        >
                          <option value="textbook">Department Textbook</option>
                          <option value="lectures">Practical/Lecture notes</option>
                          <option value="papers">Historic Questions</option>
                        </select>
                      </div>

                      <div className="space-y-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <label className="text-xs font-black text-zinc-500 uppercase block mb-1">Attached PDF/Word Document File</label>
                        <input 
                          type="file"
                          id="lib-article-file-input"
                          accept=".pdf,.docx,.doc,.pptx,.ppt"
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setNewArticleForm({ ...newArticleForm, file });
                          }}
                          className="text-xs text-zinc-650 block w-full file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                        />
                        <p className="text-[10px] text-zinc-400 italic mt-1">Optional. If chosen, readers will load the file via our secure viewer with full zoom controls.</p>
                      </div>

                      {!newArticleForm.file && (
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Plain Text Transcript Content</label>
                          <textarea 
                            placeholder="Write or paste transcript notes here..."
                            value={newArticleForm.content}
                            onChange={e => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white h-24 resize-none text-xs shadow-sm"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 py-1 ml-1 pb-2">
                        <input
                          type="checkbox"
                          id="allow-download-note-desktop"
                          checked={newArticleForm.allow_download !== 0}
                          onChange={e => setNewArticleForm({ ...newArticleForm, allow_download: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 text-teal-600 border-zinc-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor="allow-download-note-desktop" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                          Allow PDF / Document Downloads for Students
                        </label>
                      </div>

                      <div className="flex gap-2">
                        {editingArticle && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArticle(null);
                              setNewArticleForm({ headline: '', content: '', author_name: '', section: 'textbook', file: null, allow_download: 1 });
                              const fileInput = document.getElementById('lib-article-file-input') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                            className="flex-1 py-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
                        >
                          {isSavingLibraryItem ? 'Publishing...' : editingArticle ? 'Save Changes' : 'Publish College Lecture Note'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Articles List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Uploaded Lectures & Lecture Sheets ({libArticles.length})
                      </h4>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {libArticles.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 italic bg-white border border-zinc-200 rounded-2xl">No articles or notes published in the database yet.</div>
                      ) : (
                        libArticles.map(art => {
                          const parentSub = libSubjects.find(s => s.id === art.subject_id)?.name || 'Misc Subject';
                          return (
                            <div key={art.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between hover:border-teal-200 transition-all shadow-sm">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                                  {art.file_path ? <FileText size={20} /> : <BookOpen size={20} />}
                                </div>
                                <div>
                                  <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{art.headline}</h5>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-zinc-500 font-medium">
                                    <span className="font-bold text-teal-700 uppercase">{art.section}</span>
                                    <span>•</span>
                                    <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-650">{parentSub}</span>
                                    <span>•</span>
                                    <span>By {art.author_name}</span>
                                    {art.file_path && (
                                      <>
                                        <span>•</span>
                                        <a href={art.file_path} target="_blank" rel="noreferrer" className="text-teal-600 font-black hover:underline inline-flex items-center gap-0.5">
                                          View PDF <ExternalLink size={10} />
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/content/articles/${art.id}`);
                                      if (res.ok) {
                                        const fullArt = await res.json();
                                        setEditingArticle(fullArt);
                                        setNewArticleForm({
                                          headline: fullArt.headline,
                                          content: fullArt.content || '',
                                          author_name: fullArt.author_name || '',
                                          section: fullArt.section || 'textbook',
                                          file: null,
                                          allow_download: fullArt.allow_download !== 0 ? 1 : 0
                                        });
                                        setSelectedLibSubjectId(fullArt.subject_id ? fullArt.subject_id.toString() : '');
                                        setSelectedLibTopicId(fullArt.topic_id ? fullArt.topic_id.toString() : '');
                                      }
                                    } catch (err) {
                                      showNotification('Failed to fetch note details', 'error');
                                    }
                                  }}
                                  className="p-2 text-zinc-400 hover:text-teal-650 hover:bg-teal-50 rounded-lg transition-all"
                                  title="Edit Note"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArticle(art.id)}
                                  className="p-2 text-zinc-405 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* REFERENCE BOOKS MANAGEMENT */}
              {libraryManageSection === 'books' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Add Form */}
                  <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                    <h4 className="text-sm font-black uppercase tracking-wider text-amber-800 mb-4 flex items-center gap-2">
                      {editingBook ? <Edit size={16} /> : <Plus size={16} />}
                      {editingBook ? 'Edit Reference Book' : 'Volume Registry (Book)'}
                    </h4>
                    <form onSubmit={handleSaveBook} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Reference Book Title *</label>
                        <input 
                          required
                          type="text"
                          placeholder="e.g. Guyton and Hall Physio"
                          value={newBookForm.title}
                          onChange={e => setNewBookForm({ ...newBookForm, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Author / Publisher Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Elsevier"
                          value={newBookForm.author_name}
                          onChange={e => setNewBookForm({ ...newBookForm, author_name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Cover Theme Accent</label>
                        <select
                          value={newBookForm.cover_color}
                          onChange={e => setNewBookForm({ ...newBookForm, cover_color: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                        >
                          <option value="teal">Teal Green Cover</option>
                          <option value="indigo">Royal Indigo Blue</option>
                          <option value="emerald">Emerald Forest</option>
                          <option value="rose">Deep Rose Velvet</option>
                          <option value="amber">Warm Amber Gold</option>
                          <option value="violet">Noble Violet Purple</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-xl border border-zinc-200">
                        <input
                          type="checkbox"
                          id="allow-book-download"
                          checked={newBookForm.allow_download === 1}
                          onChange={e => setNewBookForm({ ...newBookForm, allow_download: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 text-amber-600 border-zinc-300 rounded focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="allow-book-download" className="text-xs font-black text-zinc-600 cursor-pointer select-none">
                          Allow downloads of this book
                        </label>
                      </div>

                      <div className="flex gap-2">
                        {editingBook && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBook(null);
                              setNewBookForm({ title: '', author_name: 'BMLT Director', cover_color: 'teal', allow_download: 1 });
                            }}
                            className="flex-1 py-3.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="flex-[2] py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : editingBook ? 'Save Changes' : 'Register Reference Book'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Books List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                      Registered Reference Volumes Overview ({libBooks.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                      {libBooks.length === 0 ? (
                        <div className="col-span-2 p-8 text-center text-zinc-400 italic">No reference books registered yet. Use the left form to compile one.</div>
                      ) : (
                        libBooks.map(bk => (
                          <div key={bk.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between hover:border-amber-200 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border font-black uppercase text-xs text-white",
                                bk.cover_color === 'teal' ? 'bg-teal-600 border-teal-500' :
                                bk.cover_color === 'indigo' ? 'bg-indigo-600 border-indigo-500' :
                                bk.cover_color === 'emerald' ? 'bg-emerald-600 border-emerald-500' :
                                bk.cover_color === 'rose' ? 'bg-rose-600 border-rose-500' :
                                bk.cover_color === 'violet' ? 'bg-violet-600 border-violet-500' : 'bg-amber-600 border-amber-500'
                              )}>
                                Bk
                              </div>
                              <div>
                                <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{bk.title}</h5>
                                <span className="text-[10px] text-zinc-400 font-medium font-sans">By {bk.author_name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBook(bk);
                                  setNewBookForm({
                                    title: bk.title,
                                    author_name: bk.author_name || 'BMLT Director',
                                    cover_color: bk.cover_color || 'teal',
                                    allow_download: bk.allow_download !== 0 ? 1 : 0
                                  });
                                }}
                                className="p-2 text-zinc-455 hover:text-amber-650 hover:bg-amber-50 rounded-lg transition-all"
                                title="Edit Book"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(bk.id)}
                                className="p-2 text-zinc-405 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOOK CHAPTERS MANAGEMENT */}
              {libraryManageSection === 'bookdocs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Add Form */}
                  <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                    <h4 className="text-sm font-black uppercase tracking-wider text-violet-800 mb-4 flex items-center gap-2">
                      {editingBookDoc ? <Edit size={16} /> : <Plus size={16} />}
                      {editingBookDoc ? 'Edit Book Chapter' : 'Upload Book Chapter PDF'}
                    </h4>
                    <form onSubmit={handleSaveBookDoc} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Select Reference Book *</label>
                        <select
                          required
                          disabled={editingBookDoc !== null}
                          value={selectedLibBookId}
                          onChange={e => setSelectedLibBookId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm disabled:opacity-50"
                        >
                          <option value="">-- Choose Reference Book --</option>
                          {libBooks.map(bk => (
                            <option key={bk.id} value={bk.id}>{bk.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Chapter / File Title</label>
                        <input 
                          type="text"
                          placeholder="e.g. Chapter 14: Cellular Adaptations"
                          value={newBookDocForm.title}
                          onChange={e => setNewBookDocForm({ ...newBookDocForm, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black text-zinc-500 uppercase ml-1">Compiler Scholar</label>
                        <input 
                          type="text"
                          placeholder="e.g. BMLT Scholar"
                          value={newBookDocForm.author_name}
                          onChange={e => setNewBookDocForm({ ...newBookDocForm, author_name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      </div>

                      <div className="space-y-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <label className="text-xs font-black text-zinc-500 uppercase block mb-1">
                          Upload Chapter PDF {editingBookDoc ? '(Optional)' : '*'}
                        </label>
                        <input 
                          required={editingBookDoc === null}
                          type="file"
                          id="lib-bookdoc-file-input"
                          accept=".pdf,.docx,.doc"
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setNewBookDocForm({ ...newBookDocForm, file });
                          }}
                          className="text-xs text-zinc-650 block w-full file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-xl border border-zinc-200">
                        <input
                          type="checkbox"
                          id="allow-doc-download"
                          checked={newBookDocForm.allow_download === 1}
                          onChange={e => setNewBookDocForm({ ...newBookDocForm, allow_download: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 text-violet-600 border-zinc-300 rounded focus:ring-violet-500 cursor-pointer"
                        />
                        <label htmlFor="allow-doc-download" className="text-xs font-black text-zinc-650 cursor-pointer select-none">
                          Allow downloads of this chapter
                        </label>
                      </div>

                      <div className="flex gap-2">
                        {editingBookDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBookDoc(null);
                              setNewBookDocForm({ title: '', author_name: 'BMLT Scholar', file: null, allow_download: 1 });
                              const docInput = document.getElementById('lib-bookdoc-file-input') as HTMLInputElement;
                              if (docInput) docInput.value = '';
                            }}
                            className="flex-1 py-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="flex-[2] py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
                        >
                          {isSavingLibraryItem ? 'Saving...' : editingBookDoc ? 'Save Changes' : 'Upload Chapter To Book'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Book documents List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Book Chapters Archive ({libBookDocs.length})
                      </h4>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {libBookDocs.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 italic bg-white border border-zinc-200 rounded-2xl">No chapters uploaded to the reference database yet.</div>
                      ) : (
                        libBookDocs
                          .filter(doc => !selectedLibBookId || doc.book_id.toString() === selectedLibBookId)
                          .map(doc => {
                            const parentBook = libBooks.find(b => b.id === doc.book_id)?.title || 'Misc Book';
                            return (
                              <div key={doc.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between hover:border-violet-200 transition-all shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                                    <GraduationCap size={20} />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{doc.title}</h5>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-zinc-500 font-medium font-mono">
                                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-650 inline-block line-clamp-1 max-w-[150px]">{parentBook}</span>
                                      <span>•</span>
                                      <span>By {doc.author_name}</span>
                                      <span>•</span>
                                      <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-violet-600 font-black hover:underline inline-flex items-center gap-0.5">
                                        Open PDF <ExternalLink size={10} />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBookDoc(doc);
                                      setNewBookDocForm({
                                        title: doc.title,
                                        author_name: doc.author_name || 'BMLT Scholar',
                                        file: null,
                                        allow_download: doc.allow_download !== 0 ? 1 : 0
                                      });
                                      setSelectedLibBookId(doc.book_id ? doc.book_id.toString() : '');
                                    }}
                                    className="p-2 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                                    title="Edit Chapter"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBookDoc(doc.id)}
                                    className="p-2 text-zinc-405 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )}

        {activeTab === 'programs' && eventsSubTab === 'demanding' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3 text-red-600">
                  <Flame size={24} className="fill-red-600" /> Demanding Chillies
                </h3>
                <form onSubmit={handleAddDemandingItem} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Type</label>
                    <select 
                      value={demandingForm.type} 
                      onChange={e => setDemandingForm({...demandingForm, type: e.target.value as any})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white font-medium"
                    >
                      <option value="song">Song / Audio</option>
                      <option value="videography">Videography Concept</option>
                      <option value="photography">Photography Concept</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Title</label>
                    <input 
                      required 
                      placeholder="Item Title" 
                      value={demandingForm.title} 
                      onChange={e => setDemandingForm({...demandingForm, title: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">External Link</label>
                    <input 
                      required 
                      placeholder="https://..." 
                      value={demandingForm.link} 
                      onChange={e => setDemandingForm({...demandingForm, link: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Style / Tag</label>
                    <input 
                      placeholder="e.g. Trendy, Minimal, Jazz..." 
                      value={demandingForm.category} 
                      onChange={e => setDemandingForm({...demandingForm, category: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Description (Optional)</label>
                    <textarea 
                      placeholder="Brief details..." 
                      value={demandingForm.description} 
                      onChange={e => setDemandingForm({...demandingForm, description: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white h-24 resize-none" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 transition-all shadow-lg mt-4 flex items-center justify-center gap-2">
                    <Plus size={20} /> Add Item
                  </button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Active Chillies ({demandingItems.length})</h2>
              </div>

              {['song', 'videography', 'photography'].map(type => {
                const items = demandingItems.filter(item => item.type === type);
                if (items.length === 0) return null;

                return (
                  <div key={type} className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-2">
                      {type === 'song' ? 'Most Demanding Songs' : type === 'videography' ? 'Videography Conceptions' : 'Photography Conceptions'}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between group hover:border-red-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                              type === 'song' ? "bg-red-50 text-red-600" : type === 'videography' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {type === 'song' ? <Music size={20} /> : type === 'videography' ? <Video size={20} /> : <Image size={20} />}
                            </div>
                            <div>
                              <h5 className="font-bold text-zinc-900">{item.title}</h5>
                              <div className="flex items-center gap-2">
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-zinc-400 hover:text-black flex items-center gap-1 uppercase tracking-wider">
                                  <LinkIcon size={10} /> {new URL(item.link).hostname}
                                </a>
                                {item.description && (
                                  <>
                                    <span className="text-zinc-300">•</span>
                                    <span className="text-[10px] text-zinc-500 font-medium">{item.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingDemanding(item)}
                              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit Item"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setPreviewMedia({ url: item.link, type: type as any, title: item.title })}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Preview Content"
                            >
                              <Play size={16} fill="currentColor" />
                            </button>
                            <button 
                              onClick={() => confirmDelete('demanding' as any, item.id, item.title)}
                              className="p-3 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {demandingItems.length === 0 && (
                <div className="text-center py-20 bg-zinc-50/50 rounded-[2rem] border-2 border-dashed border-zinc-200">
                  <Flame size={48} className="mx-auto text-zinc-200 mb-4" />
                  <p className="text-zinc-400 font-medium italic">No items added to Demanding Chillies yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {false && (
          <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-zinc-200 p-4 sm:p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-teal-900 flex items-center gap-2">
                  <BookOpen className="text-teal-600" /> Academic Content Library Database
                </h3>
                <p className="text-xs md:text-sm text-zinc-500 font-sans mt-1">Manage BMLT course syllabus, departments, topics, lecture sheets, and reference volumes.</p>
              </div>
              <button
                type="button"
                onClick={loadLibraryAdminData}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-all rounded-xl text-xs font-bold border border-zinc-200 flex items-center gap-2 self-start md:self-auto"
              >
                <RefreshCw size={14} /> Sync Library Database
              </button>
            </div>

            {/* Bento Quick Selector cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { id: 'subjects', label: 'Departments', count: libSubjects.length, icon: Layers, color: 'text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-300' },
                { id: 'topics', label: 'Syllabus Topics', count: libTopics.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300' },
                { id: 'articles', label: 'Notes & Lectures', count: libArticles.length, icon: FileText, color: 'text-teal-600 bg-teal-50 border-teal-100 hover:border-teal-300' },
                { id: 'books', label: 'Reference Books', count: libBooks.length, icon: Presentation, color: 'text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300' },
                { id: 'bookdocs', label: 'Book Chapters', count: libBookDocs.length, icon: GraduationCap, color: 'text-violet-600 bg-violet-50 border-violet-100 hover:border-violet-300' }
              ].map(sec => {
                const IconComponent = sec.icon;
                const isActive = libraryManageSection === sec.id;
                return (
                  <button
                    type="button"
                    key={sec.id}
                    onClick={() => setLibraryManageSection(sec.id as any)}
                    className={cn(
                      "p-4 rounded-2xl flex flex-col items-center justify-center text-center border transition-all shadow-sm relative overflow-hidden",
                      isActive 
                        ? "ring-2 ring-teal-500 border-transparent bg-teal-950 text-white" 
                        : sec.color + " text-zinc-700"
                    )}
                  >
                    <IconComponent size={24} className={cn("mb-2", isActive && "text-teal-300")} />
                    <div className="text-[11px] font-black uppercase tracking-wider">{sec.label}</div>
                    <div className={cn("text-lg font-black mt-1", isActive ? "text-teal-200" : "text-zinc-900")}>
                      {sec.count}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conditional Sections */}
            <AnimatePresence mode="wait">
              <motion.div
                key={libraryManageSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6 pt-4"
              >
                {/* SUBJECTS MANAGEMENT */}
                {libraryManageSection === 'subjects' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Form */}
                    <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                      <h4 className="text-sm font-black uppercase tracking-wider text-rose-800 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Add New Department/Subject
                      </h4>
                      <form onSubmit={handleSaveSubject} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Department Name *</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Hematology & Blood Banking"
                            value={newSubjectForm.name}
                            onChange={e => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Icon Logo Marker</label>
                          <select
                            value={newSubjectForm.logo}
                            onChange={e => setNewSubjectForm({ ...newSubjectForm, logo: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          >
                            <option value="BookOpen">📖 Book Open</option>
                            <option value="Beaker">🔬 Lab Beaker/Microscope</option>
                            <option value="FileText">📄 Document Sheet</option>
                            <option value="Activity">⚡ ECG Activity Wave</option>
                            <option value="Layers">🥞 Stack Layers</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : 'Add Subject Department'}
                        </button>
                      </form>
                    </div>

                    {/* Right: Department List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                        Configured Academic Departments ({libSubjects.length})
                      </h4>
                      <div className="divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm">
                        {libSubjects.length === 0 ? (
                          <div className="p-8 text-center text-zinc-400 italic">No subject departments added yet.</div>
                        ) : (
                          libSubjects.map(sub => (
                            <div key={sub.id} className="p-4 md:px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                                  {sub.logo === 'Beaker' ? <Beaker size={20} /> : sub.logo === 'Activity' ? <Activity size={20} /> : sub.logo === 'Layers' ? <Layers size={20} /> : <BookOpen size={20} />}
                                </div>
                                <div>
                                  <h5 className="font-bold text-zinc-900 text-sm">{sub.name}</h5>
                                  <span className="text-[10px] text-zinc-400 font-medium">Recorded: {new Date(sub.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Department"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOPICS MANAGEMENT */}
                {libraryManageSection === 'topics' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Form */}
                    <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                      <h4 className="text-sm font-black uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Add Syllabus Unit Topic
                      </h4>
                      <form onSubmit={handleSaveTopic} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Parent Department *</label>
                          <select
                            required
                            value={selectedLibSubjectId}
                            onChange={e => setSelectedLibSubjectId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="">-- Choose a Department --</option>
                            {libSubjects.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Topic Name *</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Unit 2: Erythrocyte Sedimenation Rate"
                            value={newTopicForm.name}
                            onChange={e => setNewTopicForm({ ...newTopicForm, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : 'Add Syllabus Topic'}
                        </button>
                      </form>
                    </div>

                    {/* Right: Topics List */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                          Syllabus Topics List
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-bold bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                          Selected Subject Filter: {libSubjects.find(s => s.id.toString() === selectedLibSubjectId)?.name || 'None'}
                        </span>
                      </div>
                      
                      {!selectedLibSubjectId ? (
                        <div className="p-12 text-center text-zinc-500 italic bg-zinc-50 rounded-[2rem] border border-zinc-200">
                          Please select a Parent Subject Department in the form or filter to view unit topics.
                        </div>
                      ) : (
                        <div className="divide-y divide-zinc-100 bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm animate-fade-in">
                          {libTopics.length === 0 ? (
                            <div className="p-8 text-center text-zinc-400 italic">No syllabus topics added under this department yet.</div>
                          ) : (
                            libTopics.map(top => (
                              <div key={top.id} className="p-4 md:px-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                    <BookOpen size={16} />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-zinc-950 text-sm">{top.name}</h5>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTopic(top.id)}
                                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LECTURES & NOTES MANAGEMENT */}
                {libraryManageSection === 'articles' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Form */}
                    <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                      <h4 className="text-sm font-black uppercase tracking-wider text-teal-800 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Publish Lecture Note / Document
                      </h4>
                      <form onSubmit={handleSaveArticle} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Subject Department *</label>
                          <select
                            required
                            value={selectedLibSubjectId}
                            onChange={e => {
                              setSelectedLibSubjectId(e.target.value);
                              setSelectedLibTopicId('');
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="">-- Choose Department --</option>
                            {libSubjects.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Syllabus Topic Unit (Optional)</label>
                          <select
                            value={selectedLibTopicId}
                            onChange={e => setSelectedLibTopicId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="">-- Choose Unit Topic --</option>
                            {libTopics.map(top => (
                              <option key={top.id} value={top.id}>{top.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Lecture Headline *</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Iron Deficiency Anemia Overview"
                            value={newArticleForm.headline}
                            onChange={e => setNewArticleForm({ ...newArticleForm, headline: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Compiler / Author Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Dr. Jane Smith"
                            value={newArticleForm.author_name}
                            onChange={e => setNewArticleForm({ ...newArticleForm, author_name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Syllabus Section</label>
                          <select
                            value={newArticleForm.section}
                            onChange={e => setNewArticleForm({ ...newArticleForm, section: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="textbook">Department Textbook</option>
                            <option value="lectures">Practical/Lecture notes</option>
                            <option value="papers">Historic Questions</option>
                          </select>
                        </div>

                        <div className="space-y-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                          <label className="text-xs font-black text-zinc-500 uppercase block mb-1">Attached PDF/Word Document File</label>
                          <input 
                            type="file"
                            id="lib-article-file-input"
                            accept=".pdf,.docx,.doc,.pptx,.ppt"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setNewArticleForm({ ...newArticleForm, file });
                            }}
                            className="text-xs text-zinc-600 block w-full file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                          />
                          <p className="text-[10px] text-zinc-400 italic mt-1">Optional. If chosen, readers will load the file via our secure viewer with full zoom controls.</p>
                        </div>

                        {!newArticleForm.file && (
                          <div className="space-y-1">
                            <label className="text-xs font-black text-zinc-500 uppercase ml-1">Plain Text Transcript Content</label>
                            <textarea 
                              placeholder="Write or paste transcript notes here..."
                              value={newArticleForm.content}
                              onChange={e => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white h-24 resize-none text-xs shadow-sm"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 py-1 ml-1 pb-2 font-sans">
                          <input
                            type="checkbox"
                            id="allow-download-note-mobile"
                            checked={newArticleForm.allow_download !== 0}
                            onChange={e => setNewArticleForm({ ...newArticleForm, allow_download: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 text-teal-600 border-zinc-300 rounded focus:ring-teal-500"
                          />
                          <label htmlFor="allow-download-note-mobile" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                            Allow PDF / Document Downloads for Students
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
                        >
                          {isSavingLibraryItem ? 'Publishing...' : 'Publish College Lecture Note'}
                        </button>
                      </form>
                    </div>

                    {/* Right: Articles List */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                          Uploaded Lectures & Lecture Sheets ({libArticles.length})
                        </h4>
                      </div>

                      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {libArticles.length === 0 ? (
                          <div className="p-8 text-center text-zinc-400 italic bg-white border border-zinc-200 rounded-2xl">No articles or notes published in the database yet.</div>
                        ) : (
                          libArticles.map(art => {
                            const parentSub = libSubjects.find(s => s.id === art.subject_id)?.name || 'Misc Subject';
                            return (
                              <div key={art.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between hover:border-teal-200 transition-all shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                                    {art.file_path ? <FileText size={20} /> : <BookOpen size={20} />}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{art.headline}</h5>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-zinc-500 font-medium">
                                      <span className="font-bold text-teal-700 uppercase">{art.section}</span>
                                      <span>•</span>
                                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-650">{parentSub}</span>
                                      <span>•</span>
                                      <span>By {art.author_name}</span>
                                      {art.file_path && (
                                        <>
                                          <span>•</span>
                                          <a href={art.file_path} target="_blank" rel="noreferrer" className="text-teal-600 font-black hover:underline inline-flex items-center gap-0.5">
                                            View PDF <ExternalLink size={10} />
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArticle(art.id)}
                                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* REFERENCE BOOKS MANAGEMENT */}
                {libraryManageSection === 'books' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Form */}
                    <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                      <h4 className="text-sm font-black uppercase tracking-wider text-amber-800 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Volume Registry (Book)
                      </h4>
                      <form onSubmit={handleSaveBook} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Reference Book Title *</label>
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Guyton and Hall Physio"
                            value={newBookForm.title}
                            onChange={e => setNewBookForm({ ...newBookForm, title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Author / Publisher Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Elsevier"
                            value={newBookForm.author_name}
                            onChange={e => setNewBookForm({ ...newBookForm, author_name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Cover Theme Accent</label>
                          <select
                            value={newBookForm.cover_color}
                            onChange={e => setNewBookForm({ ...newBookForm, cover_color: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="teal">Teal Green Cover</option>
                            <option value="indigo">Royal Indigo Blue</option>
                            <option value="emerald">Emerald Forest</option>
                            <option value="rose">Deep Rose Velvet</option>
                            <option value="amber">Warm Amber Gold</option>
                            <option value="violet">Noble Violet Purple</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-xl border border-zinc-200">
                          <input
                            type="checkbox"
                            id="allow-book-download-mobile"
                            checked={newBookForm.allow_download === 1}
                            onChange={e => setNewBookForm({ ...newBookForm, allow_download: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 text-amber-600 border-zinc-300 rounded focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor="allow-book-download-mobile" className="text-xs font-black text-zinc-600 cursor-pointer select-none">
                            Allow downloads of this book
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                        >
                          {isSavingLibraryItem ? 'Saving...' : 'Register Reference Book'}
                        </button>
                      </form>
                    </div>

                    {/* Right: Books List */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-2">
                        Registered Reference Volumes Overview ({libBooks.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                        {libBooks.length === 0 ? (
                          <div className="col-span-2 p-8 text-center text-zinc-400 italic">No reference books registered yet. Use the left form to compile one.</div>
                        ) : (
                          libBooks.map(bk => (
                            <div key={bk.id} className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between hover:border-amber-200 transition-all shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center border font-black uppercase text-xs text-white",
                                  bk.cover_color === 'teal' ? 'bg-teal-600 border-teal-500' :
                                  bk.cover_color === 'indigo' ? 'bg-indigo-600 border-indigo-500' :
                                  bk.cover_color === 'emerald' ? 'bg-emerald-600 border-emerald-500' :
                                  bk.cover_color === 'rose' ? 'bg-rose-600 border-rose-500' :
                                  bk.cover_color === 'violet' ? 'bg-violet-600 border-violet-500' : 'bg-amber-600 border-amber-500'
                                )}>
                                  Bk
                                </div>
                                <div>
                                  <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{bk.title}</h5>
                                  <span className="text-[10px] text-zinc-400 font-medium font-sans">By {bk.author_name}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(bk.id)}
                                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* BOOK CHAPTERS MANAGEMENT */}
                {libraryManageSection === 'bookdocs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Add Form */}
                    <div className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-200">
                      <h4 className="text-sm font-black uppercase tracking-wider text-violet-800 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Upload Book Chapter PDF
                      </h4>
                      <form onSubmit={handleSaveBookDoc} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Select Reference Book *</label>
                          <select
                            required
                            value={selectedLibBookId}
                            onChange={e => setSelectedLibBookId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm"
                          >
                            <option value="">-- Choose Reference Book --</option>
                            {libBooks.map(bk => (
                              <option key={bk.id} value={bk.id}>{bk.title}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Chapter / File Title</label>
                          <input 
                            type="text"
                            placeholder="e.g. Chapter 14: Cellular Adaptations"
                            value={newBookDocForm.title}
                            onChange={e => setNewBookDocForm({ ...newBookDocForm, title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-zinc-500 uppercase ml-1">Compiler Scholar</label>
                          <input 
                            type="text"
                            placeholder="e.g. BMLT Scholar"
                            value={newBookDocForm.author_name}
                            onChange={e => setNewBookDocForm({ ...newBookDocForm, author_name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white shadow-sm"
                          />
                        </div>

                        <div className="space-y-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                          <label className="text-xs font-black text-zinc-500 uppercase block mb-1">Upload Chapter PDF *</label>
                          <input 
                            required
                            type="file"
                            id="lib-bookdoc-file-input"
                            accept=".pdf,.docx,.doc"
                            onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setNewBookDocForm({ ...newBookDocForm, file });
                            }}
                            className="text-xs text-zinc-600 block w-full file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-xl border border-zinc-200">
                          <input
                            type="checkbox"
                            id="allow-doc-download-mobile"
                            checked={newBookDocForm.allow_download === 1}
                            onChange={e => setNewBookDocForm({ ...newBookDocForm, allow_download: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 text-violet-600 border-zinc-300 rounded focus:ring-violet-500 cursor-pointer"
                          />
                          <label htmlFor="allow-doc-download-mobile" className="text-xs font-black text-zinc-650 cursor-pointer select-none">
                            Allow downloads of this chapter
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingLibraryItem}
                          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md"
                        >
                          {isSavingLibraryItem ? 'Uploading File...' : 'Upload Chapter To Book'}
                        </button>
                      </form>
                    </div>

                    {/* Right: Book documents List */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                          Book Chapters Archive ({libBookDocs.length})
                        </h4>
                      </div>

                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {libBookDocs.length === 0 ? (
                          <div className="p-8 text-center text-zinc-400 italic bg-white border border-zinc-200 rounded-2xl">No chapters uploaded to the reference database yet.</div>
                        ) : (
                          libBookDocs
                            .filter(doc => !selectedLibBookId || doc.book_id.toString() === selectedLibBookId)
                            .map(doc => {
                              const parentBook = libBooks.find(b => b.id === doc.book_id)?.title || 'Misc Book';
                              return (
                                <div key={doc.id} className="bg-white p-4 rounded-xl border border-zinc-200 flex items-center justify-between hover:border-violet-200 transition-all shadow-sm">
                                  <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                                      <GraduationCap size={20} />
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-zinc-900 text-sm line-clamp-1">{doc.title}</h5>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-zinc-500 font-medium font-mono">
                                        <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-600 line-clamp-1 max-w-[150px]">{parentBook}</span>
                                        <span>•</span>
                                        <span>By {doc.author_name}</span>
                                        <span>•</span>
                                        <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-violet-600 font-black hover:underline inline-flex items-center gap-0.5">
                                          Open PDF <ExternalLink size={10} />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBookDoc(doc.id)}
                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        {activeTab === 'media' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <Plus size={20} className="md:w-6 md:h-6"/> Add Media
                </h3>
                <form onSubmit={handleAddMedia} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Title</label>
                    <input required placeholder="Event Title" value={mediaForm.title} onChange={e => setMediaForm({...mediaForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">URL</label>
                    <div className="flex gap-2">
                      <input required placeholder="Image/Video URL" value={mediaForm.url} onChange={e => setMediaForm({...mediaForm, url: e.target.value})} className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                      <label className="shrink-0 cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-3 rounded-xl transition-all flex items-center justify-center border border-zinc-200">
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, (url) => setMediaForm({...mediaForm, url}));
                          }}
                          disabled={uploading}
                        />
                        {uploading ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Type</label>
                      <select value={mediaForm.type} onChange={e => setMediaForm({...mediaForm, type: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white font-medium">
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Year</label>
                      <input required type="number" value={mediaForm.year} onChange={e => setMediaForm({...mediaForm, year: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-zinc-800 transition-all shadow-lg mt-4">Add to Gallery</button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6">Gallery Items ({media.length})</h2>
              <div className="grid grid-cols-1 gap-4">
                {media.map(item => (
                  <div key={item.id} className="bg-white p-3 md:p-4 rounded-[1.5rem] border border-zinc-200 flex items-center gap-3 md:gap-6 hover:border-black/10 transition-all shadow-sm">
                    <img src={item.url} alt={item.title} className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-xl md:rounded-2xl shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base md:text-lg tracking-tight truncate">{item.title}</h4>
                      <p className="text-[10px] md:text-sm text-zinc-500 font-bold uppercase tracking-widest">{item.type} • {item.year}</p>
                    </div>
                    <button onClick={() => confirmDelete('media', item.id, item.title)} className="p-2 md:p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0">
                      <Trash2 size={18} className="md:w-5 md:h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'batches' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            <div className="lg:col-span-1 space-y-4 md:space-y-6 lg:sticky lg:top-32 h-fit">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 shadow-sm">
                <h3 className="text-lg md:text-xl lg:text-2xl font-black tracking-tight mb-4 md:mb-6 flex items-center gap-2.5">
                  <GraduationCap size={20} className="md:w-6 md:h-6 text-emerald-500"/> Add Batch Memory
                </h3>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = (e.target as HTMLFormElement);
                    const bName = (form.elements.namedItem('batchName') as HTMLSelectElement).value;
                    const caption = (form.elements.namedItem('caption') as HTMLInputElement).value;
                    const linkUrl = (form.elements.namedItem('linkUrl') as HTMLInputElement).value;
                    const mType = (form.elements.namedItem('mType') as HTMLSelectElement).value;
                    const contributor = (form.elements.namedItem('contributor') as HTMLInputElement).value;

                    if (!caption || !linkUrl) {
                      showNotification('Please fill out required fields', 'error');
                      return;
                    }

                    try {
                      const res = await authenticatedFetch('/api/public/batch-memories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          batch_name: bName,
                          title: caption,
                          url: linkUrl,
                          type: mType,
                          uploaded_by: contributor
                        })
                      });
                      if (res.ok) {
                        showNotification('Batch memory added successfully');
                        form.reset();
                        fetchData();
                      } else {
                        showNotification('Failed to save memory', 'error');
                      }
                    } catch (err) {
                      showNotification('Failed to connect to server', 'error');
                    }
                  }} 
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Caption / Note</label>
                    <input required name="caption" placeholder="Late night lab studies..." className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Media URL</label>
                    <div className="flex gap-2">
                      <input required name="linkUrl" id="adminMemUrl" placeholder="Image or Video URL" className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-white" />
                      <label className="shrink-0 cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-2.5 sm:p-3 rounded-xl transition-all flex items-center justify-center border border-zinc-200">
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, (url) => {
                                const input = document.getElementById('adminMemUrl') as HTMLInputElement;
                                if (input) input.value = url;
                              });
                            }
                          }}
                          disabled={uploading}
                        />
                        {uploading ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Type</label>
                      <select name="mType" defaultValue="photo" className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-white font-medium">
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Batch</label>
                        <button
                          type="button"
                          onClick={() => setShowAdminAddBatchInline(!showAdminAddBatchInline)}
                          className="text-xs text-emerald-600 hover:text-emerald-500 font-extrabold flex items-center gap-0.5 cursor-pointer"
                        >
                          {showAdminAddBatchInline ? 'Cancel' : '+ Add Batch'}
                        </button>
                      </div>
                      
                      {showAdminAddBatchInline ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Batch 2027"
                            value={adminNewBatchName}
                            onChange={(e) => setAdminNewBatchName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm font-bold bg-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!adminNewBatchName.trim()) {
                                showNotification('Batch name is required', 'error');
                                return;
                              }
                              try {
                                const res = await authenticatedFetch('/api/admin/batches', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: adminNewBatchName.trim() })
                                });
                                if (res.ok) {
                                  showNotification('Batch added successfully');
                                  const savedName = adminNewBatchName.trim();
                                  setAdminNewBatchName('');
                                  setShowAdminAddBatchInline(false);
                                  
                                  // Re-fetch batches list
                                  const bRes = await fetch('/api/batches');
                                  if (bRes.ok) {
                                    const updatedList = await bRes.json();
                                    setBatches(updatedList);
                                  }
                                } else {
                                  const msg = await res.json();
                                  showNotification(msg.error || 'Failed to add batch', 'error');
                                }
                              } catch (err) {
                                showNotification('Connection error', 'error');
                              }
                            }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-black text-white text-[10px] sm:text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <select name="batchName" className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-white font-bold text-zinc-700">
                          {batches.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                          {batches.length === 0 && (
                            <>
                              <option value="Batch 2025">Batch 2025</option>
                              <option value="Batch 2024">Batch 2024</option>
                              <option value="Batch 2023">Batch 2023</option>
                              <option value="Batch 2026">Batch 2026</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Contributor</label>
                    <input name="contributor" placeholder="e.g. Kabir Das (CSE '24)" className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-black hover:bg-zinc-800 transition-all shadow-lg mt-3 sm:mt-4">Save to Memory Book</button>
                </form>
              </div>

              {/* Memory Book Upload Permissions shifted from settings */}
              <div id="memoryBookSettings" className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-zinc-900">Upload Permissions</h3>
                    <p className="text-zinc-500 text-[10px] font-bold">Control viewer memory submission</p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-xl sm:rounded-2xl border border-zinc-100 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-zinc-850">Allow public uploads</p>
                    <p className="text-[10px] text-zinc-500 leading-normal font-medium max-w-[200px] sm:max-w-none">
                      When enabled, anonymous website visitors can upload new photos or video memories to alumni batch groups.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingUploadSettings}
                    onClick={async () => {
                      const nextVal = !allowViewerUploads;
                      setIsUpdatingUploadSettings(true);
                      try {
                        const res = await authenticatedFetch('/api/admin/settings/allow-viewer-uploads', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ enabled: nextVal })
                        });
                        if (res.ok) {
                          setAllowViewerUploads(nextVal);
                          showNotification(`Public uploads successfully ${nextVal ? 'enabled' : 'disabled'}`);
                        } else {
                          showNotification('Failed to update upload permission setting.', 'error');
                        }
                      } catch (err) {
                        showNotification('Network connection error.', 'error');
                      } finally {
                        setIsUpdatingUploadSettings(false);
                      }
                    }}
                    className={`w-11 h-5.5 sm:w-12 sm:h-6 rounded-full transition-all relative shrink-0 cursor-pointer ${
                      allowViewerUploads ? 'bg-emerald-500' : 'bg-zinc-300'
                    } ${isUpdatingUploadSettings ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-all ${
                        allowViewerUploads ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Batch Cohort Management */}
              <div id="batchCohortSettings" className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-zinc-900">Batch Cohorts ({batches.length})</h3>
                    <p className="text-zinc-500 text-[10px] font-bold">Delete incorrect or mistaken entries</p>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto subtle-scrollbar space-y-1.5 pr-1 pt-1">
                  {batches.map((b) => (
                    <div key={b.id} className="p-2 sm:p-2.5 bg-zinc-50 hover:bg-zinc-100/50 rounded-xl border border-zinc-150 flex items-center justify-between gap-3 transition-colors">
                      <span className="text-xs font-extrabold text-zinc-800 truncate">{b.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCohort(b);
                            setCohortCoverUrl(b.cover_url || '');
                            setCohortAvatarUrl(b.avatar_url || '');
                            setCohortMotto(b.motto || '');
                          }}
                          className="p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title={`Customize ${b.name} Branding`}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete('cohorts', b.id, b.name)}
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title={`Delete ${b.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {batches.length === 0 && (
                    <p className="text-xs text-zinc-400 italic text-center py-4">No custom cohorts configured yet.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              {(() => {
                const filtered = selectedAdminBatch === 'All'
                  ? batchMemories
                  : batchMemories.filter(item => item.batch_name === selectedAdminBatch);
                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-sm">
                      <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                        <GraduationCap size={22} className="text-emerald-500 shrink-0" />
                        Archive Memories ({filtered.length})
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest shrink-0">Filter Batch:</span>
                        <select
                          value={selectedAdminBatch}
                          onChange={(e) => setSelectedAdminBatch(e.target.value)}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-bold text-zinc-700 outline-none cursor-pointer"
                        >
                          <option value="All">All Batches</option>
                          {batches.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {filtered.map(item => (
                        <div key={item.id} className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl md:rounded-[1.5rem] border border-zinc-200 flex items-center gap-3 sm:gap-4 md:gap-6 hover:border-black/10 transition-all shadow-sm">
                          <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-zinc-55 rounded-xl md:rounded-2xl shrink-0 overflow-hidden relative border border-zinc-100">
                            <img src={item.url.includes('youtube.com') || item.url.includes('youtu.be') ? `https://img.youtube.com/vi/${item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''}/hqdefault.jpg` : item.url} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {item.type === 'video' && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Play size={14} fill="currentColor" className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-zinc-900 leading-snug line-clamp-2">"{item.title}"</h4>
                            <p className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500 font-extrabold uppercase tracking-widest mt-1">
                              {item.batch_name} • By {item.uploaded_by || 'Anonymous'}
                            </p>
                          </div>
                          <button onClick={() => confirmDelete('batches' as any, item.id, item.title)} className="p-1.5 sm:p-2 md:p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0">
                            <Trash2 size={16} className="sm:w-5 sm:h-5 cursor-pointer" />
                          </button>
                        </div>
                      ))}
                      {filtered.length === 0 && (
                        <div className="text-center py-12 sm:py-20 bg-zinc-50/50 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-zinc-250">
                          <GraduationCap size={40} className="mx-auto text-zinc-200 mb-3" />
                          <p className="text-zinc-400 font-medium italic text-xs sm:text-sm">No memories found for {selectedAdminBatch === 'All' ? 'any batch' : selectedAdminBatch}.</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'programs' && eventsSubTab === 'performances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <Plus size={20} className="md:w-6 md:h-6"/> Add Performance
                </h3>
                <form onSubmit={handleAddPerformance} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Participation Type</label>
                    <div className="flex gap-2">
                      {['Single', 'Duo', 'Group'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            let newParticipants = [...perfForm.participants];
                            if (type === 'Single') {
                              newParticipants = [perfForm.participants[0] || ''];
                            } else if (type === 'Duo') {
                              newParticipants = [
                                perfForm.participants[0] || '',
                                perfForm.participants[1] || ''
                              ];
                            }
                            setPerfForm({ ...perfForm, group_type: type as any, participants: newParticipants });
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg border text-xs font-bold transition-all",
                            perfForm.group_type === type 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2">
                      <User size={14} /> {perfForm.group_type === 'Single' ? 'Participant Name' : 'Participants'}
                    </label>
                    {perfForm.participants.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          required 
                          placeholder={perfForm.group_type === 'Single' ? "Enter full name" : `Participant ${idx + 1} Name`} 
                          value={p} 
                          onChange={e => {
                            const newParticipants = [...perfForm.participants];
                            newParticipants[idx] = e.target.value;
                            setPerfForm({...perfForm, participants: newParticipants});
                          }} 
                          className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                        />
                        {perfForm.group_type === 'Group' && perfForm.participants.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const newParticipants = perfForm.participants.filter((_, i) => i !== idx);
                              setPerfForm({...perfForm, participants: newParticipants});
                            }}
                            className="p-3 text-zinc-400 hover:text-red-600 bg-white border border-zinc-200 rounded-xl transition-all"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {perfForm.group_type === 'Group' && (
                      <button 
                        type="button" 
                        onClick={() => setPerfForm({...perfForm, participants: [...perfForm.participants, '']})}
                        className="w-full py-2 border border-dashed border-zinc-300 rounded-xl text-xs font-bold text-zinc-500 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add Participant
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2">
                      <Phone size={14} /> Contact Information (10-digit Phone)
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs border-r border-zinc-200 pr-3">
                        +91
                      </div>
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={perfForm.contact_info}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPerfForm({ ...perfForm, contact_info: val });
                        }}
                        className="w-full pl-16 pr-4 py-3 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 flex items-center gap-2">
                      <MessageSquare size={14} /> Performance Title / Style
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {performanceTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPerfForm({ ...perfForm, title: type })}
                          className={cn(
                            "px-3 py-1 rounded-lg border text-[10px] font-bold transition-all",
                            perfForm.title === type 
                              ? "bg-black text-white border-black" 
                              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <input 
                      required 
                      placeholder="Performance Title" 
                      value={perfForm.title} 
                      onChange={e => setPerfForm({...perfForm, title: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Categories</label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-white border border-zinc-200 rounded-xl">
                      {categories.map(cat => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={perfForm.category.includes(cat)}
                            onChange={e => {
                              const newCats = e.target.checked 
                                ? [...perfForm.category, cat]
                                : perfForm.category.filter(c => c !== cat);
                              setPerfForm({...perfForm, category: newCats});
                            }}
                            className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
                          />
                          <span className="text-xs font-medium text-zinc-600 group-hover:text-black transition-colors">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Media Upload / Link</label>
                    <div className="flex gap-2 mb-2">
                      {[
                        { id: 'link', icon: LinkIcon },
                        { id: 'mp3', icon: Music },
                        { id: 'mp4', icon: Video },
                        { id: 'image', icon: Image }
                      ].map(mType => (
                        <button
                          key={mType.id}
                          type="button"
                          onClick={() => setPerfForm({...perfForm, media_type: mType.id as any})}
                          className={cn(
                            "flex-1 py-1 rounded-lg border flex flex-col items-center gap-1 transition-all",
                            perfForm.media_type === mType.id 
                              ? "bg-zinc-800 text-white border-zinc-800" 
                              : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          <mType.icon size={12} />
                          <span className="text-[10px] font-black uppercase">{mType.id}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        placeholder={perfForm.media_type === 'link' ? "Paste URL here..." : "Media URL..."} 
                        value={perfForm.media_url} 
                        onChange={e => setPerfForm({...perfForm, media_url: e.target.value})} 
                        className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                      />
                      <label className="shrink-0 cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-3 rounded-xl transition-all flex items-center justify-center border border-zinc-200">
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, (url) => setPerfForm({...perfForm, media_url: url}));
                          }}
                          disabled={uploading}
                        />
                        {uploading ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Description</label>
                    <textarea required placeholder="Short description..." value={perfForm.description} onChange={e => setPerfForm({...perfForm, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white resize-none" rows={3} />
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-zinc-800 transition-all shadow-lg mt-4">Add Performance</button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Performance Lineup ({performances.length})</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {performances.map(perf => (
                  <div key={perf.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-zinc-200 flex flex-col sm:flex-row justify-between items-start gap-4 md:gap-6 hover:border-black/10 transition-all shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="bg-zinc-100 text-zinc-900 text-[8px] md:text-[10px] font-black px-2 py-1 rounded-md uppercase border border-zinc-200">{perf.group_type || 'Single'}</span>
                        {(Array.isArray(perf.category) ? perf.category : (perf.category || '').split(', ')).filter(Boolean).map(c => (
                          <span key={c} className="bg-black text-white text-[8px] md:text-[10px] font-black px-2 py-1 rounded-md uppercase">{c}</span>
                        ))}
                      </div>
                      <h4 className="font-black text-xl md:text-2xl tracking-tight mb-1 truncate">{perf.title}</h4>
                      <p className="text-xs md:text-sm text-zinc-500 font-bold mb-3 md:mb-4 flex items-center gap-2">
                        <User size={12} className="md:w-3.5 md:h-3.5" /> {perf.performer}
                      </p>
                      {perf.contact_info && (
                        <p className="text-xs md:text-sm text-zinc-500 font-bold mb-3 md:mb-4 flex items-center gap-2">
                          <Phone size={12} className="md:w-3.5 md:h-3.5" /> {perf.contact_info}
                        </p>
                      )}
                      <p className="text-zinc-700 text-sm md:text-base leading-relaxed mb-4 line-clamp-3">{perf.description}</p>
                      
                      {perf.media_url && (
                        <div className="mt-4 p-3 md:p-4 bg-zinc-50 rounded-xl md:rounded-2xl border border-zinc-100">
                          <p className="text-[8px] md:text-[10px] font-black text-zinc-400 uppercase mb-2">Attached Media ({perf.media_type})</p>
                          <a 
                            href={perf.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs md:text-sm font-bold text-black hover:underline flex items-center gap-2"
                          >
                            <Sparkles size={12} className="md:w-3.5 md:h-3.5" /> View/Play Media
                          </a>
                        </div>
                      )}
                    </div>
                    <button onClick={() => confirmDelete('performances', perf.id, perf.title)} className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all self-end sm:self-start">
                      <Trash2 size={20} className="md:w-6 md:h-6" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Contact Messages ({messages.length})</h2>
              <button 
                onClick={fetchData}
                className="p-2 text-zinc-500 hover:text-black transition-colors"
                title="Refresh Messages"
              >
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {messages.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border border-zinc-100">
                  <MessageSquare size={48} className="mx-auto text-zinc-300 mb-4" />
                  <p className="text-zinc-500 font-medium">No messages yet.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm hover:border-black/10 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                          {msg.status === 'unread' && (
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              New
                            </span>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-black text-zinc-900 mb-1">{msg.subject}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
                            <span className="text-black">{msg.name}</span>
                            <a href={`mailto:${msg.email}`} className="text-ig-pink hover:underline">{msg.email}</a>
                          </div>
                        </div>

                        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <button 
                          onClick={() => confirmDelete('messages', msg.id, msg.subject)}
                          className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Message"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIP Passes & Interactive QR Validation Center */}
        {activeTab === 'vip_passes' && (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <h2 className="text-3xl font-black tracking-tight">VIP Pass Generator & Entry QR center</h2>
                <p className="text-zinc-500 text-sm">Create high-security entries, print credentials with unique QR codes, and validate tickets on-site.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadFirestoreData}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-750 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Reload Passes Database"
                >
                  <RefreshCw size={13} /> Refresh Data
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Box A: High-Definition QR Check-in Terminal */}
              <div className="lg:col-span-1 bg-zinc-900 text-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-850 shadow-xl space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 mb-4">
                    <Key size={20} />
                    <span className="text-xs uppercase font-extrabold tracking-widest leading-none">Scan & Check-in Terminal</span>
                  </div>
                  
                  <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                    Tempatkan kursor lalu scan kode QR tiket dengan terminal barcode laser, atau ketik manual kode pass tiket di bawah untuk check-in.
                  </p>

                  <div className="space-y-4">
                    <div className="relative">
                      {/* Interactive Viewfinder Simulation */}
                      <div className="w-full h-44 bg-black rounded-2xl border-2 border-zinc-805 relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-red-500/80 animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        <div className="w-24 h-24 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center opacity-60">
                          <Eye size={28} className="text-zinc-500" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest mt-3">CAM FINDER ACTIVE</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block ml-1">KODE PASS OR SIGNATURE TIKET</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={scanInputCode}
                          onChange={(e) => setScanInputCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleValidatePass(scanInputCode);
                            }
                          }}
                          placeholder="UD-VIP-XXXXXXXXX"
                          className="flex-1 bg-zinc-800 border bg-zinc-800 border-zinc-705 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-white text-sm outline-none focus:border-amber-400 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleValidatePass(scanInputCode)}
                          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-xl font-extrabold text-xs transition-transform hover:scale-[1.02] cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick simulator helpers to simplify check in */}
                  {vipPasses.length > 0 && (
                    <div className="pt-4 border-t border-zinc-800 mt-4 space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Quick check-in Simulator:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                        {vipPasses.slice(0, 5).map(pass => (
                          <button
                            key={pass.id}
                            type="button"
                            onClick={() => {
                              setScanInputCode(pass.qr_code);
                              handleValidatePass(pass.qr_code);
                            }}
                            className="text-[10px] font-bold px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-amber-200 border border-zinc-700 rounded-lg transition-all"
                          >
                            Scan {pass.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation outcome splash notification */}
                <AnimatePresence mode="wait">
                  {validationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "p-4 rounded-2xl border text-xs font-bold leading-relaxed shadow-md mt-6 relative",
                        validationResult.success 
                          ? "bg-emerald-950/90 text-emerald-300 border-emerald-900" 
                          : "bg-red-950/90 text-red-300 border-red-900"
                      )}
                    >
                      <button 
                        type="button"
                        onClick={() => setValidationResult(null)}
                        className="absolute top-2.5 right-2.5 p-1 rounded-full bg-white/5 hover:bg-white/10"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="uppercase text-[9px] tracking-widest font-black text-white">Status Output:</span>
                        <p>{validationResult.message}</p>
                        {validationResult.pass && (
                          <div className="mt-2 text-[10px] text-zinc-300 space-y-0.5 border-t border-white/5 pt-2">
                            <div>Nama: <span className="font-extrabold text-white">{validationResult.pass.name}</span></div>
                            <div>Kode: <span className="font-mono text-[#C5A880]">{validationResult.pass.qr_code}</span></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Box B: VIP Passes Generator & Registered list */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Generation Block Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newVipName.trim()) return;
                    setIsGeneratingVip(true);
                    try {
                      const uniqueCode = `UD-VIP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                      await addDoc(collection(db, 'vip_passes'), {
                        name: newVipName.trim(),
                        qr_code: uniqueCode,
                        is_validated: false,
                        createdAt: serverTimestamp()
                      });
                      setNewVipName('');
                      showNotification('VIP Pass generated successfully!');
                      
                      // Refresh both local states and parent loaders
                      loadFirestoreData();
                    } catch (err) {
                      console.error(err);
                      showNotification('Failed to generate VIP credential document', 'error');
                    } finally {
                      setIsGeneratingVip(false);
                    }
                  }}
                  className="bg-zinc-50 p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm flex flex-col md:flex-row items-end gap-4"
                >
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">NAMA LENGKAP PENERIMA VIP</label>
                    <input
                      required
                      placeholder="e.g. Prof. Aris Setiawan / VVIP Sponsor 1"
                      value={newVipName}
                      onChange={(e) => setNewVipName(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border-2 border-zinc-150 rounded-2xl focus:border-stone-900 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGeneratingVip}
                    className="p-4 px-8 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl w-full md:w-auto shrink-0 transition-transform hover:scale-[1.01] cursor-pointer"
                  >
                    {isGeneratingVip ? 'Generating...' : 'CREATE TICKET'}
                  </button>
                </form>

                {/* Database entries lists */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                  <h3 className="text-lg font-black tracking-tight mb-4 text-stone-800">VIP Registered Database ({vipPasses.length})</h3>

                  {vipPasses.length === 0 ? (
                    <div className="p-16 text-center text-zinc-400 font-serif italic text-sm">
                      Belum ada VIP Pass yang diterbitkan. Gunakan kolom formulir di atas untuk mendaftarkan tamu istimewa!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-stone-700 font-sans border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 text-zinc-400 text-[10px] uppercase font-black tracking-wider pb-3">
                            <th className="py-3 px-2">Nama Tamu</th>
                            <th className="py-3 px-2">Kode Pass</th>
                            <th className="py-3 px-2">Status Masuk</th>
                            <th className="py-3 px-2">Waktu Check-in</th>
                            <th className="py-3 px-2 text-center">Fasilitasi / QR Kartu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {vipPasses.map((pass) => (
                            <tr key={pass.id} className="hover:bg-zinc-50/50">
                              <td className="py-4 px-2 font-bold text-stone-900">{pass.name}</td>
                              <td className="py-4 px-2 font-mono text-zinc-500 font-bold uppercase select-all">{pass.qr_code}</td>
                              <td className="py-4 px-2">
                                <span className={cn(
                                  "font-extrabold uppercase text-[9px] tracking-wider px-2.5 py-1 rounded-full border",
                                  pass.is_validated
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                )}>
                                  {pass.is_validated ? 'VALIDATED' : 'PENDING'}
                                </span>
                              </td>
                              <td className="py-4 px-2 font-medium text-stone-550">
                                {pass.validated_at ? new Date(pass.validated_at).toLocaleTimeString() : '—'}
                              </td>
                              <td className="py-4 px-2 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Print Card button with nice pop up info */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pass.qr_code)}`;
                                      const printWin = window.open('', '_blank');
                                      if (printWin) {
                                        printWin.document.write(`
                                          <html>
                                            <head>
                                              <title>MLT UDAAN VIP Pass - ${pass.name}</title>
                                              <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;700&display=swap" rel="stylesheet" />
                                              <style>
                                                body { font-family: 'Inter', sans-serif; background-color: #f7f7f3; margin: 0; padding: 25px; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
                                                .pass-card { max-width: 320px; width: 100%; border: 4px double #C5A880; background: #fff; text-align: center; border-radius: 20px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); position: relative; }
                                                .header { font-family: 'Cinzel', serif; font-size: 20px; color: #1e1e1e; margin-bottom: 3px; font-weight: 800; letter-spacing: 2px; }
                                                .tag { text-transform: uppercase; font-size: 9px; letter-spacing: 2.5px; font-weight: 700; color: #8A7355; margin-bottom: 12px; }
                                                .qr-holder { background: #FAF9F5; padding: 12px; border-radius: 12px; display: inline-block; border: 1px solid rgba(197, 168, 128, 0.2); margin-bottom: 14px; }
                                                .qr-holder img { width: 140px; height: 140px; display: block; }
                                                .name { font-size: 15px; font-weight: 700; color: #2d261c; margin-bottom: 4px; }
                                                .signature { font-family: monospace; font-size: 11px; color: #777; font-weight: bold; background: #eee; padding: 4px 10px; border-radius: 8px; display: inline-block; }
                                              </style>
                                            </head>
                                            <body>
                                              <div class="pass-card">
                                                <div class="header">UDAAN 2.0</div>
                                                <div class="tag">✦ VIP PASS PORT ENTRY ✦</div>
                                                <div class="qr-holder">
                                                  <img src="${url}" />
                                                </div>
                                                <div class="name">${pass.name}</div>
                                                <div class="signature">${pass.qr_code}</div>
                                              </div>
                                            </body>
                                          </html>
                                        `);
                                        printWin.document.close();
                                      }
                                    }}
                                    className="p-2 text-stone-500 hover:text-[#C5A880] hover:bg-stone-50 rounded-xl"
                                    title="Tampilkan / Cetak QR Pass"
                                  >
                                    <Eye size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteVipPass(pass.id, pass.name)}
                                    className="p-2 text-zinc-300 hover:text-red-650 hover:bg-red-50 rounded-xl"
                                    title="Cancel Tiket VIP"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <UserPlus size={20} className="md:w-6 md:h-6"/> Register User
                </h3>
                <form onSubmit={handleAddAdmin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Display Name</label>
                    <input required placeholder="e.g. John Doe" value={adminForm.display_name} onChange={e => setAdminForm({...adminForm, display_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Username</label>
                    <input required placeholder="e.g. jdoe" value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
                    <input required type="password" placeholder="••••••••" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Account Role</label>
                    <select 
                      value={adminForm.role} 
                      onChange={e => setAdminForm({...adminForm, role: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm font-bold"
                    >
                      <option value="author">Academic Author (Limited Access)</option>
                      <option value="admin">System Admin (Full Access)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black hover:bg-zinc-800 transition-all shadow-lg mt-4">Create Account</button>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6">System Users ({admins.length})</h2>
              <div className="grid grid-cols-1 gap-4">
                {admins.map(admin => (
                  <div key={admin.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-zinc-200 flex items-center gap-3 md:gap-6 hover:border-black/10 transition-all shadow-sm">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-900 font-black text-sm md:text-base shrink-0">
                      {admin.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base md:text-lg tracking-tight truncate flex items-center gap-2">
                        {admin.display_name}
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border",
                          (admin.role || 'admin') === 'admin' 
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-teal-50 text-teal-700 border-teal-100"
                        )}>
                          {(admin.role || 'admin') === 'admin' ? 'Admin' : 'Author'}
                        </span>
                      </h4>
                      <p className="text-[10px] md:text-sm text-zinc-500 font-medium truncate">@{admin.username} • Joined {new Date(admin.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleResetAdminPassword(admin.id)}
                        className="p-3 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
                        title="Reset Password"
                      >
                        <Key size={20} />
                      </button>
                      {admin.username !== currentUser?.username ? (
                        <button onClick={() => confirmDelete('admins', admin.id, admin.display_name)} className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={20} />
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-650 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 text-left">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-30">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <UserPlus size={20} className="md:w-6 md:h-6 text-indigo-650"/> 
                  {editingStudentId ? 'Modify Student Info' : 'Enroll New Student'}
                </h3>
                <form onSubmit={handleCreateOrUpdateStudent} className="space-y-4 font-sans">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Display Name</label>
                    <input required placeholder="e.g. Rahul Sharma" value={studentForm.display_name} onChange={e => setStudentForm({...studentForm, display_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white placeholder-zinc-300 text-sm font-semibold" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Student User ID (Login Key)</label>
                    <input required placeholder="e.g. student101" value={studentForm.username} onChange={e => setStudentForm({...studentForm, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white placeholder-zinc-300 text-sm font-mono font-bold" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">
                      {editingStudentId ? 'Assign New Password (Optional)' : 'Password'}
                    </label>
                    <input type="password" required={!editingStudentId} placeholder="••••••••" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white placeholder-zinc-300 text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Roll No</label>
                      <input required placeholder="e.g. 12" value={studentForm.roll_no} onChange={e => setStudentForm({...studentForm, roll_no: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white placeholder-zinc-300 text-sm font-bold" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Registration No</label>
                      <input required placeholder="e.g. BMLT-2026-056" value={studentForm.reg_no} onChange={e => setStudentForm({...studentForm, reg_no: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white placeholder-zinc-300 text-sm font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between ml-1 mb-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Academic Session</label>
                        <button 
                          type="button" 
                          onClick={() => {
                            setNewSessionName('');
                            setShowSessionsModal(true);
                          }}
                          className="text-[10px] font-black text-indigo-650 hover:underline hover:text-indigo-800 transition-colors uppercase flex items-center gap-1 font-sans"
                        >
                          <Settings size={10} /> Manage
                        </button>
                      </div>
                      <select 
                        required 
                        value={studentForm.session} 
                        onChange={e => setStudentForm({...studentForm, session: e.target.value})} 
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold outline-none"
                      >
                        {academicSessions.length > 0 ? (
                          academicSessions.map(sess => (
                            <option key={sess.id} value={sess.name}>{sess.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="2022-2025">2022-2025</option>
                            <option value="2023-2026">2023-2026</option>
                            <option value="2024-2027">2024-2027</option>
                            <option value="2025-2028">2025-2028</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Class Section</label>
                      <select 
                        required 
                        value={studentForm.section} 
                        onChange={e => setStudentForm({...studentForm, section: e.target.value})} 
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold outline-none"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Initial XP Points</label>
                    <input type="number" required placeholder="0" value={studentForm.points} onChange={e => setStudentForm({...studentForm, points: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm font-black" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-black text-white py-3.5 rounded-xl font-black hover:bg-zinc-800 transition-all shadow-md text-xs sm:text-sm">
                      {editingStudentId ? 'Update Account' : 'Register Account'}
                    </button>
                    {editingStudentId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingStudentId(null);
                          setStudentForm({ username: '', password: '', display_name: '', roll_no: '', reg_no: '', points: 0, session: '2023-2026', section: 'A' });
                        }}
                        className="bg-zinc-200 hover:bg-zinc-350 text-zinc-700 px-4 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Academic Sessions Manager Card */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm mt-6">
                <h3 className="text-sm font-black uppercase text-zinc-900 tracking-wider mb-4 flex items-center justify-between">
                  <span>Academic Sessions ({academicSessions.length})</span>
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                </h3>
                
                {/* Add Session Form */}
                <form onSubmit={handleCreateSession} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-2029"
                    value={newSessionName}
                    onChange={e => setNewSessionName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold outline-none focus:border-zinc-400 bg-zinc-50/50"
                  />
                  <button
                    type="submit"
                    className="bg-black hover:bg-zinc-850 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    Add
                  </button>
                </form>

                {/* List of current sessions */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {academicSessions.map(sess => (
                    <div key={sess.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-150 text-xs font-bold transition-all hover:bg-zinc-100/70">
                      {editingSessionId === sess.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            required
                            value={editingSessionName}
                            onChange={e => setEditingSessionName(e.target.value)}
                            className="flex-1 px-1.5 py-0.5 rounded border border-zinc-300 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateSession(sess.id)}
                            className="text-[10px] text-emerald-650 hover:text-emerald-700 font-extrabold shrink-0"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSessionId(null);
                              setEditingSessionName('');
                            }}
                            className="text-[10px] text-zinc-400 hover:text-zinc-650 shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-zinc-800 tracking-tight">{sess.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionId(sess.id);
                                setEditingSessionName(sess.name);
                              }}
                              className="text-zinc-400 hover:text-black transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(sess.id)}
                              className="text-zinc-400 hover:text-red-650 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {academicSessions.length === 0 && (
                    <p className="text-[10px] text-zinc-400 text-center py-2">No custom sessions registered.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Active Students Registry ({students.length})</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button" 
                    onClick={() => {
                      setNewSessionName('');
                      setShowSessionsModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-zinc-250 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-650 hover:text-black transition-all shadow-sm flex items-center gap-1.5 font-sans cursor-pointer hover:border-zinc-400"
                  >
                    <Settings size={13} className="text-zinc-500 animate-[spin_8s_linear_infinite]" />
                    Sessions
                  </button>

                  <select 
                    value={studentSessionFilter} 
                    onChange={e => setStudentSessionFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold bg-white outline-none shadow-sm"
                  >
                    <option value="All">All Sessions</option>
                    {academicSessions.length > 0 ? (
                      academicSessions.map(sess => (
                        <option key={sess.id} value={sess.name}>{sess.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="2022-2025">2022-2025</option>
                        <option value="2023-2026">2023-2026</option>
                        <option value="2024-2027">2024-2027</option>
                        <option value="2025-2028">2025-2028</option>
                      </>
                    )}
                  </select>

                  <select 
                    value={studentSectionFilter} 
                    onChange={e => setStudentSectionFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold bg-white outline-none shadow-sm"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(() => {
                  const filtered = students.filter(std => {
                    const stdSession = std.session || '2023-2026';
                    const stdSection = std.section || 'A';
                    const matchesSession = studentSessionFilter === 'All' || stdSession === studentSessionFilter;
                    const matchesSection = studentSectionFilter === 'All' || stdSection === studentSectionFilter;
                    return matchesSession && matchesSection;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white border border-dashed border-zinc-200 rounded-3xl py-12 text-zinc-400">
                        <GraduationCap className="mx-auto w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm font-bold">No students match current filters.</p>
                        <p className="text-xs">Select different options or enroll matching accounts.</p>
                      </div>
                    );
                  }

                  return filtered.map(std => {
                    const stdDisplayName = std.displayName || std.display_name || '';
                    const stdRollNo = std.rollNo || std.roll_no || '';
                    const stdRegNo = std.regNo || std.reg_no || '';
                    const stdSession = std.session || '2023-2026';
                    const stdSection = std.section || 'A';
                    
                    let finishedCount = 0;
                    try {
                      const listA = typeof std.correct_mcq_ids === 'string' ? JSON.parse(std.correct_mcq_ids) : (std.correctMcqIds || []);
                      finishedCount += (listA || []).length;
                    } catch(e){}
                    try {
                      const listB = typeof std.correct_bmlt_mcq_ids === 'string' ? JSON.parse(std.correct_bmlt_mcq_ids) : (std.correctBmltMcqIds || []);
                      finishedCount += (listB || []).length;
                    } catch(e){}

                    return (
                      <div key={std.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-zinc-250 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-650/40 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <img 
                            src={std.profilePic || std.profile_pic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'} 
                            alt={stdDisplayName} 
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-200 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-base text-zinc-950 truncate flex items-center gap-2">
                              {stdDisplayName}
                              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                                {std.points || 0} XP
                              </span>
                            </h4>
                            <p className="text-xs text-zinc-500 font-bold font-mono">@{std.username}</p>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[10px] text-zinc-400 font-bold">
                              <span>Roll: <strong className="text-zinc-700 font-bold">{stdRollNo}</strong></span>
                              <span>Reg: <strong className="text-zinc-700 font-bold">{stdRegNo}</strong></span>
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px]">Session: {stdSession}</span>
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[9px]">Sec: {stdSection}</span>
                              <span>Solved: <strong className="text-zinc-700 font-bold">{finishedCount} Tasks</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button 
                            onClick={() => {
                              setEditingStudentId(std.id);
                              setStudentForm({
                                username: std.username,
                                password: '', 
                                display_name: stdDisplayName,
                                roll_no: stdRollNo,
                                reg_no: stdRegNo,
                                points: std.points || 0,
                                session: stdSession,
                                section: stdSection
                              });
                            }} 
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(std.id)} 
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 text-left">
            <div className="lg:col-span-1">
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32">
                <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                  <Newspaper size={20} className="md:w-6 md:h-6 text-teal-600"/> {editingNewsItem ? 'Modify Bulletin' : 'Publish Bulletin'}
                </h3>
                <form onSubmit={handleAddNews} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Title / Headline</label>
                    <input 
                      required 
                      placeholder="e.g. Critical BMLT Exam Schedule Update" 
                      value={newNewsForm.title} 
                      onChange={e => setNewNewsForm({...newNewsForm, title: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Category</label>
                    <select 
                      value={newNewsForm.category} 
                      onChange={e => setNewNewsForm({...newNewsForm, category: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white font-bold"
                    >
                      <option value="General">General</option>
                      <option value="Academic">Academic</option>
                      <option value="Event">Event</option>
                      <option value="Notice">Notice</option>
                      <option value="Seminar">Seminar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Author Name</label>
                    <input 
                      required 
                      value={newNewsForm.author_name} 
                      onChange={e => setNewNewsForm({...newNewsForm, author_name: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Image URL (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://images.unsplash.com/photo-..." 
                      value={newNewsForm.image_url} 
                      onChange={e => setNewNewsForm({...newNewsForm, image_url: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Attachment File URL / PDF (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://drive.google.com/..." 
                      value={newNewsForm.file_path} 
                      onChange={e => setNewNewsForm({...newNewsForm, file_path: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Content Body</label>
                    <textarea 
                      required 
                      rows={5} 
                      placeholder="Write administrative report or announcement here..." 
                      value={newNewsForm.content} 
                      onChange={e => setNewNewsForm({...newNewsForm, content: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white resize-none" 
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingNewsItem && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingNewsItem(null);
                          setNewNewsForm({
                            title: '',
                            content: '',
                            author_name: 'Admin',
                            category: 'General',
                            image_url: '',
                            file_path: ''
                          });
                        }} 
                        className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 py-4 rounded-xl font-black transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="flex-[2] bg-teal-600 text-white py-4 rounded-xl font-black hover:bg-teal-700 transition-all shadow-md"
                    >
                      {editingNewsItem ? 'Save Updates' : 'Publish News'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6 text-zinc-900">Published Bulletins & Updates ({adminNews.length})</h2>
              <div className="grid grid-cols-1 gap-4">
                {adminNews.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-50 border border-zinc-150 rounded-[1.5rem] text-zinc-500 font-bold">
                    No news updates created yet. Use the publisher form to post!
                  </div>
                ) : (
                  adminNews.map(item => (
                    <div key={item.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-zinc-200 flex items-start gap-4 hover:border-black/10 transition-all shadow-sm">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-250 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Newspaper className="text-teal-500 w-6 h-6 md:w-8 md:h-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-teal-50 text-teal-850 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-teal-100">
                            {item.category || 'General'}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono font-bold">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-black text-base md:text-lg tracking-tight leading-snug text-zinc-950 line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-zinc-500 font-semibold line-clamp-2 mt-1">{item.content}</p>
                        <span className="block text-[10px] text-zinc-400 font-bold mt-2">By {item.author_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 self-center shrink-0">
                        <button 
                          onClick={() => {
                            setEditingNewsItem(item);
                            setNewNewsForm({
                              title: item.title,
                              content: item.content,
                              author_name: item.author_name,
                              category: item.category || 'General',
                              image_url: item.image_url || '',
                              file_path: item.file_path || ''
                            });
                          }}
                          className="p-2.5 text-zinc-400 hover:text-teal-650 hover:bg-teal-50 rounded-lg transition-all"
                          title="Edit News"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => confirmDelete('news' as any, item.id, item.title)} 
                          className="p-2.5 text-zinc-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete News"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mcqs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 text-left font-sans">
            {/* Left: Creator/Editor Form */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-100 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 sticky top-32 space-y-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-teal-650 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black tracking-tight text-zinc-900 leading-tight">
                      {editingMcq ? 'Edit Question' : 'Publish MCQ'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold">Add practice test questions to the library</p>
                  </div>
                </div>

                <form onSubmit={handleSaveMcq} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Syllabus Department</label>
                    <select
                      value={newMcqForm.subject_id}
                      onChange={e => {
                        const subId = e.target.value;
                        setNewMcqForm({ ...newMcqForm, subject_id: subId, topic_id: '' });
                        fetchMcqTopicsForSubject(subId);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold shadow-sm"
                    >
                      <option value="">-- Generic / None --</option>
                      {mcqSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Syllabus Topic (Optional)</label>
                    <select
                      value={newMcqForm.topic_id}
                      onChange={e => setNewMcqForm({ ...newMcqForm, topic_id: e.target.value })}
                      disabled={!newMcqForm.subject_id}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold shadow-sm disabled:opacity-50"
                    >
                      <option value="">-- Select Topic --</option>
                      {mcqTopics.map(top => (
                        <option key={top.id} value={top.id}>{top.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">MCQ Question Statement</label>
                    <textarea
                      required
                      placeholder="e.g. Which test is considered the gold-standard for diagnosing beta-thalassemia?"
                      value={newMcqForm.question}
                      onChange={e => setNewMcqForm({ ...newMcqForm, question: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm resize-none h-20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Option A (Required)</label>
                    <input
                      required
                      placeholder="Enter option detail..."
                      value={newMcqForm.option_a}
                      onChange={e => setNewMcqForm({ ...newMcqForm, option_a: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Option B (Required)</label>
                    <input
                      required
                      placeholder="Enter option detail..."
                      value={newMcqForm.option_b}
                      onChange={e => setNewMcqForm({ ...newMcqForm, option_b: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Option C (Optional)</label>
                    <input
                      placeholder="Leave empty to exclude..."
                      value={newMcqForm.option_c}
                      onChange={e => setNewMcqForm({ ...newMcqForm, option_c: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Option D (Optional)</label>
                    <input
                      placeholder="Leave empty to exclude..."
                      value={newMcqForm.option_d}
                      onChange={e => setNewMcqForm({ ...newMcqForm, option_d: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Option E (Optional)</label>
                    <input
                      placeholder="Leave empty to exclude..."
                      value={newMcqForm.option_e}
                      onChange={e => setNewMcqForm({ ...newMcqForm, option_e: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 block">Correct Option Marker</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['A', 'B', 'C', 'D', 'E'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setNewMcqForm({ ...newMcqForm, correct_option: opt })}
                          className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                            newMcqForm.correct_option === opt
                              ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-105'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingMcq && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMcq(null);
                          setNewMcqForm({
                            subject_id: '',
                            topic_id: '',
                            question: '',
                            option_a: '',
                            option_b: '',
                            option_c: '',
                            option_d: '',
                            option_e: '',
                            correct_option: 'A'
                          });
                        }}
                        className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-805 py-3 rounded-xl text-xs font-black uppercase transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-[2] py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
                    >
                      {editingMcq ? 'Save Changes' : 'Publish MCQ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: MCQ Banking Directory */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900">MCQ Database Bank</h2>
                  <p className="text-xs font-bold text-zinc-400 mt-0.5">Manage and audit all available academic questions ({adminMcqs.length})</p>
                </div>
              </div>

              {adminMcqs.length === 0 ? (
                <div className="text-center py-16 bg-zinc-50 border border-zinc-150 rounded-[2rem] text-zinc-500 font-bold">
                  No MCQ questions published yet. Enter details on the left form to build your question bank!
                </div>
              ) : (
                <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
                  {adminMcqs.map((mcq, idx) => {
                    const matchedSubject = mcqSubjects.find(s => s.id === mcq.subject_id);
                    return (
                      <div key={mcq.id} className="bg-white p-5 rounded-[1.5rem] border border-zinc-250/70 hover:border-zinc-400 transition-all shadow-sm space-y-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest">
                                MCQ ID #{mcq.id}
                              </span>
                              {matchedSubject && (
                                <span className="bg-teal-50 text-teal-850 border border-teal-100 rounded-lg px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest">
                                  {matchedSubject.name}
                                </span>
                              )}
                            </div>
                            <h4 className="text-zinc-950 font-black text-xs sm:text-sm leading-relaxed text-left">
                              Q: {mcq.question}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingMcq(mcq);
                                setNewMcqForm({
                                  subject_id: mcq.subject_id ? mcq.subject_id.toString() : '',
                                  topic_id: mcq.topic_id ? mcq.topic_id.toString() : '',
                                  question: mcq.question,
                                  option_a: mcq.option_a,
                                  option_b: mcq.option_b,
                                  option_c: mcq.option_c || '',
                                  option_d: mcq.option_d || '',
                                  option_e: mcq.option_e || '',
                                  correct_option: mcq.correct_option || 'A'
                                });
                                if (mcq.subject_id) {
                                  fetchMcqTopicsForSubject(mcq.subject_id.toString());
                                }
                              }}
                              className="p-2 text-zinc-450 hover:text-teal-650 hover:bg-teal-50 rounded-lg transition"
                              title="Edit MCQ"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMcq(mcq.id)}
                              className="p-2 text-zinc-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                              title="Delete MCQ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Options list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                          {[
                            { key: 'A', value: mcq.option_a },
                            { key: 'B', value: mcq.option_b },
                            { key: 'C', value: mcq.option_c },
                            { key: 'D', value: mcq.option_d },
                            { key: 'E', value: mcq.option_e }
                          ].filter(o => o.value).map(optObj => {
                            const isCorrect = mcq.correct_option === optObj.key;
                            return (
                              <div
                                key={optObj.key}
                                className={`px-4 py-2.5 rounded-xl border text-[11px] font-semibold text-left flex items-center justify-between ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-extrabold'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                                }`}
                              >
                                <span className="truncate">({optObj.key}) {optObj.value}</span>
                                {isCorrect && (
                                  <span className="bg-emerald-600 text-white rounded-full p-0.5 text-[8px] font-extrabold select-none">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'database' && dbSubTab === 'mlt_desk' && (
          <div className="space-y-8 text-left font-sans animate-fade-in">
            {/* Bento Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                onClick={() => { setMltSubTab('slides'); setShowMltForm(false); }}
                className={cn(
                  "p-5 rounded-[2rem] border transition-all cursor-pointer shadow-sm flex flex-col justify-between",
                  mltSubTab === 'slides' 
                    ? "bg-teal-950 border-teal-800 text-teal-100" 
                    : "bg-white border-zinc-200 text-zinc-900 hover:border-teal-500"
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono tracking-widest uppercase">Microscope Slides</span>
                  <Microscope size={18} className={mltSubTab === 'slides' ? "text-teal-400" : "text-zinc-500"} />
                </div>
                <div>
                  <div className="text-3xl font-black">{mltSlides.length}</div>
                  <div className="text-[10px] font-bold opacity-60">Verified Cell Layers</div>
                </div>
              </div>

              <div 
                onClick={() => { setMltSubTab('lab_params'); setShowMltForm(false); }}
                className={cn(
                  "p-5 rounded-[2rem] border transition-all cursor-pointer shadow-sm flex flex-col justify-between",
                  mltSubTab === 'lab_params' 
                    ? "bg-teal-950 border-teal-800 text-teal-100" 
                    : "bg-white border-zinc-200 text-zinc-900 hover:border-teal-500"
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono tracking-widest uppercase">Lab Parameters</span>
                  <Activity size={18} className={mltSubTab === 'lab_params' ? "text-teal-400" : "text-zinc-500"} />
                </div>
                <div>
                  <div className="text-3xl font-black">{mltLabParams.length}</div>
                  <div className="text-[10px] font-bold opacity-60">Clinical Normal Ranges</div>
                </div>
              </div>

              <div 
                onClick={() => { setMltSubTab('cases'); setShowMltForm(false); }}
                className={cn(
                  "p-5 rounded-[2rem] border transition-all cursor-pointer shadow-sm flex flex-col justify-between",
                  mltSubTab === 'cases' 
                    ? "bg-teal-950 border-teal-800 text-teal-100" 
                    : "bg-white border-zinc-200 text-zinc-900 hover:border-teal-500"
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono tracking-widest uppercase">Case Studies</span>
                  <FileText size={18} className={mltSubTab === 'cases' ? "text-teal-400" : "text-zinc-500"} />
                </div>
                <div>
                  <div className="text-3xl font-black">{mltCases.length}</div>
                  <div className="text-[10px] font-bold opacity-60">MCQ & Paragraph Tasks</div>
                </div>
              </div>

              <div 
                onClick={() => { setMltSubTab('mcqs'); setShowMltForm(false); }}
                className={cn(
                  "p-5 rounded-[2rem] border transition-all cursor-pointer shadow-sm flex flex-col justify-between",
                  mltSubTab === 'mcqs' 
                    ? "bg-teal-950 border-teal-800 text-teal-100" 
                    : "bg-white border-zinc-200 text-zinc-900 hover:border-teal-500"
                )}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono tracking-widest uppercase">Practice MCQs</span>
                  <HelpCircle size={18} className={mltSubTab === 'mcqs' ? "text-teal-400" : "text-zinc-500"} />
                </div>
                <div>
                  <div className="text-3xl font-black">{mltMcqs.length}</div>
                  <div className="text-[10px] font-bold opacity-60">BMLT Desk Practice Quiz</div>
                </div>
              </div>
            </div>

            {/* Sub-section Controls */}
            <div className="flex justify-between items-center bg-zinc-100 p-4 rounded-3xl border border-zinc-200">
              <div>
                <h3 className="text-lg font-black tracking-tight uppercase font-mono">
                  {mltSubTab === 'slides' && '🔬 Microscope Simulator Slides'}
                  {mltSubTab === 'lab_params' && '🧪 Clinical Reference Parameters'}
                  {mltSubTab === 'cases' && '📋 Laboratory Case Studies'}
                  {mltSubTab === 'mcqs' && '❓ Practice Multiple Choice Questions'}
                </h3>
                <p className="text-xs text-zinc-500 font-bold">
                  {mltSubTab === 'slides' && 'Configure custom slide imagery, target cells, sweetspot facts, and hotspots.'}
                  {mltSubTab === 'lab_params' && 'Manage Reference parameters including male/female thresholds and medical units.'}
                  {mltSubTab === 'cases' && 'Add and modify clinical patient records in paragraph or MCQ answering layout.'}
                  {mltSubTab === 'mcqs' && 'Configure custom multiple-choice questions for general diagnostic training.'}
                </p>
              </div>

              {!showMltForm && (
                <button
                  type="button"
                  onClick={() => {
                    // Reset forms on create click
                    setSlideForm({ id: null, name: '', description: '', targetCell: '', hint: '', imageUrl: '', fact: '', options: '', hotspots: '[]' });
                    setLabForm({ id: null, name: '', unit: '', normalMinMale: '', normalMaxMale: '', normalMinFemale: '', normalMaxFemale: '', category: '', description: '' });
                    setMltCaseForm({ id: null, type: 'mcq', title: '', scenario: '', question: '', options: '', correct: '', explanation: '', normalParams: '' });
                    setMltMcqForm({ id: null, question: '', options: '', correct: '', imageUrl: '', explanation: '' });
                    setShowMltForm(true);
                  }}
                  className="flex items-center gap-1 bg-black hover:bg-zinc-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-3 rounded-xl transition shadow active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Item</span>
                </button>
              )}
            </div>

            {/* Interactive Forms */}
            {showMltForm && (
              <div className="bg-zinc-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 shadow-sm animate-slide-up">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h4 className="text-lg font-black tracking-tight text-teal-800">
                    {slideForm.id || labForm.id || mltCaseForm.id || mltMcqForm.id ? '✏️ EDIT CURRENT RECOGNITION OBJECT' : '✨ CREATE NEW LABORATORY RESOURCE'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowMltForm(false)}
                    className="p-1 hover:bg-zinc-200 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* SLIDES FORM */}
                {mltSubTab === 'slides' && (
                  <form onSubmit={handleSaveSlide} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Slide Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Normal Blood Film, Malaria Ring Form"
                        value={slideForm.name}
                        onChange={(e) => setSlideForm({ ...slideForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Target Cell Name (Correct Answer) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Neutrophil, Plasmodium falciparum"
                        value={slideForm.targetCell}
                        onChange={(e) => setSlideForm({ ...slideForm, targetCell: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Answer Guess Options (Comma Separated) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Neutrophil, Lymphocyte, Monocyte, Eosinophil"
                        value={slideForm.options}
                        onChange={(e) => setSlideForm({ ...slideForm, options: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block font-black text-zinc-700 uppercase font-mono">Slide Specimen Image *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                        {/* Option 1: Device File Upload */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Option 1: Upload from local device</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleFileUpload(file, (url) => {
                                  setSlideForm((prev) => ({ ...prev, imageUrl: url }));
                                });
                              }
                            }}
                            className="bg-white text-xs w-full p-2 border border-zinc-200 rounded-xl"
                          />
                          <p className="text-[10px] text-zinc-400 italic">Select an image to automatically upload to Cloud Drive/Local Storage.</p>
                        </div>
                        {/* Option 2: Direct Image URL */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Option 2: Direct Image URL</span>
                          <input
                            type="text"
                            placeholder="https://example.com/slide-specimen.png"
                            value={slideForm.imageUrl}
                            onChange={(e) => setSlideForm({ ...slideForm, imageUrl: e.target.value })}
                            className="w-full text-xs px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                          />
                        </div>
                      </div>
                      
                      {slideForm.imageUrl && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2 text-emerald-800 rounded-xl mt-1">
                          <span className="font-bold text-[10px]">Active Image Path:</span>
                          <span className="font-mono font-bold text-[9px] truncate max-w-xs">{slideForm.imageUrl}</span>
                          <button
                            type="button"
                            onClick={() => setSlideForm((prev) => ({ ...prev, imageUrl: '' }))}
                            className="text-[10px] text-rose-600 hover:underline font-bold ml-auto shrink-0"
                          >
                            Clear Path
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Microscope Helper Hint</label>
                      <input
                        type="text"
                        placeholder="e.g. Look for segmented multilobed nuclei with fine pink-purple granules"
                        value={slideForm.hint}
                        onChange={(e) => setSlideForm({ ...slideForm, hint: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Clinical Fact Highlight</label>
                      <input
                        type="text"
                        placeholder="e.g. Neutrophils act as first responders and undergo rapid chemotaxis."
                        value={slideForm.fact}
                        onChange={(e) => setSlideForm({ ...slideForm, fact: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Structural Hotspots Coordinates (JSON List)</label>
                      <textarea
                        rows={2}
                        placeholder='e.g. [{"x": 48, "y": 51, "name": "Segmented Nucleus", "description": "Three connected segments"}]'
                        value={slideForm.hotspots}
                        onChange={(e) => setSlideForm({ ...slideForm, hotspots: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-550 block mt-1">Leaves empty `[]` if no custom hot structures require highlighting inside the magnification layer.</span>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Overall Specimen Description</label>
                      <textarea
                        rows={2}
                        placeholder="Description of laboratory staining technique, diagnosis, and background"
                        value={slideForm.description}
                        onChange={(e) => setSlideForm({ ...slideForm, description: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMltForm(false)}
                        className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 rounded-xl font-bold uppercase transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-3 bg-teal-800 hover:bg-teal-950 text-white rounded-xl font-black uppercase tracking-wider transition"
                      >
                        Save Microscope Slide
                      </button>
                    </div>
                  </form>
                )}

                {/* LAB PARAMS FORM */}
                {mltSubTab === 'lab_params' && (
                  <form onSubmit={handleSaveLabParam} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Parameter Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Platelet Count, Serum Creatinine"
                        value={labForm.name}
                        onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Measurement Unit *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. cells/mcL, g/dL, mg/dL"
                        value={labForm.unit}
                        onChange={(e) => setLabForm({ ...labForm, unit: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Normal Min (Male) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 13.5"
                        value={labForm.normalMinMale}
                        onChange={(e) => setLabForm({ ...labForm, normalMinMale: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Normal Max (Male) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 17.5"
                        value={labForm.normalMaxMale}
                        onChange={(e) => setLabForm({ ...labForm, normalMaxMale: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Normal Min (Female) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 12.0"
                        value={labForm.normalMinFemale}
                        onChange={(e) => setLabForm({ ...labForm, normalMinFemale: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Normal Max (Female) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 15.5"
                        value={labForm.normalMaxFemale}
                        onChange={(e) => setLabForm({ ...labForm, normalMaxFemale: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Laboratory Section/Category *</label>
                      <select
                        required
                        value={labForm.category}
                        onChange={(e) => setLabForm({ ...labForm, category: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-sans"
                      >
                        <option value="">Select Category</option>
                        <option value="Hematology">Hematology</option>
                        <option value="Biochemistry">Biochemistry</option>
                        <option value="Immunology">Immunology/Serology</option>
                        <option value="Microbiology">Microbiology</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Brief Description</label>
                      <input
                        type="text"
                        placeholder="Diagnostic role and common pathological variants"
                        value={labForm.description}
                        onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-sans"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMltForm(false)}
                        className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 rounded-xl font-bold uppercase transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-3 bg-teal-800 hover:bg-teal-950 text-white rounded-xl font-black uppercase tracking-wider transition"
                      >
                        Save Parameter Normal Range
                      </button>
                    </div>
                  </form>
                )}

                {/* CASES FORM */}
                {mltSubTab === 'cases' && (
                  <form onSubmit={handleSaveMltCase} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Case Study Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chronic Fatigue in 28-Year-Old Primigravida"
                        value={mltCaseForm.title}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Answering Mode Type *</label>
                      <select
                        required
                        value={mltCaseForm.type}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, type: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      >
                        <option value="mcq">Multiple Choice Answering (MCQ)</option>
                        <option value="paragraph">Paragraph/Written Response Mode</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Patient Clinical Scenario / History *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Describe the medical presentation, symptoms, symptoms onset, physical exams, etc."
                        value={mltCaseForm.scenario}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, scenario: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Laboratory Reports & Findings (Hb, WBCs, etc.)</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Hb: 8.5 g/dL (low), MCV: 70 fL (low), Serum Iron: 25 mcg/dL (low)"
                        value={mltCaseForm.normalParams}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, normalParams: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Diagnostic Quiz Question *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. What is the most definitive next investigative assay?"
                        value={mltCaseForm.question}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, question: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>

                    {mltCaseForm.type === 'mcq' && (
                      <div className="md:col-span-2">
                        <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Answering Options (Comma Separated) *</label>
                        <input
                          type="text"
                          placeholder="e.g. Serum Ferritin Assay, Bone Marrow Biopsy, Hemoglobin Electrophoresis"
                          value={mltCaseForm.options || ''}
                          onChange={(e) => setMltCaseForm({ ...mltCaseForm, options: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Correct Option / Target Diagnostic *</label>
                      <input
                        type="text"
                        required
                        placeholder={mltCaseForm.type === 'mcq' ? "e.g. Serum Ferritin Assay" : "e.g. Iron Deficiency Anemia"}
                        value={mltCaseForm.correct}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, correct: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Clinical Explanation & Resolution *</label>
                      <input
                        type="text"
                        required
                        placeholder="Clinical rationale for the answer and treatment options"
                        value={mltCaseForm.explanation}
                        onChange={(e) => setMltCaseForm({ ...mltCaseForm, explanation: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMltForm(false)}
                        className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 rounded-xl font-bold uppercase transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-3 bg-teal-800 hover:bg-teal-950 text-white rounded-xl font-black uppercase tracking-wider transition"
                      >
                        Save Case Study
                      </button>
                    </div>
                  </form>
                )}

                {/* MCQS FORM */}
                {mltSubTab === 'mcqs' && (
                  <form onSubmit={handleSaveMltMcq} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Practice Question Text *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Formulate a diagnostic question about clinical chemistry, hematology, or histopathology"
                        value={mltMcqForm.question}
                        onChange={(e) => setMltMcqForm({ ...mltMcqForm, question: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Question Multi-choice Options (Comma Separated) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Megaloblastic Anemia, Sideroblastic Anemia, Lead Poisoning"
                        value={mltMcqForm.options}
                        onChange={(e) => setMltMcqForm({ ...mltMcqForm, options: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Correct Choice Value *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sideroblastic Anemia"
                        value={mltMcqForm.correct}
                        onChange={(e) => setMltMcqForm({ ...mltMcqForm, correct: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Linked Illustration Image URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="Optional URL link to diagnostic visual diagram"
                        value={mltMcqForm.imageUrl}
                        onChange={(e) => setMltMcqForm({ ...mltMcqForm, imageUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-black text-zinc-700 mb-1.5 uppercase font-mono">Clinical Explanation & Key takeaways *</label>
                      <input
                        type="text"
                        required
                        placeholder="Explain the biochemical or hematological rationale for the correct answer"
                        value={mltMcqForm.explanation}
                        onChange={(e) => setMltMcqForm({ ...mltMcqForm, explanation: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMltForm(false)}
                        className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 rounded-xl font-bold uppercase transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-2 py-3 bg-teal-800 hover:bg-teal-950 text-white rounded-xl font-black uppercase tracking-wider transition"
                      >
                        Save BMLT MCQ
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Tables and Lists */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
              {mltLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-teal-600" size={32} />
                  <span className="font-mono text-xs font-black tracking-widest uppercase">Fetching MLT Desk Database...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Slides Tab Table */}
                  {mltSubTab === 'slides' && (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-mono tracking-widest uppercase text-[10px]">
                          <th className="py-3 px-4">Preview</th>
                          <th className="py-3 px-4">Slide Name</th>
                          <th className="py-3 px-4">Target Answer</th>
                          <th className="py-3 px-4">Choices</th>
                          <th className="py-3 px-4">Hotspots</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mltSlides.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-zinc-550 font-bold">
                              No microscope slides configured in SQLite database. Default static bank active as fallback.
                            </td>
                          </tr>
                        ) : (
                          mltSlides.map((slide, idx) => {
                            const optionCount = String(slide.options || '').split(',').filter(Boolean).length;
                            let hsCount = 0;
                            try {
                              hsCount = JSON.parse(slide.hotspots || '[]').length;
                            } catch (_) {}
                            return (
                              <tr key={slide.id || idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                                <td className="py-3 px-4">
                                  <img 
                                    src={slide.imageUrl} 
                                    alt={slide.name} 
                                    className="w-12 h-10 object-cover rounded-md border border-zinc-200 shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                </td>
                                <td className="py-3 px-4 font-black text-zinc-800">{slide.name}</td>
                                <td className="py-3 px-4"><span className="bg-teal-50 text-teal-800 px-2 py-1 rounded-full font-bold">{slide.targetCell}</span></td>
                                <td className="py-3 px-4 font-mono">{optionCount} items</td>
                                <td className="py-3 px-4 font-mono">{hsCount} spots</td>
                                <td className="py-3 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => {
                                      setSlideForm({
                                        id: slide.id,
                                        name: slide.name,
                                        description: slide.description || '',
                                        targetCell: slide.targetCell,
                                        hint: slide.hint || '',
                                        imageUrl: slide.imageUrl,
                                        fact: slide.fact || '',
                                        options: slide.options || '',
                                        hotspots: slide.hotspots || '[]'
                                      });
                                      setShowMltForm(true);
                                    }}
                                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlide(slide.id)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Lab Test Parameters Table */}
                  {mltSubTab === 'lab_params' && (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-mono tracking-widest uppercase text-[10px]">
                          <th className="py-3 px-4">Param Name</th>
                          <th className="py-3 px-4">Male Range</th>
                          <th className="py-3 px-4">Female Range</th>
                          <th className="py-3 px-4">Unit</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mltLabParams.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-zinc-550 font-bold">
                              No laboratory parameters configured in SQLite database. Default static bank active as fallback.
                            </td>
                          </tr>
                        ) : (
                          mltLabParams.map((param, idx) => (
                            <tr key={param.id || idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                              <td className="py-3 px-4 font-black text-zinc-850">{param.name}</td>
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">{param.normalMinMale} - {param.normalMaxMale}</td>
                              <td className="py-3 px-4 font-mono font-bold text-pink-600">{param.normalMinFemale} - {param.normalMaxFemale}</td>
                              <td className="py-3 px-4 font-mono text-zinc-500">{param.unit}</td>
                              <td className="py-3 px-4"><span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md text-[10px] text-zinc-700 font-bold">{param.category || 'Clinical'}</span></td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setLabForm({
                                      id: param.id,
                                      name: param.name,
                                      unit: param.unit,
                                      normalMinMale: String(param.normalMinMale),
                                      normalMaxMale: String(param.normalMaxMale),
                                      normalMinFemale: String(param.normalMinFemale),
                                      normalMaxFemale: String(param.normalMaxFemale),
                                      category: param.category || '',
                                      description: param.description || ''
                                    });
                                    setShowMltForm(true);
                                  }}
                                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteLabParam(param.id)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Case Studies Table */}
                  {mltSubTab === 'cases' && (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-mono tracking-widest uppercase text-[10px]">
                          <th className="py-3 px-4">Case Study Title</th>
                          <th className="py-3 px-4">Answering Format</th>
                          <th className="py-3 px-4">Verification Rationale</th>
                          <th className="py-3 px-4">Correct Target</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mltCases.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-zinc-550 font-bold">
                              No case study scenarios configured in database. General medical list loaded as fallback.
                            </td>
                          </tr>
                        ) : (
                          mltCases.map((cs, idx) => (
                            <tr key={cs.id || idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                              <td className="py-3 px-4 font-black text-zinc-850">{cs.title}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md font-mono text-[9px] uppercase font-bold",
                                  cs.type === 'mcq' ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                                )}>
                                  {cs.type === 'mcq' ? 'MCQ Choice' : 'Paragraph answer'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-zinc-500 truncate max-w-xs">{cs.question}</td>
                              <td className="py-3 px-4 font-bold text-teal-850">{cs.correct}</td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setMltCaseForm({
                                      id: cs.id,
                                      type: cs.type as any,
                                      title: cs.title,
                                      scenario: cs.scenario || '',
                                      question: cs.question || '',
                                      options: cs.options || '',
                                      correct: cs.correct || '',
                                      explanation: cs.explanation || '',
                                      normalParams: cs.normalParams || ''
                                    });
                                    setShowMltForm(true);
                                  }}
                                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMltCase(cs.id)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Practice MCQs Table */}
                  {mltSubTab === 'mcqs' && (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-mono tracking-widest uppercase text-[10px]">
                          <th className="py-3 px-4">Quiz Question</th>
                          <th className="py-3 px-4">Illustration Diagram</th>
                          <th className="py-3 px-4">Correct Diagnostic</th>
                          <th className="py-3 px-4">Options Count</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mltMcqs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-zinc-550 font-bold">
                              No practice MCQs configured in SQLite database. Default static bank active as fallback.
                            </td>
                          </tr>
                        ) : (
                          mltMcqs.map((q, idx) => {
                            const optList = String(q.options || '').split(',').filter(Boolean);
                            return (
                              <tr key={q.id || idx} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                                <td className="py-3 px-4 font-black text-zinc-850 truncate max-w-sm">{q.question}</td>
                                <td className="py-3 px-4 font-semibold text-zinc-500">
                                  {q.imageUrl ? (
                                    <span className="text-teal-600 font-mono font-bold text-[9px] uppercase">Diagram Linked</span>
                                  ) : (
                                    <span className="text-zinc-400">None</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-bold text-emerald-700">{q.correct}</td>
                                <td className="py-3 px-4 font-mono">{optList.length} Options</td>
                                <td className="py-3 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => {
                                      setMltMcqForm({
                                        id: q.id,
                                        question: q.question,
                                        options: q.options || '',
                                        correct: q.correct || '',
                                        imageUrl: q.imageUrl || '',
                                        explanation: q.explanation || ''
                                      });
                                      setShowMltForm(true);
                                    }}
                                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMltMcq(q.id)}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold font-mono text-[9px] uppercase transition cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 md:gap-4 mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-900 shrink-0">
                  <FileSpreadsheet size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight">Google Sheets Integration</h3>
                  <p className="text-zinc-500 text-[10px] md:text-sm font-bold">Sync participation data to a spreadsheet</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      googleStatus.connected ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-zinc-300"
                    )} />
                    <span className="font-bold text-zinc-700">
                      {googleStatus.connected ? 'Connected to Google' : 'Not Connected'}
                    </span>
                  </div>
                  {!googleStatus.connected ? (
                    <button
                      onClick={handleGoogleConnect}
                      className="px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all text-sm"
                    >
                      Connect Account
                    </button>
                  ) : (
                    <button
                      onClick={handleGoogleConnect}
                      className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-300 transition-all text-sm"
                    >
                      Reconnect
                    </button>
                  )}
                </div>

                {googleStatus.connected && (
                  <form onSubmit={updateSpreadsheetId} className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-zinc-700 mb-2 uppercase tracking-wider">Spreadsheet ID</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={googleStatus.spreadsheetId}
                          onChange={(e) => setGoogleStatus({ ...googleStatus, spreadsheetId: e.target.value })}
                          placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold placeholder:font-normal"
                        />
                        <button
                          type="submit"
                          className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
                        >
                          Save ID
                        </button>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs space-y-2">
                        <p className="font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                          <LinkIcon size={14} /> How to get your ID:
                        </p>
                        <p className="text-blue-700 leading-relaxed font-medium">
                          1. Open your Google Sheet.<br />
                          2. Copy the ID from the URL: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-bold">docs.google.com/spreadsheets/d/<span className="text-black">THIS_LONG_ID</span>/edit</code><br />
                          3. Make sure the account you connected below has <strong className="text-blue-900">Editor</strong> access to the sheet.
                        </p>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Custom Branding & Layout Settings Form */}
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-zinc-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 md:gap-4 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-950 shrink-0">
                  <Settings size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black tracking-tight">Public Display Customizable Settings</h3>
                  <p className="text-zinc-500 text-[10px] md:text-sm font-bold">Configure active ticker news bar & default home assets</p>
                </div>
              </div>

              <form onSubmit={handleSaveCustomSettings} className="space-y-6">
                {/* 0. Custom SVG / PNG App Logo Replacement */}
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-4">
                  <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600 animate-pulse" /> Custom App Logo Replacement
                  </h4>
                  <p className="text-zinc-500 text-[10px] sm:text-xs font-sans">
                    Configure a custom logo mark that will replace the default MEDex App logo across all client-facing screens. Supports crisp vector SVGs or high-resolution PNG/JPG raster file uploads.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Method 1: SVG Vector */}
                    <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-widest">Option A: SVG Vector Logo</span>
                      <div className="border border-dashed border-zinc-350 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-zinc-650 block mb-1">Select Custom .svg file</span>
                        <input 
                          type="file" 
                          accept=".svg,image/svg+xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const text = ev.target?.result;
                                if (typeof text === 'string') {
                                  setCustomAppLogoSvg(text);
                                  showNotification('SVG vector loaded successfully!', 'success');
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="text-[10px] text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-black file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Raw SVG code representation:</label>
                        <textarea
                          value={customAppLogoSvg.trim().startsWith('<svg') || customAppLogoSvg.trim().startsWith('<?xml') ? customAppLogoSvg : ''}
                          onChange={(e) => setCustomAppLogoSvg(e.target.value)}
                          placeholder="Paste raw <svg>...</svg> tag representation manually (or select SVG file)..."
                          className="w-full px-2.5 py-1.5 text-[10px] bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-1 focus:ring-black font-mono h-20 placeholder:font-sans placeholder:text-[10px]"
                        />
                      </div>
                    </div>

                    {/* Method 2: PNG/JPG Image */}
                    <div className="p-4 bg-white border border-zinc-200 rounded-xl flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-widest">Option B: PNG / JPG Logo Image</span>
                        <div className="border border-dashed border-zinc-250 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-zinc-650 block mb-1.5">Select high-res .png or .jpg image</span>
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleFileUpload(file, (url) => {
                                  setCustomAppLogoSvg(url);
                                  showNotification('Logo image uploaded & applied!', 'success');
                                });
                              }
                            }}
                            className="text-[10px] text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-black file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                        <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">Active Image URL:</span>
                        <input
                          type="text"
                          readOnly
                          value={!customAppLogoSvg.trim().startsWith('<svg') && !customAppLogoSvg.trim().startsWith('<?xml') ? customAppLogoSvg : ''}
                          placeholder="No image uploaded yet (Paste URL or upload image file)..."
                          className="w-full py-1 px-2 border border-zinc-150 rounded text-[9.5px] font-mono bg-white outline-none select-all truncate"
                        />
                      </div>
                    </div>
                  </div>

                  {customAppLogoSvg && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-100 rounded-xl border border-zinc-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-600 font-mono">Current Logo Preview:</span>
                        <div className="bg-zinc-800 p-2 rounded-lg inline-flex items-center justify-center">
                          <MedexLogo size="sm" showSubtitle={false} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAppLogoSvg('');
                          showNotification('Logo cleared. Default MEDex logo restored.', 'success');
                        }}
                        className="w-full sm:w-auto px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-black transition-all"
                      >
                        Reset to Default App Logo
                      </button>
                    </div>
                  )}
                </div>

                {/* 1. Breaking News Bar */}
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-4">
                  <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} className="text-[#ee2a7b]" /> Translucent Breaking News Bar
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-650">Enable Ticker below Header:</span>
                    <button
                      type="button"
                      onClick={() => setBreakingNewsEnabled(!breakingNewsEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${breakingNewsEnabled ? "bg-black" : "bg-zinc-200"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${breakingNewsEnabled ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-1">Ticker News Content (Repeated text loop):</label>
                    <textarea
                      value={breakingNewsText}
                      onChange={(e) => setBreakingNewsText(e.target.value)}
                      placeholder="e.g. 🔥 ADMISSIONS OPEN FOR BMLT BATCH OF '26-27! • EXCITING FRESH EVENTS COMING SOON! • NEW ARCHIVE PORTALS LIVE NOW •"
                      className="w-full px-4 py-2 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold h-18 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* 2. Custom Images (Default when no program is active) */}
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-4">
                  <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                    <Image size={16} className="text-indigo-600" /> Default Home Creative Assets (Idle Mode)
                  </h4>
                  <p className="text-zinc-500 text-[10px] font-sans">
                    These images will display as homepage banners, Polaroids, and showcase grids when no program is active. Provide raw image URLs.
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Hero Slider Background - Image 1</label>
                      <input
                        type="text"
                        value={homeImage1}
                        onChange={(e) => setHomeImage1(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Hero Slider Background - Image 2</label>
                      <input
                        type="text"
                        value={homeImage2}
                        onChange={(e) => setHomeImage2(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Hero Slider Background - Image 3</label>
                      <input
                        type="text"
                        value={homeImage3}
                        onChange={(e) => setHomeImage3(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>

                    <div className="border-t border-zinc-200/60 my-2" />

                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Polaroid Photo - Image 1</label>
                      <input
                        type="text"
                        value={polaroidImage1}
                        onChange={(e) => setPolaroidImage1(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Polaroid Photo - Image 2</label>
                      <input
                        type="text"
                        value={polaroidImage2}
                        onChange={(e) => setPolaroidImage2(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Polaroid Photo - Image 3</label>
                      <input
                        type="text"
                        value={polaroidImage3}
                        onChange={(e) => setPolaroidImage3(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>

                    <div className="border-t border-zinc-200/60 my-2" />

                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Legacy Bottom Showcase - Grid Image 1</label>
                      <input
                        type="text"
                        value={showcaseImage1}
                        onChange={(e) => setShowcaseImage1(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-zinc-600 uppercase mb-1">Legacy Bottom Showcase - Grid Image 2</label>
                      <input
                        type="text"
                        value={showcaseImage2}
                        onChange={(e) => setShowcaseImage2(e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-black font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingCustomSettings}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all font-mono"
                >
                  {isUpdatingCustomSettings ? "SAVING INTEGRATIVE VALUES..." : "SAVE BRANDING & NEWS SETTINGS"}
                </button>
              </form>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem]">
              <div className="flex gap-4">
                <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-amber-900 mb-1">Configuration Required</h4>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    To use Google Sheets, you must provide <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in your environment variables.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit Modal (Firestore/SQLite) */}
      {isEditing && (editIdea || editPerformance) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200"
          >
            <div className="px-6 md:px-8 py-4 md:py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-xl md:rounded-2xl flex items-center justify-center text-white">
                  <Edit size={16} className="md:hidden" />
                  <Edit size={20} className="hidden md:block" />
                </div>
                <h3 className="text-lg md:text-xl font-black tracking-tight">
                  Edit {editPerformance ? 'Performance Record' : 'Submission'}
                </h3>
              </div>
              <button 
                onClick={() => { setIsEditing(false); setEditIdea(null); setEditPerformance(null); }}
                className="p-2 hover:bg-zinc-200 rounded-xl transition-all"
              >
                <X size={20} className="md:hidden" />
                <X size={24} className="hidden md:block" />
              </button>
            </div>
            
            <form onSubmit={editPerformance ? handleUpdatePerformance : handleUpdateIdea} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editPerformance ? editPerformance.title : (editIdea?.title || '')}
                    onChange={(e) => editPerformance 
                      ? setEditPerformance({ ...editPerformance, title: e.target.value })
                      : editIdea && setEditIdea({ ...editIdea, title: e.target.value })
                    }
                    className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Group Type</label>
                  <select
                    value={editPerformance ? editPerformance.group_type : (editIdea?.group_type || 'Single')}
                    onChange={(e) => editPerformance
                      ? setEditPerformance({ ...editPerformance, group_type: e.target.value as any })
                      : editIdea && setEditIdea({ ...editIdea, group_type: e.target.value as any })
                    }
                    className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                  >
                    <option value="Single">Single</option>
                    <option value="Duo">Duo</option>
                    <option value="Group">Group</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Description</label>
                <textarea
                  required
                  value={editPerformance ? editPerformance.description : (editIdea?.description || '')}
                  onChange={(e) => editPerformance
                    ? setEditPerformance({ ...editPerformance, description: e.target.value })
                    : editIdea && setEditIdea({ ...editIdea, description: e.target.value })
                  }
                  className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold min-h-[100px]"
                />
              </div>

              {editIdea && !editPerformance ? (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 block">Participants</label>
                  {editIdea.participants?.map((p, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={p}
                        onChange={(e) => {
                          const newP = [...(editIdea.participants || [])];
                          newP[idx] = e.target.value;
                          setEditIdea({ ...editIdea, participants: newP });
                        }}
                        className="flex-1 px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                      />
                      {(editIdea.participants?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newP = editIdea.participants?.filter((_, i) => i !== idx);
                            setEditIdea({ ...editIdea, participants: newP });
                          }}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditIdea({ ...editIdea, participants: [...(editIdea.participants || []), ''] })}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-black transition-all px-1"
                  >
                    <Plus size={16} /> Add Participant
                  </button>
                </div>
              ) : editPerformance && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Performer(s)</label>
                  <input
                    type="text"
                    required
                    value={editPerformance.performer}
                    onChange={(e) => setEditPerformance({ ...editPerformance, performer: e.target.value })}
                    className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                    placeholder="Comma separated names"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Contact Info</label>
                  <input
                    type="text"
                    value={editPerformance ? (editPerformance.contact_info || '') : (editIdea?.contact_info || '')}
                    onChange={(e) => editPerformance
                      ? setEditPerformance({ ...editPerformance, contact_info: e.target.value })
                      : editIdea && setEditIdea({ ...editIdea, contact_info: e.target.value })
                    }
                    className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Media Link</label>
                  <input
                    type="url"
                    value={editPerformance ? (editPerformance.media_url || '') : (editIdea?.media_url || '')}
                    onChange={(e) => editPerformance
                      ? setEditPerformance({ ...editPerformance, media_url: e.target.value })
                      : editIdea && setEditIdea({ ...editIdea, media_url: e.target.value })
                    }
                    className="w-full px-5 py-3 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-black focus:bg-white transition-all outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditIdea(null); setEditPerformance(null); }}
                  className="flex-1 px-8 py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {previewMedia && (
          <MediaPreviewModal 
            url={previewMedia.url} 
            type={previewMedia.type} 
            title={previewMedia.title} 
            onClose={() => setPreviewMedia(null)} 
          />
        )}
      </AnimatePresence>

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative my-auto"
          >
            <button 
              onClick={() => setEditingProgram(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 text-blue-600 border-b border-zinc-100 pb-2">
              <Edit size={18} /> Edit Program
            </h3>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const { id, ...updateData } = editingProgram;
                await updateDoc(doc(db, 'programs', id), updateData);
                showNotification('Program updated successfully');
                setEditingProgram(null);
                loadFirestoreData();
              }} 
              className="space-y-3 max-h-[65vh] overflow-y-auto px-1 custom-scrollbar text-left"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Program Name</label>
                  <input required value={editingProgram.name} onChange={e => setEditingProgram({...editingProgram, name: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Subtitle</label>
                  <input value={editingProgram.subtitle || ''} onChange={e => setEditingProgram({...editingProgram, subtitle: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Hero GIF URL</label>
                  <input required value={editingProgram.gifUrl} onChange={e => setEditingProgram({...editingProgram, gifUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Invitation URL</label>
                  <input required value={editingProgram.invitationUrl} onChange={e => setEditingProgram({...editingProgram, invitationUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Invitation PDF URL</label>
                  <input value={editingProgram.invitationPdfUrl || ''} onChange={e => setEditingProgram({...editingProgram, invitationPdfUrl: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Date</label>
                  <input value={editingProgram.date || ''} onChange={e => setEditingProgram({...editingProgram, date: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Time</label>
                  <input value={editingProgram.time || ''} onChange={e => setEditingProgram({...editingProgram, time: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Location</label>
                  <input value={editingProgram.location || ''} onChange={e => setEditingProgram({...editingProgram, location: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-0.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Department</label>
                  <input value={editingProgram.department || ''} onChange={e => setEditingProgram({...editingProgram, department: e.target.value})} className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none" />
                </div>
                <div className="space-y-1 sm:col-span-2 bg-violet-50/50 p-2.5 rounded-xl border border-violet-100">
                  <label className="text-[8.5px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-1">
                    ⏰ Custom Countdown Limit
                  </label>
                  <input 
                    value={editingProgram.countdownDate || ''} 
                    onChange={e => setEditingProgram({...editingProgram, countdownDate: e.target.value})} 
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg focus:border-violet-500 focus:bg-white transition-all outline-none font-bold text-xs" 
                    placeholder="e.g. September 05, 2026 10:00:00" 
                  />
                  <p className="text-[8px] text-zinc-400 leading-normal mt-0.5">
                    If blank, countdown falls back automatically to display Date &amp; Time.
                  </p>
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-0.5">Description (Long Message)</label>
                <textarea value={editingProgram.description || ''} onChange={e => setEditingProgram({...editingProgram, description: e.target.value})} className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl focus:border-black focus:bg-white transition-all outline-none min-h-[60px] resize-none" />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setEditingProgram(null)}
                  className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-zinc-100 hover:bg-zinc-200 transition-all text-zinc-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Demanding Chilli Modal */}
      {editingDemanding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative my-8"
          >
            <button 
              onClick={() => setEditingDemanding(null)}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3 text-red-600">
              <Edit size={24} /> Edit Chilli Item
            </h3>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await authenticatedFetch(`/api/admin/demanding-items/${editingDemanding.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(editingDemanding)
                });
                if (res.ok) {
                  showNotification('Item updated successfully');
                  setEditingDemanding(null);
                  fetchData();
                } else {
                  showNotification('Failed to update item', 'error');
                }
              }} 
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Type</label>
                <select 
                  value={editingDemanding.type} 
                  onChange={e => setEditingDemanding({...editingDemanding, type: e.target.value as any})} 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white font-medium"
                >
                  <option value="song">Song / Audio</option>
                  <option value="videography">Videography Concept</option>
                  <option value="photography">Photography Concept</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Title</label>
                <input 
                  required 
                  value={editingDemanding.title} 
                  onChange={e => setEditingDemanding({...editingDemanding, title: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">External Link</label>
                <input 
                  required 
                  value={editingDemanding.link} 
                  onChange={e => setEditingDemanding({...editingDemanding, link: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Style / Tag</label>
                <input 
                  value={editingDemanding.category} 
                  onChange={e => setEditingDemanding({...editingDemanding, category: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Description (Optional)</label>
                <textarea 
                  value={editingDemanding.description} 
                  onChange={e => setEditingDemanding({...editingDemanding, description: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white h-24 resize-none" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingDemanding(null)}
                  className="flex-1 py-4 rounded-xl font-bold bg-zinc-100 hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 transition-all shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Academic Sessions Manager Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative my-8 border border-zinc-200"
          >
            <button 
              type="button"
              onClick={() => {
                setShowSessionsModal(false);
                setEditingSessionId(null);
                setEditingSessionName('');
              }}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 border border-zinc-100 bg-white"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2 flex items-center gap-3 text-zinc-950 font-sans">
              <GraduationCap size={24} className="text-indigo-650 animate-bounce" />
              Academic Sessions Manager
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mb-6">Create, modify, or delete active student registry batches.</p>
            
            {/* Add Session Form */}
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-3xl mb-6">
              <h4 className="text-xs font-black uppercase text-zinc-900 tracking-wider mb-2 px-1">Create New Batch</h4>
              <form onSubmit={handleCreateSession} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2029"
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-250 text-sm font-semibold outline-none focus:border-indigo-600 bg-white shadow-sm font-sans"
                />
                <button
                  type="submit"
                  className="bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shrink-0 flex items-center gap-1 shadow-md hover:shadow-lg hover:shadow-indigo-600/10"
                >
                  <Plus size={16} /> Add Session
                </button>
              </form>
            </div>

            {/* List of current sessions */}
            <h4 className="text-xs font-black uppercase text-zinc-900 tracking-wider mb-3 px-1">Registered Batches ({academicSessions.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {academicSessions.map(sess => (
                <div key={sess.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-zinc-200 text-sm font-bold transition-all hover:bg-zinc-50/50 hover:border-zinc-350">
                  {editingSessionId === sess.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        required
                        value={editingSessionName}
                        onChange={e => setEditingSessionName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-250 text-xs font-semibold focus:border-indigo-650 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateSession(sess.id)}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold hover:bg-emerald-700 transition-colors shrink-0 shadow-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSessionId(null);
                          setEditingSessionName('');
                        }}
                        className="bg-zinc-100 text-zinc-650 hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-colors shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-505" />
                        <span className="text-zinc-800 tracking-tight font-extrabold font-sans text-sm">{sess.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSessionId(sess.id);
                            setEditingSessionName(sess.name);
                          }}
                          className="p-1 px-2.5 text-xs font-bold text-zinc-500 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess.id)}
                          className="p-1 px-2.5 text-xs font-bold text-zinc-550 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {academicSessions.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6 border border-dashed border-zinc-200 rounded-2xl">No custom sessions registered. Enter a value above to seed standard batches.</p>
              )}
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-5 text-right">
              <button
                type="button"
                onClick={() => {
                  setShowSessionsModal(false);
                  setEditingSessionId(null);
                  setEditingSessionName('');
                }}
                className="w-full sm:w-auto px-6 py-2.5 font-black text-xs text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all"
              >
                Close Manager
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
