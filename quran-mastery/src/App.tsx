/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Clock,
  Heart,
  LayoutGrid,
  ListFilter,
  ArrowRight,
  History
} from 'lucide-react';
import { Ayah, RangeSelection, Attempt, QuizVariant, Question, TestPoolRange, RangeType } from './types';
import * as engine from './engine';

const QUESTION_TYPES_STUDY = [
  { id: 'meta_from_arabic', label: 'Meta (Num, Page, Juz, Ruku) from Arabic' },
  { id: 'arabic_from_key', label: 'Arabic + Meta from Ayah Key' },
  { id: 'first_ayahs_page', label: 'First Ayahs of Pages' },
  { id: 'last_ayahs_page', label: 'Last Ayahs of Pages' },
  { id: 'recite_to_ruku', label: 'Recite X to Y (Forward to Ruku)' },
  { id: 'recite_backward', label: 'Recite X to Y (Backward to Ruku)' },
  { id: 'recite_random', label: 'Recite Random 10-20 Ayahs' },
  { id: 'recite_every_x', label: 'Recite Every Xth Ayah' },
  { id: 'first_ayahs_ruku', label: 'First Ayahs of Random Rukus' },
  { id: 'last_ayahs_ruku', label: 'Last Ayahs of Random Rukus' },
  { id: 'jump_navigation', label: 'Jump Navigation Sequences' },
];

const QUESTION_TYPES_QUIZ = [
  'ayah_number', 'page_number', 'juz_number', 'ruku_number', 'ayah_key',
  'next_ayah', 'prev_ayah', 'x_after', 'x_before',
  'first_of_page', 'last_of_page', 'first_of_ruku', 'last_of_ruku'
];

