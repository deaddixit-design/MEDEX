import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  BookOpen, 
  Activity, 
  HelpCircle, 
  GraduationCap, 
  ArrowRight, 
  Award, 
  FileText, 
  Layers, 
  Play, 
  RotateCcw,
  Compass,
  Database,
  CheckCircle2,
  HeartPulse,
  Flame,
  Search,
  Check,
  Plus,
  Trash2,
  Edit,
  Sliders,
  Sun,
  Image as ImageIcon,
  CheckSquare,
  AlertTriangle,
  FileCode,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

// Hardcoded Blood Specimen configuration for Microscope Simulation Challenge
const MICROSCOPE_SLIDES = [
  {
    id: 'neutrophil',
    name: 'Normal Blood Smear - Polymorphonuclear Neutrophil',
    description: 'Notice the multi-lobed nucleus (usually 3 to 5 lobes joined by thin strands) and fine, lilac-pink granules in the cytoplasm.',
    targetCell: 'Neutrophil',
    hint: 'Multi-lobed nucleus with neutral cytoplasm granules, crucial for immune defense.',
    imageUrl: 'https://images.unsplash.com/photo-1579161748255-33b3fc535f26?auto=format&fit=crop&q=80&w=600',
    fact: 'Neutrophils are the most abundant type of granulocytes, making up 40% to 70% of all white blood cells in humans.',
    options: ['Neutrophil', 'Eosinophil', 'Lymphocyte', 'Monocyte']
  },
  {
    id: 'malaria',
    name: 'Peripheral Blood Smear - Plasmodium falciparum (Ring Form)',
    description: 'Look carefully inside the red blood cells. You will see delicate blue cytoplasmic rings with bright red chromatin dots resembling a signet-ring.',
    targetCell: 'Plasmodium falciparum',
    hint: 'A signet-ring shape inside erythrocyte cytoplasm. Causes malaria.',
    imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=600',
    fact: 'Plasmodium falciparum represents the most dangerous species of malaria parasite, causing cerebral symptoms.',
    options: ['Plasmodium falciparum', 'Trypanosoma', 'Leishmania donovani', 'Babesia']
  },
  {
    id: 'sickle',
    name: 'Erythrocyte Pathology - Sickle Cell Anemia (Drepanocytes)',
    description: 'Look for elongated, crescent-shaped or sickle-like erythrocytes with pointed ends caused by mutated Hemoglobin S polymer chains under hypoxia.',
    targetCell: 'Sickle Cell',
    hint: 'Crescent or banana-shaped erythrocytes causing vascular occlusion.',
    imageUrl: 'https://images.unsplash.com/photo-1614850523011-8f49fc9ec67a?auto=format&fit=crop&q=80&w=600',
    fact: 'A single amino acid substitution (valine for glutamic acid at position 6 of the beta-globin chain) is the root genetic cause.',
    options: ['Sickle Cell', 'Target Cell', 'Spherocyte', 'Schistocyte']
  }
];

// Interactive cell-identification hotspots located on the zoomed blood specimen
const SPECIMEN_HOTSPOTS: { [key: string]: Array<{ x: number, y: number, name: string, description: string }> } = {
  neutrophil: [
    { x: 50, y: 50, name: 'Normal Multi-lobed Nucleus', description: 'Classic polymorphonuclear clumped chromatin showing 3 distinct connected nuclear lobes.' },
    { x: 38, y: 64, name: 'Neutral Cytoplasmic Granules', description: 'Extremely fine, dusty pink-lilac neutrophilic lysosomal granules suspended in neutral cytoplasm.' },
    { x: 22, y: 35, name: 'Normal Biconcave Erythrocyte', description: 'Aperfect discocyte showing ideal 1/3 circular central pallor of normal hemoglobin saturation.' },
    { x: 74, y: 72, name: 'Extracellular Platelet (Thrombocyte)', description: 'Small, 2-3 micron non-nucleated cytoplasmic fragment showing purple granule cores.' }
  ],
  malaria: [
    { x: 42, y: 48, name: 'Plasmodium Ring Form (Trophozoite)', description: 'Early rings with high-contrast red chromatin bead and thin blue cytoplasmic ring loop.' },
    { x: 67, y: 34, name: 'Double Infection Ring Host', description: 'Erythrocyte containing multiple parasite rings, heavily suggestive of high-density P. falciparum loads.' },
    { x: 30, y: 72, name: 'Normal Uninfected Red Blood Cell', description: 'Standard healthy discocyte serving as morphologic size reference (approx 7 microns).' }
  ],
  sickle: [
    { x: 48, y: 58, name: 'Classic Drepanocyte (Sickle Erythrocyte)', description: 'Rigid, crescent-shaped cell with sharp pointed ends, formed by polymerized mutant HbS tactile chains.' },
    { x: 32, y: 28, name: 'Normal Discocyte RBC', description: 'Standard healthy biconcave erythrocyte unaffected by sickling triggers.' },
    { x: 68, y: 42, name: 'Target Cell (Codocyte)', description: 'Erythrocyte featuring a target board central ring due to increased membrane surface area relative to hemoglobin content.' }
  ]
};

// Pathology test references
const LAB_TESTS_CATALOG = [
  { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalMinMale: 13.5, normalMaxMale: 17.5, normalMinFemale: 12.0, normalMaxFemale: 15.5, category: 'Hematology', description: 'Oxygen-carrying protein in red blood cells.' },
  { name: 'Total WBC Count', unit: 'cells/cu.mm', normalMinMale: 4000, normalMaxMale: 11000, normalMinFemale: 4000, normalMaxFemale: 11000, category: 'Hematology', description: 'White blood cells count. Key indicator of systemic infection.' },
  { name: 'Platelet Count', unit: 'Lakhs/cu.mm (e.g. 1.5 - 4.5)', normalMinMale: 1.5, normalMaxMale: 4.5, normalMinFemale: 1.5, normalMaxFemale: 4.5, category: 'Hematology', description: 'Crucial element involved in cellular blood coagulation.' },
  { name: 'Serum Bilirubin (Total)', unit: 'mg/dL', normalMinMale: 0.2, normalMaxMale: 1.2, normalMinFemale: 0.2, normalMaxFemale: 1.2, category: 'Biochemistry', description: 'Heme degradation byproduct. Elevated levels indicate Jaundice or Hepatic dysfunction.' },
  { name: 'Fasting Blood Glucose', unit: 'mg/dL', normalMinMale: 70, normalMaxMale: 100, normalMinFemale: 70, normalMaxFemale: 100, category: 'Biochemistry', description: 'Blood sugar density. Primary benchmark for diabetes screening.' },
  { name: 'Serum Creatinine', unit: 'mg/dL', normalMinMale: 0.7, normalMaxMale: 1.3, normalMinFemale: 0.6, normalMaxFemale: 1.1, category: 'Biochemistry', description: 'Muscle creatinine breakdown waste filtered by kidneys. Serves as kidney health check.' }
];

