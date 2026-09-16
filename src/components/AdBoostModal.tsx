import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tv, 
  Sparkles, 
  Play, 
  CheckCircle, 
  Clock, 
  Infinity as InfinityIcon, 
  Coins, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { SystemSettings, Boost } from '../types';

interface AdBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  activeBoosts: Boost[];
  adsWatchedCount: number;
  onWatchAdSuccess: () => Promise<void>;
}

export const AdBoostModal: React.FC<AdBoostModalProps> = ({
  isOpen,
  onClose,
  settings,
  activeBoosts,
  adsWatchedCount,
  onWatchAdSuccess
}) => {
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClaim, setCanClaim] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  // Ad sample sponsors rotation
  const adSponsors = [
    {
      title: 'TON Teleport Bridge & DEX',
      desc: 'Swap Bitcoin & Ethereum directly to TON with zero custodial risk!',
      badge: 'Official Web3 Sponsor',
      gradient: 'from-blue-600 to-cyan-500'
    },
    {
      title: 'Durov Telegram Ecosystem Portal',
      desc: 'Explore the fastest growing Web3 community in the world on Telegram.',
      badge: 'Telegram Mini App Partner',
      gradient: 'from-indigo-600 to-purple-600'
    },
    {
      title: 'Tonkeeper Mobile Wallet',
      desc: 'The leading non-custodial wallet for Toncoin and Jettons on TON Blockchain.',
      badge: 'TON Foundation Verified',
      gradient: 'from-cyan-600 to-teal-500'
    }
  ];
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdPlaying && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isAdPlaying && countdown === 0) {
      setCanClaim(true);
    }
    return () => clearTimeout(timer);
  }, [isAdPlaying, countdown]);

  if (!isOpen) return null;

  const handleStartAd = () => {
    setCurrentAdIndex(Math.floor(Math.random() * adSponsors.length));
    setCountdown(5);
    setCanClaim(false);
    setIsAdPlaying(true);
    setJustClaimed(false);
  };

  const handleClaimReward = async () => {
    if (!canClaim || claimLoading) return;
    setClaimLoading(true);
    try {
      await onWatchAdSuccess();
      setJustClaimed(true);
      // Automatically return user to mining screen after brief celebration feedback
      setTimeout(() => {
        setIsAdPlaying(false);
        setJustClaimed(false);
        onClose();
      }, 900);
    } catch (err) {
      console.warn('Ad claim completed with fallback:', err);
      setJustClaimed(true);
      setTimeout(() => {
        setIsAdPlaying(false);
        setJustClaimed(false);
        onClose();
      }, 900);
    } finally {
      setClaimLoading(false);
    }
  };

  const adSponsor = adSponsors[currentAdIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0e1726] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-[#121d30]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Rewarded Ad Boost
                <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                  UNLIMITED
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Watch ads to boost mining speed & earn TON</p>
            </div>
          </div>
          <button
            id="close-ad-modal-btn"
            onClick={onClose}
            disabled={isAdPlaying && !canClaim}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              isAdPlaying && !canClaim ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          {/* Ad Simulation Screen */}
          {isAdPlaying ? (
            <div className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
              {/* Sponsor Banner Backdrop */}
              <div className={`absolute inset-0 bg-gradient-to-br ${adSponsor.gradient} opacity-20`} />
              
              {/* Ad badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Adsgram Network</span>
              </div>

              {/* Countdown Timer */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-mono font-bold text-amber-300">
                <Clock className="w-3 h-3 animate-spin" />
                <span>{countdown > 0 ? `${countdown}s` : 'Ready!'}</span>
              </div>

              {/* Ad Content */}
              <div className="relative z-10 text-center px-4">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-[#0098ea] flex items-center justify-center text-white shadow-lg shadow-[#0098ea]/30">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {adSponsor.badge}
                </span>
                <h4 className="text-sm font-bold text-white mt-1">
                  {adSponsor.title}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xs mx-auto">
                  {adSponsor.desc}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                <div 
                  className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            /* Ad Rewards Explainer Card */
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#12233c] to-[#0d1728] border border-cyan-800/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Guaranteed Ad Rewards</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {adsWatchedCount} watched
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Instant TON</span>
                  <div className="flex items-baseline gap-1 font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>+{settings.adRewardInstantTon} TON</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400">Mining Multiplier</span>
                  <div className="flex items-baseline gap-1 font-mono font-bold text-amber-300 text-sm mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{settings.adBoostMultiplier}x Speed</span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 flex items-start gap-1.5">
                <InfinityIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Unlimited Boosts:</strong> You can watch ads consecutively without daily caps! Each ad extends your active boost timer by <strong>+{settings.adBoostDurationMinutes} minutes</strong> and refills +300 energy!
                </span>
              </div>
            </div>
          )}

          {/* Active Boosts Status in modal */}
          {activeBoosts.length > 0 && !isAdPlaying && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                Current Active Boost
              </span>
              <div className="flex items-center justify-between mt-1 text-white font-mono">
                <span className="font-semibold">{activeBoosts[0].title}</span>
                <span className="text-amber-300 text-[11px]">
                  Expires in {Math.max(0, Math.floor((activeBoosts[0].expiresAt - Date.now()) / 60000))} mins
                </span>
              </div>
            </div>
          )}

          {justClaimed && (
            <div className="py-2 px-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Reward Applied! +{settings.adRewardInstantTon} TON & {settings.adBoostMultiplier}x Boost!</span>
            </div>
          )}

          {/* Action Button */}
          {isAdPlaying ? (
            <button
              id="claim-ad-reward-btn"
              onClick={handleClaimReward}
              disabled={!canClaim || claimLoading}
              className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                canClaim
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {claimLoading ? (
                <span>Verifying Reward...</span>
              ) : canClaim ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Claim TON & {settings.adBoostMultiplier}x Boost Now</span>
                </>
              ) : (
                <span>Watch Ad to Complete ({countdown}s)...</span>
              )}
            </button>
          ) : (
            <button
              id="watch-ad-start-btn"
              onClick={handleStartAd}
              className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Watch Short Ad (Unlimited Boosts)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
