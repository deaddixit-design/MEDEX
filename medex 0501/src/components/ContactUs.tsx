import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function ContactUs() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
      await addDoc(collection(db, 'messages'), {
        ...formState,
        created_at: serverTimestamp(),
        status: 'unread'
      });
      
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setFormState({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-32">
      <div className="text-center mb-8 md:mb-16 space-y-2 md:space-y-4">
        <div className="flex items-center justify-center gap-1.5 md:gap-2 text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-[0.2em]">
          <MessageSquare size={14} className="md:w-4 md:h-4" fill="currentColor" /> Get In Touch
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">
          Contact Us.
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base md:text-xl max-w-2xl mx-auto">
          Have questions about MEDex? We're here to help you build the future of medical laboratory sciences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <div className="p-5 sm:p-6 md:p-8 bg-zinc-50 rounded-2xl md:rounded-[2.5rem] border border-zinc-100 hover:border-black/10 transition-all">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm mb-4 md:mb-6">
              <Mail size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 md:mb-2">Email Us</h3>
            <p className="text-zinc-550 text-xs sm:text-sm mb-3 md:mb-4">Our team is ready to assist you via email.</p>
            <a href="mailto:sksafin361@gmail.com" className="text-sm sm:text-base md:text-lg font-black text-zinc-900 hover:text-emerald-600 transition-colors break-all">
              sksafin361@gmail.com
            </a>
          </div>

          <div className="p-5 sm:p-6 md:p-8 bg-zinc-50 rounded-2xl md:rounded-[2.5rem] border border-zinc-100 hover:border-black/10 transition-all">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-ig-pink shadow-sm mb-4 md:mb-6">
              <Phone size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 md:mb-2">Call Us</h3>
            <p className="text-zinc-550 text-xs sm:text-sm mb-3 md:mb-4">Available during college hours for urgent queries.</p>
            <span className="text-sm sm:text-base md:text-lg font-black text-zinc-900">+91 8900474778</span>
          </div>

          <div className="p-5 sm:p-6 md:p-8 bg-zinc-50 rounded-2xl md:rounded-[2.5rem] border border-zinc-100 hover:border-black/10 transition-all">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shadow-sm mb-4 md:mb-6">
              <MapPin size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 md:mb-2">Visit Us</h3>
            <p className="text-zinc-550 text-xs sm:text-sm mb-3 md:mb-4">Find us at the Student Activity Center.</p>
            <span className="text-sm sm:text-base md:text-lg font-black text-zinc-900">Main Campus, Block A</span>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-zinc-200 shadow-lg shadow-zinc-200/40">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-4 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold transition-all text-sm"
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  required
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-4 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Subject</label>
              <input
                required
                type="text"
                value={formState.subject}
                onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                placeholder="How can we help?"
                className="w-full px-4 sm:px-6 py-2.5 sm:py-4 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Message</label>
              <textarea
                required
                rows={4}
                value={formState.message}
                onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                placeholder="Tell us more about your inquiry..."
                className="w-full px-4 sm:px-6 py-2.5 sm:py-4 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold transition-all resize-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitted || isSending}
              className="w-full bg-black text-white py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-black text-sm sm:text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2.5 sm:gap-3 shadow-md shadow-black/5 disabled:bg-emerald-600"
            >
              {submitted ? (
                <>
                  <Sparkles size={18} className="sm:w-5 sm:h-5" /> Message Sent!
                </>
              ) : isSending ? (
                <>
                  <RefreshCw className="animate-spin sm:w-5 sm:h-5" size={18} /> Sending...
                </>
              ) : (
                <>
                  <Send size={18} className="sm:w-5 sm:h-5" /> Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
