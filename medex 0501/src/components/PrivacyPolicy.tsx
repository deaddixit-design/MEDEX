import React from 'react';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function PrivacyPolicy() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32"
    >
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-black mb-12 transition-colors font-medium">
        <ArrowLeft size={18} /> Back to Home
      </Link>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-[0.2em]">
            <Shield size={16} fill="currentColor" /> Legal & Privacy
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter">
            Privacy Policy.
          </h1>
          <p className="text-zinc-500 text-xl">
            Last updated: March 12, 2026
          </p>
        </header>

        <section className="prose prose-zinc max-w-none space-y-8 text-zinc-600 leading-relaxed">
          <div className="bg-zinc-50 p-8 rounded-[2.5rem] border border-zinc-100 space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
              <Eye className="text-indigo-500" /> 1. Overview
            </h2>
            <p>
              MEDex ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services, particularly in relation to our integration with Google APIs.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
              <FileText className="text-indigo-500" /> 2. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us when you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Submit a startup or event idea via our participation form.</li>
              <li>Upload media (photos/videos) to our gallery.</li>
              <li>Contact us for support or inquiries.</li>
            </ul>
            <p>
              This information may include your name, email address, college department, and the content of your submissions.
            </p>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 space-y-4">
            <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-3">
              <Lock className="text-indigo-600" /> 3. Use of Google API Data
            </h2>
            <p className="text-indigo-900/80 font-medium">
              Our application uses Google OAuth and Google Sheets API to store and manage event submissions.
            </p>
            <p className="text-indigo-900/70">
              MEDex's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google API Service User Data Policy</a>, including the Limited Use requirements.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-indigo-900/70">
              <li><strong>Access:</strong> We only request access to the specific Google Sheets you authorize for data storage.</li>
              <li><strong>Storage:</strong> Your submission data is stored in the designated Google Sheet to facilitate event planning and lineup management.</li>
              <li><strong>Sharing:</strong> We do not share your Google user data with third parties, except as required to provide the service or comply with the law.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">4. Data Retention</h2>
            <p>
              We retain your submission data for as long as necessary to fulfill the purposes outlined in this policy, such as managing the current year's event lineup and maintaining an archive of past highlights.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">5. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. If you wish to have your submission removed from our database or the linked Google Sheet, please contact the campus administrator.
            </p>
          </div>

          <div className="pt-12 border-t border-zinc-100">
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <span className="font-bold text-black">sksafin361@gmail.com</span>
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
