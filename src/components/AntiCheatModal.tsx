import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface AntiCheatModalProps {
  isOpen: boolean;
  reason?: string;
  onSolveChallenge: (answer: string, expected: string) => Promise<boolean>;
  onClose: () => void;
}

export const AntiCheatModal: React.FC<AntiCheatModalProps> = ({
  isOpen,
  reason,
  onSolveChallenge,
  onClose
}) => {
  const [num1, setNum1] = useState(7);
  const [num2, setNum2] = useState(5);
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateNewMath = () => {
    const a = Math.floor(Math.random() * 20) + 4;
    const b = Math.floor(Math.random() * 15) + 3;
    setNum1(a);
    setNum2(b);
    setUserAnswer('');
    setErrorMsg(null);
  };

  useEffect(() => {
    if (isOpen) {
      generateNewMath();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const expectedAnswer = String(num1 + num2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!userAnswer.trim()) return;

    setLoading(true);
    try {
      const success = await onSolveChallenge(userAnswer.trim(), expectedAnswer);
      if (success) {
        onClose();
      } else {
        setErrorMsg('Incorrect answer. Please solve the new challenge.');
        generateNewMath();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Try again.');
      generateNewMath();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#121622] border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-5">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-base font-extrabold text-white text-center">
          Security Check: Fair Play Verification
        </h3>

        <p className="text-xs text-slate-300 text-center mt-1.5 leading-relaxed">
          {reason || 'Abnormal tapping cadence or autoclicker behavior detected. Please verify you are human to protect fair mining rewards for everyone.'}
        </p>

        {errorMsg && (
          <div className="mt-3 p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Puzzle Card */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
              Solve Human Math Equation
            </span>

            <div className="flex items-center gap-3 text-2xl font-black text-white font-mono">
              <span>{num1}</span>
              <span className="text-amber-400">+</span>
              <span>{num2}</span>
              <span className="text-slate-400">=</span>
              <span className="text-cyan-400">?</span>
            </div>

            <button
              type="button"
              onClick={generateNewMath}
              className="mt-2 text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Generate different equation</span>
            </button>
          </div>

          <input
            id="anticheat-answer-input"
            type="number"
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-center font-mono text-base font-bold focus:outline-none focus:border-amber-400"
          />

          <button
            id="anticheat-verify-submit-btn"
            type="submit"
            disabled={loading || !userAnswer.trim()}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              !loading && userAnswer.trim()
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : 'Verify & Unlock Mining'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <span className="text-[10px] text-slate-500">
            TON Miner Anti-Bot Engine v2.4 • Monitored 24/7
          </span>
        </div>
      </div>
    </div>
  );
};
