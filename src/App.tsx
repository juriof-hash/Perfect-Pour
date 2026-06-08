import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Droplet, Trash2, Sparkles, Info, Settings, Wand2 } from 'lucide-react';

type FlaskData = {
  id: string;
  max: number;
  current: number;
  colorClass: string;
};

const COLORS = [
  'bg-gradient-to-t from-pink-500 via-pink-400 to-pink-300',
  'bg-gradient-to-t from-indigo-500 via-indigo-400 to-indigo-300',
  'bg-gradient-to-t from-emerald-500 via-emerald-400 to-emerald-300',
];

// Helper to determine greatest common divisor
const getGcd = (a: number, b: number): number => b === 0 ? a : getGcd(b, a % b);
const getArrayGcd = (arr: number[]) => arr.reduce((acc, val) => getGcd(acc, val));

export default function App() {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  
  const [setupConfig, setSetupConfig] = useState<{
    flaskCount: 2 | 3;
    caps: number[];
    target: number;
  }>({
    flaskCount: 2,
    caps: [5, 3],
    target: 4
  });

  const [flasks, setFlasks] = useState<FlaskData[]>([]);
  const [target, setTarget] = useState(4);
  const [moves, setMoves] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Refs for state access inside framer-motion drag handlers
  const flasksRef = useRef(flasks);
  useEffect(() => { flasksRef.current = flasks; }, [flasks]);

  const startGame = () => {
    const currentCaps = setupConfig.caps.slice(0, setupConfig.flaskCount);
    
    if (currentCaps.some(cap => !cap || cap <= 0)) {
      setSetupError('모든 물약병의 용량은 1L 이상이어야 합니다.');
      return;
    }
    
    const maxCap = Math.max(...currentCaps);
    if (setupConfig.target > maxCap) {
      setSetupError(`목표 용량(${setupConfig.target}L)은 가장 큰 물약병의 용량(${maxCap}L)보다 클 수 없습니다.`);
      return;
    }

    if (!setupConfig.target || setupConfig.target <= 0) {
       setSetupError('목표 용량은 1L 이상이어야 합니다.');
       return;
    }

    const gcd = getArrayGcd(currentCaps);
    if (setupConfig.target % gcd !== 0) {
       setSetupError(`입력한 병들로는 ${setupConfig.target}L를 정확히 만들 수 없습니다. (${gcd}의 배수만 가능)`);
       return;
    }

    setSetupError(null);
    const newFlasks = currentCaps.map((cap, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C
      max: cap,
      current: 0,
      colorClass: COLORS[idx % COLORS.length]
    }));
    setFlasks(newFlasks);
    setTarget(setupConfig.target);
    setMoves(0);
    setIsSuccess(false);
    setGameState('playing');
  };

  const handleAutoRecommend = () => {
    const currentCaps = setupConfig.caps.slice(0, setupConfig.flaskCount).filter(c => c > 0);
    if (currentCaps.length === 0) return;
    
    const gcd = getArrayGcd(currentCaps);
    const maxVal = Math.max(...currentCaps);
    
    let validTargets = [];
    for (let i = gcd; i <= maxVal; i += gcd) {
      if (!currentCaps.includes(i)) validTargets.push(i);
    }
    
    if (validTargets.length === 0) {
      for (let i = gcd; i <= maxVal; i += gcd) validTargets.push(i);
    }
    
    const rec = validTargets[Math.floor(Math.random() * validTargets.length)] || gcd;
    setSetupConfig(prev => ({ ...prev, target: rec }));
  };

  const updateCap = (idx: number, val: number) => {
    setSetupError(null);
    const newCaps = [...setupConfig.caps];
    newCaps[idx] = val;
    setSetupConfig({ ...setupConfig, caps: newCaps });
  };

  const handleDragEnd = (sourceId: string, info: any) => {
    if (isSuccess) return;

    const sourceElem = document.getElementById(`flask-${sourceId}-draggable`);
    const sourceRect = sourceElem?.getBoundingClientRect();

    const currentFlasks = flasksRef.current;
    
    const targets = [
      { id: 'spring', rect: document.getElementById('spring-zone')?.getBoundingClientRect(), padding: 80 },
      { id: 'cauldron', rect: document.getElementById('cauldron-zone-mobile')?.getBoundingClientRect(), padding: 80 },
      { id: 'cauldron', rect: document.getElementById('cauldron-zone-desktop')?.getBoundingClientRect(), padding: 80 }
    ];
    
    currentFlasks.forEach(f => {
      if (f.id !== sourceId) {
        targets.push({
          id: `flask-${f.id}`,
          rect: document.getElementById(`flask-${f.id}-zone`)?.getBoundingClientRect(),
          padding: 30
        });
      }
    });

    const getDropTarget = () => {
      let bestTarget = null;
      let maxScore = 0;

      targets.forEach(t => {
        if (!t.rect || t.rect.width === 0 || t.rect.height === 0) return;
        let score = 0;

        if (
          info.point.x >= t.rect.left - t.padding &&
          info.point.x <= t.rect.right + t.padding &&
          info.point.y >= t.rect.top - t.padding &&
          info.point.y <= t.rect.bottom + t.padding
        ) {
          score += 100000;
        }

        if (sourceRect) {
           const overlapLeft = Math.max(sourceRect.left, t.rect.left - t.padding);
           const overlapRight = Math.min(sourceRect.right, t.rect.right + t.padding);
           const overlapTop = Math.max(sourceRect.top, t.rect.top - t.padding);
           const overlapBottom = Math.min(sourceRect.bottom, t.rect.bottom + t.padding);

           if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
             const area = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
             score += area;
             
             const sourceCenterX = sourceRect.left + sourceRect.width / 2;
             const sourceCenterY = sourceRect.top + sourceRect.height / 2;
             const targetCenterX = t.rect.left + t.rect.width / 2;
             const targetCenterY = t.rect.top + t.rect.height / 2;
             const dist = Math.sqrt(Math.pow(sourceCenterX - targetCenterX, 2) + Math.pow(sourceCenterY - targetCenterY, 2));
             score += Math.max(0, 1000 - dist) * 10;
           }
        }

        if (score > maxScore && score > 0) {
          maxScore = score;
          bestTarget = t.id;
        }
      });
      return bestTarget;
    };

    let newFlasks: FlaskData[] | null = null;
    let didMove = false;
    const targetAction = getDropTarget();
    const sourceFlask = currentFlasks.find(f => f.id === sourceId)!;

    if (targetAction?.startsWith('flask-')) {
      const destId = targetAction.replace('flask-', '');
      const destFlask = currentFlasks.find(f => f.id === destId)!;
      const amount = Math.min(sourceFlask.current, destFlask.max - destFlask.current);
      
      if (amount > 0) {
        newFlasks = currentFlasks.map(f => {
          if (f.id === sourceId) return { ...f, current: f.current - amount };
          if (f.id === destId) return { ...f, current: f.current + amount };
          return f;
        });
        didMove = true;
      }
    } else if (targetAction === 'spring') {
      if (sourceFlask.current < sourceFlask.max) {
        newFlasks = currentFlasks.map(f => 
          f.id === sourceId ? { ...f, current: f.max } : f
        );
        didMove = true;
      }
    } else if (targetAction === 'cauldron') {
      if (sourceFlask.current > 0) {
        newFlasks = currentFlasks.map(f => 
          f.id === sourceId ? { ...f, current: 0 } : f
        );
        didMove = true;
      }
    }

    if (newFlasks) {
      setFlasks(newFlasks);
      if (didMove) setMoves(m => m + 1);

      if (newFlasks.some(f => f.current === target)) {
        setTimeout(() => setIsSuccess(true), 400);
      }
    }
  };

  const SpringZone = () => (
    <div id="spring-zone" className="relative w-[7.5rem] h-40 sm:w-44 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center transition-all group shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-300/40 via-cyan-300/30 to-blue-400/40 rounded-[2rem] blur-[20px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 will-change-transform" />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-[2rem] border-[3px] border-white/50 shadow-[0_0_25px_rgba(45,212,191,0.4),inset_0_0_20px_rgba(255,255,255,0.8)] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[200%] opacity-60 mix-blend-overlay">
           <div className="w-full h-full bg-gradient-to-b from-transparent via-cyan-200/80 to-transparent animate-water-flow" />
        </div>
        <div className="absolute bottom-[-10%] inset-x-[-10%] h-1/2 bg-teal-400/40 blur-[15px] rounded-[50%] animate-swirl" />
        <div className="absolute bottom-[-5%] inset-x-[-20%] h-[60%] bg-cyan-300/40 blur-[25px] rounded-[50%] animate-swirl-reverse" />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute bottom-4 left-[20%] w-2.5 h-2.5 bg-teal-100 rounded-full blur-[1px] shadow-[0_0_8px_rgba(204,253,246,1)] animate-particle-1" />
          <div className="absolute bottom-2 left-[50%] w-3.5 h-3.5 bg-cyan-100 rounded-full blur-[2px] shadow-[0_0_10px_rgba(207,250,254,1)] animate-particle-2" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center animate-float pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-200 blur-xl opacity-60 rounded-full transform scale-150" />
          <Droplet className="w-8 h-8 sm:w-14 sm:h-14 text-teal-400 mb-2 fill-cyan-100 drop-shadow-[0_0_15px_rgba(45,212,191,0.9)] relative z-10" />
        </div>
        <span className="text-teal-900 font-black text-xs sm:text-base tracking-wide drop-shadow-[0_3px_5px_rgba(255,255,255,0.9)]">마법의 샘</span>
        <span className="text-teal-800 font-extrabold text-[0.65rem] sm:text-sm bg-white/80 px-2 sm:px-3 py-1 rounded-full mt-1 sm:mt-2 shadow-[0_0_15px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(255,255,255,1)] border-[1.5px] border-teal-200/80 shadow-sm backdrop-blur-md">✨ 채우기</span>
      </div>
    </div>
  );

  const CauldronZone = ({ idStr }: { idStr?: string }) => (
    <div id={idStr || "cauldron-zone"} className="relative w-[7.5rem] h-40 sm:w-44 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center transition-all group shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-500/10 to-indigo-600/20 rounded-[2rem] blur-[20px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 will-change-transform" />
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-[2rem] border-[3px] border-white/40 shadow-[0_0_20px_rgba(168,85,247,0.2),inset_0_0_20px_rgba(255,255,255,0.8)] overflow-hidden flex flex-col items-center justify-end pb-3 sm:pb-8">
        <div className="relative w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-b from-purple-900 to-[#1e0a38] rounded-[40%] flex items-center justify-center shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.2)] border-t border-purple-500/50 z-10 animate-float">
          <div className="w-14 h-14 sm:w-24 sm:h-24 bg-gradient-to-b from-[#2a1045] to-[#130526] rounded-[40%] flex items-center justify-center shadow-inner relative overflow-hidden">
             <div className="absolute bottom-[-20%] inset-x-[-20%] h-[120%] bg-fuchsia-500/40 blur-[10px] rounded-[50%] animate-swirl" />
             <div className="absolute bottom-[-10%] inset-x-[-10%] h-[100%] bg-purple-400/40 blur-[15px] rounded-[50%] animate-swirl-reverse" />
          </div>
          <Trash2 className="w-6 h-6 sm:w-12 sm:h-12 text-purple-200 z-10 absolute drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center mt-auto pointer-events-none pb-3 sm:pb-6">
        <span className="text-purple-900 font-black text-xs sm:text-base tracking-wide drop-shadow-[0_3px_5px_rgba(255,255,255,0.9)]">마법 가마솥</span>
        <span className="text-purple-800 font-extrabold text-[0.65rem] sm:text-sm bg-white/80 px-2 sm:px-3 py-1 rounded-full mt-1 sm:mt-2 shadow-[0_0_15px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(255,255,255,1)] border-[1.5px] border-purple-200/80 backdrop-blur-md">🌪️ 버리기</span>
      </div>
    </div>
  );

  const getVisualConfig = (max: number, totalFlasks: number) => {
     const baseH = totalFlasks === 3 ? 120 : 150; 
     const baseW = totalFlasks === 3 ? 65 : 85;
     return { height: baseH + (max - 3) * 15, width: baseW + (max - 3) * 4 };
  };

  const Flask = ({ id, current, max, colorClass, totalFlasks }: FlaskData & { totalFlasks: number }) => {
    const config = getVisualConfig(max, totalFlasks);
    const heightPercent = max > 0 ? (current / max) * 100 : 0;
    
    return (
      <div id={`flask-${id}-zone`} className="relative flex flex-col items-center justify-end z-20 shrink-0 mx-2 sm:mx-4" style={{ height: 320, width: config.width + 10 }}>
        <div className="absolute bottom-16 w-24 h-4 rounded-[50%] bg-black/5 blur-sm" />
        
        <motion.div
           id={`flask-${id}-draggable`}
           drag
           dragSnapToOrigin
           dragTransition={{ bounceStiffness: 400, bounceDamping: 20 }}
           whileDrag={{ scale: 1.08, rotate: id === 'A' ? 5 : -5, zIndex: 50, cursor: 'grabbing' }}
           whileHover={{ scale: 1.03 }}
           onDragEnd={(e, info) => handleDragEnd(id, info)}
           className="relative cursor-grab active:cursor-grabbing flex flex-col justify-end items-center mb-8 will-change-transform group"
           style={{ height: config.height, width: config.width }}
        >
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-x-[4px] sm:border-x-[5px] border-white bg-white/30 backdrop-blur-[2px] z-10 relative left-[1px]">
               <div className="absolute -top-1.5 -inset-x-3 h-4 rounded-[50%] border-[3px] sm:border-[4px] border-white bg-white/60 shadow-sm" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all font-bold">
                  ↕
               </div>
            </div>
            
            <div className="relative w-full flex-1 border-[4px] sm:border-[5px] border-b-[6px] sm:border-b-[8px] border-white rounded-b-[2rem] rounded-t-xl overflow-hidden bg-white/20 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_-10px_20px_rgba(255,255,255,0.8)] flex flex-col justify-end">
               <div 
                 className={`w-full transition-[height] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative ${colorClass}`}
                 style={{ height: `${heightPercent}%`, minHeight: current > 0 ? '8px' : '0px' }}
               >
                  <div className="absolute top-0 inset-x-0 h-4 bg-white/30 backdrop-blur-sm -mt-2 rounded-[50%] border-t border-white/20" />
                  {current > 0 && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                         <div className="absolute -bottom-2 left-[25%] w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/40 animate-[ping_2s_infinite]" />
                         <div className="absolute bottom-4 right-[30%] w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/50 animate-[ping_3s_infinite_1s]" />
                      </div>
                  )}
               </div>
            </div>
        </motion.div>

        <div className="text-center absolute bottom-0 inset-x-0 pointer-events-none">
            <div className="font-mono font-bold text-xl sm:text-2xl text-slate-700 flex items-baseline justify-center gap-1">
               {current} <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {max}L</span>
            </div>
            <div className={`font-bold mt-0.5 text-[0.65rem] sm:text-xs px-2 py-0.5 rounded-full border bg-white/80 backdrop-blur inline-block shadow-sm ${colorClass.includes('pink') ? 'text-pink-500 border-pink-100' : colorClass.includes('indigo') ? 'text-indigo-500 border-indigo-100' : 'text-emerald-500 border-emerald-100'}`}>
               물약병 {id}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6ff] via-[#f0f4ff] to-[#fff0f5] flex flex-col p-4 sm:p-6 overflow-x-hidden font-sans selection:bg-purple-200">
      
      {gameState === 'setup' ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-xl border border-white max-w-md w-full mx-auto relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-300 rounded-full blur-[50px] opacity-20 pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-300 rounded-full blur-[50px] opacity-20 pointer-events-none" />
            
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500 mb-8 text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-400" /> 마법의 물약 제조
            </h2>
            
            <div className="mb-6 relative z-10">
              <label className="block text-sm font-bold text-slate-600 mb-2">물약병 개수</label>
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                <button 
                  onClick={() => { setSetupError(null); setSetupConfig(s => ({ ...s, flaskCount: 2 })); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${setupConfig.flaskCount === 2 ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                >2개 사용</button>
                <button 
                  onClick={() => {
                     setSetupError(null);
                     const newCaps = [...setupConfig.caps];
                     if (newCaps.length < 3) newCaps.push(7);
                     setSetupConfig(s => ({ ...s, flaskCount: 3, caps: newCaps }));
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${setupConfig.flaskCount === 3 ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                >3개 사용</button>
              </div>
            </div>

            <div className="mb-6 relative z-10">
              <label className="block text-sm font-bold text-slate-600 mb-2">각 물약병의 최대 용량 (L)</label>
              <div className="flex gap-3">
                 {Array.from({ length: setupConfig.flaskCount }).map((_, i) => (
                   <div key={i} className="flex-1 flex flex-col">
                      <span className="text-xs text-center text-slate-500 mb-1 font-semibold">병 {String.fromCharCode(65+i)}</span>
                      <input 
                        type="number" min="1" max="20"
                        value={setupConfig.caps[i] || ''}
                        onChange={(e) => updateCap(i, parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-center font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all font-mono text-lg shadow-sm"
                      />
                   </div>
                 ))}
              </div>
            </div>

            <div className="mb-6 relative z-10">
               <label className="block text-sm font-bold text-slate-600 mb-2">목표 마법 용량 (L)</label>
               <div className="flex gap-2">
                 <input 
                   type="number" min="1"
                   value={setupConfig.target || ''}
                   onChange={(e) => { setSetupError(null); setSetupConfig({ ...setupConfig, target: parseInt(e.target.value) || 0 }); }}
                   className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all font-mono text-lg shadow-sm"
                 />
                 <button 
                   onClick={() => { setSetupError(null); handleAutoRecommend(); }}
                   className="bg-violet-50 text-violet-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-100 transition-colors flex items-center justify-center gap-1 border border-violet-200 shadow-sm whitespace-nowrap active:scale-95"
                 >
                   <Wand2 className="w-4 h-4" />
                   자동 추천
                 </button>
               </div>
            </div>

            <AnimatePresence>
              {setupError && (
                 <motion.div 
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="mb-6 text-sm font-semibold text-pink-600 bg-pink-50 p-3 rounded-xl border border-pink-200 flex items-start gap-2 overflow-hidden"
                 >
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{setupError}</span>
                 </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-extrabold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10"
            >
              마법 실험 시작하기
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Header Region */}
          <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between mt-2 mb-8 gap-4 px-2">
             <div className="flex items-center gap-4">
                <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-2xl px-5 py-3 flex items-center gap-4 border border-white">
                   <div className="flex items-center gap-2 text-slate-600 font-medium">
                      <span className="opacity-80 text-sm">목표 용량</span>
                      <span className="font-black text-xl text-violet-600 bg-violet-100/50 border border-violet-100 px-3 py-1 rounded-xl shadow-inner font-mono tabular-nums">{target}L</span>
                   </div>
                   <div className="w-px h-6 bg-slate-200" />
                   <div className="flex items-center gap-2 text-slate-500 font-medium">
                      <span className="opacity-80 text-sm">이동</span> 
                      <span className="font-bold text-xl text-slate-800 font-mono tabular-nums">{moves}</span>
                   </div>
                </div>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={() => setGameState('setup')}
                  className="px-4 py-2.5 bg-white/70 backdrop-blur-sm text-slate-600 border border-slate-200 font-semibold rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all outline-none flex items-center gap-1.5 text-sm"
                >
                  <Settings className="w-4 h-4" /> 설정 변경
                </button>
                <button 
                  onClick={startGame}
                  className="px-4 py-2.5 bg-white/70 backdrop-blur-sm text-pink-600 border border-pink-200 font-bold rounded-xl shadow-sm hover:bg-pink-50 active:scale-95 transition-all outline-none flex items-center gap-1.5 text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> 재시작
                </button>
             </div>
          </div>

          {/* Main Game Interface Container */}
          <div className="flex-1 flex flex-col items-center justify-center relative w-full pb-8 sm:pb-2">
            
            <div className="absolute top-0 flex items-center gap-2 text-slate-500 font-medium text-xs sm:text-sm bg-white/70 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white shadow-sm mb-4 pointer-events-none z-30">
               <Info className="w-4 h-4 text-violet-400" />
               <span>병을 <strong className="text-violet-600">드래그</strong>해서 물을 옮겨 정확히 <strong className="text-pink-500">{target}L</strong> 를 만들어보세요!</span>
            </div>

            <div className="flex flex-col lg:flex-row w-full max-w-6xl items-end justify-center lg:justify-between mt-16 sm:mt-12 pt-4 gap-4 sm:gap-8 px-2 lg:px-6">
               <div className="flex justify-between w-full lg:w-auto px-4 lg:px-0 lg:contents">
                 <div className="flex justify-center"><SpringZone /></div>
                 <div className="flex w-[7.5rem] sm:w-[11rem] justify-center lg:hidden"><CauldronZone idStr="cauldron-zone-mobile" /></div>
               </div>
               
               <div className="flex items-end justify-center gap-4 sm:gap-8 w-full lg:flex-1 pb-10 pt-8 lg:pt-0 flex-wrap">
                   {flasks.map(f => (
                     <Flask key={f.id} {...f} totalFlasks={flasks.length} />
                   ))}
               </div>
               
               <div className="hidden lg:flex w-[11rem] justify-center"><CauldronZone idStr="cauldron-zone-desktop" /></div>
            </div>
          </div>
          
          {/* Success Modal Overlay */}
          <AnimatePresence>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4"
              >
                 <motion.div
                   initial={{ scale: 0.9, y: 30 }}
                   animate={{ scale: 1, y: 0 }}
                   transition={{ type: "spring", stiffness: 300, damping: 25 }}
                   className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-sm sm:max-w-md w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] text-center relative overflow-hidden border border-white"
                 >
                   <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-pink-50 to-indigo-50 opacity-90 pointer-events-none" />
                   <div className="relative z-10 flex flex-col items-center">
                      
                      <motion.div 
                         initial={{ rotate: -180, scale: 0 }}
                         animate={{ rotate: 0, scale: 1 }}
                         transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                         className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-500 text-white rounded-[40%] flex flex-col items-center justify-center mb-6 shadow-xl border-4 border-white"
                      >
                         <Sparkles className="w-12 h-12" strokeWidth={2.5} />
                      </motion.div>
                      
                      <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-orange-400 to-pink-500 mb-3 drop-shadow-sm">
                         성공!
                      </h2>
                      
                      <p className="text-lg text-slate-600 mb-8 font-medium leading-relaxed bg-white/50 p-4 rounded-3xl border border-white/60 w-full shadow-inner">
                         환상적이에요! <span className="font-bold text-violet-600">{moves}</span>번의 이동으로<br/> 
                         목표한 <span className="text-2xl font-black text-pink-500 mx-1">{target}L</span> 마법 물약을 완성했습니다!
                      </p>
                      
                      <div className="flex gap-3 w-full">
                         <button
                           onClick={() => setGameState('setup')}
                           className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                         >
                           설정 변경
                         </button>
                         <button
                           onClick={startGame}
                           className="flex-[2] py-3.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
                         >
                           다시 하기
                         </button>
                      </div>
                   </div>
                 </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