export function BmltHub() {
  const isAdmin = typeof window !== 'undefined' && !!localStorage.getItem('admin_token');

  // Navigation tabs (Added 'practice-mcqs' tab)
  const [activeTab, setActiveTab] = useState<'microscope' | 'reference' | 'cases' | 'practice-mcqs'>('microscope');

  // Interactive Custom Score
  const [userScore, setUserScore] = useState<number>(0);

  // Microscope simulation states
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [magnification, setMagnification] = useState<10 | 40 | 100>(10);
  const [focusDial, setFocusDial] = useState<number>(35); // 0 to 100
  const [stageX, setStageX] = useState<number>(0); // -40 to +40 px pan translation
  const [stageY, setStageY] = useState<number>(0); // -40 to +40 px pan translation
  const [condenserDimmer, setCondenserDimmer] = useState<number>(100); // 40% to 140% brightness
  
  const [selectedGuess, setSelectedGuess] = useState<string>('');
  const [slideStatus, setSlideStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<{ name: string, description: string } | null>(null);

  // Quick laboratory reference checker states
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [searchTestQuery, setSearchTestQuery] = useState<string>('');
  const [testInputs, setTestInputs] = useState<{[key: string]: string}>({});
  const [testResultsFeedback, setTestResultsFeedback] = useState<{[key: string]: { status: 'Normal' | 'Low' | 'High', color: string, reason: string }}>({});

  // Backend SQLite-loaded states
  const [customMcqs, setCustomMcqs] = useState<any[]>([]);
  const [customCases, setCustomCases] = useState<any[]>([]);
  const [dbSlides, setDbSlides] = useState<any[]>([]);
  const [dbLabParams, setDbLabParams] = useState<any[]>([]);
  const [isLoadingBmlt, setIsLoadingBmlt] = useState<boolean>(true);

  // Form toggles
  const [showMcqForm, setShowMcqForm] = useState<boolean>(false);
  const [editingMcq, setEditingMcq] = useState<any | null>(null);
  const [showCaseForm, setShowCaseForm] = useState<boolean>(false);
  const [editingCase, setEditingCase] = useState<any | null>(null);

  const openNewMcqForm = () => {
    setEditingMcq(null);
    setMcqQuestion('');
    setMcqOptA('');
    setMcqOptB('');
    setMcqOptC('');
    setMcqOptD('');
    setMcqCorrect('A');
    setMcqImageUrl('');
    setMcqExplanation('');
    setShowMcqForm(true);
  };

  const openEditMcqForm = (mcq: any) => {
    setEditingMcq(mcq);
    setMcqQuestion(mcq.question || '');
    setMcqOptA(mcq.option_a || '');
    setMcqOptB(mcq.option_b || '');
    setMcqOptC(mcq.option_c || '');
    setMcqOptD(mcq.option_d || '');
    setMcqCorrect(mcq.correct_option || 'A');
    setMcqImageUrl(mcq.image_url || '');
    setMcqExplanation(mcq.explanation || '');
    setShowMcqForm(true);
  };

  const openEditCaseForm = (cs: any) => {
    setEditingCase(cs);
    setCaseTitle(cs.title || '');
    setCasePresentation(cs.presentation || '');
    setCaseType(cs.type || 'mcq');
    setCaseQuestion(cs.question || '');
    setCaseOptA(cs.option_a || '');
    setCaseOptB(cs.option_b || '');
    setCaseOptC(cs.option_c || '');
    setCaseOptD(cs.option_d || '');
    setCaseCorrectOption(cs.correct_option || 'A');
    setCaseGuidelines(cs.correct_guidelines || '');
    setShowCaseForm(true);
  };

  // MCQ Form States
  const [mcqQuestion, setMcqQuestion] = useState<string>('');
  const [mcqOptA, setMcqOptA] = useState<string>('');
  const [mcqOptB, setMcqOptB] = useState<string>('');
  const [mcqOptC, setMcqOptC] = useState<string>('');
  const [mcqOptD, setMcqOptD] = useState<string>('');
  const [mcqCorrect, setMcqCorrect] = useState<string>('A');
  const [mcqImageUrl, setMcqImageUrl] = useState<string>('');
  const [mcqExplanation, setMcqExplanation] = useState<string>('');

  // Case Form States
  const [caseTitle, setCaseTitle] = useState<string>('');
  const [casePresentation, setCasePresentation] = useState<string>('');
  const [caseType, setCaseType] = useState<'mcq' | 'paragraph'>('mcq');
  const [caseQuestion, setCaseQuestion] = useState<string>('');
  const [caseOptA, setCaseOptA] = useState<string>('');
  const [caseOptB, setCaseOptB] = useState<string>('');
  const [caseOptC, setCaseOptC] = useState<string>('');
  const [caseOptD, setCaseOptD] = useState<string>('');
  const [caseCorrectOption, setCaseCorrectOption] = useState<string>('A');
  const [caseGuidelines, setCaseGuidelines] = useState<string>('');

  // Practice MCQs UI State
  const [practiceMcqIndex, setPracticeMcqIndex] = useState<number>(0);
  const [selectedMcqAnswer, setSelectedMcqAnswer] = useState<string>('');
  const [mcqAnswerChecked, setMcqAnswerChecked] = useState<boolean>(false);
  const [mcqCurrentFeedback, setMcqCurrentFeedback] = useState<string>('');

  // Case study states
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [revealTests, setRevealTests] = useState<boolean>(false);
  const [selectedCaseAnswer, setSelectedCaseAnswer] = useState<string>('');
  const [caseQuizFeedback, setCaseQuizFeedback] = useState<string>('');

  // Paragraph-type Case assessment states
  const [paragraphAnswer, setParagraphAnswer] = useState<string>('');
  const [hasSubmittedParagraph, setHasSubmittedParagraph] = useState<boolean>(false);
  const [paragraphFeedback, setParagraphFeedback] = useState<string>('');

  // Fetch SQLite persistence
  const loadBmltDatabaseData = async () => {
    try {
      setIsLoadingBmlt(true);
      const resMcqs = await fetch('/api/bmlt/mcqs');
      const dataMcqs = await resMcqs.json();
      setCustomMcqs(dataMcqs);

      const resCases = await fetch('/api/bmlt/cases');
      const dataCases = await resCases.json();
      setCustomCases(dataCases);

      const resSlides = await fetch('/api/bmlt/slides');
      const dataSlides = await resSlides.json();
      const normalizedSlides = Array.isArray(dataSlides) ? dataSlides.map((s: any) => ({
        ...s,
        imageUrl: s.imageUrl || s.image_url || '',
        targetCell: s.targetCell || s.target_cell || ''
      })) : [];
      setDbSlides(normalizedSlides);

      const resParams = await fetch('/api/bmlt/lab-params');
      const dataParams = await resParams.json();
      setDbLabParams(dataParams);

      if (dataCases.length > 0 && selectedCaseId === null) {
        setSelectedCaseId(dataCases[0].id);
      }
    } catch (err) {
      console.error('Error fetching BMLT database objects:', err);
    } finally {
      setIsLoadingBmlt(false);
    }
  };

  useEffect(() => {
    loadBmltDatabaseData();
  }, []);

  const activeSlides = dbSlides.length > 0 ? dbSlides : MICROSCOPE_SLIDES;
  const slide = activeSlides[currentSlideIndex] || activeSlides[0];
  const deviation = Math.abs(focusDial - 50);

  const getSlideOptions = (s: any) => {
    if (!s) return [];
    if (s.options) {
      if (typeof s.options === 'string') {
        return s.options.split(',').map((o: string) => o.trim());
      }
      return s.options;
    }
    return [];
  };

  const getSlideHotspots = (s: any) => {
    if (!s) return [];
    if (s.hotspots) {
      try {
        if (typeof s.hotspots === 'string') {
          const trimmed = s.hotspots.trim();
          if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
            return [];
          }
          // Safely check if it starts with valid array JSON structure
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return JSON.parse(trimmed);
          }
          return [];
        }
        return s.hotspots;
      } catch (e) {
        // Quietly fail-safe to avoid console or UI crashes
        return [];
      }
    }
    return SPECIMEN_HOTSPOTS[s.id] || [];
  };

  const activeLabParams = dbLabParams.length > 0 ? dbLabParams : LAB_TESTS_CATALOG;

  // Microscope optics css parameters
  const getMicroscopeStyle = () => {
    const blurPx = Math.max(0, (deviation * 0.28) - 0.4);
    
    let scale = 1.0;
    if (magnification === 40) scale = 1.85;
    if (magnification === 100) scale = 2.9;

    return {
      filter: `blur(${blurPx}px) contrast(${100 + (condenserDimmer - 100) * 0.25}%) brightness(${condenserDimmer}%)`,
      transform: `scale(${scale}) translate(${stageX}px, ${stageY}px)`,
      transition: 'filter 0.15s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    };
  };

  const handleSlideGuess = () => {
    if (!selectedGuess) return;
    setHasChecked(true);
    if (selectedGuess === slide.targetCell) {
      setSlideStatus('correct');
      setUserScore(prev => prev + 10);
    } else {
      setSlideStatus('wrong');
    }
  };

  const nextSlide = () => {
    setHasChecked(false);
    setSlideStatus('idle');
    setSelectedGuess('');
    setFocusDial(25); 
    setStageX(0);
    setStageY(0);
    setSelectedHotspot(null);
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  // Lab checker verification engine
  const checkLabValue = (testName: string, valueStr: string) => {
    const value = parseFloat(valueStr);
    if (isNaN(value)) {
      setTestResultsFeedback(prev => {
        const next = { ...prev };
        delete next[testName];
        return next;
      });
      return;
    }

    const t = activeLabParams.find(item => item.name === testName);
    if (!t) return;

    let min = selectedGender === 'male' ? t.normalMinMale : t.normalMinFemale;
    let max = selectedGender === 'male' ? t.normalMaxMale : t.normalMaxFemale;

    let status: 'Normal' | 'Low' | 'High' = 'Normal';
    let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let reason = `Diagnostic Value is within perfect normal limits (${min} - ${max} ${t.unit}) for clinical standard parameters.`;

    if (value < min) {
      status = 'Low';
      color = 'text-amber-700 bg-amber-50 border-amber-200';
      reason = `Below normal limits of ${min} ${t.unit}. Could suggest erythrocytic anemia, decreased hematopoietic bone marrow activity, fluid dilution, or infection.`;
    } else if (value > max) {
      status = 'High';
      color = 'text-rose-700 bg-rose-50 border-rose-200';
      reason = `Elevated above ideal index of ${max} ${t.unit}. Primary triggers may suggest critical systemic pathology, dehydration hemoconcentration, active metabolic syndrome, or cell proliferation.`;
    }

    setTestResultsFeedback(prev => ({
      ...prev,
      [testName]: { status, color, reason }
    }));
  };

  // CRUD custom MCQ submission
  const handleSaveMcq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcqQuestion || !mcqOptA || !mcqOptB) {
      alert("Please populate the question and first two compulsory options.");
      return;
    }

    const payload = {
      id: editingMcq?.id,
      question: mcqQuestion,
      option_a: mcqOptA,
      option_b: mcqOptB,
      option_c: mcqOptC || null,
      option_d: mcqOptD || null,
      correct_option: mcqCorrect,
      image_url: mcqImageUrl || null,
      explanation: mcqExplanation || null
    };

    try {
      const url = editingMcq ? `/api/bmlt/mcqs/${editingMcq.id}` : '/api/bmlt/mcqs';
      const method = editingMcq ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadBmltDatabaseData();
        setShowMcqForm(false);
        setEditingMcq(null);
        // Reset states
        setMcqQuestion('');
        setMcqOptA('');
        setMcqOptB('');
        setMcqOptC('');
        setMcqOptD('');
        setMcqCorrect('A');
        setMcqImageUrl('');
        setMcqExplanation('');
      } else {
        alert("Failed to submit custom MCQ.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMcq = async (id: number) => {
    if (!window.confirm("Delete this custom practice MCQ from laboratory library?")) return;
    try {
      const res = await fetch(`/api/bmlt/mcqs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadBmltDatabaseData();
        setPracticeMcqIndex(0);
        setSelectedMcqAnswer('');
        setMcqAnswerChecked(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD custom Case Study submission
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle || !casePresentation || !caseQuestion) {
      alert("Missing mandatory case report details.");
      return;
    }

    const payload = {
      id: editingCase?.id,
      title: caseTitle,
      presentation: casePresentation,
      type: caseType,
      question: caseQuestion,
      option_a: caseType === 'mcq' ? caseOptA : null,
      option_b: caseType === 'mcq' ? caseOptB : null,
      option_c: caseType === 'mcq' ? caseOptC : null,
      option_d: caseType === 'mcq' ? caseOptD : null,
      correct_option: caseType === 'mcq' ? caseCorrectOption : null,
      correct_guidelines: caseType === 'paragraph' ? caseGuidelines : null
    };

    try {
      const url = editingCase ? `/api/bmlt/cases/${editingCase.id}` : '/api/bmlt/cases';
      const method = editingCase ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadBmltDatabaseData();
        setShowCaseForm(false);
        setEditingCase(null);
        // Reset states
        setCaseTitle('');
        setCasePresentation('');
        setCaseType('mcq');
        setCaseQuestion('');
        setCaseOptA('');
        setCaseOptB('');
        setCaseOptC('');
        setCaseOptD('');
        setCaseCorrectOption('A');
        setCaseGuidelines('');
      } else {
        alert("Failed to save patient case study.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCase = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this clinical case study?")) return;
    try {
      const res = await fetch(`/api/bmlt/cases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadBmltDatabaseData();
        setSelectedCaseId(null);
        setRevealTests(false);
        setSelectedCaseAnswer('');
        setCaseQuizFeedback('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action states for case answers
  const handleCaseAnswerAction = (cId: number, optionKey: string, correctKey: string, matchedAnswerText: string) => {
    setSelectedCaseAnswer(optionKey);
    const isCorrect = optionKey.toUpperCase() === correctKey.toUpperCase();
    if (isCorrect) {
      setCaseQuizFeedback(`Correct Assessment! "${matchedAnswerText}" is highly diagnostic based on the presented biochemical markers and patient criteria. (+15 score)`);
      if (!caseQuizFeedback.includes('Correct')) {
        setUserScore(prev => prev + 15);
      }
    } else {
      setCaseQuizFeedback(`Incorrect Clinical Interpretation. Review biochemical ranges or physiological clues again and explore other choices.`);
    }
  };

  const handlePracticeMcqGuess = (mcq: any, answerKey: string) => {
    if (mcqAnswerChecked) return;
    setSelectedMcqAnswer(answerKey);
  };

  const checkPracticeMcqAnswer = (mcq: any) => {
    if (!selectedMcqAnswer) return;
    setMcqAnswerChecked(true);
    const isCorrect = selectedMcqAnswer.toUpperCase() === mcq.correct_option.toUpperCase();
    if (isCorrect) {
      setMcqCurrentFeedback(`Correct! Excellent laboratory deduction. ${mcq.explanation || 'Matches standard pathological indicators perfectly.'}`);
      setUserScore(prev => prev + 10);
      // Award student points via API
      fetch('/api/student/earn-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToAdd: 10, mcqId: mcq.id, isBmlt: true }),
        credentials: 'include'
      }).catch(err => console.error("Error rewarding points:", err));
    } else {
      setMcqCurrentFeedback(`Incorrect. The correct answer was option ${mcq.correct_option}. ${mcq.explanation || 'Refine blood biochemistry parameters and try again.'}`);
      // Deduct student points via API
      fetch('/api/student/earn-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToAdd: -2.5, mcqId: mcq.id, isBmlt: true }),
        credentials: 'include'
      }).catch(err => console.error("Error deducting points:", err));
    }
  };

  const resetPracticeMcq = () => {
    setSelectedMcqAnswer('');
    setMcqAnswerChecked(false);
    setMcqCurrentFeedback('');
  };

  const activeCase = customCases.find(c => c.id === selectedCaseId);

  const filteredReferenceTests = activeLabParams.filter(test =>
    test.name.toLowerCase().includes(searchTestQuery.toLowerCase()) ||
    test.category.toLowerCase().includes(searchTestQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-10 sm:pb-20 font-sans">
      {/* Dynamic Interactive Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-indigo-950 text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-400/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-wider font-mono">
                <Activity size={12} className="animate-pulse" /> MLT Clinical Excellence Desk
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-display tracking-tight leading-tight">
                Academic & Diagnostic <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300">
                  Medical Lab Technology Portal
                </span>
              </h1>
              
              {/* Features Lists using Instagram + Ocean Blue animated bars */}
              <div className="space-y-2 max-w-xl text-[11px] sm:text-xs">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">Features of this section:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-350">
                  <div className="flex flex-col gap-0.5 p-2 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <span className="font-extrabold flex items-center gap-1">🔬 Auto-Achromatic Microscope</span>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-ig-ocean-gradient rounded-full w-[85%] animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <span className="font-extrabold flex items-center gap-1">🧪 Biochemistry Range Analyzer</span>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-ig-ocean-gradient rounded-full w-[92%] animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <span className="font-extrabold flex items-center gap-1">🩺 Interactive Patient Cases</span>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-ig-ocean-gradient rounded-full w-[78%] animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
                    <span className="font-extrabold flex items-center gap-1">📝 MCQ Exam Self-Assessments</span>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-ig-ocean-gradient rounded-full w-[88%] animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1 text-[10px]">
                <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <Award size={12} className="text-amber-400" />
                  <span className="font-bold text-zinc-300">Total Academic Score: {userScore} Points</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
                  <span className="font-bold text-zinc-300">SQLite Connected & Seeded</span>
                </div>
              </div>
            </div>

            {/* Alumni / Graduating batches */}
            <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-left relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-[8px] tracking-wider uppercase">
                  <GraduationCap size={13} /> Cohort Flag
                </div>
                <h4 className="font-display font-black text-xs text-white leading-tight">
                  Alumni Memory Lane
                </h4>
                <p className="text-zinc-400 text-[10px] leading-relaxed font-sans">
                  Passing out batch or MLT alumni? Reconnect with classmates.
                </p>
                <Link 
                  to="/batches" 
                  className="inline-flex w-full items-center justify-between bg-white text-black hover:bg-[#cc2366] hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm border-0"
                >
                  <span>Go to Alumni</span>
                  <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 md:mt-16">
        
        {/* Navigation Tabs (Added Practice MCQs option) */}
        <div className="flex overflow-x-auto md:flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 md:pb-5 mb-6 md:mb-8 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
          <button
            onClick={() => setActiveTab('microscope')}
            className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 snap-start ${
              activeTab === 'microscope'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <Compass size={14} /> Specimen Identifier
          </button>
          
          <button
            onClick={() => setActiveTab('reference')}
            className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 snap-start ${
              activeTab === 'reference'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <HeartPulse size={14} /> Lab Checker
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 snap-start ${
              activeTab === 'cases'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <FileText size={14} /> Case Studies ({customCases.length})
          </button>

          <button
            onClick={() => setActiveTab('practice-mcqs')}
            className={`flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-[11px] md:text-sm font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 snap-start ${
              activeTab === 'practice-mcqs'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            <CheckSquare size={14} /> Practice MCQs ({customMcqs.length})
          </button>
        </div>

        {/* Tab 1: Virtual Specimen Identifier Challenge */}
        {activeTab === 'microscope' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn text-xs">
            
            {/* Left Column: Specimen Image Viewer & Slide Deck */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="px-2 py-0.5 bg-sky-50 border border-sky-100/50 rounded-full text-sky-700 text-[9px] font-black uppercase tracking-wider font-mono">
                      Cell Recognition Specimen
                    </span>
                    <h3 className="font-display font-black text-sm sm:text-base text-zinc-900 mt-0.5">
                      {slide.name || 'Microscopic Slide Specimen'}
                    </h3>
                  </div>
                  <div className="px-2.5 py-0.5 bg-zinc-100 rounded-full font-mono text-[9px] font-bold text-zinc-550 shrink-0">
                    #{currentSlideIndex + 1} of {activeSlides.length}
                  </div>
                </div>

                {/* High quality Specimen Image Frame */}
                <div className="relative rounded-xl overflow-hidden border border-zinc-200/60 bg-zinc-950 h-[240px] sm:h-[300px] flex items-center justify-center shadow-inner group">
                  <div className="absolute inset-0 z-10 pointer-events-none rounded-xl border border-black/40 ring-1 ring-inset ring-white/10" />
                  
                  {/* Microscope Circular Field Mask */}
                  <div className="w-[190px] h-[190px] sm:w-[250px] sm:h-[250px] rounded-full overflow-hidden border-4 border-zinc-850 shadow-[0_0_40px_rgba(0,0,0,0.85)] bg-zinc-950 flex items-center justify-center relative">
                    <img 
                      src={slide.imageUrl} 
                      alt={slide.name || 'Laboratory Specimen'} 
                      style={getMicroscopeStyle()}
                      className="w-full h-full object-cover select-none" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Focus quality HUD gauge */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/85 text-[8px] font-mono text-zinc-300 px-2 py-0.5 rounded-full z-10 uppercase tracking-widest text-center whitespace-nowrap">
                      Focus: {Math.max(0, 100 - deviation * 2)}%
                    </div>
                  </div>

                  <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-zinc-300 pointer-events-none uppercase">
                    Interactive Lens
                  </div>
                </div>

                {/* Specimen Slide Deck / Mini Gallery Selector */}
                <div className="mt-3.5">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                    Specimen deck ({activeSlides.length} items):
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
                    {activeSlides.map((item, idx) => (
                      <button
                        key={item.id || idx}
                        onClick={() => {
                          setHasChecked(false);
                          setSlideStatus('idle');
                          setSelectedGuess('');
                          setCurrentSlideIndex(idx);
                        }}
                        className={`relative rounded-lg overflow-hidden h-9 w-12 shrink-0 border-2 transition-all cursor-pointer ${
                          currentSlideIndex === idx
                          ? 'border-indigo-600 scale-95 shadow-sm'
                          : 'border-zinc-200/50 hover:border-zinc-400'
                        }`}
                      >
                        <img 
                          src={item.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                        <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-0.5 py-px text-[7px] font-mono text-zinc-300 scale-90">
                          #{idx + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ACTIVE OPTICAL CONTROLS CODES & PROGRESS METER BARS */}
                <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3.5">
                  {/* Dynamic Focus Quality Progress Bar with moving Instagram + Ocean Blue Gradient */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono font-black text-zinc-550 uppercase">
                      <span>🔬 Auto-Achromatic Blur Correction</span>
                      <span className={deviation <= 8 ? 'text-emerald-600' : 'text-[#ee2a7b]'}>
                        {deviation <= 8 ? '✨ OPTIMAL RESOLUTION' : '🌫️ FOCUS OFFSET'}
                      </span>
                    </div>
                    {/* The Animated Metre Bar */}
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-ig-ocean-gradient rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, 100 - deviation * 2)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Fine Focus Adjust Range Input */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-650 uppercase font-mono tracking-wider">
                          Fine Focus Adjust (Standard: 50)
                        </label>
                        <span className="text-[10px] font-mono font-extrabold text-indigo-650">{focusDial}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-zinc-400">Blur</span>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={focusDial}
                          onChange={(e) => setFocusDial(Number(e.target.value))}
                          className="flex-1 accent-indigo-600 cursor-pointer h-1 bg-zinc-250 rounded-lg appearance-none"
                        />
                        <span className="text-[8px] font-mono text-zinc-400">Crisp</span>
                      </div>
                    </div>

                    {/* Condenser Light Intensity Dimmer */}
                    <div className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-zinc-650 uppercase font-mono tracking-wider">
                          Condenser Light intensity
                        </label>
                        <span className="text-[10px] font-mono font-extrabold text-rose-650">{condenserDimmer}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-zinc-400">Dark</span>
                        <input 
                          type="range"
                          min="40"
                          max="140"
                          value={condenserDimmer}
                          onChange={(e) => setCondenserDimmer(Number(e.target.value))}
                          className="flex-1 accent-rose-500 cursor-pointer h-1 bg-zinc-250 rounded-lg appearance-none"
                        />
                        <span className="text-[8px] font-mono text-zinc-400">Glow</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage D-Pad and Magnification select */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    
                    {/* D-Pad */}
                    <div className="md:col-span-5 bg-zinc-50 border border-zinc-150 p-2 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[8.5px] font-black text-zinc-400 uppercase font-mono block">Stage Align</span>
                        <div className="text-[9px] font-mono font-bold text-zinc-700">
                          X:{stageX}px Y:{stageY}px
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setStageX(prev => Math.max(-40, prev - 8))} 
                          className="w-[18px] h-[18px] bg-white border border-zinc-200 rounded text-[8px] font-extrabold flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
                          title="Left"
                        >
                          ◀
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <button 
                            onClick={() => setStageY(prev => Math.max(-40, prev - 8))} 
                            className="w-[18px] h-[18px] bg-white border border-zinc-200 rounded text-[8px] font-extrabold flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
                            title="Up"
                          >
                            ▲
                          </button>
                          <button 
                            onClick={() => setStageY(prev => Math.min(40, prev + 8))} 
                            className="w-[18px] h-[18px] bg-white border border-zinc-200 rounded text-[8px] font-extrabold flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
                            title="Down"
                          >
                            ▼
                          </button>
                        </div>
                        <button 
                          onClick={() => setStageX(prev => Math.min(40, prev + 8))} 
                          className="w-[18px] h-[18px] bg-white border border-zinc-200 rounded text-[8px] font-extrabold flex items-center justify-center hover:bg-zinc-100 cursor-pointer"
                          title="Right"
                        >
                          ▶
                        </button>
                        <button 
                          onClick={() => { setStageX(0); setStageY(0); }} 
                          className="w-[18px] h-[18px] bg-zinc-800 text-white rounded text-[7px] font-black flex items-center justify-center hover:bg-zinc-950 cursor-pointer ml-0.5"
                          title="Reset Center"
                        >
                          ⟲
                        </button>
                      </div>
                    </div>

                    {/* Magnification select */}
                    <div className="md:col-span-7 bg-zinc-50 border border-zinc-150 p-2 rounded-xl flex items-center justify-between">
                      <span className="text-[8.5px] font-black text-zinc-400 uppercase font-mono block">Objective Lens</span>
                      <div className="flex gap-0.5">
                        {[10, 40, 100].map((mag) => (
                          <button
                            key={mag}
                            onClick={() => setMagnification(mag as 10 | 40 | 100)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase transition-all cursor-pointer ${
                              magnification === mag 
                              ? 'bg-zinc-900 text-white shadow-sm' 
                              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                            }`}
                          >
                            {mag}x {mag === 100 ? 'Oil' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Identification Quiz & Intelligent Hints */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Intelligent Clue / Hint card */}
              <div className="bg-gradient-to-br from-zinc-900 to-indigo-950 border border-indigo-400/20 rounded-2xl p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-[9px] font-black uppercase tracking-widest font-mono">
                    <Sparkles size={11} className="text-yellow-400 animate-pulse" /> Diagnostic Clues
                  </div>
                  <span className="text-[8px] font-black font-mono tracking-widest text-[#ee2a7b] animate-pulse">
                    CHALLENGE ACTIVE
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-display font-black text-xs text-zinc-100 leading-tight">Morphological Profile</h4>
                  <p className="text-zinc-300 text-[11px] leading-relaxed font-semibold">
                    {slide.description || 'Analyze cell nuclei, cytoplasmic granules, chromatin characteristics, or outer membrane morphology to match clinical indicators.'}
                  </p>
                </div>

                {/* Hint toggle widget */}
                <div className="border-t border-white/10 pt-2.5">
                  <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-1 relative border border-white/10">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-yellow-300 font-mono uppercase">
                      💡 Diagnostic Key / Hint:
                    </div>
                    <p className="text-zinc-200 text-[11px] leading-relaxed font-semibold">
                      {slide.hint || 'No specific hints available. Focus on structural cell markers.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Identification Task Options Box */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-rose-600 font-black text-[9px] uppercase tracking-wider font-mono mb-1.5">
                  <Flame size={12} className="animate-pulse" /> Identify Clinical Target
                </div>

                <h4 className="font-display font-black text-xs sm:text-sm text-zinc-900 leading-tight">
                  Choose the Correct Target Object
                </h4>

                {/* Multiple choices */}
                <div className="space-y-2 mt-3">
                  {getSlideOptions(slide).map((option, idx) => (
                    <button
                      key={`${option}-${idx}`}
                      disabled={hasChecked}
                      onClick={() => setSelectedGuess(option)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border flex items-center justify-between transition-all cursor-pointer ${
                        selectedGuess === option 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <span className="font-semibold">{option}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedGuess === option ? 'border-indigo-600 bg-indigo-600' : 'border-zinc-300'
                      }`}>
                        {selectedGuess === option && <Check size={8} className="text-white font-extrabold" />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-3 space-y-3">
                  {!hasChecked ? (
                    <button
                      onClick={handleSlideGuess}
                      disabled={!selectedGuess}
                      className="w-full py-2.5 bg-black hover:bg-indigo-600 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:border-zinc-200 text-white border border-transparent rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={13} /> Confirm Identification
                    </button>
                  ) : (
                    <div className="space-y-3 animate-fadeIn">
                      {slideStatus === 'correct' ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800 space-y-0.5">
                          <h5 className="font-bold text-xs flex items-center gap-1"><CheckCircle2 size={14} /> Spot On! +10 Score Awarded</h5>
                          <p className="text-[11px] leading-relaxed">{slide.fact}</p>
                        </div>
                      ) : (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 space-y-0.5">
                          <h5 className="font-bold text-xs flex items-center gap-1">&#10060; Incorrect Identification</h5>
                          <p className="text-[11px] leading-relaxed">
                            The correct cell/specimen is standardly classified as <strong className="font-black text-zinc-950 uppercase">{slide.targetCell}</strong>. {slide.fact}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={nextSlide}
                        className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                      >
                        Next Diagnostic Challenge <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quick Pathology References & Diagnostic Value Checker */}
        {activeTab === 'reference' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white rounded-[2rem] border border-zinc-200/80 p-4 sm:p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-5 border-b border-zinc-100">
                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl sm:text-2xl text-zinc-900 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" /> Standard Calibration Calculator
                  </h3>
                  <p className="text-zinc-500 text-xs sm:text-sm">
                    Enter clinical pathological values to evaluate healthy biomarker reference ranges.
                  </p>
                </div>

                {/* Gender toggle */}
                <div className="bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200 shadow-inner flex items-center gap-1 w-fit shrink-0">
                  <button
                    onClick={() => { setSelectedGender('male'); setTestResultsFeedback({}); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                      selectedGender === 'male'
                      ? 'bg-white text-zinc-900 shadow'
                      : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    MALE
                  </button>
                  <button
                    onClick={() => { setSelectedGender('female'); setTestResultsFeedback({}); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                      selectedGender === 'female'
                      ? 'bg-white text-zinc-900 shadow'
                      : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    FEMALE
                  </button>
                </div>
              </div>

              {/* Search test range */}
              <div className="relative mt-8 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                <input
                  type="text"
                  placeholder="Search hematology, biochemistry, bilirubin, levels..."
                  value={searchTestQuery}
                  onChange={(e) => setSearchTestQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm transition-all shadow-sm outline-none font-medium text-zinc-800 placeholder-zinc-400"
                />
              </div>

              {/* Lab test grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {filteredReferenceTests.map((test) => {
                  const min = selectedGender === 'male' ? test.normalMinMale : test.normalMinFemale;
                  const max = selectedGender === 'male' ? test.normalMaxMale : test.normalMaxFemale;
                  const feedback = testResultsFeedback[test.name];

                  return (
                    <div 
                      key={`${test.name}-${test.id || ''}`} 
                      className="bg-zinc-50/50 rounded-2xl p-5 border border-zinc-200/70 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-mono">
                            {test.category}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 font-bold">Ref: {min} - {max} {test.unit}</span>
                        </div>
                        
                        <h4 className="font-display font-extrabold text-base text-zinc-950">{test.name}</h4>
                        <p className="text-zinc-500 text-[11px] leading-relaxed font-sans">{test.description}</p>
                      </div>

                      {/* Input calculator field */}
                      <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            placeholder="Enter test value..."
                            value={testInputs[test.name] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTestInputs(prev => ({ ...prev, [test.name]: val }));
                              checkLabValue(test.name, val);
                            }}
                            className="flex-grow px-3 py-2 bg-white border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl text-xs sm:text-sm outline-none font-semibold text-zinc-800 placeholder-zinc-400 shadow-sm"
                          />
                          <span className="text-xs text-zinc-400 font-bold shrink-0">{test.unit}</span>
                        </div>

                        {/* Instant analyzer banner */}
                        <AnimatePresence>
                          {feedback && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={`rounded-xl p-3 border text-[11px] font-medium leading-relaxed font-sans ${feedback.color} transition-all`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-xs uppercase tracking-wide">Analysis: {feedback.status}</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-black/5 rounded">BMLT Standard</span>
                              </div>
                              <p>{feedback.reason}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: BMLT Dynamic Case Studies (CRUD & Answering mode) */}
        {activeTab === 'cases' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Control Panel: Case Studies */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/85 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-zinc-900 uppercase">Case Studies Repository</h4>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Explore clinical case studies and complete diagnostic assessments below.
                </p>
              </div>
            </div>

            {/* MAIN CASE STUDIES INTERACTIVE DISPLAY LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Case presentations list left sidebar */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 lg:space-y-3 lg:gap-0">
                <span className="col-span-1 sm:col-span-2 lg:col-span-1 text-xs font-black text-zinc-400 uppercase tracking-widest block pl-1 mb-1">Active Patient Files:</span>
                
                {isLoadingBmlt ? (
                  <div className="p-5 text-center text-zinc-450 font-mono text-xs">Loading SQLite Patient Files...</div>
                ) : customCases.length === 0 ? (
                  <div className="p-5 text-center text-zinc-450 font-mono text-xs border border-dashed rounded-2xl">No Case Studies in repository.</div>
                ) : (
                  customCases.map((cs) => (
                    <div
                      key={cs.id}
                      onClick={() => {
                        setSelectedCaseId(cs.id);
                        setRevealTests(false);
                        setSelectedCaseAnswer('');
                        setCaseQuizFeedback('');
                        setParagraphAnswer('');
                        setHasSubmittedParagraph(false);
                        setParagraphFeedback('');
                      }}
                      className={`group p-3.5 sm:p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col space-y-2 select-none relative overflow-hidden ${
                        selectedCaseId === cs.id 
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-md transform translate-x-1'
                        : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 pr-3">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[#ee2a7b] font-bold">
                            CASE STUDY #{cs.id} • {cs.type === 'mcq' ? 'MCQ Quiz' : 'Clinical Essay'}
                          </span>
                          <h5 className="font-display font-black text-xs sm:text-sm leading-tight group-hover:text-amber-300 transition-colors">{cs.title}</h5>
                        </div>
                        <ArrowRight size={13} className={selectedCaseId === cs.id ? 'text-amber-400' : 'text-zinc-300'} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Patient Case Presentation viewport */}
              <div className="lg:col-span-8">
                {activeCase ? (
                  <div className="bg-white rounded-[2rem] border border-zinc-200/80 p-5 sm:p-6 md:p-8 shadow-sm space-y-5 sm:space-y-6">
                    
                    <div className="border-b border-zinc-100 pb-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded font-bold">
                          Active File: {activeCase.type === 'mcq' ? 'MCQ Diagnostic mode' : 'Open Paragraph reporting'}
                        </span>
                        <h3 className="font-display font-black text-lg sm:text-2xl text-zinc-950 mt-1.5">{activeCase.title}</h3>
                      </div>
                      <BookOpen size={22} className="text-zinc-300 shrink-0" />
                    </div>

                    {/* Patient Presentation Box */}
                    <div className="space-y-1.5 sm:space-y-2 font-mono">
                      <label className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-wider block">PATIENT DIAGNOSTIC RECAP REPORT:</label>
                      <p className="bg-zinc-50 rounded-2xl p-4 sm:p-5 border border-zinc-100 text-xs sm:text-sm leading-relaxed text-zinc-700 font-medium">
                        "{activeCase.presentation}"
                      </p>
                    </div>

                    {/* Clinical action trigger */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest block font-mono">ORDER CLINICAL LAB ANALYSIS:</label>
                        {!revealTests && (
                          <span className="text-[9px] text-amber-600 font-extrabold animate-pulse">Execute panel checks to reveal diagnostic biomarkers</span>
                        )}
                      </div>

                      {!revealTests ? (
                        <button
                          onClick={() => setRevealTests(true)}
                          className="w-full py-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Play size={14} fill="currentColor" /> Process Blood Smear & Spectrophotometry Chemistry 
                        </button>
                      ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 sm:p-5 animate-fadeIn">
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-black uppercase tracking-widest font-mono mb-2">
                            <CheckCircle2 size={13} /> Complete Panel processing complete
                          </div>
                          
                          <div className="space-y-3">
                            <div className="text-zinc-800 text-xs sm:text-sm leading-relaxed font-semibold">
                              Diagnostic parameters have been parsed. Evaluate the Core Question below to form your diagnostic hypothesis.
                            </div>
                            <div className="text-[10.5px] text-zinc-600 font-medium font-mono whitespace-pre-line bg-white/60 p-2.5 rounded-lg border border-zinc-200/50">
                              {activeCase.normal_params || activeCase.normalParams || 'Biomarkers checked: Standard Hb levels, Serum Creatinine profile normal, Bilirubin assay outputs completed.'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MCQs vs Paragraph answering formats */}
                    {revealTests && (
                      <div className="space-y-4 border-t border-zinc-100 pt-6 animate-fadeIn">
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block font-mono">Core Diagnostic Question:</span>
                          <h4 className="font-display font-extrabold text-sm sm:text-base text-zinc-950 leading-tight">
                            {activeCase.question}
                          </h4>
                        </div>

                        {activeCase.type === 'mcq' ? (
                          /* MCQ Options list */
                          <div className="space-y-3 mt-4">
                            {[
                              { key: 'A', text: activeCase.option_a },
                              { key: 'B', text: activeCase.option_b },
                              { key: 'C', text: activeCase.option_c },
                              { key: 'D', text: activeCase.option_d }
                            ].filter(opt => opt.text).map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => handleCaseAnswerAction(activeCase.id, opt.key, activeCase.correct_option, opt.text || '')}
                                className={`w-full p-4 rounded-2xl text-left text-xs sm:text-sm font-bold border flex items-center gap-3 transition-all cursor-pointer ${
                                  selectedCaseAnswer.toUpperCase() === opt.key.toUpperCase()
                                  ? opt.key.toUpperCase() === activeCase.correct_option.toUpperCase()
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm'
                                    : 'bg-rose-50 border-rose-450 text-rose-950 shadow-sm'
                                  : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-lg uppercase flex items-center justify-center text-xs font-mono font-black border ${
                                  selectedCaseAnswer.toUpperCase() === opt.key.toUpperCase()
                                  ? opt.key.toUpperCase() === activeCase.correct_option.toUpperCase()
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-rose-500 text-white border-rose-500'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                                }`}>
                                  {opt.key}
                                </span>
                                <span>{opt.text}</span>
                              </button>
                            ))}

                            {/* Case MCQ interactive feedback box */}
                            {caseQuizFeedback && (
                              <div className={`rounded-2xl p-4 border text-xs sm:text-sm font-semibold leading-relaxed shadow-sm ${
                                caseQuizFeedback.includes('Correct') 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                              }`}>
                                <p>{caseQuizFeedback}</p>
                              </div>
                            )}

                          </div>
                        ) : (
                          
                          /* Paragraph Open analysis report form */
                          <div className="space-y-4">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block">Type your Clinical Identification Essay:</label>
                            <textarea
                              disabled={hasSubmittedParagraph}
                              value={paragraphAnswer}
                              onChange={(e) => setParagraphAnswer(e.target.value)}
                              placeholder="Describe your biochemistry cell parameters, diagnostic review of normal ranges, and complete medical hypothesis..."
                              className="w-full p-4 border border-zinc-200 hover:border-zinc-300 focus:border-black rounded-2xl text-xs sm:text-sm outline-none font-sans font-medium h-32 resize-none bg-zinc-50"
                            />
                            
                            {!hasSubmittedParagraph ? (
                              <button
                                onClick={() => {
                                  if (!paragraphAnswer.trim()) return;
                                  setHasSubmittedParagraph(true);
                                  const answerLower = paragraphAnswer.toLowerCase();
                                  const guidelines = activeCase.correct_guidelines || 'anemia, clinical';
                                  const keywords = guidelines.split(',').map(s => s.trim().toLowerCase());
                                  const discovered = keywords.filter(k => answerLower.includes(k));
                                  const matchedPercentage = Math.round((discovered.length / keywords.length) * 100);
                                  
                                  let scoreReward = 0;
                                  let pFeed = '';
                                  if (matchedPercentage >= 50) {
                                    scoreReward = 20;
                                    pFeed = `Excellent assessment! Your case review contains core diagnostic keywords: [${discovered.join(', ')}]. You demonstrated deep haematology/pathology synthesis. (+20 Score)`;
                                  } else if (matchedPercentage >= 15) {
                                    scoreReward = 10;
                                    pFeed = `Acceptable assessment. Your notes included some criteria keywords: [${discovered.join(', ')}]. Consider referencing the complete guidelines for professional BMLT reporting. (+10 Score)`;
                                  } else {
                                    pFeed = `Reviewed. Your analysis is noted but missed core diagnostic markers. Correct clinical reference benchmarks look for characteristics containing keywords: "${guidelines}".`;
                                  }
                                  setParagraphFeedback(pFeed);
                                  if (scoreReward > 0) {
                                    setUserScore(prev => prev + scoreReward);
                                  }
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all shrink-0 font-mono border-0"
                              >
                                Submit Lab Report Analysis
                              </button>
                            ) : (
                              <div className="space-y-3 animate-fadeIn">
                                <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 text-indigo-900 text-xs sm:text-sm leading-relaxed space-y-2">
                                  <h5 className="font-extrabold text-sm text-indigo-950">👨‍⚕️ Clinical Review Evaluation:</h5>
                                  <p className="font-medium">{paragraphFeedback}</p>
                                  <div className="border-t border-indigo-200/60 pt-2 text-[11px] font-mono font-bold text-indigo-700">
                                    Target Pathology Biomarkers Checked: "{activeCase.correct_guidelines}"
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setHasSubmittedParagraph(false);
                                    setParagraphAnswer('');
                                    setParagraphFeedback('');
                                  }}
                                  className="px-4 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl text-xs font-bold font-mono bg-white"
                                >
                                  Retry Lab Analysis
                                </button>
                              </div>
                            )}
                          </div>

                        )}

                      </div>
                    )}

                  </div>
                ) : (
                  <div className="bg-white border text-center p-10 text-zinc-450 rounded-[2rem] font-medium text-sm">
                    Select a patient file on the left side menu to start active lab diagnostic procedures.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab 4: Practice MCQs section (Saves images dynamically to SQLite) */}
        {activeTab === 'practice-mcqs' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Control Panel: Practice MCQs */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/85 shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-zinc-900 uppercase">Interactive Hematology MCQ Library</h4>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Test your diagnostic skills with multiple choice practice questions below.
                </p>
              </div>
            </div>

            {/* MCQ LIBRARY INTERACTIVE WORKBENCH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Practice Work Arena */}
              <div className="lg:col-span-8">
                {isLoadingBmlt ? (
                  <div className="bg-white p-10 text-center text-zinc-400 font-mono text-sm border rounded-[2rem]">
                    Loading SQLite Haematology MCQs...
                  </div>
                ) : customMcqs.length === 0 ? (
                  <div className="bg-white p-12 text-center text-zinc-400 font-mono text-sm border border-dashed rounded-[2rem] space-y-3">
                    <p>No customized MCQs found in clinical library database.</p>
                  </div>
                ) : (
                  (() => {
                    const activeMcqIdxNormalized = Math.max(0, Math.min(practiceMcqIndex, customMcqs.length - 1));
                    const mcq = customMcqs[activeMcqIdxNormalized];
                    if (!mcq) return null;

                    return (
                      <div className="bg-white rounded-[2rem] border border-zinc-200/80 p-5 sm:p-6 md:p-8 shadow-sm space-y-6">
                        
                        <div className="flex items-center justify-between border-b pb-4">
                          <div>
                            <span className="text-[10px] font-mono tracking-widest uppercase text-[#ee2a7b] font-black">
                              LAB QUESTION PRACTICE ({activeMcqIdxNormalized + 1} of {customMcqs.length})
                            </span>
                            <h4 className="font-display font-black text-lg text-zinc-950 mt-1">Interactive Diagnostic Assessment</h4>
                          </div>
                          

                        </div>

                        {/* Slide custom image (Option to set image) */}
                        {mcq.image_url && (
                          <div className="rounded-xl border overflow-hidden max-h-56 bg-zinc-950 flex items-center justify-center relative shadow-sm">
                            <img
                              src={mcq.image_url}
                              alt="Diagnostic Slide Microphotograph"
                              className="max-w-full max-h-56 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                              Biomarker Slide Specimen Model
                            </div>
                          </div>
                        )}

                        {/* Question title */}
                        <div className="space-y-4">
                          <h4 className="font-sans font-extrabold text-sm sm:text-base text-zinc-900 leading-snug">
                            {mcq.question}
                          </h4>

                          <div className="grid grid-cols-1 gap-2.5 pt-2">
                            {[
                              { key: 'A', text: mcq.option_a },
                              { key: 'B', text: mcq.option_b },
                              { key: 'C', text: mcq.option_c },
                              { key: 'D', text: mcq.option_d }
                            ].filter(opt => opt.text).map((o) => (
                              <button
                                key={o.key}
                                disabled={mcqAnswerChecked}
                                onClick={() => handlePracticeMcqGuess(mcq, o.key)}
                                className={`w-full p-4 rounded-xl text-left text-xs sm:text-sm font-bold border flex items-center gap-3 transition-all cursor-pointer ${
                                  selectedMcqAnswer === o.key
                                  ? mcqAnswerChecked
                                    ? o.key === mcq.correct_option
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                                      : 'bg-rose-50 border-rose-450 text-rose-950 ring-1 ring-rose-500'
                                    : 'border-indigo-650 bg-indigo-50/20 text-indigo-950 ring-1 ring-indigo-650'
                                  : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-lg uppercase flex items-center justify-center text-xs font-mono font-black border ${
                                  selectedMcqAnswer === o.key
                                  ? mcqAnswerChecked
                                    ? o.key === mcq.correct_option
                                      ? 'bg-emerald-500 text-white border-emerald-500'
                                      : 'bg-rose-500 text-white border-rose-500'
                                    : 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-zinc-100 border-zinc-250 text-zinc-500'
                                }`}>
                                  {o.key}
                                </span>
                                <span>{o.text}</span>
                              </button>
                            ))}
                          </div>

                          {/* Submit Actions */}
                          <div className="flex items-center gap-2 pt-4 border-t border-zinc-100">
                            {!mcqAnswerChecked ? (
                              <button
                                disabled={!selectedMcqAnswer}
                                onClick={() => checkPracticeMcqAnswer(mcq)}
                                className="px-5 py-2.5 bg-zinc-950 hover:bg-indigo-600 disabled:bg-zinc-100 disabled:text-zinc-450 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow border-0"
                              >
                                Validate Answer
                              </button>
                            ) : (
                              <button
                                onClick={resetPracticeMcq}
                                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-zinc-250 text-zinc-700"
                              >
                                Retry Question
                              </button>
                            )}

                            {practiceMcqIndex < customMcqs.length - 1 && (
                              <button
                                onClick={() => {
                                  resetPracticeMcq();
                                  setPracticeMcqIndex(prev => prev + 1);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow border-0"
                              >
                                Next MCQ
                              </button>
                            )}

                            {practiceMcqIndex > 0 && (
                              <button
                                onClick={() => {
                                  resetPracticeMcq();
                                  setPracticeMcqIndex(prev => prev - 1);
                                }}
                                className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-500"
                              >
                                Previous
                              </button>
                            )}
                          </div>

                          {/* Explanation Output */}
                          <AnimatePresence>
                            {mcqCurrentFeedback && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`rounded-xl p-4 border text-xs sm:text-sm font-semibold leading-relaxed shadow-sm ${
                                  mcqCurrentFeedback.includes('Correct')
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                              >
                                <p>{mcqCurrentFeedback}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>

                      </div>
                    );
                  })()
                )}
              </div>

              {/* Side index panel right side */}
              <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-sm space-y-4">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest block font-mono pl-1">All Available MCQs:</span>
                
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto scrollbar-thin">
                  {customMcqs.map((m, index) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        resetPracticeMcq();
                        setPracticeMcqIndex(index);
                      }}
                      className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        practiceMcqIndex === index
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <div className="truncate pr-3 space-y-0.5">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-rose-500 font-extrabold">MCQ {index + 1}</span>
                        <div className="truncate">{m.question}</div>
                      </div>
                      <CheckCircle2 size={12} className={practiceMcqIndex === index ? 'text-amber-400' : 'text-zinc-300'} />
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
