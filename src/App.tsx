import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Droplet, Trash2, Sparkles, Info } from 'lucide-react';

type FlaskId = 'A' | 'B';

// Helper to determine greatest common divisor
const getGcd = (a: number, b: number): number => b === 0 ? a : getGcd(b, a % b);

export default function App() {
  const [caps, setCaps] = useState({ A: 5, B: 3 });
  const [vals, setVals] = useState({ A: 0, B: 0 });
  const [target, setTarget] = useState(4);
  const [moves, setMoves] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs for state access inside framer-motion drag handlers
  const valsRef = useRef(vals);
  useEffect(() => { valsRef.current = vals; }, [vals]);

  const capsRef = useRef(caps);
  useEffect(() => { capsRef.current = caps; }, [caps]);

  // Generate initial puzzle
  useEffect(() => {
    generatePuzzle();
  }, []);

  const generatePuzzle = () => {
    let a, b;
    do {
      a = Math.floor(Math.random() * 7) + 3; // 3 to 9
      b = Math.floor(Math.random() * 7) + 3; // 3 to 9
    } while (a === b || getGcd(a, b) !== 1);

    const maxCap = Math.max(a, b);
    const t = Math.floor(Math.random() * (maxCap - 1)) + 1; // 1 to maxCap - 1

    setCaps({ A: a, B: b });
    setVals({ A: 0, B: 0 });
    setTarget(t);
    setMoves(0);
    setIsSuccess(false);
  };

  const handleDragEnd = (sourceId: FlaskId, info: any) => {
    if (isSuccess) return;

    // Element representing the dragged flask
    const sourceElem = document.getElementById(`flask-${sourceId}-draggable`);
    const sourceRect = sourceElem?.getBoundingClientRect();

    // Retrieve bounding boxes for drop detection
    const springRect = document.getElementById('spring-zone')?.getBoundingClientRect();
    const cauldronRect = document.getElementById('cauldron-zone')?.getBoundingClientRect();
    const destId = sourceId === 'A' ? 'B' : 'A';
    const destRect = document.getElementById(`flask-${destId}-zone`)?.getBoundingClientRect();

    // Score-based target resolving for much better touch/drag accuracy
    const getDropTarget = () => {
      const targets = [
        { id: 'flask', rect: destRect, padding: 30 },
        { id: 'spring', rect: springRect, padding: 80 },
        { id: 'cauldron', rect: cauldronRect, padding: 80 }
      ];

      let bestTarget = null;
      let maxScore = 0;

      targets.forEach(t => {
        if (!t.rect) return;
        let score = 0;

        // 1. Pointer inside target area (Heavy priority factor)
        if (
          info.point.x >= t.rect.left - t.padding &&
          info.point.x <= t.rect.right + t.padding &&
          info.point.y >= t.rect.top - t.padding &&
          info.point.y <= t.rect.bottom + t.padding
        ) {
          score += 100000;
        }

        // 2. Overlap area bounding box
        if (sourceRect) {
           const overlapLeft = Math.max(sourceRect.left, t.rect.left - t.padding);
           const overlapRight = Math.min(sourceRect.right, t.rect.right + t.padding);
           const overlapTop = Math.max(sourceRect.top, t.rect.top - t.padding);
           const overlapBottom = Math.min(sourceRect.bottom, t.rect.bottom + t.padding);

           if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
             const area = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
             score += area;
             
             // Center proximity bonus
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

    const currentVals = valsRef.current;
    const currentCaps = capsRef.current;

    let newVals: { A: number, B: number } | null = null;
    let didMove = false;

    const targetAction = getDropTarget();

    if (targetAction === 'flask') {
      const amount = Math.min(currentVals[sourceId], currentCaps[destId] - currentVals[destId]);
      if (amount > 0) {
        newVals = {
          ...currentVals,
          [sourceId]: currentVals[sourceId] - amount,
          [destId]: currentVals[destId] + amount
        };
        didMove = true;
      }
    } else if (targetAction === 'spring') {
      if (currentVals[sourceId] < currentCaps[sourceId]) {
        newVals = { ...currentVals, [sourceId]: currentCaps[sourceId] };
        didMove = true;
      }
    } else if (targetAction === 'cauldron') {
      if (currentVals[sourceId] > 0) {
        newVals = { ...currentVals, [sourceId]: 0 };
        didMove = true;
      }
    }

    if (newVals) {
      setVals(newVals);
      if (didMove) setMoves(m => m + 1);

      // Check success condition
      if (newVals.A === target || newVals.B === target) {
        setTimeout(() => setIsSuccess(true), 400); // Slight delay allowing liquid to animate securely
      }
    }
  };

  const SpringZone = () => (
    <div id="spring-zone" className="relative w-[8.5rem] h-48 sm:w-44 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center transition-all group">
      
      {/* Outer Magical Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-300/40 via-cyan-300/30 to-blue-400/40 rounded-[2rem] blur-[20px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 will-change-transform" />
      
      {/* Main Container */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-[2rem] border-[3px] border-white/50 shadow-[0_0_25px_rgba(45,212,191,0.4),inset_0_0_20px_rgba(255,255,255,0.8)] overflow-hidden">
        
        {/* Waterfall Animation */}
        <div className="absolute inset-x-0 top-0 h-[200%] opacity-60 mix-blend-overlay">
           <div className="w-full h-full bg-gradient-to-b from-transparent via-cyan-200/80 to-transparent animate-water-flow" />
        </div>
        
        {/* Rippling Magical Pool */}
        <div className="absolute bottom-[-10%] inset-x-[-10%] h-1/2 bg-teal-400/40 blur-[15px] rounded-[50%] animate-swirl" />
        <div className="absolute bottom-[-5%] inset-x-[-20%] h-[60%] bg-cyan-300/40 blur-[25px] rounded-[50%] animate-swirl-reverse" />
        
        {/* Rising Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute bottom-4 left-[20%] w-2.5 h-2.5 bg-teal-100 rounded-full blur-[1px] shadow-[0_0_8px_rgba(204,253,246,1)] animate-particle-1" />
          <div className="absolute bottom-2 left-[50%] w-3.5 h-3.5 bg-cyan-100 rounded-full blur-[2px] shadow-[0_0_10px_rgba(207,250,254,1)] animate-particle-2" />
          <div className="absolute bottom-6 left-[80%] w-2 h-2 bg-white rounded-full blur-[1px] shadow-[0_0_5px_rgba(255,255,255,1)] animate-particle-3" />
          <div className="absolute bottom-0 left-[35%] w-3 h-3 bg-blue-100 rounded-full blur-[1.5px] shadow-[0_0_8px_rgba(219,234,254,1)] animate-particle-4" />
        </div>
      </div>

      {/* Floating Content */}
      <div className="relative z-10 flex flex-col items-center animate-float pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-teal-200 blur-xl opacity-60 rounded-full transform scale-150" />
          <Droplet className="w-10 h-10 sm:w-14 sm:h-14 text-teal-400 mb-2 fill-cyan-100 drop-shadow-[0_0_15px_rgba(45,212,191,0.9)] relative z-10" />
        </div>
        <span className="text-teal-900 font-black text-sm sm:text-base tracking-wide drop-shadow-[0_3px_5px_rgba(255,255,255,0.9)]">마법의 샘</span>
        <span className="text-teal-800 font-extrabold text-xs sm:text-sm bg-white/80 px-3 py-1 rounded-full mt-1 sm:mt-2 shadow-[0_0_15px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(255,255,255,1)] border-[1.5px] border-teal-200/80 hidden sm:block backdrop-blur-md">✨ 채우기 존</span>
      </div>
    </div>
  );

  const CauldronZone = () => (
    <div id="cauldron-zone" className="relative w-[8.5rem] h-48 sm:w-44 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center transition-all group">
      
      {/* Magical Dark Aura */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-fuchsia-500/10 to-indigo-600/20 rounded-[2rem] blur-[20px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 will-change-transform" />
      
      {/* Main Container Container */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-[2rem] border-[3px] border-white/40 shadow-[0_0_20px_rgba(168,85,247,0.2),inset_0_0_20px_rgba(255,255,255,0.8)] overflow-hidden flex flex-col items-center justify-end pb-4 sm:pb-8">
        
        {/* Dynamic Cauldron Visual */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-b from-purple-900 to-[#1e0a38] rounded-[40%] flex items-center justify-center shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.2)] border-t border-purple-500/50 z-10 animate-float">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-b from-[#2a1045] to-[#130526] rounded-[40%] flex items-center justify-center shadow-inner relative overflow-hidden">
             {/* Swirling poisonous/magical brew */}
             <div className="absolute bottom-[-20%] inset-x-[-20%] h-[120%] bg-fuchsia-500/40 blur-[10px] rounded-[50%] animate-swirl" />
             <div className="absolute bottom-[-10%] inset-x-[-10%] h-[100%] bg-purple-400/40 blur-[15px] rounded-[50%] animate-swirl-reverse" />
          </div>
          <Trash2 className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200 z-10 absolute drop-shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center mt-auto pointer-events-none pb-4 sm:pb-6">
        <span className="text-purple-900 font-black text-sm sm:text-base tracking-wide drop-shadow-[0_3px_5px_rgba(255,255,255,0.9)]">마법 가마솥</span>
        <span className="text-purple-800 font-extrabold text-xs sm:text-sm bg-white/80 px-3 py-1 rounded-full mt-1 sm:mt-2 shadow-[0_0_15px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(255,255,255,1)] border-[1.5px] border-purple-200/80 hidden sm:block backdrop-blur-md">🌪️ 버리기 존</span>
      </div>
    </div>
  );

  // Generates variable visual heights/widths to represent flask sizes relatively
  const getVisualConfig = (max: number) => {
     const baseH = 150; // base height for 3L
     return { height: baseH + (max - 3) * 20, width: 85 + (max - 3) * 4 };
  };

  const Flask = ({ id, current, max, colorClass }: { id: FlaskId, current: number, max: number, colorClass: string }) => {
    const config = getVisualConfig(max);
    const heightPercent = max > 0 ? (current / max) * 100 : 0;
    
    return (
      <div id={`flask-${id}-zone`} className="relative flex flex-col items-center justify-end z-20" style={{ height: 320, width: 140 }}>
        {/* Soft shadow representing 'home' marker for the draggable bottle */}
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
            {/* Flask Neck */}
            <div className="w-10 h-10 border-x-[5px] border-white bg-white/30 backdrop-blur-[2px] z-10 relative left-[1px]">
               <div className="absolute -top-1.5 -inset-x-3 h-4 rounded-[50%] border-[4px] border-white bg-white/60 shadow-sm" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all font-bold">
                  ↕
               </div>
            </div>
            
            {/* Flask Body */}
            <div className="relative w-full flex-1 border-[5px] border-b-[8px] border-white rounded-b-[2rem] rounded-t-xl overflow-hidden bg-white/20 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_-10px_20px_rgba(255,255,255,0.8)] flex flex-col justify-end">
               
               {/* Animated Liquid Section */}
               <div 
                 className={`w-full transition-[height] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative ${colorClass}`}
                 style={{ height: `${heightPercent}%`, minHeight: current > 0 ? '8px' : '0px' }}
               >
                  {/* Glossy top edge for liquid */}
                  <div className="absolute top-0 inset-x-0 h-4 bg-white/30 backdrop-blur-sm -mt-2 rounded-[50%] border-t border-white/20" />
                  
                  {/* Embedded magical bubbles */}
                  {current > 0 && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                         <div className="absolute -bottom-2 left-[25%] w-2 h-2 rounded-full bg-white/40 animate-[ping_2s_infinite]" />
                         <div className="absolute bottom-4 right-[30%] w-1.5 h-1.5 rounded-full bg-white/50 animate-[ping_3s_infinite_1s]" />
                         <div className="absolute top-1/3 left-[40%] w-1.5 h-1.5 rounded-full bg-white/60 animate-[ping_2.5s_infinite_0.5s]" />
                      </div>
                  )}
               </div>
            </div>
        </motion.div>

        {/* Stats directly beneath the flask drop zone */}
        <div className="text-center absolute bottom-0 inset-x-0 pointer-events-none">
            <div className="font-mono font-bold text-2xl text-slate-700 flex items-baseline justify-center gap-1">
               {current} <span className="text-sm font-semibold text-slate-400">/ {max}L</span>
            </div>
            <div className={`font-bold mt-0.5 text-xs px-3 py-1 rounded-full border bg-white/80 backdrop-blur inline-block shadow-sm ${id === 'A' ? 'text-pink-500 border-pink-100' : 'text-indigo-500 border-indigo-100'}`}>
               물약병 {id}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6ff] via-[#f0f4ff] to-[#fff0f5] flex flex-col p-4 sm:p-6 overflow-x-hidden font-sans selection:bg-purple-200">
      
      {/* Top Header Region */}
      <div className="w-full max-w-4xl mx-auto flex-col flex items-center text-center mb-6 sm:mb-10 pt-2 sm:pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 mb-6 drop-shadow-sm">
           ✨ 퀘스트: 마법 물약 제조
        </h1>
        
        <div className="bg-white/70 backdrop-blur-md shadow-sm rounded-[2rem] p-4 sm:px-10 sm:py-5 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 border border-white max-w-2xl w-full">
           <div className="text-lg sm:text-xl font-medium text-slate-600 flex items-center gap-3">
              <span className="opacity-80">목표 용량</span>
              <span className="font-black text-3xl sm:text-4xl text-violet-600 bg-violet-100/50 border border-violet-100 px-4 py-1.5 rounded-2xl shadow-inner font-mono tabular-nums">{target}L</span>
           </div>
           
           <div className="hidden sm:block w-px h-12 bg-slate-200" />
           <div className="w-full sm:hidden inset-x-0 h-px bg-slate-200" />
           
           <div className="text-lg sm:text-xl text-slate-500 flex items-center gap-3">
              <span className="opacity-80">이동 횟수</span> 
              <span className="font-bold text-3xl sm:text-4xl text-slate-800 font-mono tabular-nums">{moves}</span>
           </div>
        </div>
      </div>

      {/* Main Game Interface Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full pb-8 sm:pb-2">
        
        {/* Floating Instruction */}
        <div className="absolute top-0 sm:-top-4 flex items-center gap-2 text-slate-500 font-medium text-sm bg-white/70 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white shadow-sm mb-4 pointer-events-none z-30">
           <Info className="w-4 h-4 text-violet-400" />
           <span>병을 <strong className="text-violet-600">드래그</strong>해서 물을 옮겨 목표 용량을 정확히 맞춰보세요!</span>
        </div>

        {/* 
          Grid layout handles mobile/desktop transformation cleanly:
          Mobile: Top row = Spring + Cauldron. Bottom row = Flasks (stacked wide).
          Desktop: 4 columns. Spring(1) -> Flasks(2,3) -> Cauldron(4). 
        */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 sm:gap-y-12 gap-x-2 sm:gap-x-6 w-full max-w-5xl items-end justify-items-center mt-20 sm:mt-12 pt-4">
           
           {/* Magic Source Zone */}
           <div className="col-span-1 lg:col-span-1 row-start-1 lg:row-auto w-full flex justify-center">
              <SpringZone />
           </div>

           {/* Magic Sink Zone */}
           <div className="col-span-1 lg:col-span-1 row-start-1 lg:row-auto lg:col-start-4 w-full flex justify-center">
              <CauldronZone />
           </div>

           {/* Flasks Display Zone */}
           <div className="col-span-2 lg:col-span-2 row-start-2 lg:row-start-1 lg:col-start-2 flex items-end gap-10 sm:gap-16 justify-center w-full z-10 pt-6 sm:pt-0 pb-16">
              <Flask id="A" current={vals.A} max={caps.A} colorClass="bg-gradient-to-t from-pink-500 via-pink-400 to-pink-300" />
              <Flask id="B" current={vals.B} max={caps.B} colorClass="bg-gradient-to-t from-indigo-500 via-indigo-400 to-indigo-300" />
           </div>
           
        </div>
      </div>
      
      {/* Bottom Reset Area */}
      <div className="w-full flex justify-center mt-auto pb-4 absolute bottom-4 sm:bottom-8 right-0 left-0">
          <button 
            onClick={generatePuzzle}
            className="group relative px-6 py-3 bg-white/80 backdrop-blur-sm text-violet-600 border border-violet-200 font-bold rounded-2xl shadow-sm hover:shadow hover:bg-violet-50 hover:border-violet-300 active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500 text-violet-500" /> 
            <span>마법 물약 레시피 리셋</span>
          </button>
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
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-pink-50 to-indigo-50 opacity-90" />
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
                     환상적이에요!<br/> 
                     <span className="font-bold text-violet-600 text-xl mx-0.5">{moves}</span>번의 이동으로 목표한 <br/> 
                     <span className="text-3xl font-black text-pink-500 mx-1 mt-1 block">{target}L</span>
                  </p>
                  
                  <button
                     onClick={generatePuzzle}
                     className="w-full py-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/20"
                  >
                     새로운 퀘스트 도전하기
                  </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
