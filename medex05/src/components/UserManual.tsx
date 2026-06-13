import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  BookOpen, 
  Download, 
  FileText, 
  Award, 
  Microscope, 
  ShieldAlert, 
  ChevronRight, 
  UserCheck, 
  FolderLock, 
  Flame, 
  Compass, 
  Activity, 
  FileCheck2,
  BookmarkCheck
} from 'lucide-react';

export function UserManual() {
  const [activeTab, setActiveTab] = useState<'intro' | 'student' | 'library' | 'bmlt' | 'admin'>('intro');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDFManual = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Helper for clean positioning
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Utility state
      let yOffset = 0;

      // Color Palette Settings
      const primaryColor = [15, 23, 42]; // deep slate (slate-900)
      const secondaryColor = [79, 70, 229]; // Indigo (indigo-600)
      const accentColor = [13, 148, 136]; // Teal (teal-600)
      const textGray = [71, 85, 105]; // text secondary (slate-600)
      const bgLight = [248, 250, 252]; // fine offwear (slate-50)

      const drawHeader = (pageNum: number) => {
        if (pageNum === 1) return; // Skip on title page
        
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(margin, 10, contentWidth, 12, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('MEDEX PLATFORM PROPOSAL & USER MANUAL', margin + 3, 18);
        
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Academic & Laboratory Diagnostics Framework', pageWidth - margin - 3, 18, { align: 'right' });
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 23, pageWidth - margin, 23);
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Author & Proposer Contact: sksafin361@gmail.com | Dept. of MLT', margin, pageHeight - 10);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      };

      const addHeadline = (text: string, size = 18, spacingAfter = 6) => {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(text, margin, yOffset);
        yOffset += spacingAfter;
      };

      const addSubheading = (text: string, size = 12, spacingAfter = 5) => {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(text, margin, yOffset);
        yOffset += spacingAfter;
      };

      const addParagraph = (text: string, size = 9.5, spacingAfter = 4.5, italic = false) => {
        doc.setFont('Helvetica', italic ? 'oblique' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (yOffset > pageHeight - 25) {
            addNewPage();
          }
          doc.text(line, margin, yOffset);
          yOffset += size * 0.45; 
        });
        yOffset += spacingAfter - (size * 0.45);
      };

      const addBulletPoint = (boldTerm: string, text: string, size = 9.5) => {
        if (yOffset > pageHeight - 25) {
          addNewPage();
        }
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('• ' + boldTerm + ': ', margin + 3, yOffset);
        
        const boldOffset = doc.getTextWidth('• ' + boldTerm + ': ');
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        
        const lines = doc.splitTextToSize(text, contentWidth - boldOffset - 3);
        lines.forEach((line: string, i: number) => {
          if (yOffset > pageHeight - 25) {
            addNewPage();
          }
          const xPos = i === 0 ? (margin + 3 + boldOffset) : (margin + 8);
          doc.text(line, xPos, yOffset);
          yOffset += size * 0.45;
        });
        yOffset += 2;
      };

      const addCalloutBox = (title: string, linesText: string[], isWarning = false) => {
        const boxColor = isWarning ? [254, 242, 242] : [240, 253, 250]; // soft red / soft teal
        const borderColor = isWarning ? [252, 165, 165] : [153, 246, 228];
        const textColor = isWarning ? [153, 27, 27] : [15, 118, 110];

        // Reserve space
        const boxHeight = 10 + (linesText.length * 4.5);
        if (yOffset + boxHeight > pageHeight - 25) {
          addNewPage();
        }

        doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yOffset, contentWidth, boxHeight, 2, 2, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(title, margin + 4, yOffset + 5.5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        linesText.forEach((ln, idx) => {
          doc.text(ln, margin + 4, yOffset + 10.5 + (idx * 4.2));
        });

        yOffset += boxHeight + 6;
      };

      const addNewPage = () => {
        doc.addPage();
        yOffset = 30; // Leave space for headers
      };

      // ==========================================
      // PAGE 1: PROFESSIONAL COVER PAGE
      // ==========================================
      
      // Top Accents
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 45, 'F');

      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 45, pageWidth, 4, 'F');

      // Title & Branding
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text('MEDex', margin, 24);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(191, 196, 210);
      doc.text('Academic Labs & Diagnostics Hub', margin, 32);

      // Proposal Title Panel
      yOffset = 75;
      addHeadline('SYSTEM PROPOSAL & DESIGN SPECIFICATION', 17, 4);
      addSubheading('A High-Fidelity Hybrid Learning Framework for B.Sc MLT & Allied Health Programs', 10, 20);

      // Beautiful Horizontal Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, yOffset, pageWidth - margin, yOffset);
      yOffset += 10;

      // Overview / Abstract text
      addParagraph('PREPARED FOR: Academic Council, Department heads & Professional Pathologists.', 10, 6, true);
      addParagraph('The MEDex platform represents a custom, full-stack unified education framework designed specifically for medical laboratory technology (B.Sc MLT) students, academic authors, and course compilers. Seamlessly integrating virtual digital textbooks, lecture slide catalogs, diagnosis sandbox tools, and gamified point reward structures, the system bridges clinical laboratory protocols directly with modern software interfaces.', 10, 15);

      // System Metadata Table Base
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(margin, yOffset, contentWidth, 55, 3, 3, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Document Metadata & Authenticity', margin + 6, yOffset + 7);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('Subject Title:', margin + 6, yOffset + 16);
      doc.setFont('Helvetica', 'bold');
      doc.text('MEDex Academic Resource Engine', margin + 45, yOffset + 16);

      doc.setFont('Helvetica', 'normal');
      doc.text('Primary Contact / Proposer:', margin + 6, yOffset + 22);
      doc.setFont('Helvetica', 'bold');
      doc.text('sksafin361@gmail.com', margin + 45, yOffset + 22);

      doc.setFont('Helvetica', 'normal');
      doc.text('Primary Platform Target:', margin + 6, yOffset + 28);
      doc.setFont('Helvetica', 'bold');
      doc.text('React 19 / SQLite 3 Standard SQL Engine', margin + 45, yOffset + 28);

      doc.setFont('Helvetica', 'normal');
      doc.text('Current Release Revision:', margin + 6, yOffset + 34);
      doc.setFont('Helvetica', 'bold');
      doc.text('Release v2.4.2 [Production Active]', margin + 45, yOffset + 34);

      doc.setFont('Helvetica', 'normal');
      doc.text('Database Engine State:', margin + 6, yOffset + 40);
      doc.setFont('Helvetica', 'bold');
      doc.text('Active Client Sessions (Local Encrypted Credentials Backup)', margin + 45, yOffset + 40);

      doc.setFont('Helvetica', 'normal');
      doc.text('Platform Build Timestamp:', margin + 6, yOffset + 46);
      doc.setFont('Helvetica', 'bold');
      doc.text('June 12, 2026', margin + 45, yOffset + 46);

      // Dynamic session ID backup check
      yOffset += 65;

      // Draw first page footer
      drawFooter(1, 4);

      // ==========================================
      // PAGE 2: TABLE OF CONTENTS & ARCHITECTURE
      // ==========================================
      addNewPage();
      drawHeader(2);

      addHeadline('1. Executive Vision & Core Sub-Modules', 14, 5);
      addParagraph('The primary goal of MEDex is to make medical laboratory education and microscopic slide reviews highly immersive and structured. This is accomplished by dividing the application workflow into five critical sectors, allowing student pathways to cross directly into author publishing registries, culminating in deep, self-determined learning.', 9.5, 6);

      addSubheading('Platform Architecture Structure Overview', 11, 4);
      addBulletPoint('Student Registry Portal', 'Individual student accounts, secure numeric login system, customizable profilograph, total accumulated experience tracker, and progressive achievement level badges.');
      addBulletPoint('The Content Library', 'Categorized B.Sc MLT subject catalogs with collapsible chapters. Hosts micro-lectures, digital PDF notes with embedded custom slide navigators, and direct download links matching physical curricula.');
      addBulletPoint('Diagnostics BMLT Hub', 'Interactive modules including Virtual Microscope Slide Viewers with custom hematological cases, Clinical Pathology Bio-chemical reference indexes, and diagnostics Case Simulators.');
      addBulletPoint('Author & Editor Console', 'Specialized roles for department instructors and path-compiled authors, allowing custom uploads, news syndications, scheduling indicators, and lecture edits.');
      addBulletPoint('Live Event Synchronization', 'Interactive tools built explicitly for scheduling and hosting active department convocations, freshmen induction program calendars (e.g. UDAAN 2.0), and micro-bulletin boards.');

      yOffset += 4;
      addSubheading('Platform Inter-connectivity Architecture Map', 11, 4);
      addParagraph('All user sessions are linked through unified SQLite and session databases. This prevents un-authenticated edits while ensuring that student engagement, point scoring, and textbook uploads are real-time, lightweight, and highly isolated for student integrity.', 9.5, 6);

      // Add callout box
      addCalloutBox(
        'ARCHITECTURE HIGHLIGHT: DUAL SESSION FALLBACKS',
        [
          '- High-Performance SQLite storage matches complex SQL relational structures.',
          '- Local Storage backup synchronization serves as an instantaneous student token fallback.',
          '- Sessions are securely saved across iframe boundaries using modern SameSite configuration.',
          '- Admin tools are isolated backend routes validating author tokens seamlessly.'
        ]
      );

      drawFooter(2, 4);

      // ==========================================
      // PAGE 3: STUDENT REGISTRY & THE XP ENGINE
      // ==========================================
      addNewPage();
      drawHeader(3);

      addHeadline('2. Student Engagement Control & Gamification Loop', 14, 5);
      addParagraph('MEDex implements a robust, mathematical gamification loop to promote regular MCQ study and accurate laboratory deductions. Points are earned directly through the active learning panels and displayed visually inside the student dashboard portal.', 9.5, 6);

      addSubheading('The Exact XP Algorithmic Formula', 11, 4);
      addParagraph('To encourage accurate laboratory diagnosis and discourage careless guessing, the points adjustment system is calculated programmatically using the following rigorous logic rules:', 9.5, 5);

      addBulletPoint('Core MCQ Reward Key', 'Whenever a student selects a correct diagnostic MCQ response, they are immediately awarded +10 XP. This is instantly saved to their clinical student database profile to track long-term academic excellence.');
      addBulletPoint('Deduction & Careless Error Penalty', 'If a student submits an incorrect option during pathological diagnosis slides, a strict penalty of -2.5 XP is deducted. This trains students in high-fidelity laboratory caution, reflecting actual hospital environments.');
      addBulletPoint('Level-Up Formulation Metric', 'Student level rank indexes are computed dynamically on-the-fly inside the client dashboard. The absolute mathematical mapping is: Level = floor(AccXP / 100) + 1. The remainder XP modulo 100 calculates active level progress.');
      addBulletPoint('Underflow Security Shield', 'To maintain student motivation and safeguard profiles, the engine prevents total scores from ever dipping below 0 XP, even during consecutive academic diagnostic failures.');

      yOffset += 4;
      addSubheading('Milestone Academic Honor Badges', 11, 4);
      addParagraph('As students cross critical XP milestones, custom badge designations are unlocked automatically and displayed on the student portal. These act as virtual certificates of competency for academic evaluation:', 9.5, 5);

      addBulletPoint('Bronze Scholar', 'Initiated once the student crosses 50 XP. Indicates foundational onboarding and completing initial core clinical questions.');
      addBulletPoint('Silver Practitioner', 'Automated trigger at 150 XP. Signifies deep familiarization with laboratory biochemistry and microbiological parameters.');
      addBulletPoint('Gold Pathologist Senior', 'Awarded at 300 XP. Reflects advanced expertise in diagnostic identification and error-free virtual microscope case solving.');
      addBulletPoint('Platinum Champion Fellow', 'Unlocked at 500 XP. The absolute peak of accomplishment. Awarded for near-flawless academic slide and textbook diagnostics.');

      addCalloutBox(
        'IMPORTANT IMPLEMENTATION NOTE: REPEAT QUESTION GUARDS',
        [
          'The backend blocks double-rewards. Once a student successfully answers an MCQ correctly,',
          'its database key is saved to their correct_mcq_ids JSON column.',
          'Subsequent submissions are flagged as alreadyEarned, preserving grading equity.'
        ],
        false
      );

      drawFooter(3, 4);

      // ==========================================
      // PAGE 4: BMLT DIAGNOSTICS HUB & TEACHER CONTROLS
      // ==========================================
      addNewPage();
      drawHeader(4);

      addHeadline('3. Laboratory Desk Tools & Classroom Controls', 14, 5);
      addParagraph('The platform acts as a practical laboratory desk simulator, reducing the need for expensive physical slides and allowing students to practice high-risk hematological slide examination from anywhere.', 9.5, 6);

      addSubheading('A. Interactive Laboratory Desk (BMLT Hub)', 11, 4);
      addBulletPoint('Virtual Hematological Sliding Scope', 'High-definition digital slides depicting microscopic fields (e.g. Leishmania, sickle cell anemia, and malignant blood films) are zoomable, with interactive indicators explaining pathologies.');
      addBulletPoint('Differential Leukocyte Counter', 'A dedicated tactile keyboard emulator representing laboratory counters. Students count WBCs (Neutrophils, Lymphocytes, Monocytes) sequentially, compiling clinical ratios interactively.');
      addBulletPoint('The Biochemical Reference Engine', 'Provides complete, searchable laboratory diagnostics ranges (Hemoglobin, Serum Bilirubin, Blood Urea) with dynamic pathological explanations for adult clinical profiles.');

      yOffset += 4;
      addSubheading('B. Subject Syllabus desk (Content Library)', 11, 4);
      addParagraph('Organized in high-contrast chapters, this module allows students to download official curriculum PDFs and view digital copy notes on topics in Clinical Immunology, Blood Banking, and Systemic Bacteriology.', 9.5, 6);

      addSubheading('C. Author & Editor Operations (Admin Desk)', 11, 4);
      addBulletPoint('Roles Separation', 'Differentiates between Super-Admins (with full database deletion, student account management, and slide controls) and Academic Authors.');
      addBulletPoint('The Author Sandbox', 'Enables limited admin role profiles. Authors log in to draft news feeds, program curriculum materials, publish new chapters, and review student feedback without accessing security variables.');
      addBulletPoint('Active Syllabus Injection', 'Compilers use formatting forms to add books, upload lectures, control permissions parameters, change cover palettes, and restrict downloads dynamically based on institutional copyright policies.');

      addCalloutBox(
        'AUTHOR GUIDELINES FOR INSTITUTIONAL PROPOSALS',
        [
          '1. Direct access link configured under "Author Login" in public footers.',
          '2. Secure session variables protect custom textbook uploads.',
          '3. Faculty can review real-time class diagnostics and student scoreboard metrics.'
        ]
      );

      drawFooter(4, 4);

      // Save Document
      doc.save('MEDex_System_Proposal_Manual.pdf');
    } catch (err) {
      console.error('Error generating PDF User Manual:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="medex-user-manual-page" className="min-h-screen bg-zinc-50 pt-8 pb-16 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Proposal Summary Deck */}
        <div className="bg-gradient-to-r from-zinc-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-10 text-white relative overflow-hidden shadow-xl border border-zinc-900">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full border border-indigo-500/30">
                OFFICIAL SYSTEM PROPOSAL
              </span>
              <span className="text-zinc-400 text-xs font-mono font-bold">RELEASE v2.4.2</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                MEDex Platform <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-teal-400 to-emerald-300 font-display">
                  Project Proposal & User Manual
                </span>
              </h1>
              <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
                A high-fidelity hybrid learning framework and diagnostics simulator engineered explicitly for B.Sc Medical Laboratory Technology (MLT) departments, clinical pathologists, and academic compilers.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generatePDFManual}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-550/20 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Activity className="animate-spin" size={15} />
                    Compiling PDF...
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Download Official PDF Document
                  </>
                )}
              </button>
              <div className="text-[10px] text-zinc-400 font-medium font-mono border border-zinc-800 rounded-2xl px-4 py-3 flex items-center gap-1.5 bg-zinc-950/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Proposed writer: sksafin361@gmail.com
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Chapter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Chapter Selector Rail */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-zinc-150 shadow-sm space-y-1.5 sticky top-24">
            <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest pl-3 pb-2 border-b border-zinc-100">
              Interactive Manual Chapters
            </h3>
            
            <button
              onClick={() => setActiveTab('intro')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === 'intro' 
                  ? 'bg-zinc-950 text-white font-bold shadow-md' 
                  : 'text-zinc-600 hover:bg-zinc-50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={16} className={activeTab === 'intro' ? 'text-teal-400' : 'text-zinc-400'} />
                <span className="text-xs">1. Executive Overview</span>
              </div>
              <ChevronRight size={14} className="opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === 'student' 
                  ? 'bg-zinc-950 text-white font-bold shadow-md' 
                  : 'text-zinc-600 hover:bg-zinc-50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <Award size={16} className={activeTab === 'student' ? 'text-indigo-400' : 'text-zinc-400'} />
                <span className="text-xs">2. Student Portal & XP Engine</span>
              </div>
              <ChevronRight size={14} className="opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === 'library' 
                  ? 'bg-zinc-950 text-white font-bold shadow-md' 
                  : 'text-zinc-600 hover:bg-zinc-50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={16} className={activeTab === 'library' ? 'text-teal-400' : 'text-zinc-400'} />
                <span className="text-xs">3. Digital Syllabus Library</span>
              </div>
              <ChevronRight size={14} className="opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('bmlt')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === 'bmlt' 
                  ? 'bg-zinc-950 text-white font-bold shadow-md' 
                  : 'text-zinc-600 hover:bg-zinc-50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <Microscope size={16} className={activeTab === 'bmlt' ? 'text-emerald-400' : 'text-zinc-400'} />
                <span className="text-xs">4. Clinical BMLT Lab Desk</span>
              </div>
              <ChevronRight size={14} className="opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === 'admin' 
                  ? 'bg-zinc-950 text-white font-bold shadow-md' 
                  : 'text-zinc-600 hover:bg-zinc-50 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck size={16} className={activeTab === 'admin' ? 'text-pink-400' : 'text-zinc-400'} />
                <span className="text-xs">5. Author & Instructor Desk</span>
              </div>
              <ChevronRight size={14} className="opacity-60" />
            </button>
          </div>

          {/* Core Text Display Panel */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-zinc-150 shadow-sm min-h-[500px]">
            {activeTab === 'intro' && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-3 py-1 rounded-full border border-teal-100 uppercase tracking-wider select-none">
                    Chapter 1
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-3">Platform Proposers & Academic Intent</h2>
                </div>
                
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Medical Laboratory Technology is a deeply diagnostic, visual science. However, students often suffer from a lack of high-fidelity slide access and consolidated textbooks outside institutional hours. <strong>MEDex</strong> resolves this constraint as a unified digital ecosystem. 
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                    <Compass size={18} className="text-indigo-600" />
                    <h4 className="font-bold text-sm text-zinc-900">Virtual Lab Desk</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">Provides high-fidelity virtual microscopes and haematological differential counters directly on portable devices.</p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                    <Activity size={18} className="text-teal-600" />
                    <h4 className="font-bold text-sm text-zinc-900">Gamified Scoreboard</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">Drives accurate clinical deductions through state-retained point gains and progressive level ranking badges.</p>
                  </div>
                </div>

                <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-100/50 space-y-2">
                  <h4 className="font-extrabold text-teal-980 text-xs uppercase tracking-wider">Proposal Recommendation Desk</h4>
                  <p className="text-xs text-teal-800 leading-relaxed">
                    This document serves as an institutional blueprint to demonstrate to review committees, senior deans, and program heads how MEDex improves slide diagnostics engagement metrics and consolidates medical syllabi into a single academic source.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'student' && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider select-none">
                    Chapter 2
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-3">Student Portal & Gamified Point Engine</h2>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed">
                  Every student gains an isolated, secure credential login dashboard. Here they can view active study tasks, trace cumulative points history, level up, and customize display avatars safely.
                </p>

                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <Flame className="text-amber-600 animate-bounce" size={18} />
                    <h4 className="font-black text-xs uppercase tracking-wider text-amber-800">The Exact XP Grading Logic</h4>
                  </div>
                  
                  <ul className="space-y-3 text-xs text-amber-900 font-semibold leading-relaxed">
                    <li className="flex items-start gap-4">
                      <span className="bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">+10</span>
                      <div>
                        <strong>Correct Answer:</strong> Correctly identifying hematology or biochemistry MCQs instantly yields <strong>+10 XP</strong> to track excellence.
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">-2.5</span>
                      <div>
                        <strong>Incorrect Diagnostic Penalty:</strong> Submitting a flawed clinical determination deducts <strong>-2.5 XP</strong>, establishing pathological focus guidelines.
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="bg-zinc-800 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">LVL</span>
                      <div>
                        <strong>Mathematical Progress Level:</strong> Formulated dynamically as: <code>Level = Math.floor(XP / 100) + 1</code>. Remaining XP modulo 100 tracks progress to the next level rank.
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-zinc-900 mb-2">Milestone Competency Badges</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 border border-zinc-100 rounded-xl bg-zinc-50/50">
                      <strong className="text-amber-800">🥉 Bronze Scholar (50 XP)</strong>
                      <p className="text-[10px] text-zinc-500 mt-1">Completes foundational laboratory modules successfully.</p>
                    </div>
                    <div className="p-3 border border-zinc-100 rounded-xl bg-zinc-50/50">
                      <strong className="text-slate-600">🥈 Silver Practitioner (150 XP)</strong>
                      <p className="text-[10px] text-zinc-500 mt-1">Demonstrates stable pathology diagnostic accuracy.</p>
                    </div>
                    <div className="p-3 border border-zinc-100 rounded-xl bg-zinc-50/50">
                      <strong className="text-yellow-600">🥇 Gold Pathologist (300 XP)</strong>
                      <p className="text-[10px] text-zinc-500 mt-1">Solves complex micro-level diagnosis indices accurately.</p>
                    </div>
                    <div className="p-3 border border-zinc-100 rounded-xl bg-zinc-50/50">
                      <strong className="text-purple-700">💎 Platinum Fellow (500 XP)</strong>
                      <p className="text-[10px] text-zinc-500 mt-1">Undisputed diagnostics champion of the academic network.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-3 py-1 rounded-full border border-teal-100 uppercase tracking-wider select-none">
                    Chapter 3
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-3">Content Library & Lecture Database</h2>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed">
                  The Content Library centralizes academic files, micro-notes, and digital textbooks across primary medical laboratory sciences subjects.
                </p>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 font-bold text-sm">A</div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Structured Class Catalog</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">Notes are sorted into subjects like Clinical Biochemistry, Hematology, Blood Banking, and Histopathology to ease revision.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 font-bold text-sm">B</div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Custom Slide Previews</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">Authors can link files directly with diagnostic slide indexes, allowing students to cycle slide visuals next to physical lecture content.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 font-bold text-sm">C</div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Secure Intellectual Rights</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">Compilers retain granular control over which digital notes are allowed for direct local PDF downloads. Unpermitted documents are exclusively viewable inside the high-fidelity native web reader.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bmlt' && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-wider select-none">
                    Chapter 4
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-3">The Lab Desk & Microscope Simulators</h2>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed">
                  The BMLT Hub provides high-fidelity, hands-on clinical tools, allowing remote simulation of diagnostic exercises.
                </p>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-150 space-y-3">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck size={16} className="text-emerald-600" />
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-700">Digital Microscope Capabilities</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Select pathological slide files and load them inside the Virtual Microscope stage. Use tactile panning controls to focus, toggle high-power views, and read cell-indicator tooltips for deep microscopic analysis.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-150 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 size={16} className="text-indigo-600" />
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-700">Reference Index Analyzer</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Search pathological normal, elevated, and lowered biochem parameters across hematocrits, serum proteins, or lipid channels. Enter test indicators and receive diagnostic predictions.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-pink-50 text-pink-700 font-extrabold px-3 py-1 rounded-full border border-pink-100 uppercase tracking-wider select-none">
                    Chapter 5
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-3">Author Controls & Academic Event Synced Rails</h2>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed">
                  Instructors can register as <strong>Academic Authors</strong> inside the unified management suite to manage active learning programs seamlessly.
                </p>

                <div className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <FolderLock size={20} className="text-pink-600 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-900">Role-Based Protection System</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Differentiates between core system admins and contributing educators. Academic authors possess access scopes to draft micro-articles, upload notes, publish news announcements, and edit syllabus structures, while system configurations remain secured.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <UserCheck size={20} className="text-indigo-600 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-900">Event Calendars & Bulletins</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Inject active convocations, freshman induction programs, or technical seminars like <strong>UDAAN 2.0</strong> to display countdowns on the public board, handle secure student RSVPs, and collect yearbook memories.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-150 text-xs">
                  <div className="flex items-center gap-2 font-black uppercase mb-1">
                    <ShieldAlert size={14} className="text-red-700" />
                    Security Baseline Warning
                  </div>
                  System actions like removing student registries, resetting SQL password hashes, or changing database extensions are restricted to Super-Admins in the management console.
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
