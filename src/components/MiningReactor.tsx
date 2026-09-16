import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Sparkles, 
  Flame, 
  Clock, 
  Coins, 
  Gift, 
  Tv, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { UserProfile, SystemSettings } from '../types';

interface MiningReactorProps {
  user: UserProfile;
  settings: SystemSettings;
  effectiveMultiplier: number;
  onTapMine: (count: number, variance: number) => Promise<void>;
  onInstantTap?: (count?: number) => void;
  onClaimPassive: () => Promise<void>;
  onOpenAdBoost: () => void;
  onOpenDailyBonus: () => void;
  onOpenReferrals: () => void;
  onTriggerAntiCheat?: (reason: string) => void;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

export const MiningReactor: React.FC<MiningReactorProps> = ({
  user,
  settings,
  effectiveMultiplier,
  onTapMine,
  onInstantTap,
  onClaimPassive,
  onOpenAdBoost,
  onOpenDailyBonus,
  onOpenReferrals,
  onTriggerAntiCheat
}) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isTapping, setIsTapping] = useState(false);
  const [passiveClaiming, setPassiveClaiming] = useState(false);
  const [passiveSuccessMsg, setPassiveSuccessMsg] = useState<string | null>(null);

  // Tap tracking & background flush
  const tapHistoryRef = useRef<number[]>([]);
  const pendingTapsRef = useRef<number>(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Clean up flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  // Passive mining live calculation ticker
  const [accumulatedPassive, setAccumulatedPassive] = useState<number>(0);

  // Live timer for active boosts
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update accumulated passive yield
  useEffect(() => {
    const elapsedHours = Math.max(0, (now - user.lastActiveTimestamp) / (1000 * 3600));
    const rate = (user.minerBaseRate || settings.baseMiningRatePerHour) * effectiveMultiplier;
    setAccumulatedPassive(elapsedHours * rate);
  }, [now, user.lastActiveTimestamp, user.minerBaseRate, settings.baseMiningRatePerHour, effectiveMultiplier]);

  // Clean floating numbers
  const addFloatingText = (x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev.slice(-10), { id, x, y, text }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(item => item.id !== id));
    }, 1000);
  };

  // Handle Crystal Tap with instant optimistic update & unlimited energy
  const handleTap = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    // Prevent synthetic duplicate click after touch
    if (e.type === 'click' && Date.now() - lastTapTimeRef.current < 250) {
      return;
    }
    lastTapTimeRef.current = Date.now();

    // Coordinate calculation
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e && e.clientX > 0) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (user.isBanned) return;

    // Visual feedback
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 120);

    const rewardPerTap = settings.tapRewardAmount * effectiveMultiplier;
    addFloatingText(clientX, clientY, `+${rewardPerTap.toFixed(4)} TON`);

    // 1. INSTANT OPTIMISTIC FEEDBACK: Balance & Energy change immediately on screen!
    if (onInstantTap) {
      onInstantTap(1);
    }

    // 2. Queue for background server sync (flushes every 400ms without resetting)
    pendingTapsRef.current += 1;
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        const count = pendingTapsRef.current;
        pendingTapsRef.current = 0;
        if (count > 0) {
          onTapMine(count, 10);
        }
      }, 400);
    }
  };

  const handleClaimPassiveClick = async () => {
    if (accumulatedPassive < 0.0001 || passiveClaiming) return;
    setPassiveClaiming(true);
    try {
      await onClaimPassive();
      setPassiveSuccessMsg(`+${accumulatedPassive.toFixed(5)} TON claimed!`);
      setTimeout(() => setPassiveSuccessMsg(null), 3500);
    } finally {
      setPassiveClaiming(false);
    }
  };

  const activeAdBoosts = user.activeBoosts.filter(b => b.expiresAt > now);
  const hourlyRate = (user.minerBaseRate || settings.baseMiningRatePerHour) * effectiveMultiplier;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-20 select-none">
      {/* Top Banner: TON Balance Display */}
      <div className="w-full flex flex-col items-center justify-center my-3 py-4 px-5 rounded-2xl bg-gradient-to-b from-[#111e33] to-[#0c1626] border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0098ea]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-[#0098ea]" />
          Available TON Balance
        </span>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
            {user.balance.toFixed(5)}
          </span>
          <span className="text-sm font-bold text-[#0098ea]">TON</span>
        </div>

        {/* Current Mining Hashrate */}
        <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-[#0098ea]/10 border border-[#0098ea]/20 text-xs font-semibold text-cyan-300">
          <TrendingUp className="w-3.5 h-3.5 text-[#0098ea]" />
          <span>Mining Rate: {hourlyRate.toFixed(4)} TON/hr</span>
          {effectiveMultiplier > 1.0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded text-[10px] font-black">
              {effectiveMultiplier.toFixed(1)}x
            </span>
          )}
        </div>
      </div>

      {/* Active Boosts Indicator / Unlimited Stacker */}
      <div className="w-full mb-3">
        {activeAdBoosts.length > 0 ? (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" />
              <div className="flex flex-col">
                <span className="font-bold text-amber-300 truncate">
                  {activeAdBoosts[0].title}
                </span>
                <span className="text-[10px] text-amber-200/80 font-mono">
                  {Math.max(0, Math.floor((activeAdBoosts[0].expiresAt - now) / 60000))}m remaining
                </span>
              </div>
            </div>
            <button
              id="stack-boost-btn"
              onClick={onOpenAdBoost}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] flex-shrink-0 shadow-sm"
            >
              + Stack Boost
            </button>
          </div>
        ) : (
          <div 
            onClick={onOpenAdBoost}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-[#0098ea]/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#0098ea]" />
              <span className="text-xs font-medium">Watch Ads for Unlimited 2.5x Boost</span>
            </div>
            <span className="text-[11px] font-bold text-[#0098ea] bg-[#0098ea]/10 px-2 py-0.5 rounded border border-[#0098ea]/30">
              Boost Now
            </span>
          </div>
        )}
      </div>

      {/* Mining Reactor Crystal Sphere (Interactive Tap Target) */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Pulsing Backlight Rings */}
        <div className={`absolute w-64 h-64 rounded-full bg-[#0098ea]/20 blur-3xl transition-transform duration-300 ${isTapping ? 'scale-125 opacity-90' : 'scale-100 opacity-60'}`} />
        <div className="absolute w-52 h-52 rounded-full border border-[#0098ea]/20 animate-[spin_12s_linear_infinite]" />
        <div className="absolute w-60 h-60 rounded-full border border-cyan-400/15 border-dashed animate-[spin_18s_linear_infinite_reverse]" />

        {/* Reactor Core / Crystal */}
        <div
          id="mining-crystal-target"
          onClick={handleTap}
          onTouchStart={handleTap}
          className={`relative z-10 w-48 h-48 sm:w-52 sm:h-52 rounded-full cursor-pointer flex flex-col items-center justify-center transition-transform active:scale-95 shadow-2xl ${
            isTapping ? 'scale-95' : 'hover:scale-105'
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #38bdf8 0%, #0098ea 45%, #034b8c 75%, #0b1d3a 100%)',
            boxShadow: '0 0 45px rgba(0, 152, 234, 0.45), inset 0 2px 14px rgba(255, 255, 255, 0.6)'
          }}
        >
          {/* TON Symbol Logo */}
          <div className="w-20 h-20 relative flex items-center justify-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <svg
              viewBox="0 0 120 120"
              className="w-16 h-16 text-white fill-current transition-transform"
            >
              <path d="M60 10L10 40L60 110L110 40L60 10ZM60 25L92 44L60 62L28 44L60 25ZM25 53L52 69V98L25 53ZM68 69L95 53L68 98V69Z" />
            </svg>
          </div>

          <span className="text-white font-extrabold text-xs tracking-wider uppercase mt-1 drop-shadow-md">
            Tap to Mine
          </span>
          <span className="text-[10px] text-cyan-100 font-semibold opacity-90">
            +{ (settings.tapRewardAmount * effectiveMultiplier).toFixed(4) } TON
          </span>
        </div>
      </div>

      {/* Prominent Tap to Mine Action Button with Unlimited Energy */}
      <button
        id="tap-mining-action-btn"
        onClick={handleTap}
        disabled={user.isBanned}
        className="w-full py-3.5 px-4 mb-2 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg select-none active:scale-95 cursor-pointer bg-gradient-to-r from-[#0098ea] via-sky-500 to-cyan-400 hover:from-sky-500 hover:to-[#0098ea] text-white shadow-cyan-500/25"
      >
        <Zap className="w-4 h-4 fill-current text-amber-300 animate-bounce" />
        <span>Tap to Mine TON (+{(settings.tapRewardAmount * effectiveMultiplier).toFixed(4)} TON) • Unlimited ⚡</span>
      </button>

      {/* Floating Gain Numbers */}
      {floatingTexts.map(item => (
        <div
          key={item.id}
          className="fixed pointer-events-none text-emerald-400 font-black text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-out fade-out slide-out-to-top-12 duration-1000 z-50 font-mono"
          style={{ left: item.x - 20, top: item.y - 30 }}
        >
          {item.text}
        </div>
      ))}

      {/* Energy Bar (Unlimited) */}
      <div className="w-full bg-[#101b2d] border border-slate-800 rounded-xl p-3 my-2 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>Mining Energy</span>
          </div>
          <div className="text-slate-300 font-mono text-xs flex items-center gap-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              Unlimited ⚡
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({user.maxEnergy} / {user.maxEnergy})</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full w-full transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
          />
        </div>
      </div>

      {/* Passive Hashrate Storage & Claim */}
      <div className="w-full bg-gradient-to-r from-[#0e1d33] to-[#12243d] border border-cyan-900/40 rounded-xl p-3.5 my-2 shadow-sm flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Passive Rig Hashrate
          </span>
          <span className="text-base font-extrabold text-white font-mono mt-0.5">
            +{accumulatedPassive.toFixed(5)} <span className="text-xs text-[#0098ea]">TON</span>
          </span>
          <span className="text-[10px] text-slate-400">
            Auto-mined in background
          </span>
        </div>

        <button
          id="claim-passive-rig-btn"
          onClick={handleClaimPassiveClick}
          disabled={accumulatedPassive < 0.0001 || passiveClaiming}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
            accumulatedPassive >= 0.0001 && !passiveClaiming
              ? 'bg-[#0098ea] hover:bg-[#00a2ff] text-white shadow-[#0098ea]/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          {passiveClaiming ? (
            <Clock className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>{passiveClaiming ? 'Claiming...' : 'Claim TON'}</span>
        </button>
      </div>

      {passiveSuccessMsg && (
        <div className="w-full mt-1 py-1.5 px-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-lg text-center font-semibold animate-in fade-in">
          {passiveSuccessMsg}
        </div>
      )}

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5 w-full mt-3">
        {/* Watch Ad */}
        <button
          id="quick-watch-ad-btn"
          onClick={onOpenAdBoost}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 mb-1.5 group-hover:scale-110 transition-transform">
            <Tv className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-white">Watch Ad</span>
          <span className="text-[9px] text-amber-400 font-semibold">+Boost & TON</span>
        </button>

        {/* Daily Bonus */}
        <button
          id="quick-daily-bonus-btn"
          onClick={onOpenDailyBonus}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform">
            <Gift className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-white">Daily Bonus</span>
          <span className="text-[9px] text-emerald-400 font-semibold">Day {user.dailyStreak || 1} Streak</span>
        </button>

        {/* Referrals */}
        <button
          id="quick-referrals-btn"
          onClick={onOpenReferrals}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-[#0098ea]/50 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0098ea]/15 flex items-center justify-center text-[#0098ea] mb-1.5 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-white">Invite & Earn</span>
          <span className="text-[9px] text-cyan-400 font-semibold">{settings.referralCommissionPercent}% Comm</span>
        </button>
      </div>
    </div>
  );
};
