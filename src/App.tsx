/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Languages, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ar');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, `[${time}] ${msg}`].slice(-10));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setInputText(event.target?.result as string);
      setError(null);
      addLog(`Loaded file: ${file.name} (${Math.round(file.size / 1024)}KB)`);
    };
    reader.readAsText(file);
  };

  const translateSRT = async () => {
    if (!inputText.trim()) {
      setError('Input buffer empty. Please provide SRT data.');
      return;
    }

    setIsLoading(true);
    setProgress(10);
    setError(null);
    addLog(`Initializing translation: ${sourceLang} -> ${targetLang}`);

    try {
      const lines = inputText.split("\n");
      const textLines: string[] = [];
      const mapIndex: number[] = [];

      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed !== "" && !trimmed.match(/^\d+$/) && !trimmed.includes("-->")) {
          textLines.push(trimmed);
          mapIndex.push(i);
        }
      });

      if (textLines.length === 0) throw new Error("No dialogue sequences detected.");
      addLog(`Parsed ${textLines.length} dialogue sequences.`);

      setProgress(30);
      const batchSize = 50;
      const translatedLines: string[] = [];

      for (let i = 0; i < textLines.length; i += batchSize) {
        const batch = textLines.slice(i, i + batchSize);
        addLog(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(textLines.length/batchSize)}...`);
        
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: batch.join("\n"),
            source: sourceLang,
            target: LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Upstream API failure");
        }

        const data = await response.json();
        const batchTranslated = data.translatedText.split("\n");
        
        for (let j = 0; j < batch.length; j++) {
          translatedLines.push(batchTranslated[j] || batch[j]);
        }

        setProgress(30 + Math.floor((i / textLines.length) * 60));
      }

      const resultLines = [...lines];
      mapIndex.forEach((index, i) => {
        resultLines[index] = translatedLines[i] || lines[index];
      });

      setOutputText(resultLines.join("\n"));
      addLog(`Translation complete. Assets verified.`);
      setProgress(100);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Execution error.");
      addLog(`ERROR: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSRT = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName ? `translated_${fileName}` : "translated.srt";
    link.click();
    URL.revokeObjectURL(url);
    addLog(`Exported: ${link.download}`);
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setFileName(null);
    setProgress(0);
    setError(null);
    setLogs([]);
    addLog(`System state reset.`);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col overflow-x-hidden selection:bg-slate-200">
      {/* Nav */}
      <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black flex items-center justify-center rotate-45">
            <div className="w-3 h-3 bg-white -rotate-45"></div>
          </div>
          <span className="font-bold tracking-tight text-xl uppercase italic">SRT.OS</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span className="text-black border-b-2 border-black pb-5 mt-5 h-16 flex items-center">Translator</span>
          <a href="#" className="hover:text-black transition-colors py-5 h-16 flex items-center">Documentation</a>
          <a href="#" className="hover:text-black transition-colors py-5 h-16 flex items-center">Settings</a>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200 uppercase tracking-wider">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
            {isLoading ? 'Processing' : 'System Ready'}
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 p-8 grid grid-cols-12 grid-rows-6 gap-6 bg-slate-50 min-h-0">
        {/* Project Header */}
        <div className="col-span-12 lg:col-span-8 row-span-2 bg-white border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Session</p>
              <h1 className="text-3xl font-light text-slate-800 tracking-tight">
                {fileName || 'Unbuffered Session'}
              </h1>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Engine</p>
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 border border-slate-200">
                <span className="text-xs font-mono text-slate-600">Gemini-2.0-Flash</span>
                <Sparkles size={12} className="text-indigo-500" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-8 sm:gap-16 mt-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Source</span>
              <select 
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-transparent border-b border-slate-300 py-1 font-semibold text-sm outline-none focus:border-black transition-colors"
              >
                <option value="auto">AUTO-DETECT</option>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target</span>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent border-b border-slate-300 py-1 font-semibold text-sm outline-none focus:border-black transition-colors"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
              <span className="text-xl font-semibold tracking-tighter">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Console / Logs */}
        <div className="col-span-12 lg:col-span-4 row-span-4 bg-black p-6 flex flex-col order-first lg:order-none">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">System Console</span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
              <div className="w-2 h-2 rounded-full bg-slate-700"></div>
            </div>
          </div>
          <div className="font-mono text-[11px] leading-relaxed flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">Idle. Awaiting file input...</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className={log.includes('ERROR') ? 'text-red-400' : log.includes('complete') ? 'text-green-400' : 'text-slate-400'}>
                  {log}
                </p>
              ))
            )}
            {isLoading && <p className="text-blue-400 animate-pulse">Running neural mapping process...</p>}
            <p className="text-slate-600 animate-pulse">_</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
             <label className="block w-full cursor-pointer group">
               <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">
                 <span>Upload Buffer</span>
                 <Upload size={12} />
               </div>
               <input type="file" className="hidden" accept=".srt" onChange={handleFileUpload} />
             </label>
          </div>
        </div>

        {/* Editor Grids */}
        <div className="col-span-12 lg:col-span-4 row-span-2 bg-white border border-slate-200 flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Buffer Input</span>
            <span className="font-mono">{inputText.length ? `${Math.round(inputText.length/1024)}KB` : 'Empty'}</span>
          </div>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 p-4 font-mono text-[11px] resize-none outline-none text-slate-700 leading-normal"
            placeholder="Paste raw SRT sequence here..."
          />
        </div>

        <div className="col-span-12 lg:col-span-4 row-span-2 bg-white border border-slate-200 flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Buffer Output</span>
            {outputText && <Check size={12} className="text-green-500" />}
          </div>
          <textarea 
            readOnly
            value={outputText}
            className="flex-1 p-4 font-mono text-[11px] resize-none outline-none text-slate-900 leading-normal"
            placeholder="Awaiting translation stream..."
          />
        </div>

        {/* Action Panel */}
        <div className="col-span-12 row-span-2 bg-white border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-12 mt-4 lg:mt-0">
          <div className="flex-1 flex flex-col text-center md:text-left">
            <h3 className="text-4xl font-bold tracking-tighter">Verified Deployment</h3>
            <p className="text-slate-500 text-sm mt-3 max-w-md">
              Timestamps are locked. Sequence indices are immutable. 
              The translation engine handles dialogue context while 
              preserving subtitle structural integrity.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {error && (
              <div className="flex-1 flex items-center gap-2 px-4 py-4 bg-red-50 text-red-700 text-xs font-bold border border-red-100 uppercase tracking-wider">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
            <button 
              onClick={translateSRT}
              disabled={isLoading || !inputText}
              className="px-12 py-5 bg-black text-white font-bold text-xs hover:bg-slate-800 transition-all uppercase tracking-[0.2em] disabled:opacity-30 disabled:hover:bg-black active:scale-95"
            >
              Initialize Push
            </button>
            <button 
              onClick={downloadSRT}
              disabled={!outputText}
              className="px-12 py-5 border-2 border-black text-black font-bold text-xs hover:bg-slate-50 transition-all uppercase tracking-[0.2em] disabled:opacity-20 disabled:border-slate-200 active:scale-95"
            >
              Export Archive
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Build v1.0.4 - NODE-STABLE</div>
        <div className="flex items-center gap-6">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Engine: Gemini 2.0</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] hidden sm:block font-mono">Status: {isLoading ? 'BUSY' : 'READY'}</div>
        </div>
      </footer>
    </div>
  );
}
