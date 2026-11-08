import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, BellOff, X, Megaphone, ArrowRight, ExternalLink, CheckCheck, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UserNotification {
  id: number;
  title: string;
  message: string;
  author_name?: string;
  category?: string;
  url?: string;
  news_id?: number;
  image_url?: string;
  created_at: string;
}

// Synthesize a pleasant two-tone audio chime using Web Audio API
function playChimeAudio() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone (E5 ~ 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second tone (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (_) {
    // Audio autoplay restrictions silently ignored
  }
}

// Convert VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationManager() {
  const navigate = useNavigate();
  const [activePush, setActivePush] = useState<UserNotification | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('medex_notif_sound') !== 'disabled';
  });

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Initialize Service Worker
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          swRegistrationRef.current = reg;
        })
        .catch((err) => {
          console.warn('Service Worker registration note:', err);
        });
    }
  }, []);

  // Request browser push notification permission
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        // Trigger welcome feedback
        if (swRegistrationRef.current && 'showNotification' in swRegistrationRef.current) {
          swRegistrationRef.current.showNotification('🔔 Push Notifications Enabled!', {
            body: 'You will receive instant alerts whenever new announcements or clinical news are posted.',
            icon: '/favicon.ico',
            tag: 'medex-welcome'
          });
        } else {
          new Notification('🔔 Push Notifications Enabled!', {
            body: 'You will receive instant alerts whenever new announcements or clinical news are posted.',
            icon: '/favicon.ico'
          });
        }

        // Try registering Push Subscription with backend if available
        if (swRegistrationRef.current && 'pushManager' in swRegistrationRef.current) {
          try {
            const sub = await swRegistrationRef.current.pushManager.getSubscription();
            if (sub) {
              const subJson = sub.toJSON();
              await fetch('/api/public/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  endpoint: sub.endpoint,
                  keys: subJson.keys,
                  userAgent: navigator.userAgent
                })
              });
            }
          } catch (_) {}
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }, []);

  // Dispatch a new incoming notification
  const handleIncomingNotification = useCallback((notif: UserNotification) => {
    // Check if user already saw this notification
    const lastSeen = parseInt(localStorage.getItem('medex_last_seen_notif') || '0', 10);
    if (notif.id && notif.id <= lastSeen) {
      return;
    }

    // Play chime sound
    if (soundEnabled) {
      playChimeAudio();
    }

    // Show in-app floating banner
    setActivePush(notif);
    setProgress(100);

    // If tab is backgrounded or hidden and permission is granted, display native OS notification
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      if (swRegistrationRef.current && 'showNotification' in swRegistrationRef.current) {
        swRegistrationRef.current.showNotification(notif.title, {
          body: notif.message,
          icon: notif.image_url || '/favicon.ico',
          tag: `medex-news-${notif.id || Date.now()}`,
          data: { url: notif.url || (notif.news_id ? `/news?id=${notif.news_id}` : '/news') }
        });
      } else {
        new Notification(notif.title, {
          body: notif.message,
          icon: notif.image_url || '/favicon.ico'
        });
      }
    }

    // Broadcast custom event so NotificationBell updates badge immediately
    window.dispatchEvent(new CustomEvent('medex-new-notification', { detail: notif }));
  }, [soundEnabled]);

  // Connect to Real-time SSE Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/public/notifications/stream');

        eventSource.onmessage = (event) => {
          if (!event.data || event.data.trim() === ': ping') return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'news_created' || data.type === 'notification') {
              handleIncomingNotification(data);
            }
          } catch (_) {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 8s
          setTimeout(connectSSE, 8000);
        };
      } catch (_) {
        // Fallback polling
      }
    };

    connectSSE();

    // Secondary fallback polling every 25 seconds
    pollInterval = setInterval(async () => {
      try {
        const lastSeen = parseInt(localStorage.getItem('medex_last_seen_notif') || '0', 10);
        const res = await fetch(`/api/public/notifications/latest?since=${lastSeen}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            // Find latest unseen notification
            const newest = list[0];
            if (newest.id > lastSeen) {
              handleIncomingNotification(newest);
            }
          }
        }
      } catch (_) {}
    }, 25000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [handleIncomingNotification]);

  // Floating Banner Auto-Dismiss Countdown
  useEffect(() => {
    if (!activePush) return;

    if (isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const durationMs = 8500;
    const intervalMs = 50;
    const step = (intervalMs / durationMs) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(progressTimerRef.current);
          setActivePush(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activePush, isPaused]);

  // Dismiss currently active push
  const dismissPush = () => {
    if (activePush?.id) {
      localStorage.setItem('medex_last_seen_notif', String(activePush.id));
    }
    setActivePush(null);
  };

  // Open notification target URL
  const handleOpenPush = () => {
    if (!activePush) return;
    const targetUrl = activePush.url || (activePush.news_id ? `/news?id=${activePush.news_id}` : '/news');
    if (activePush.id) {
      localStorage.setItem('medex_last_seen_notif', String(activePush.id));
    }
    setActivePush(null);
    navigate(targetUrl);
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('medex_notif_sound', next ? 'enabled' : 'disabled');
  };

  return (
    <>
      {/* 1. FLOATING REAL-TIME IN-APP PUSH NOTIFICATION CARD */}
      <AnimatePresence>
        {activePush && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] max-w-sm w-[calc(100vw-32px)] sm:w-96 rounded-2xl bg-zinc-950/95 text-white border border-teal-500/40 shadow-2xl backdrop-blur-xl overflow-hidden pointer-events-auto"
            style={{
              boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 25px rgba(20,184,166,0.25)'
            }}
          >
            {/* Top Glowing Gradient Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500" />

            <div className="p-4 sm:p-5 text-left relative space-y-3">
              {/* Header: Tag & Dismiss Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-black uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-500/40">
                  <Megaphone size={11} className="text-teal-400 animate-pulse" />
                  <span>{activePush.category || 'Official Bulletin'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleSound}
                    className="p-1 rounded-md text-zinc-400 hover:text-white transition cursor-pointer"
                    title={soundEnabled ? 'Mute notification chimes' : 'Enable notification chimes'}
                  >
                    {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>
                  <button
                    onClick={dismissPush}
                    className="p-1 rounded-md text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Title & Preview Body */}
              <div className="space-y-1">
                <h4 className="font-display font-black text-sm sm:text-base text-white tracking-tight leading-snug line-clamp-2">
                  {activePush.title}
                </h4>
                <p className="text-xs text-zinc-300 line-clamp-2 font-normal leading-relaxed">
                  {activePush.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleOpenPush}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-teal-400 to-cyan-300 hover:from-teal-300 hover:to-cyan-200 shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Read Announcement</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  onClick={dismissPush}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="h-1 bg-zinc-900 w-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// -------------------------------------------------------------
// 2. NAVBAR NOTIFICATION BELL & DROPDOWN COMPONENT
// -------------------------------------------------------------
export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Fetch latest notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/public/notifications/latest');
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          setNotifications(items);
          const lastSeen = parseInt(localStorage.getItem('medex_last_seen_notif') || '0', 10);
          const count = items.filter((item) => item.id > lastSeen).length;
          setUnreadCount(count);
        }
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleNew = (e: any) => {
      const notif = e.detail;
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener('medex-new-notification', handleNew);
    return () => {
      window.removeEventListener('medex-new-notification', handleNew);
    };
  }, [loadNotifications]);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Request browser push permissions
  const handleEnablePush = async () => {
    if (!('Notification' in window)) {
      alert('Desktop/Mobile Push Notifications are not supported on this browser.');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new Notification('🔔 Notifications Activated!', {
          body: 'You will now receive notifications whenever MEDex publishes new bulletins.',
          icon: '/favicon.ico'
        });
      }
    } catch (_) {}
  };

  const markAllRead = () => {
    if (notifications.length > 0) {
      const highestId = Math.max(...notifications.map((n) => n.id || 0));
      localStorage.setItem('medex_last_seen_notif', String(highestId));
    }
    setUnreadCount(0);
  };

  const handleItemClick = (notif: UserNotification) => {
    if (notif.id) {
      const lastSeen = parseInt(localStorage.getItem('medex_last_seen_notif') || '0', 10);
      if (notif.id > lastSeen) {
        localStorage.setItem('medex_last_seen_notif', String(notif.id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
    setIsOpen(false);
    const targetUrl = notif.url || (notif.news_id ? `/news?id=${notif.news_id}` : '/news');
    navigate(targetUrl);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && unreadCount > 0) {
            markAllRead();
          }
        }}
        className="relative p-2 rounded-full text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-all cursor-pointer focus:outline-none"
        title="Notifications & Announcements"
        aria-label="View announcements"
      >
        {unreadCount > 0 ? (
          <BellRing size={19} className="text-teal-600 animate-wiggle" />
        ) : (
          <Bell size={19} />
        )}

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9.5px] font-mono font-black text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-zinc-200 shadow-2xl z-50 overflow-hidden font-sans text-left"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <Megaphone size={14} />
                </div>
                <div>
                  <h4 className="font-display font-black text-xs sm:text-sm text-zinc-950 tracking-tight">
                    Bulletins & Alerts
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Real-time announcement center</p>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10.5px] font-bold text-teal-600 hover:text-teal-700 cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  <span>Mark read</span>
                </button>
              )}
            </div>

            {/* Permission Banner (if not granted) */}
            {permission !== 'granted' && (
              <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BellRing size={14} className="text-teal-600 shrink-0" />
                  <span className="text-[11px] font-bold text-teal-950 leading-tight">
                    Turn on push alerts on this device?
                  </span>
                </div>
                <button
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer shrink-0 shadow-xs"
                >
                  Allow
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
              {loading ? (
                <div className="py-8 text-center text-xs font-bold text-zinc-400">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <BellOff size={24} className="mx-auto text-zinc-300" />
                  <p className="text-xs font-bold text-zinc-400">No announcements posted yet.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="p-3.5 hover:bg-zinc-50 transition cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                        {item.category || 'Update'}
                      </span>
                      <span className="text-[9.5px] font-mono text-zinc-400">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <h5 className="text-xs font-black text-zinc-900 group-hover:text-teal-600 transition leading-snug line-clamp-1">
                      {item.title}
                    </h5>

                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-zinc-50 border-t border-zinc-150 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/news');
                }}
                className="text-[11px] font-extrabold text-zinc-700 hover:text-black transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full News Room</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