export default function App() {
  const [view, setView] = useState<'home' | 'study' | 'quiz' | 'progress'>('home');
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranges, setRanges] = useState<TestPoolRange[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Study State
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentStudyQuestion, setCurrentStudyQuestion] = useState<Question | null>(null);
  const [showStudyAnswer, setShowStudyAnswer] = useState(false);

  // Quiz State
  const [focusWeak, setFocusWeak] = useState(false);
  const [quizActive, setQuizActive] = useState(false);

  const testPool = useMemo(() => engine.buildTestPool(ayahs, ranges), [ayahs, ranges]);

  const generateStudyQuestion = () => {
    if (selectedTypes.length === 0 || testPool.length === 0) return;

    const type = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
    const randomAyah = testPool[Math.floor(Math.random() * testPool.length)];
    
    let q: Question = {
      id: Math.random().toString(),
      text: '',
      answer: '',
      ayah: randomAyah,
      type
    };

    switch (type) {
      case 'meta_from_arabic':
        q.text = "Mention Ayah Number, Page, Juz, and Ruku for this Arabic text:";
        q.arabic = randomAyah.text_indopak;
        q.answer = `Ayah: ${randomAyah.ayah}, Page: ${randomAyah.page_13line}, Juz: ${randomAyah.juz_number}, Ruku in Juz: ${randomAyah.ruku_in_juz}`;
        break;
      case 'arabic_from_key':
        q.text = `Mention Arabic text plus Page, Juz, and Ruku for Ayah ${randomAyah.verse_key}:`;
        q.answer = `${randomAyah.text_indopak} (${randomAyah.verse_key})\nPage: ${randomAyah.page_13line}, Juz: ${randomAyah.juz_number}, Ruku in Juz: ${randomAyah.ruku_in_juz}`;
        break;
      case 'first_ayahs_page':
        const first = engine.getFirstAyahOfPage(ayahs, randomAyah.page_13line);
        q.text = `What is the first ayah of page ${randomAyah.page_13line}?`;
        q.answer = first ? `${first.text_indopak} (${first.verse_key})` : "N/A";
        break;
      case 'last_ayahs_page':
        const last = engine.getLastAyahOfPage(ayahs, randomAyah.page_13line);
        q.text = `What is the last ayah of page ${randomAyah.page_13line}?`;
        q.answer = last ? `${last.text_indopak} (${last.verse_key})` : "N/A";
        break;
      case 'recite_to_ruku':
        const boundary = engine.getNearestRukuBoundary(ayahs, randomAyah, 'forward');
        q.text = `Recite from ${randomAyah.verse_key} to the nearest ruku boundary (${boundary.verse_key}):`;
        const rangeAyahs = ayahs.filter(a => a.global_order >= randomAyah.global_order && a.global_order <= boundary.global_order);
        q.answer = rangeAyahs.map(a => `${a.text_indopak} (${a.verse_key})`).join('\n');
        break;
      case 'jump_navigation':
        q.text = "Follow this navigation sequence:";
        const steps = ["Next Ruku Start", "Previous Page", "Forward 2 Ayahs"];
        q.text += "\n1. " + steps.join("\n2. ");
        q.answer = "Navigation sequence completed.";
        break;
      default:
        q.text = "Question type not fully implemented.";
        q.answer = "Sample Answer";
    }

    setCurrentStudyQuestion(q);
    setShowStudyAnswer(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qRes = await fetch('/api/quran');
        const qData = await qRes.json();
        setAyahs(qData);
        
        const pRes = await fetch('/api/progress');
        const pData = await pRes.json();
        setAttempts(pData);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const resetProgress = async () => {
    if (confirm("Are you sure you want to reset all progress? This cannot be undone.")) {
      await fetch('/api/reset', { method: 'POST' });
      setAttempts([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-secondary">
        <div className="text-white animate-pulse font-medium">Loading Quran Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary text-white">
      <header className="border-b border-white/10 bg-brand-primary sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('home')}
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-primary font-bold font-display">Q</div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">Quran <span className="text-brand-accent">Mastery</span></h1>
          </div>
          <nav className="flex gap-6">
            <button 
              onClick={() => setView('study')}
              className={`text-sm font-bold transition-colors ${view === 'study' ? 'text-brand-accent' : 'text-white/70 hover:text-white'}`}
            >
              Study
            </button>
            <button 
              onClick={() => setView('quiz')}
              className={`text-sm font-bold transition-colors ${view === 'quiz' ? 'text-brand-accent' : 'text-white/70 hover:text-white'}`}
            >
              Quiz
            </button>
            <button 
              onClick={() => setView('progress')}
              className={`text-sm font-bold transition-colors ${view === 'progress' ? 'text-brand-accent' : 'text-white/70 hover:text-white'}`}
            >
              Progress
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {(view === 'study' || view === 'quiz') && (
            <aside className="lg:w-80 shrink-0 space-y-6">
              <TestPoolBuilder ayahs={ayahs} ranges={ranges} setRanges={setRanges} />
              
              {view === 'study' && (
                <div className="mastery-card space-y-4 border-l-4 border-brand-accent">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">Question Types</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {QUESTION_TYPES_STUDY.map(t => (
                      <label key={t.id} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={selectedTypes.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTypes([...selectedTypes, t.id]);
                            else setSelectedTypes(selectedTypes.filter(id => id !== t.id));
                          }}
                          className="w-4 h-4 accent-brand-primary"
                        />
                        <span className="text-xs text-brand-secondary group-hover:text-brand-primary transition-colors">{t.label}</span>
                      </label>
                    ))}
                  </div>
                  <button 
                    onClick={generateStudyQuestion}
                    disabled={selectedTypes.length === 0 || testPool.length === 0}
                    className="w-full mastery-button flex items-center justify-center gap-2 bg-brand-secondary text-white hover:bg-brand-primary text-[10px] py-2 uppercase tracking-widest"
                  >
                    Generate Question
                  </button>
                </div>
              )}

              {view === 'quiz' && !quizActive && (
                <div className="mastery-card space-y-4 border-l-4 border-brand-accent-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">Quiz Options</h3>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={focusWeak}
                      onChange={(e) => setFocusWeak(e.target.checked)}
                      className="w-4 h-4 accent-brand-primary"
                    />
                    <span className="text-xs text-brand-secondary group-hover:text-brand-primary transition-colors">Focus on Weak Areas</span>
                  </label>
                </div>
              )}
            </aside>
          )}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {view === 'home' && <HomeView setView={setView} />}
              {view === 'study' && (
                <StudyView 
                  currentQuestion={currentStudyQuestion} 
                  showAnswer={showStudyAnswer} 
                  setShowAnswer={setShowStudyAnswer} 
                  onNext={generateStudyQuestion} 
                />
              )}
              {view === 'quiz' && (
                <QuizView 
                  testPool={testPool} 
                  attempts={attempts} 
                  setAttempts={setAttempts} 
                  focusWeak={focusWeak}
                  active={quizActive}
                  setActive={setQuizActive}
                />
              )}
              {view === 'progress' && <ProgressView attempts={attempts} resetProgress={resetProgress} />}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function HomeView({ setView }: { setView: (v: 'home' | 'study' | 'quiz' | 'progress') => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid md:grid-cols-2 gap-8"
    >
      <div className="space-y-6">
        <h2 className="text-4xl font-bold tracking-tight leading-tight text-white">
          Master the Structure <br />
          <span className="text-brand-primary font-medium">of the Holy Quran.</span>
        </h2>
        <p className="text-white/90 leading-relaxed max-w-md">
          A disciplined approach to mastering ayah locations, structural boundaries, and navigation sequences. No distractions, just focused learning.
        </p>
        <div className="flex gap-4 pt-4">
          <button onClick={() => setView('study')} className="mastery-button flex items-center gap-2 bg-brand-accent text-white hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20">
            <BookOpen size={18} />
            Study Mode
          </button>
          <button onClick={() => setView('quiz')} className="mastery-button flex items-center gap-2 bg-brand-accent-2 text-white hover:bg-brand-accent-2/90 shadow-lg shadow-brand-accent-2/20">
            <Trophy size={18} />
            Quiz Mode
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="mastery-card flex flex-col justify-between border-b-4 border-brand-secondary">
          <LayoutGrid className="text-brand-secondary mb-4" />
          <div>
            <h3 className="font-bold">Structural Mastery</h3>
            <p className="text-xs text-brand-secondary mt-1">Master pages, juz, and ruku boundaries.</p>
          </div>
        </div>
        <div className="mastery-card flex flex-col justify-between border-b-4 border-brand-accent">
          <History className="text-brand-accent mb-4" />
          <div>
            <h3 className="font-bold">Jump Navigation</h3>
            <p className="text-xs text-brand-secondary mt-1">Navigate the Quran with mental agility.</p>
          </div>
        </div>
        <div className="mastery-card flex flex-col justify-between border-b-4 border-brand-accent-2">
          <Clock className="text-brand-accent-2 mb-4" />
          <div>
            <h3 className="font-bold">Speed Drills</h3>
            <p className="text-xs text-brand-secondary mt-1">Test your recall under time pressure.</p>
          </div>
        </div>
        <div className="mastery-card flex flex-col justify-between border-b-4 border-brand-primary">
          <ListFilter className="text-brand-primary mb-4" />
          <div>
            <h3 className="font-bold">Weak Areas</h3>
            <p className="text-xs text-brand-secondary mt-1">Targeted practice on difficult sections.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TestPoolBuilder({ ayahs, ranges, setRanges }: { ayahs: Ayah[], ranges: TestPoolRange[], setRanges: (r: TestPoolRange[]) => void }) {
  const [activeTab, setActiveTab] = useState<RangeType>('ayah');
  const [error, setError] = useState<string | null>(null);

  // Ayah Range State
  const [ayahStart, setAyahStart] = useState({ surah: 1, ayah: 1 });
  const [ayahEnd, setAyahEnd] = useState({ surah: 1, ayah: 7 });

  // Ruku Range State
  const [rukuStart, setRukuStart] = useState({ juz: 1, ruku: 1 });
  const [rukuEnd, setRukuEnd] = useState({ juz: 1, ruku: 1 });

  // Juz Range State
  const [juzStart, setJuzStart] = useState(1);
  const [juzEnd, setJuzEnd] = useState(1);

  const testPool = useMemo(() => engine.buildTestPool(ayahs, ranges), [ayahs, ranges]);

  const addRange = () => {
    setError(null);
    let newRange: TestPoolRange;

    if (activeTab === 'ayah') {
      const startAyah = ayahs.find(a => a.surah === ayahStart.surah && a.ayah === ayahStart.ayah);
      const endAyah = ayahs.find(a => a.surah === ayahEnd.surah && a.ayah === ayahEnd.ayah);
      if (!startAyah || !endAyah) {
        setError("Invalid surah or ayah number.");
        return;
      }
      if (startAyah.global_order > endAyah.global_order) {
        setError("End ayah cannot be before start ayah.");
        return;
      }
      newRange = { type: 'ayah', start: ayahStart, end: ayahEnd };
    } else if (activeTab === 'ruku') {
      const startRukuAyahs = engine.get_ayahs_for_ruku(ayahs, rukuStart.juz, rukuStart.ruku);
      const endRukuAyahs = engine.get_ayahs_for_ruku(ayahs, rukuEnd.juz, rukuEnd.ruku);
      if (startRukuAyahs.length === 0 || endRukuAyahs.length === 0) {
        setError("Invalid ruku selection.");
        return;
      }
      if (startRukuAyahs[0].global_order > endRukuAyahs[0].global_order) {
        setError("End ruku cannot be before start ruku.");
        return;
      }
      newRange = { type: 'ruku', start: rukuStart, end: rukuEnd };
    } else {
      if (juzStart > juzEnd) {
        setError("End juz cannot be before start juz.");
        return;
      }
      newRange = { type: 'juz', start: juzStart, end: juzEnd };
    }

    setRanges([...ranges, newRange]);
  };

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const clearPool = () => {
    setRanges([]);
  };

  const getValidRukus = (juz: number) => {
    const rukuSet = new Set(ayahs.filter(a => a.juz_number === juz).map(a => a.ruku_in_juz));
    return Array.from(rukuSet).sort((a, b) => a - b);
  };

  return (
    <div className="space-y-4">
      <div className="mastery-card space-y-4 border-t-4 border-brand-secondary">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">Range Builder</h3>
          {ranges.length > 0 && (
            <button onClick={clearPool} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear</button>
          )}
        </div>
        
        <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
          {(['ayah', 'ruku', 'juz'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === tab ? 'bg-white text-brand-accent shadow-sm' : 'text-brand-secondary hover:text-brand-primary'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {activeTab === 'ayah' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">Start (S:A)</label>
                <div className="flex gap-1">
                  <input type="number" value={ayahStart.surah} onChange={e => setAyahStart({...ayahStart, surah: parseInt(e.target.value) || 1})} className="w-full border border-black/10 rounded px-1.5 py-1 text-xs" />
                  <input type="number" value={ayahStart.ayah} onChange={e => setAyahStart({...ayahStart, ayah: parseInt(e.target.value) || 1})} className="w-full border border-black/10 rounded px-1.5 py-1 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">End (S:A)</label>
                <div className="flex gap-1">
                  <input type="number" value={ayahEnd.surah} onChange={e => setAyahEnd({...ayahEnd, surah: parseInt(e.target.value) || 1})} className="w-full border border-black/10 rounded px-1.5 py-1 text-xs" />
                  <input type="number" value={ayahEnd.ayah} onChange={e => setAyahEnd({...ayahEnd, ayah: parseInt(e.target.value) || 1})} className="w-full border border-black/10 rounded px-1.5 py-1 text-xs" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ruku' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">Start (J:R)</label>
                <div className="flex gap-1">
                  <select value={rukuStart.juz} onChange={e => setRukuStart({...rukuStart, juz: parseInt(e.target.value), ruku: 1})} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                    {Array.from({length: 30}, (_, i) => i + 1).map(j => <option key={j} value={j}>J{j}</option>)}
                  </select>
                  <select value={rukuStart.ruku} onChange={e => setRukuStart({...rukuStart, ruku: parseInt(e.target.value)})} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                    {getValidRukus(rukuStart.juz).map(r => <option key={r} value={r}>R{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">End (J:R)</label>
                <div className="flex gap-1">
                  <select value={rukuEnd.juz} onChange={e => setRukuEnd({...rukuEnd, juz: parseInt(e.target.value), ruku: 1})} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                    {Array.from({length: 30}, (_, i) => i + 1).map(j => <option key={j} value={j}>J{j}</option>)}
                  </select>
                  <select value={rukuEnd.ruku} onChange={e => setRukuEnd({...rukuEnd, ruku: parseInt(e.target.value)})} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                    {getValidRukus(rukuEnd.juz).map(r => <option key={r} value={r}>R{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'juz' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">Start Juz</label>
                <select value={juzStart} onChange={e => setJuzStart(parseInt(e.target.value))} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                  {Array.from({length: 30}, (_, i) => i + 1).map(j => <option key={j} value={j}>Juz {j}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-brand-secondary">End Juz</label>
                <select value={juzEnd} onChange={e => setJuzEnd(parseInt(e.target.value))} className="w-full border border-black/10 rounded px-1 py-1 text-[11px]">
                  {Array.from({length: 30}, (_, i) => i + 1).map(j => <option key={j} value={j}>Juz {j}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
          
          <button onClick={addRange} className="w-full mastery-button bg-brand-primary text-white hover:bg-brand-secondary text-[10px] py-1.5 uppercase tracking-widest">
            Add Range
          </button>
        </div>

        {ranges.length > 0 && (
          <div className="pt-4 border-t border-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-brand-secondary">Active Pool</span>
              <span className="text-xs font-bold">{testPool.length} <span className="text-[10px] font-normal text-brand-secondary">Ayahs</span></span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {ranges.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-[10px]">
                  <span className="capitalize font-medium truncate mr-2">
                    {r.type}: {r.type === 'ayah' ? `${r.start.surah}:${r.start.ayah}-${r.end.surah}:${r.end.ayah}` : 
                              r.type === 'ruku' ? `J${r.start.juz}:R${r.start.ruku}-J${r.end.juz}:R${r.end.ruku}` : 
                              `Juz ${r.start}-${r.end}`}
                  </span>
                  <button onClick={() => removeRange(i)} className="text-red-400 hover:text-red-600 shrink-0">
                    <XCircle size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudyView({ currentQuestion, showAnswer, setShowAnswer, onNext }: { currentQuestion: Question | null, showAnswer: boolean, setShowAnswer: (s: boolean) => void, onNext: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="max-w-3xl mx-auto">
        {currentQuestion ? (
          <div className="mastery-card min-h-[400px] flex flex-col">
            <div className="flex-1 space-y-6">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent-2 bg-brand-accent-2/10 px-2 py-1 rounded">
                  {currentQuestion.type.replace(/_/g, ' ')}
                </span>
              </div>
              
              <h4 className="text-xl font-medium leading-relaxed">{currentQuestion.text}</h4>
              
              {currentQuestion.arabic && (
                <div className="arabic-text text-3xl leading-loose p-6 bg-gray-50 rounded-lg text-center">
                  {currentQuestion.arabic}
                </div>
              )}

              {showAnswer && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 pt-8 border-t border-black/5 space-y-4"
                >
                  <h5 className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Answer</h5>
                  <div className="space-y-4">
                    {currentQuestion.answer.toString().split('\n').map((line, i) => (
                      <div key={i} className={line.includes('(') ? "arabic-text text-2xl text-right" : "text-brand-primary"}>
                        {line}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              {!showAnswer ? (
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 mastery-button bg-brand-primary text-white hover:bg-brand-secondary"
                >
                  Show Answer
                </button>
              ) : (
                <button 
                  onClick={onNext}
                  className="flex-1 mastery-button bg-brand-accent text-white hover:bg-brand-accent/90"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mastery-card h-[400px] flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
            <BookOpen size={48} className="text-brand-secondary/20" />
            <div className="space-y-2">
              <h3 className="font-bold text-brand-secondary">Ready to Study?</h3>
              <p className="text-sm text-brand-secondary max-w-xs">Select your test pool and question types in the sidebar to begin your mastery session.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function QuizView({ testPool, attempts, setAttempts, focusWeak, active, setActive }: { testPool: Ayah[], attempts: Attempt[], setAttempts: (a: Attempt[]) => void, focusWeak: boolean, active: boolean, setActive: (a: boolean) => void }) {
  const [variant, setVariant] = useState<QuizVariant | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [finished, setFinished] = useState(false);

  // Stats calculation for weak areas
  const stats = useMemo<Record<number, { correct: number, total: number }>>(() => {
    const pageStats: Record<number, { correct: number, total: number }> = {};
    attempts.forEach(a => {
      if (!pageStats[a.page_13line]) pageStats[a.page_13line] = { correct: 0, total: 0 };
      pageStats[a.page_13line].total++;
      if (a.correct) pageStats[a.page_13line].correct++;
    });
    return pageStats;
  }, [attempts]);

  const startQuiz = (v: QuizVariant) => {
    if (testPool.length === 0) return;
    setVariant(v);
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setCurrentIndex(0);
    setFinished(false);
    
    // Generate questions
    const count = v === 'normal' ? 25 : 100; // High score/speedrun need more
    const qs: Question[] = [];

    for (let i = 0; i < count; i++) {
      let pool = testPool;
      if (focusWeak && Math.random() < 0.7) {
        const weakPages = (Object.entries(stats) as [string, { correct: number, total: number }][])
          .filter(([_, s]) => (s.correct / s.total) < 0.7)
          .map(([p]) => parseInt(p));
        if (weakPages.length > 0) {
          pool = testPool.filter(a => weakPages.includes(a.page_13line));
          if (pool.length === 0) pool = testPool;
        }
      }
      
      const randomAyah = pool[Math.floor(Math.random() * pool.length)] || testPool[Math.floor(Math.random() * testPool.length)];
      const type = QUESTION_TYPES_QUIZ[Math.floor(Math.random() * QUESTION_TYPES_QUIZ.length)];
      
      let q: Question = {
        id: i.toString(),
        text: '',
        answer: '',
        ayah: randomAyah,
        type,
        options: []
      };

      // Simple question generation for quiz
      switch (type) {
        case 'ayah_number':
          q.text = "What is the ayah number?";
          q.arabic = randomAyah.text_indopak;
          q.answer = randomAyah.ayah.toString();
          break;
        case 'page_number':
          q.text = "What page is this ayah on?";
          q.arabic = randomAyah.text_indopak;
          q.answer = randomAyah.page_13line.toString();
          break;
        default:
          q.text = `What is the ayah key for this?`;
          q.arabic = randomAyah.text_indopak;
          q.answer = randomAyah.verse_key;
      }

      // Generate options for multiple choice
      const options = new Set([q.answer]);
      while (options.size < 4) {
        const other = testPool[Math.floor(Math.random() * testPool.length)];
        options.add(type === 'ayah_number' ? other.ayah.toString() : other.page_13line.toString());
      }
      q.options = Array.from(options).sort(() => Math.random() - 0.5);
      qs.push(q);
    }

    setQuestions(qs);
    setActive(true);
  };

  useEffect(() => {
    let timer: any;
    if (active && variant === 'speedrun' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setFinished(true);
    }
    return () => clearInterval(timer);
  }, [active, variant, timeLeft]);

  const handleAnswer = async (ans: string) => {
    const q = questions[currentIndex];
    const isCorrect = ans === q.answer;
    
    // Log attempt
    const attemptData = {
      ayah_key: q.ayah.verse_key,
      question_type: q.type,
      page_13line: q.ayah.page_13line,
      juz_number: q.ayah.juz_number,
      ruku_in_juz: q.ayah.ruku_in_juz,
      correct: isCorrect
    };

    await fetch('/api/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attemptData)
    });

    // Update local state
    setAttempts([...attempts, { ...attemptData, id: Date.now(), timestamp: new Date().toISOString() } as Attempt]);

    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      if (variant === 'highscore') {
        setLives(l => l - 1);
        if (lives <= 1) setFinished(true);
      }
    }

    if (variant === 'normal' && currentIndex >= 24) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  if (finished) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Quiz Complete</h2>
          <p className="text-brand-secondary">Session results and analysis</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="mastery-card">
            <div className="text-3xl font-bold">{score}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary mt-1">Score</div>
          </div>
          <div className="mastery-card">
            <div className="text-3xl font-bold">{Math.round((score / (currentIndex + 1)) * 100)}%</div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary mt-1">Accuracy</div>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setActive(false)} className="flex-1 mastery-button bg-brand-secondary text-white hover:bg-brand-primary">Back to Menu</button>
          <button onClick={() => startQuiz(variant!)} className="flex-1 mastery-button bg-brand-accent text-white hover:bg-brand-accent/90">Try Again</button>
        </div>
      </motion.div>
    );
  }

  if (active) {
    const q = questions[currentIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
              Question {currentIndex + 1}
            </span>
            {variant === 'speedrun' && (
              <div className="flex items-center gap-1 text-brand-accent font-bold">
                <Clock size={14} />
                {timeLeft}s
              </div>
            )}
            {variant === 'highscore' && (
              <div className="flex items-center gap-1 text-brand-accent-2 font-bold">
                <Heart size={14} fill="currentColor" />
                {lives}
              </div>
            )}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
            Score: {score}
          </div>
        </div>

        <div className="mastery-card space-y-8">
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-medium">{q.text}</h3>
            {q.arabic && (
              <div className="arabic-text text-4xl leading-loose p-8 bg-gray-50 rounded-lg">
                {q.arabic}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {q.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="mastery-button-secondary py-4 text-lg hover:border-brand-accent hover:text-brand-accent"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="mastery-card flex flex-col justify-between p-6 border-t-4 border-brand-secondary">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-brand-secondary/10 rounded-full flex items-center justify-center text-brand-secondary">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Normal Mode</h3>
                <p className="text-sm text-brand-secondary">25 questions covering your selected range.</p>
              </div>
            </div>
            <button onClick={() => startQuiz('normal')} className="mastery-button-primary mt-6">Start Quiz</button>
          </div>

          <div className="mastery-card flex flex-col justify-between p-6 border-t-4 border-brand-accent">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-brand-accent/10 rounded-full flex items-center justify-center text-brand-accent">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Speedrun</h3>
                <p className="text-sm text-brand-secondary">Answer as many as you can in 60 seconds.</p>
              </div>
            </div>
            <button onClick={() => startQuiz('speedrun')} className="mastery-button-primary mt-6">Start Speedrun</button>
          </div>

          <div className="mastery-card flex flex-col justify-between p-6 border-t-4 border-brand-accent-2">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-brand-accent-2/10 rounded-full flex items-center justify-center text-brand-accent-2">
                <Heart size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">High Score</h3>
                <p className="text-sm text-brand-secondary">3 lives. How long can you survive?</p>
              </div>
            </div>
            <button onClick={() => startQuiz('highscore')} className="mastery-button-primary mt-6">Start Challenge</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProgressView({ attempts, resetProgress }: { attempts: Attempt[], resetProgress: () => void }) {
  const stats = useMemo(() => {
    if (attempts.length === 0) return null;
    
    const accuracy = (attempts.filter(a => a.correct).length / attempts.length) * 100;
    
    const pageAccuracy: Record<number, { correct: number, total: number }> = {};
    const juzAccuracy: Record<number, { correct: number, total: number }> = {};
    const typeAccuracy: Record<string, { correct: number, total: number }> = {};

    attempts.forEach(a => {
      [pageAccuracy[a.page_13line], juzAccuracy[a.juz_number], typeAccuracy[a.question_type]].forEach((obj, i) => {
        const key = i === 0 ? a.page_13line : i === 1 ? a.juz_number : a.question_type;
        const target = i === 0 ? pageAccuracy : i === 1 ? juzAccuracy : typeAccuracy;
        if (!target[key]) target[key] = { correct: 0, total: 0 };
        target[key].total++;
        if (a.correct) target[key].correct++;
      });
    });

    const getWeakest = (obj: Record<string, { correct: number, total: number }>) => {
      const entries = Object.entries(obj);
      if (entries.length === 0) return ["N/A", { correct: 0, total: 1 }] as [string, { correct: number, total: number }];
      return entries.sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0] as [string, { correct: number, total: number }];
    };

    const weakestPage = getWeakest(pageAccuracy);
    const weakestJuz = getWeakest(juzAccuracy);
    const weakestType = getWeakest(typeAccuracy);

    return {
      total: attempts.length,
      accuracy,
      weakestPage,
      weakestJuz,
      weakestType
    };
  }, [attempts]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Mastery Progress</h2>
          <p className="text-white/80">Detailed analysis of your structural knowledge</p>
        </div>
        <button onClick={resetProgress} className="text-xs font-bold text-brand-accent-2 hover:text-white transition-colors uppercase tracking-widest">
          Reset All Progress
        </button>
      </div>

      {!stats ? (
        <div className="mastery-card h-64 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
          <History size={48} className="text-brand-secondary/20" />
          <div className="space-y-2">
            <h3 className="font-bold text-brand-secondary">No Data Yet</h3>
            <p className="text-sm text-brand-secondary max-w-xs">Complete a quiz session to start tracking your progress.</p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="mastery-card col-span-full grid grid-cols-2 md:grid-cols-4 gap-8 border-b-4 border-brand-primary">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Total Answered</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Overall Accuracy</div>
              <div className="text-3xl font-bold text-brand-secondary">{Math.round(stats.accuracy)}%</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Weakest Page</div>
              <div className="text-3xl font-bold text-brand-accent">#{stats.weakestPage[0]}</div>
              <div className="text-[10px] text-brand-accent-2 font-bold uppercase">{Math.round((stats.weakestPage[1].correct / stats.weakestPage[1].total) * 100)}% Accuracy</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Weakest Juz</div>
              <div className="text-3xl font-bold text-brand-accent-2">#{stats.weakestJuz[0]}</div>
              <div className="text-[10px] text-brand-accent-2 font-bold uppercase">{Math.round((stats.weakestJuz[1].correct / stats.weakestJuz[1].total) * 100)}% Accuracy</div>
            </div>
          </div>

          <div className="mastery-card md:col-span-2 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Accuracy by Question Type</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{stats.weakestType[0].replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-secondary transition-all" 
                      style={{ width: `${(stats.weakestType[1].correct / stats.weakestType[1].total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8">{Math.round((stats.weakestType[1].correct / stats.weakestType[1].total) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mastery-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand-secondary">Recent Activity</h3>
            <div className="space-y-3">
              {attempts.slice(-5).reverse().map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {a.correct ? <CheckCircle2 size={14} className="text-brand-secondary" /> : <XCircle size={14} className="text-brand-accent-2" />}
                    <span className="font-medium">{a.ayah_key}</span>
                  </div>
                  <span className="text-brand-secondary">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

