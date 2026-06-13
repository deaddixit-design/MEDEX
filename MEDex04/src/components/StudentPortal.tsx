import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, Award, LogIn, LogOut, Loader2, Sparkles, Trophy, 
  BookOpen, Edit3, Save, ShieldAlert, BadgeCheck, Eye, EyeOff, CheckCircle, GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';

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

export function StudentPortal() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // File Upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      const res = await fetch('/api/student/me', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setStudent(data.student);
        setDisplayName(data.student.displayName);
        setProfilePic(data.student.profilePic || '');
      } else {
        setStudent(null);
      }
    } catch (e) {
      console.warn("Failed to fetch student session:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('medex_student_token', data.token);
        }
        setStudent(data.student);
        setDisplayName(data.student.displayName);
        setProfilePic(data.student.profilePic || '');
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(data.error || 'Invalid User ID or Password');
      }
    } catch (err) {
      setLoginError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/student/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      localStorage.removeItem('medex_student_token');
      setStudent(null);
      setIsEditing(false);
      setNewPassword('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess(false);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          profilePic,
          newPassword: newPassword.trim() !== '' ? newPassword : undefined
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudent(data.student);
        setNewPassword('');
        setUpdateSuccess(true);
        setIsEditing(false);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  // Profile Picture Upload Handler
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/public/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setProfilePic(data.url);
        // Save automatically back to the student's profile DB record so they don't lose it
        try {
          const autoSaveRes = await fetch('/api/student/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              displayName: displayName || (student ? student.displayName : ''),
              profilePic: data.url
            }),
            credentials: 'include'
          });
          const autoSaveData = await autoSaveRes.json();
          if (autoSaveRes.ok && autoSaveData.success) {
            setStudent(autoSaveData.student);
          }
        } catch (autoSaveErr) {
          console.error('[StudentPortal] Auto-saving profile picture failed:', autoSaveErr);
        }
      } else {
        alert('Upload failed. Try another picture.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading profile image.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex items-center justify-center bg-zinc-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-black mx-auto" />
          <p className="text-sm text-zinc-500 font-bold">Configuring student desktop...</p>
        </div>
      </div>
    );
  }

  // Points & Badge Calculations
  const points = student?.points || 0;
  const level = Math.floor(points / 100) + 1;
  const progressPercent = points % 100;

  const badges = [
    { title: "Bronze Scholar", reqPts: 50, color: "from-amber-600 to-amber-800 text-amber-100", desc: "Awarded for completing training foundations" },
    { title: "Silver Expert", reqPts: 150, color: "from-zinc-400 to-zinc-600 text-zinc-100", desc: "Awarded for advanced diagnostics progress" },
    { title: "Gold Pathologist", reqPts: 300, color: "from-yellow-400 to-yellow-600 text-yellow-950", desc: "Recognized as expert diagnostics technician" },
    { title: "Academic Laureate", reqPts: 500, color: "from-violet-600 via-fuchsia-600 to-pink-600 text-white animate-pulse", desc: "Distinguished maximum elite student leaderboard status" }
  ];

  return (
    <div className="min-h-screen pt-24 sm:pt-32 pb-16 bg-[#fafafa] font-sans antialiased text-zinc-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {!student ? (
          /* LOGIN PANEL Layout with high prestige style */
          <div className="max-w-md mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-10 rounded-[2rem] border border-zinc-200 shadow-xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 bg-black text-white items-center justify-center rounded-2xl shadow-lg shadow-black/10">
                  <GraduationCap size={24} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">Student Hub</h2>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider font-mono">Academic Diagnostic Portal</p>
              </div>

              {loginError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 ml-1">Student User ID (Login KeyID)</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your Student Login ID"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white placeholder-zinc-400 text-sm font-semibold focus:outline-none focus:border-zinc-950 transition-colors"
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 ml-1">Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-zinc-200 bg-white placeholder-zinc-400 text-sm font-semibold focus:outline-none focus:border-zinc-950 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white hover:bg-zinc-800 py-4 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Authenticating Student...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Sign In to Student Portal
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-zinc-150 pt-4 text-center">
                <p className="text-[10px] sm:text-xs text-zinc-400 font-bold leading-relaxed">
                  🔒 Student enrollment IDs & Passwords are securely registered and managed via Campus Administrators. Contact your System Administrator to request your credentials.
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          /* STUDENT PANEL PORTAL */
          <div className="space-y-8">
            {/* Gradient Greeting Banner */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 text-white rounded-[2rem] p-6 sm:p-10 relative overflow-hidden shadow-xl border border-zinc-800"
            >
              <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-wider font-mono border border-indigo-500/20">
                    <Sparkles size={11} className="animate-spin text-indigo-400" /> Active Student Desktop
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-300">{student.displayName}</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 font-semibold">
                    Let's review clinical parameters, solve training cases, and check your academic badges list!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="bg-white/10 hover:bg-white/15 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-white/10 self-start md:self-center transition-all active:scale-95"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            </motion.div>

            {updateSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle size={16} />
                <span>Student profile updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Profile Details Sidebar */}
              <div className="md:col-span-5 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-200 shadow-md space-y-6 text-center relative">
                  
                  {/* Student Avatar Visualizer */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto group">
                    <img
                      src={profilePic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200'}
                      alt={student.displayName}
                      className="w-full h-full rounded-[2rem] object-cover border-4 border-zinc-100 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/60 rounded-[2rem] flex flex-col items-center justify-center text-white cursor-pointer transition-all hover:bg-black/75">
                        <User size={20} className={cn(uploading && "animate-spin")} />
                        <span className="text-[9px] font-black uppercase mt-1">Upload JPG</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePicUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-zinc-950 truncate">{student.displayName}</h3>
                    <p className="text-xs text-zinc-500 font-bold font-mono">@{student.username}</p>
                  </div>

                  {/* High Security Admin Locks */}
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Roll Number</span>
                      <span className="text-xs font-black font-mono text-zinc-750 bg-white px-2 py-0.5 rounded border border-zinc-150">
                        {student.rollNo}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Registration ID</span>
                      <span className="text-xs font-black font-mono text-zinc-750 bg-white px-2 py-0.5 rounded border border-zinc-150">
                        {student.regNo}
                      </span>
                    </div>

                    {student.session && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Academic Session</span>
                        <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {student.session}
                        </span>
                      </div>
                    )}

                    {student.section && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Class Section</span>
                        <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Section {student.section}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-200 flex items-center gap-1.5 text-[8.5px] font-bold text-amber-600 bg-amber-50/20 px-2 py-1 rounded">
                      <ShieldAlert size={11} className="text-amber-500 animate-pulse shrink-0" />
                      <span>Security credentials provided & managed by system administrators.</span>
                    </div>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border border-zinc-150"
                    >
                      <Edit3 size={14} /> Edit Student Profile
                    </button>
                  ) : (
                    <form onSubmit={handleProfileUpdate} className="space-y-4 text-left border-t border-zinc-150 pt-4">
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 ml-1">Edit Display Name</label>
                        <input
                          required
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-extrabold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 ml-1">Custom Avatar URL (Optional)</label>
                        <input
                          type="text"
                          placeholder="Or paste direct image http link"
                          value={profilePic}
                          onChange={e => setProfilePic(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-extrabold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 ml-1">New Password (Optional)</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep same"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={updating}
                          className="flex-1 bg-black text-white hover:bg-zinc-800 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save size={13} />}
                          Save Profiles
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setDisplayName(student.displayName);
                            setProfilePic(student.profilePic || '');
                            setNewPassword('');
                          }}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-650 px-4 py-2.5 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Progress & Badges Main Board */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Gamified Progress Card / Level stats */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-200 shadow-md space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={20} />
                        <span className="text-xs uppercase font-black tracking-wider text-zinc-550">Academic Achievements</span>
                      </div>
                      <h4 className="text-xl font-bold text-zinc-950">Level {level} Diagnostic Student</h4>
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 px-4 py-2.5 rounded-2xl border border-yellow-100 text-center font-bold">
                      <span className="block text-[8px] font-black uppercase tracking-widest leading-none text-yellow-600">Total Score</span>
                      <span className="text-xl font-black">{points}</span>
                      <span className="text-[10px] block font-extrabold leading-none">XP Points</span>
                    </div>
                  </div>

                  {/* REAL PROGRESS BAR */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-500 font-bold font-mono">
                      <span>Level {level}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-black border border-indigo-100">
                        {points % 100} / 100 XP to Level {level + 1}
                      </span>
                    </div>
                    
                    <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden border border-zinc-150 p-0.5">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 via-indigo-500 to-fuchsia-500 shadow-inner"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Completed summary details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center">
                      <span className="block text-[8px] font-black uppercase tracking-wider text-zinc-400">Library MCQs Slates Solved</span>
                      <span className="text-lg font-black font-mono text-zinc-800">
                        {(student.correctMcqIds || []).length}
                      </span>
                    </div>

                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center">
                      <span className="block text-[8px] font-black uppercase tracking-wider text-zinc-400">BMLT Desk Practice Solved</span>
                      <span className="text-lg font-black font-mono text-zinc-800">
                        {(student.correctBmltMcqIds || []).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges Grid Collection */}
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-200 shadow-md space-y-4">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight border-b border-zinc-100 pb-3 flex items-center gap-2">
                    <Award size={20} className="text-[#ee2a7b]" /> Earned Academic Badges
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {badges.map((badge, idx) => {
                      const isUnlocked = points >= badge.reqPts;
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                            isUnlocked 
                              ? "bg-gradient-to-br from-white to-zinc-50/10 border-zinc-200 hover:shadow-md hover:border-zinc-300"
                              : "bg-zinc-50/50 border-zinc-200/50 opacity-40 select-none"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm border",
                              isUnlocked 
                                ? "bg-gradient-to-br " + badge.color
                                : "bg-zinc-200 text-zinc-400 border-zinc-300"
                            )}>
                              {isUnlocked ? <BadgeCheck size={18} /> : "🔒"}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h4 className="font-extrabold text-sm text-zinc-900 truncate flex items-center gap-1">
                                {badge.title}
                              </h4>
                              <p className="text-[10px] text-zinc-550 leading-tight font-medium">
                                {badge.desc}
                              </p>
                              <div className="pt-1.5 flex items-center justify-between text-[9px] font-bold font-mono">
                                <span className={isUnlocked ? "text-emerald-600" : "text-zinc-400"}>
                                  {isUnlocked ? "Unlocked" : "Locked"}
                                </span>
                                <span className="text-zinc-400">{badge.reqPts} XP Required</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Call to action panel */}
                <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 p-6 rounded-[2rem] text-center space-y-3 shadow-inner">
                  <h4 className="font-extrabold text-base text-zinc-900 tracking-tight">Ready to score more points & badges?</h4>
                  <p className="text-xs text-zinc-650 max-w-md mx-auto leading-relaxed">
                    Head over to the active learning panels to practice high-fidelity diagnostics exercises. Every correct choice earns you <strong>+10 XP</strong> instantly on this bulletin board.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <a
                      href="/library"
                      className="bg-white/80 border border-zinc-200 hover:bg-white text-zinc-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <BookOpen size={13} /> Content Library
                    </a>
                    <a
                      href="/bmlt"
                      className="bg-black text-white hover:bg-zinc-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <Sparkles size={13} /> MLT Desk Hub
                    </a>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
