import React, { useState } from 'react';
import { 
  Users, 
  Share2, 
  Copy, 
  Check, 
  Coins, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Gift 
} from 'lucide-react';
import { UserProfile, SystemSettings, ReferralFriend } from '../types';

interface ReferralViewProps {
  user: UserProfile;
  settings: SystemSettings;
  friends: ReferralFriend[];
  onBack: () => void;
}

export const ReferralView: React.FC<ReferralViewProps> = ({
  user,
  settings,
  friends,
  onBack
}) => {
  const [copied, setCopied] = useState(false);

  // Generate Telegram bot start link and Web link
  const botUsername = 'TonCoinMinerBot';
  const referralTelegramLink = `https://t.me/${botUsername}?start=${user.referralCode || user.id}`;
  const webShareLink = `${window.location.origin}?ref=${user.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralTelegramLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `⚡ Start mining real TON Coin with me on Telegram! Watch ads for unlimited 2.5x boosts and withdraw instantly to your TON wallet! 💎`
    );
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralTelegramLink)}&text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto px-4 pb-20 select-none animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="w-full flex items-center justify-between my-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Referral Program</h2>
            <p className="text-xs text-slate-400">Invite friends & earn passive commissions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Total Invited */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#101e33] to-[#0d1626] border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#0098ea]" />
            Invited Friends
          </span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {user.referralsCount}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
            +{settings.referralBonusTon} TON each
          </span>
        </div>

        {/* Total Earned */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#101e33] to-[#0d1626] border border-slate-800 flex flex-col">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Total Earnings
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {user.referralEarnings.toFixed(4)}
          </div>
          <span className="text-[10px] text-[#0098ea] font-medium mt-0.5">
            {settings.referralCommissionPercent}% mining share
          </span>
        </div>
      </div>

      {/* Rewards Explainer Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12233e] to-[#0c1626] border border-cyan-800/40 mb-4 flex flex-col gap-3">
        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-amber-400" />
          How Referrals Work
        </span>

        <div className="flex items-start gap-3 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-full bg-[#0098ea]/20 text-[#0098ea] font-bold flex items-center justify-center flex-shrink-0 text-xs">
            1
          </div>
          <div>
            <strong className="text-white">Instant Sign-up Bonus:</strong> You receive{' '}
            <span className="text-emerald-400 font-mono font-bold">+{settings.referralBonusTon} TON</span> instantly when your friend launches the bot.
          </div>
        </div>

        <div className="flex items-start gap-3 text-xs text-slate-300">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
            2
          </div>
          <div>
            <strong className="text-white">Lifetime Mining Share:</strong> Earn{' '}
            <span className="text-amber-300 font-mono font-bold">{settings.referralCommissionPercent}% commission</span> on every single TON token mined by your friends forever!
          </div>
        </div>
      </div>

      {/* Referral Link & Buttons */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4 flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Your Unique Telegram Invite Link</span>
          <span className="text-[10px] text-[#0098ea] font-mono">Code: {user.referralCode}</span>
        </label>

        <div className="flex items-center gap-2">
          <input
            id="referral-link-input"
            type="text"
            readOnly
            value={referralTelegramLink}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white font-mono text-xs truncate focus:outline-none"
          />
          <button
            id="copy-referral-link-btn"
            type="button"
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center justify-center flex-shrink-0"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            id="share-telegram-btn"
            type="button"
            onClick={handleShareTelegram}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0098ea] hover:from-[#00a2ff] hover:to-[#0088cc] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#0088cc]/20 active:scale-98"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share to Telegram</span>
          </button>

          <button
            id="copy-code-btn"
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Friends List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Your Active Referrals ({friends.length})
          </h3>
          <span className="text-[10px] text-slate-400">Real-time sync</span>
        </div>

        {friends.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 text-slate-600" />
            <span>No referrals yet. Share your link above to start earning passive TON!</span>
          </div>
        ) : (
          friends.map(friend => (
            <div
              key={friend.id}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#162742] flex items-center justify-center text-[#0098ea] font-bold text-xs">
                  {friend.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">@{friend.username}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Joined {new Date(friend.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-emerald-400 font-mono">
                  +{friend.commissionEarned.toFixed(4)} TON
                </div>
                <div className="text-[10px] text-slate-400">
                  Mined: {friend.minedTotal.toFixed(3)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
