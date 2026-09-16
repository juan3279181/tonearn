import React, { useState } from 'react';
import { 
  X, 
  Gift, 
  Sparkles, 
  Check, 
  Lock, 
  Coins, 
  Zap, 
  Flame 
} from 'lucide-react';
import { UserProfile } from '../types';

interface DailyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onClaimDailyBonus: () => Promise<void>;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
  isOpen,
  onClose,
  user,
  onClaimDailyBonus
}) => {
  const [loading, setLoading] = useState(false);
  const [claimedReward, setClaimedReward] = useState<any | null>(null);

  if (!isOpen) return null;

  const currentStreak = user.dailyStreak || 0;
  const now = Date.now();
  const ONE_DAY = 86400000;
  const elapsedSinceClaim = now - (user.lastDailyClaim || 0);
  const isClaimAvailable = !user.lastDailyClaim || elapsedSinceClaim >= ONE_DAY * 0.8;

  const daysRewardConfig = [
    { day: 1, ton: 0.002, boost: '1.2x', duration: '15m', energy: 200 },
    { day: 2, ton: 0.005, boost: '1.5x', duration: '20m', energy: 300 },
    { day: 3, ton: 0.010, boost: '1.8x', duration: '30m', energy: 400 },
    { day: 4, ton: 0.020, boost: '2.0x', duration: '30m', energy: 500 },
    { day: 5, ton: 0.035, boost: '2.2x', duration: '45m', energy: 600 },
    { day: 6, ton: 0.050, boost: '2.5x', duration: '60m', energy: 800 },
    { day: 7, ton: 0.100, boost: '3.0x', duration: '120m', energy: 1000 }
  ];

  const handleClaim = async () => {
    if (!isClaimAvailable || loading) return;
    setLoading(true);
    try {
      await onClaimDailyBonus();
      setClaimedReward(daysRewardConfig[Math.min(6, currentStreak)]);
      setTimeout(() => setClaimedReward(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0e1726] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-[#121d30]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Daily Mining Bonus
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-400" />
                  {currentStreak} Day Streak
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Log in daily to scale your rewards & boosts</p>
            </div>
          </div>
          <button
            id="close-daily-bonus-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 7-Day Calendar Grid */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {claimedReward && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center text-xs font-bold animate-in zoom-in">
              🎉 Claimed Day {currentStreak}! +{claimedReward.ton} TON, +{claimedReward.energy} Energy, & {claimedReward.boost} Boost!
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {daysRewardConfig.slice(0, 4).map(item => {
              const isClaimed = item.day <= currentStreak && !isClaimAvailable;
              const isToday = (item.day === (currentStreak % 7) + 1 && isClaimAvailable) || 
                              (item.day === 1 && currentStreak === 0 && isClaimAvailable);
              const isLocked = item.day > ((currentStreak % 7) + (isClaimAvailable ? 1 : 0));

              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                    isToday
                      ? 'bg-gradient-to-b from-[#0098ea]/20 to-[#0098ea]/5 border-[#0098ea] shadow-md shadow-[#0098ea]/20 scale-105'
                      : isClaimed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800 opacity-70'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-300">
                    Day {item.day}
                  </span>

                  <div className="my-1.5">
                    {isClaimed ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : isToday ? (
                      <div className="w-6 h-6 rounded-full bg-[#0098ea] text-white flex items-center justify-center animate-bounce">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] font-black text-white font-mono">
                    +{item.ton}
                  </span>
                  <span className="text-[9px] text-amber-300 font-bold">
                    {item.boost}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {daysRewardConfig.slice(4, 7).map(item => {
              const isClaimed = item.day <= currentStreak && !isClaimAvailable;
              const isToday = (item.day === (currentStreak % 7) + 1 && isClaimAvailable);
              const isMegaDay7 = item.day === 7;

              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                    isToday
                      ? 'bg-gradient-to-b from-[#0098ea]/20 to-[#0098ea]/5 border-[#0098ea] shadow-md shadow-[#0098ea]/20 scale-105'
                      : isClaimed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : isMegaDay7
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800 opacity-70'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                    Day {item.day}
                    {isMegaDay7 && <Sparkles className="w-3 h-3 text-amber-400" />}
                  </span>

                  <div className="my-1.5">
                    {isClaimed ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : isToday ? (
                      <div className="w-6 h-6 rounded-full bg-[#0098ea] text-white flex items-center justify-center animate-bounce">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] font-black text-white font-mono">
                    +{item.ton} TON
                  </span>
                  <span className="text-[9px] text-amber-300 font-bold">
                    {item.boost} ({item.duration})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            id="claim-today-daily-btn"
            type="button"
            onClick={handleClaim}
            disabled={!isClaimAvailable || loading}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mt-2 ${
              isClaimAvailable && !loading
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-98 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>
              {loading
                ? 'Claiming...'
                : isClaimAvailable
                ? `Claim Day ${((currentStreak % 7) + 1)} Bonus`
                : 'Already Claimed for Today!'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
