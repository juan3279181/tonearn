import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserProfile, 
  SystemSettings, 
  WithdrawalRequest, 
  ReferralFriend, 
  LeaderboardEntry, 
  AppNotification,
  TonDispatcherStatus
} from './types';
import { TelegramHeader } from './components/TelegramHeader';
import { MiningReactor } from './components/MiningReactor';
import { AdBoostModal } from './components/AdBoostModal';
import { WalletWithdrawModal } from './components/WalletWithdrawModal';
import { ReferralView } from './components/ReferralView';
import { DailyBonusModal } from './components/DailyBonusModal';
import { LeaderboardView } from './components/LeaderboardView';
import { AntiCheatModal } from './components/AntiCheatModal';
import { AdminPanel } from './components/AdminPanel';
import { NotificationDrawer } from './components/NotificationDrawer';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { 
  Sparkles, 
  Bell, 
  WifiOff, 
  RefreshCw, 
  Wallet, 
  ShieldCheck, 
  AlertCircle,
  Check, 
  Copy, 
  Clipboard, 
  Unlink, 
  Edit2, 
  ArrowUpRight, 
  Zap, 
  ExternalLink,
  RotateCcw 
} from 'lucide-react';
import { cleanAndValidateTonAddress } from './utils/tonAddress';

const DEFAULT_SETTINGS: SystemSettings = {
  baseMiningRatePerHour: 0.015,
  tapRewardAmount: 0.0001,
  adBoostMultiplier: 2.5,
  adBoostDurationMinutes: 30,
  adRewardInstantTon: 0.005,
  referralBonusTon: 0.05,
  referralCommissionPercent: 12,
  minWithdrawalLimit: 0.25,
  withdrawalFeePercent: 1.5,
  antiCheatMaxTapsPerSec: 12,
  antiCheatSensitivity: 'medium',
  maintenanceMode: false
};

const DEFAULT_USER: UserProfile = {
  id: 'user_demo',
  telegramId: '772910482',
  username: 'ton_champion',
  firstName: 'You (Miner)',
  tonWalletAddress: 'EQA4j3g7YkFm028hjdKmslwq82937mdkQo182js8dj283921',
  balance: 0.742,
  totalMined: 1.482,
  energy: 1000,
  maxEnergy: 1000,
  energyRegenRate: 2,
  minerLevel: 2,
  minerBaseRate: 0.02,
  activeBoosts: [
    {
      id: 'boost_welcome',
      title: '2.5x Ad Boost',
      multiplier: 2.5,
      durationSeconds: 1800,
      startedAt: Date.now(),
      expiresAt: Date.now() + 1800000,
      type: 'ad'
    }
  ],
  lastActiveTimestamp: Date.now(),
  lastDailyClaim: Date.now() - 86400000,
  dailyStreak: 2,
  referralCode: 'TON_MINER_VIP',
  referralsCount: 3,
  referralEarnings: 0.18,
  role: 'admin',
  isBanned: false,
  cheatScore: 0,
  botFlags: [],
  adsWatchedCount: 5,
  createdAt: Date.now() - 86400000 * 3
};

function getInitialUser(): UserProfile {
  try {
    const saved = localStorage.getItem('ton_miner_user_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.warn('LocalStorage not accessible:', e);
  }
  return DEFAULT_USER;
}

function getInitialSettings(): SystemSettings {
  try {
    const saved = localStorage.getItem('ton_miner_settings_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.baseMiningRatePerHour) return parsed;
    }
  } catch (e) {
    console.warn('LocalStorage not accessible:', e);
  }
  return DEFAULT_SETTINGS;
}

export default function App() {
  const [user, setUser] = useState<UserProfile>(getInitialUser);
  const [settings, setSettings] = useState<SystemSettings>(getInitialSettings);
  const [effectiveMultiplier, setEffectiveMultiplier] = useState(2.5);
  const [currentTab, setCurrentTab] = useState<TabType>('mine');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Modals & Drawers
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState(false);
  const [isAntiCheatModalOpen, setIsAntiCheatModalOpen] = useState(false);
  const [antiCheatReason, setAntiCheatReason] = useState<string>('');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // In-page wallet view state
  const [inlineWalletInput, setInlineWalletInput] = useState('');
  const [isEditingInlineWallet, setIsEditingInlineWallet] = useState(false);
  const [isSavingInlineWallet, setIsSavingInlineWallet] = useState(false);
  const [inlineCopied, setInlineCopied] = useState(false);
  const backendAvailableRef = useRef<boolean | null>(null);

  // App Data
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_welcome',
      title: 'Welcome to TON Miner! 💎',
      message: 'Start mining TON coin, watch ads for unlimited boost multipliers, and invite friends.',
      timestamp: Date.now() - 3600000,
      read: false,
      type: 'system'
    }
  ]);
  const [friends, setFriends] = useState<ReferralFriend[]>([
    { id: 'ref_1', username: 'ton_fan_99', joinedAt: Date.now() - 86400000 * 2, minedTotal: 0.42, commissionEarned: 0.05, active: true },
    { id: 'ref_2', username: 'telegram_gems', joinedAt: Date.now() - 86400000, minedTotal: 0.81, commissionEarned: 0.09, active: true },
    { id: 'ref_3', username: 'crypto_digger', joinedAt: Date.now() - 3600000 * 5, minedTotal: 0.25, commissionEarned: 0.04, active: true }
  ]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [dispatcherStatus, setDispatcherStatus] = useState<TonDispatcherStatus | null>(null);
  const [topMiners, setTopMiners] = useState<LeaderboardEntry[]>([
    { rank: 1, userId: 'user_1', username: 'crypto_whale_ton', totalMined: 42.61, referralsCount: 48, minerLevel: 5 },
    { rank: 2, userId: 'user_2', username: 'ton_rocket_node', totalMined: 29.41, referralsCount: 31, minerLevel: 4 },
    { rank: 3, userId: 'user_3', username: 'durov_miner_fan', totalMined: 18.25, referralsCount: 19, minerLevel: 3 },
    { rank: 4, userId: 'user_demo', username: 'ton_champion', totalMined: 1.482, referralsCount: 3, minerLevel: 2, isCurrentUser: true }
  ]);
  const [topReferrers, setTopReferrers] = useState<LeaderboardEntry[]>([
    { rank: 1, userId: 'user_1', username: 'crypto_whale_ton', totalMined: 42.61, referralsCount: 48, minerLevel: 5 },
    { rank: 2, userId: 'user_2', username: 'ton_rocket_node', totalMined: 29.41, referralsCount: 31, minerLevel: 4 }
  ]);
  
  // Real-time toast alert
  const [toastAlert, setToastAlert] = useState<{ id: string; title: string; message: string } | null>(null);
  const [pushPermissionState, setPushPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  // Simulated Telegram Mini App Framing Mode
  const [isSimulatedTMA, setIsSimulatedTMA] = useState(true);

  // Derive resolved user ID & referral from URL or Telegram WebApp
  const getResolvedUserId = useCallback(() => {
    try {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser && tgUser.id) {
        return String(tgUser.id);
      }
    } catch (e) {}
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || user.id || 'user_demo';
  }, [user.id]);

  const resolvedUserId = getResolvedUserId();
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref') || '';

  // Check Web Push & Telegram WebApp SDK
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermissionState(Notification.permission);
    } else {
      setPushPermissionState('unsupported');
    }

    // Telegram WebApp SDK support if opened inside Telegram Mini App
    try {
      if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();
        tg.expand();
        // Guard header color for Telegram WebApp version 6.1+ to prevent console error on version 6.0
        if (typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.1')) {
          try {
            if (tg.setHeaderColor) tg.setHeaderColor('#0d1624');
          } catch (e) {}
        }
        if (tg.platform && tg.platform !== 'unknown') {
          // Inside native Telegram Mini App, no need for simulated frame
          setIsSimulatedTMA(false);
        }
      }
    } catch (e) {
      // Ignore Telegram WebApp initialization errors
    }
  }, []);

  // Display Toast helper
  const showToast = (title: string, message: string) => {
    const id = String(Date.now());
    setToastAlert({ id, title, message });
    setTimeout(() => {
      setToastAlert(curr => (curr?.id === id ? null : curr));
    }, 4000);
  };

  // Fetch initial profile & configs with AbortController timeout
  const fetchUserData = useCallback(async () => {
    // If running on a static host where /api is not deployed, operate in local offline mode
    if (backendAvailableRef.current === false) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      let query = `?id=${encodeURIComponent(resolvedUserId)}&ref=${encodeURIComponent(refCode)}`;
      try {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser) {
          if (tgUser.username) query += `&username=${encodeURIComponent(tgUser.username)}`;
          if (tgUser.first_name) query += `&first_name=${encodeURIComponent(tgUser.first_name)}`;
        }
      } catch (e) {}

      const res = await fetch(`/api/user${query}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        backendAvailableRef.current = true;
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem('ton_miner_user_v1', JSON.stringify(data.user));
          } catch (e) {}
        }
        if (data.settings) {
          setSettings(data.settings);
          try {
            localStorage.setItem('ton_miner_settings_v1', JSON.stringify(data.settings));
          } catch (e) {}
        }
        if (data.effectiveMultiplier) {
          setEffectiveMultiplier(data.effectiveMultiplier);
        }
        setSyncError(null);
      } else if (res.status === 404) {
        // Backend API not present (e.g. static hosting on Vercel)
        backendAvailableRef.current = false;
      }
    } catch {
      clearTimeout(timeoutId);
      // Fallback is already active locally so the user experience is smooth
    } finally {
      setIsSyncing(false);
    }
  }, [resolvedUserId, refCode]);

  // Fetch Auxiliary Data (Notifications, Referrals, Withdrawals, Leaderboard)
  const fetchAuxiliaryData = useCallback(async () => {
    if (backendAvailableRef.current === false) return;
    try {
      const notifsRes = await fetch(`/api/notifications?userId=${encodeURIComponent(resolvedUserId)}`);
      if (notifsRes.ok) {
        backendAvailableRef.current = true;
        const data = await notifsRes.json();
        if (data.notifications) setNotifications(data.notifications);
      } else if (notifsRes.status === 404) {
        backendAvailableRef.current = false;
        return;
      }

      const refsRes = await fetch(`/api/referrals?userId=${encodeURIComponent(resolvedUserId)}`);
      if (refsRes.ok) {
        const data = await refsRes.json();
        if (data.friends) setFriends(data.friends);
      }

      const wdrawRes = await fetch(`/api/wallet/history?userId=${encodeURIComponent(resolvedUserId)}`);
      if (wdrawRes.ok) {
        const data = await wdrawRes.json();
        if (data.withdrawals) setWithdrawals(data.withdrawals);
      }

      const dispRes = await fetch('/api/wallet/dispatcher-status');
      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDispatcherStatus(dispData);
      }

      const leadRes = await fetch(`/api/leaderboard?userId=${encodeURIComponent(resolvedUserId)}`);
      if (leadRes.ok) {
        const data = await leadRes.json();
        if (data.topMiners) setTopMiners(data.topMiners);
        if (data.topReferrers) setTopReferrers(data.topReferrers);
      }
    } catch {
      // Keep using local state gracefully
    }
  }, [resolvedUserId]);

  useEffect(() => {
    fetchUserData();
    fetchAuxiliaryData();

    // Periodic sync every 25 seconds
    const interval = setInterval(() => {
      fetchUserData();
      fetchAuxiliaryData();
    }, 25000);

    return () => clearInterval(interval);
  }, [fetchUserData, fetchAuxiliaryData]);

  // Smooth local energy recovery ticker
  useEffect(() => {
    const energyTimer = setInterval(() => {
      setUser(prev => {
        if (!prev || prev.energy >= prev.maxEnergy) return prev;
        const newEnergy = Math.min(prev.maxEnergy, prev.energy + prev.energyRegenRate);
        return { ...prev, energy: newEnergy };
      });
    }, 1000);
    return () => clearInterval(energyTimer);
  }, []);

  // Haptic Feedback simulation
  const triggerHaptic = () => {
    if ((window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred('light');
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Instant Tap Optimistic Execution (Unlimited Energy)
  const handleInstantTap = useCallback((tapsCount: number = 1) => {
    if (!user || user.isBanned) return;
    triggerHaptic();

    const count = Math.max(1, tapsCount);
    const earned = count * (settings.tapRewardAmount || 0.0001) * effectiveMultiplier;

    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        balance: prev.balance + earned,
        totalMined: prev.totalMined + earned,
        energy: prev.maxEnergy // Unlimited energy: always at max
      };
    });
  }, [user, settings.tapRewardAmount, effectiveMultiplier, triggerHaptic]);

  // Tap Mining Handler (Unlimited Energy & No Security Checks)
  const handleTapMine = async (count: number, variance: number) => {
    if (!user || backendAvailableRef.current === false) return;

    try {
      const res = await fetch('/api/mine/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tapsCount: count,
          clientTimestamp: Date.now(),
          tapCadenceVariance: variance
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? {
          ...prev,
          balance: data.newBalance,
          energy: prev.maxEnergy, // Unlimited energy
          totalMined: Math.max(prev.totalMined, data.newBalance)
        } : null);
        if (data.effectiveMultiplier) {
          setEffectiveMultiplier(data.effectiveMultiplier);
        }
      } else if (res.status === 404) {
        backendAvailableRef.current = false;
      }
    } catch {
      backendAvailableRef.current = false;
    }
  };

  // Passive Mining Claim
  const handleClaimPassive = async () => {
    if (!user) return;
    triggerHaptic();

    if (backendAvailableRef.current === false) {
      const now = Date.now();
      const elapsedHours = (now - user.lastActiveTimestamp) / 3600000;
      const claimed = Math.max(0.0001, elapsedHours * settings.baseMiningRatePerHour * effectiveMultiplier);
      setUser(prev => prev ? {
        ...prev,
        balance: prev.balance + claimed,
        totalMined: prev.totalMined + claimed,
        lastActiveTimestamp: now
      } : null);
      showToast('Passive Mining Claimed! 💎', `+${claimed.toFixed(5)} TON added to your balance.`);
      return;
    }

    try {
      const res = await fetch('/api/mine/claim-passive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? {
          ...prev,
          balance: data.newBalance,
          lastActiveTimestamp: Date.now()
        } : null);
        showToast('Passive Mining Claimed! 💎', `+${data.claimedAmount.toFixed(5)} TON added to your balance.`);
        fetchAuxiliaryData();
      } else if (res.status === 404) {
        backendAvailableRef.current = false;
        const claimed = 0.005 * effectiveMultiplier;
        setUser(prev => prev ? { ...prev, balance: prev.balance + claimed, lastActiveTimestamp: Date.now() } : null);
        showToast('Passive Mining Claimed! 💎', `+${claimed.toFixed(5)} TON added to your balance.`);
      }
    } catch {
      backendAvailableRef.current = false;
      const claimed = 0.005 * effectiveMultiplier;
      setUser(prev => prev ? { ...prev, balance: prev.balance + claimed, lastActiveTimestamp: Date.now() } : null);
      showToast('Passive Mining Claimed! 💎', `+${claimed.toFixed(5)} TON added to your balance.`);
    }
  };

  // Watch Ad Success Handler (Unlimited Boosts)
  const handleWatchAdSuccess = async () => {
    if (!user) return;
    triggerHaptic();

    const instantTon = settings.adRewardInstantTon || 0.005;
    const boostMult = settings.adBoostMultiplier || 2.5;
    const durationMs = (settings.adBoostDurationMinutes || 30) * 60 * 1000;
    const now = Date.now();

    // 1. Instant optimistic update so user sees reward immediately
    setUser(prev => {
      if (!prev) return null;
      const existingBoost = prev.activeBoosts.find(b => b.type === 'ad' && b.expiresAt > now);
      let updatedBoosts = [...prev.activeBoosts];
      if (existingBoost) {
        existingBoost.expiresAt += durationMs;
        existingBoost.multiplier = Math.max(existingBoost.multiplier, boostMult);
      } else {
        updatedBoosts.push({
          id: 'boost_' + now,
          title: `${boostMult}x Speed Boost`,
          multiplier: boostMult,
          durationSeconds: (settings.adBoostDurationMinutes || 30) * 60,
          startedAt: now,
          expiresAt: now + durationMs,
          type: 'ad'
        });
      }
      return {
        ...prev,
        balance: prev.balance + instantTon,
        totalMined: prev.totalMined + instantTon,
        energy: Math.min(prev.maxEnergy, prev.energy + 300),
        adsWatchedCount: (prev.adsWatchedCount || 0) + 1,
        activeBoosts: updatedBoosts
      };
    });
    setEffectiveMultiplier(prev => Math.max(prev, boostMult));
    showToast('Unlimited Boost Applied! ⚡', `+${instantTon} TON & ${boostMult}x Speed Active! Refilled +300 Energy.`);

    // 2. Background sync with backend if available
    if (backendAvailableRef.current !== false) {
      try {
        const res = await fetch('/api/ads/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });

        if (res.ok) {
          const data = await res.json();
          setUser(prev => prev ? {
            ...prev,
            balance: data.newBalance,
            energy: data.energy,
            activeBoosts: data.activeBoosts,
            adsWatchedCount: data.totalAdsWatched
          } : null);
          setEffectiveMultiplier(data.effectiveMultiplier);
          fetchAuxiliaryData();
        } else if (res.status === 404) {
          backendAvailableRef.current = false;
        }
      } catch {
        backendAvailableRef.current = false;
      }
    }
  };

  // Daily Bonus Claim
  const handleClaimDailyBonus = async () => {
    if (!user) return;
    triggerHaptic();

    if (backendAvailableRef.current === false) {
      const nextDay = ((user.dailyStreak || 0) % 7) + 1;
      const tonReward = 0.02 * nextDay;
      const boostMult = 1.5 + (nextDay * 0.2);
      setUser(prev => prev ? {
        ...prev,
        balance: prev.balance + tonReward,
        dailyStreak: nextDay,
        lastDailyClaim: Date.now()
      } : null);
      showToast(`Day ${nextDay} Streak Claimed! 🔥`, `+${tonReward.toFixed(3)} TON & ${boostMult.toFixed(1)}x Boost added!`);
      return;
    }

    try {
      const res = await fetch('/api/daily-bonus/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? {
          ...prev,
          balance: data.newBalance,
          energy: data.energy,
          dailyStreak: data.day,
          lastDailyClaim: Date.now()
        } : null);
        showToast(`Day ${data.day} Streak Claimed! 🔥`, `+${data.reward.ton} TON & ${data.reward.boostMult}x Boost added!`);
        fetchUserData();
        fetchAuxiliaryData();
      } else if (res.status === 404) {
        backendAvailableRef.current = false;
        const nextDay = ((user.dailyStreak || 0) % 7) + 1;
        const tonReward = 0.02 * nextDay;
        setUser(prev => prev ? {
          ...prev,
          balance: prev.balance + tonReward,
          dailyStreak: nextDay,
          lastDailyClaim: Date.now()
        } : null);
        showToast(`Day ${nextDay} Streak Claimed! 🔥`, `+${tonReward.toFixed(3)} TON added!`);
      }
    } catch {
      backendAvailableRef.current = false;
      const nextDay = ((user.dailyStreak || 0) % 7) + 1;
      const tonReward = 0.02 * nextDay;
      setUser(prev => prev ? {
        ...prev,
        balance: prev.balance + tonReward,
        dailyStreak: nextDay,
        lastDailyClaim: Date.now()
      } : null);
      showToast(`Day ${nextDay} Streak Claimed! 🔥`, `+${tonReward.toFixed(3)} TON added!`);
    }
  };

  // Save Wallet Address
  const handleSaveWalletAddress = async (address: string) => {
    if (!user) return;

    // 1. Clean and validate address format
    const valResult = cleanAndValidateTonAddress(address);
    if (!valResult.valid && address.trim() !== '') {
      throw new Error(valResult.error || 'Invalid Gram / TON address format');
    }
    const cleanAddress = valResult.cleaned || '';

    // 2. Always optimistically update local state & persistent storage immediately
    setUser(prev => prev ? { ...prev, tonWalletAddress: cleanAddress } : null);
    setInlineWalletInput(cleanAddress);
    setIsEditingInlineWallet(!cleanAddress);
    try {
      const cached = localStorage.getItem('ton_miner_user_v1');
      const parsed = cached ? JSON.parse(cached) : {};
      parsed.tonWalletAddress = cleanAddress;
      localStorage.setItem('ton_miner_user_v1', JSON.stringify(parsed));
    } catch (e) {
      // Ignore localStorage write error
    }

    if (cleanAddress) {
      const short = cleanAddress.length > 12 
        ? `${cleanAddress.substring(0, 6)}...${cleanAddress.substring(cleanAddress.length - 4)}` 
        : cleanAddress;
      showToast('Wallet Connected! 💎', `TON address ${short} linked successfully.`);
    } else {
      showToast('Wallet Disconnected', 'Your wallet address was unlinked.');
    }

    // 3. Sync with backend if available (never blocks or throws error if static Vercel/offline)
    if (backendAvailableRef.current !== false) {
      try {
        const res = await fetch('/api/user/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, tonWalletAddress: cleanAddress })
        });

        if (res.ok) {
          backendAvailableRef.current = true;
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data?.tonWalletAddress !== undefined) {
              setUser(prev => prev ? { ...prev, tonWalletAddress: data.tonWalletAddress } : null);
            }
          } catch {}
        } else if (res.status === 404) {
          backendAvailableRef.current = false;
        }
      } catch {
        backendAvailableRef.current = false;
      }
    }
  };

  // Request Withdrawal
  const handleRequestWithdrawal = async (amount: number, address: string, memo?: string) => {
    if (!user) return;

    const fee = amount * (settings.withdrawalFeePercent / 100);
    const netAmount = Math.max(0, amount - fee);
    const localId = 'wd_' + Date.now();

    const localWithdrawal: WithdrawalRequest = {
      id: localId,
      userId: user.id,
      username: user.username,
      amount,
      fee,
      netAmount,
      tonAddress: address,
      memo,
      status: 'pending',
      mode: 'pending_hotwallet',
      createdAt: Date.now()
    };

    // Deduct user balance and record withdrawal locally
    setUser(prev => prev ? {
      ...prev,
      balance: Math.max(0, prev.balance - amount),
      tonWalletAddress: address
    } : null);

    setWithdrawals(prev => [localWithdrawal, ...prev]);

    // If backend is active, try to sync request with server
    if (backendAvailableRef.current !== false) {
      try {
        const res = await fetch('/api/wallet/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            amount,
            tonAddress: address,
            memo
          })
        });

        if (res.ok) {
          backendAvailableRef.current = true;
          const data = await res.json();
          if (data?.withdrawal) {
            setWithdrawals(prev => [data.withdrawal, ...prev.filter(w => w.id !== localId)]);
            if (data.withdrawal.status === 'completed' && data.withdrawal.mode === 'live_onchain') {
              showToast('Payout Broadcast On-Chain! 💎', `Sent ${data.withdrawal.netAmount.toFixed(4)} TON to ${address.substring(0, 8)}...`);
            } else {
              showToast('Payout Request Queued 💎', `Payout of ${amount} TON queued. You can refund it back to balance anytime.`);
            }
          }
          if (data?.newBalance !== undefined) {
            setUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
          }
          return;
        } else if (res.status === 404) {
          backendAvailableRef.current = false;
        }
      } catch {
        backendAvailableRef.current = false;
      }
    }

    showToast('Payout Request Queued 💎', `Payout of ${amount} TON queued. Can be refunded to balance anytime.`);
  };

  // Refund Withdrawal back to mining balance
  const handleRefundWithdrawal = async (withdrawalId: string) => {
    if (!user) return;
    try {
      if (backendAvailableRef.current !== false) {
        const res = await fetch('/api/wallet/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalId, userId: user.id })
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.newBalance !== undefined) {
            setUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
          }
          if (data?.withdrawal) {
            setWithdrawals(prev => prev.map(w => w.id === withdrawalId ? data.withdrawal : w));
          }
          showToast('Refund Successful! 💎', `Restored ${data.refundedAmount || ''} TON back to your mining balance.`);
          return;
        }
      }
    } catch {
      // Fallback local refund
    }

    // Local state refund
    const target = withdrawals.find(w => w.id === withdrawalId);
    if (target && target.status !== 'refunded') {
      setUser(prev => prev ? { ...prev, balance: prev.balance + target.amount } : null);
      setWithdrawals(prev => prev.map(w => w.id === withdrawalId ? { ...w, status: 'refunded', refundedAt: Date.now() } : w));
      showToast('Refunded to Balance! 💎', `Restored ${target.amount} TON back to your mining balance.`);
    }
  };

  // Solve Anti-Cheat Challenge
  const handleSolveAntiCheat = async (answer: string, expected: string): Promise<boolean> => {
    if (!user) return false;
    const res = await fetch('/api/anticheat/verify-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        answer,
        expected
      })
    });

    if (res.ok) {
      showToast('Human Verification Passed! 🛡️', 'Fair play verified. Mining unlocked.');
      fetchUserData();
      return true;
    }
    return false;
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    if (!user) return;
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Request real Browser Push Permission
  const handleRequestPushPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPushPermissionState(perm);
      if (perm === 'granted') {
        new Notification('TON Miner Bot Notifications Active! 💎', {
          body: 'You will receive instant alerts on mining yields, unlimited ad boosts, and wallet payouts.'
        });
      }
    }
  };

  // Update Settings in Admin Panel
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      showToast('Settings Updated! ⚙️', 'Custom reward rates and economy rules saved.');
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update settings');
    }
  };

  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#070e18] text-slate-100 flex flex-col items-center justify-start antialiased selection:bg-[#0098ea] selection:text-white">
      {/* Real-time Floating Toast Alert */}
      {toastAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-xs bg-slate-900/95 border border-[#0098ea]/40 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#0098ea]/20 text-[#0098ea] flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{toastAlert.title}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{toastAlert.message}</div>
          </div>
        </div>
      )}

      {/* Sync Status Banner (Only visible if background sync failed) */}
      {syncError && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-300">
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
            <span>Local Mode: Your mining progress is preserved locally.</span>
          </div>
          <button
            onClick={() => fetchUserData()}
            className="flex items-center gap-1 font-semibold hover:underline text-amber-200 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            Retry Sync
          </button>
        </div>
      )}

      {/* Desktop Mode Switcher Bar */}
      <div className="w-full max-w-4xl px-4 pt-2 hidden sm:flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">TON Blockchain Network: Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="toggle-view-mode-btn"
            onClick={() => setIsSimulatedTMA(!isSimulatedTMA)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-[11px] text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isSimulatedTMA ? '🖥️ Switch to Full Screen View' : '📱 Switch to Telegram Phone Frame'}
          </button>
        </div>
      </div>

      {/* Main Container: Supports simulated Telegram App frame or Full Screen */}
      <div className={`w-full transition-all duration-300 flex flex-col ${
        isSimulatedTMA 
          ? 'max-w-md my-0 sm:my-4 rounded-none sm:rounded-3xl border-0 sm:border border-slate-800/80 bg-[#09111e] shadow-2xl min-h-screen sm:min-h-[720px] relative' 
          : 'max-w-4xl min-h-screen my-0 sm:my-4 rounded-none sm:rounded-2xl border-0 sm:border border-slate-800/80 bg-[#09111e]'
      }`}>
        
        {/* Telegram App Simulated Top Status Bar (Only in TMA view) */}
        {isSimulatedTMA && (
          <div className="bg-[#0b1422] px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 font-mono select-none">
            <span className="font-bold text-slate-300">9:41</span>
            <span className="text-[10px] text-cyan-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Telegram Mini App
            </span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Telegram Header */}
        <TelegramHeader
          user={user}
          unreadNotifsCount={unreadNotifs}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenAntiCheatStatus={() => {
            setAntiCheatReason(`Current Cheat Score: ${user.cheatScore}/100. Bot flags: ${user.botFlags.length}. You can solve a verification puzzle anytime.`);
            setIsAntiCheatModalOpen(true);
          }}
          isSimulatedTMA={isSimulatedTMA}
          onToggleTMAMode={() => setIsSimulatedTMA(!isSimulatedTMA)}
          effectiveMultiplier={effectiveMultiplier}
        />

        {/* Dynamic Views */}
        <main className="flex-1 w-full flex flex-col pb-24">
          {currentTab === 'mine' && (
            <MiningReactor
              user={user}
              settings={settings}
              effectiveMultiplier={effectiveMultiplier}
              onTapMine={handleTapMine}
              onInstantTap={handleInstantTap}
              onClaimPassive={handleClaimPassive}
              onOpenAdBoost={() => setIsAdModalOpen(true)}
              onOpenDailyBonus={() => setIsDailyBonusModalOpen(true)}
              onOpenReferrals={() => setCurrentTab('referrals')}
            />
          )}

          {currentTab === 'boosts' && (
            <div className="w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4 pb-20">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                    Unlimited Ad Boosts ⚡
                  </h2>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Stack {settings.adBoostMultiplier}x mining multiplier with zero daily caps!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95"
                >
                  Watch Now
                </button>
              </div>

              {/* Active Boosts Details */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Active Multipliers ({user.activeBoosts.length})
                </span>
                {user.activeBoosts.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    No boosts active. Watch a 5-second ad to activate a {settings.adBoostMultiplier}x multiplier & earn instant TON!
                  </div>
                ) : (
                  user.activeBoosts.map(b => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{b.title}</div>
                        <div className="text-[10px] text-amber-300 font-mono">
                          {b.multiplier}x Mining Speed
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {Math.max(0, Math.floor((b.expiresAt - Date.now()) / 60000))}m left
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Rewarded Ad Player (Earn +{settings.adRewardInstantTon} TON)</span>
              </button>
            </div>
          )}

          {currentTab === 'referrals' && (
            <ReferralView
              user={user}
              settings={settings}
              friends={friends}
              onBack={() => setCurrentTab('mine')}
            />
          )}

          {currentTab === 'wallet' && (
            <div className="w-full max-w-md mx-auto px-4 py-3 pb-24 flex flex-col gap-3.5 animate-in fade-in duration-150">
              {/* Top Balance & Instant Action Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#122238] via-[#0f1b2d] to-[#0a1320] border border-cyan-900/50 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#0098ea]/20 text-[#0098ea] border border-[#0098ea]/30">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mined Balance</span>
                      <div className="text-xl font-black text-white font-mono leading-none mt-0.5">
                        {user.balance.toFixed(5)} <span className="text-xs font-bold text-[#0098ea]">TON</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Min. Payout</span>
                    <div className="text-xs font-bold text-cyan-300 font-mono">
                      {settings.minWithdrawalLimit} TON
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="open-payout-drawer-btn"
                  onClick={() => setIsWalletModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white font-bold text-xs shadow-lg shadow-[#0098ea]/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Request TON Payout (Withdraw)</span>
                </button>
              </div>

              {/* Wallet Connection / Address Management Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Gram & TON Wallet
                    </h3>
                  </div>

                  {user.tonWalletAddress ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <AlertCircle className="w-3 h-3" />
                      Not Linked
                    </span>
                  )}
                </div>

                {/* If Wallet is connected and not currently editing */}
                {user.tonWalletAddress && !isEditingInlineWallet ? (
                  <div className="flex flex-col gap-2">
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-sky-300 truncate select-all">
                        {user.tonWalletAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.tonWalletAddress || '');
                          setInlineCopied(true);
                          setTimeout(() => setInlineCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 flex-shrink-0 transition-all"
                      >
                        {inlineCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {inlineCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setInlineWalletInput(user.tonWalletAddress || '');
                          setIsEditingInlineWallet(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Change Address
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveWalletAddress('')}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Unlink
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Input form for saving/connecting address directly */
                  <div className="flex flex-col gap-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Paste EQ..., UQ..., or Telegram @wallet"
                        value={inlineWalletInput}
                        onChange={(e) => setInlineWalletInput(e.target.value)}
                        className="w-full pl-3 pr-20 py-2.5 rounded-xl bg-black/50 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#0098ea]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setInlineWalletInput(text.trim());
                          } catch {}
                        }}
                        className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                      >
                        <Clipboard className="w-3 h-3" />
                        Paste
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingInlineWallet || !inlineWalletInput.trim()}
                        onClick={async () => {
                          const val = cleanAndValidateTonAddress(inlineWalletInput);
                          if (!val.valid) {
                            showToast('Invalid Address', val.error || 'Please enter a valid TON address.');
                            return;
                          }
                          setIsSavingInlineWallet(true);
                          try {
                            await handleSaveWalletAddress(val.cleaned);
                            setIsEditingInlineWallet(false);
                          } catch (err: any) {
                            showToast('Error Saving Wallet', err.message);
                          } finally {
                            setIsSavingInlineWallet(false);
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0098ea] to-[#0088cc] hover:from-[#00a2ff] hover:to-[#0098ea] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-sky-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSavingInlineWallet ? 'Saving...' : 'Save & Connect Wallet'}
                      </button>
                      {user.tonWalletAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineWalletInput(user.tonWalletAddress || '');
                            setIsEditingInlineWallet(false);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* 1-Click Providers */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        1-Click Instant Connect
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveWalletAddress(`@${user.username || 'wallet'}`)}
                          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-400 text-left transition-all"
                        >
                          <div className="text-[11px] font-bold text-white flex items-center gap-1">
                            <span>✈️</span> Telegram @wallet
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">@{user.username || 'wallet'}</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveWalletAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N')}
                          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-400 text-left transition-all"
                        >
                          <div className="text-[11px] font-bold text-white flex items-center gap-1">
                            <span>💎</span> Gram Wallet
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">Official GRAM Coin</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveWalletAddress('EQBvW8Z5huBkMJYdn30dcTe8xO4m5N42y2N9G3v8v0784920')}
                          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-400 text-left transition-all"
                        >
                          <div className="text-[11px] font-bold text-white flex items-center gap-1">
                            <span>TK</span> Tonkeeper
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">TON Non-Custodial</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveWalletAddress('UQDFG21lmskwpo1829mskalq01828mznxka91283namskd01')}
                          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-sky-400 text-left transition-all"
                        >
                          <div className="text-[11px] font-bold text-white flex items-center gap-1">
                            <span>MT</span> MyTonWallet
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">Web & Desktop</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Payout Requests on Page */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Recent Payouts ({withdrawals.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)}
                    className="text-[11px] font-bold text-[#0098ea] hover:underline"
                  >
                    View All
                  </button>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No payouts requested yet. Mine TON to initiate direct on-chain payouts!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {withdrawals.slice(0, 3).map((w) => (
                      <div
                        key={w.id}
                        className="p-2.5 rounded-xl bg-black/30 border border-slate-800/70 flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white font-mono">{w.netAmount.toFixed(4)} TON</span>
                          <span className="text-[9px] text-slate-400 font-mono truncate max-w-[150px]">
                            {w.tonAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              w.status === 'refunded'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : w.status === 'completed' && w.mode === 'live_onchain'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : w.status === 'completed'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : w.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {w.status === 'refunded' ? 'Refunded' : w.status === 'completed' && w.mode === 'live_onchain' ? 'On-Chain' : w.status === 'completed' ? 'Simulated' : w.status}
                          </span>

                          {(w.status === 'pending' || (w.status === 'completed' && w.mode !== 'live_onchain')) && (
                            <button
                              type="button"
                              onClick={() => handleRefundWithdrawal(w.id)}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-0.5"
                              title="Refund to mining balance"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Refund</span>
                            </button>
                          )}

                          {w.txHash && w.mode === 'live_onchain' && (
                            <a
                              href={`https://tonscan.org/tx/${w.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0098ea] hover:text-cyan-300 p-1"
                              title="View on TON explorer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'leaderboard' && (
            <LeaderboardView
              topMiners={topMiners}
              topReferrers={topReferrers}
              currentUserId={user.id}
            />
          )}

          {currentTab === 'admin' && (
            <AdminPanel
              currentSettings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClose={() => setCurrentTab('mine')}
            />
          )}
        </main>

        {/* Bottom Tab Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          isAdmin={user.role === 'admin'}
          activeBoostsCount={user.activeBoosts.length}
        />
      </div>

      {/* MODALS */}
      {/* 1. Rewarded Ad Boost Modal */}
      <AdBoostModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        settings={settings}
        activeBoosts={user.activeBoosts}
        adsWatchedCount={user.adsWatchedCount || 0}
        onWatchAdSuccess={handleWatchAdSuccess}
      />

      {/* 2. TON Wallet & Withdrawal Modal */}
      <WalletWithdrawModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={user}
        settings={settings}
        withdrawals={withdrawals}
        dispatcherStatus={dispatcherStatus}
        onSaveWalletAddress={handleSaveWalletAddress}
        onRequestWithdrawal={handleRequestWithdrawal}
        onRefundWithdrawal={handleRefundWithdrawal}
      />

      {/* 3. Daily Bonus Streak Modal */}
      <DailyBonusModal
        isOpen={isDailyBonusModalOpen}
        onClose={() => setIsDailyBonusModalOpen(false)}
        user={user}
        onClaimDailyBonus={handleClaimDailyBonus}
      />

      {/* 4. Anti-Cheat Human Verification Modal */}
      <AntiCheatModal
        isOpen={isAntiCheatModalOpen}
        reason={antiCheatReason}
        onSolveChallenge={handleSolveAntiCheat}
        onClose={() => setIsAntiCheatModalOpen(false)}
      />

      {/* 5. Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotifsRead}
        onRequestPushPermission={handleRequestPushPermission}
        pushPermissionState={pushPermissionState}
      />
    </div>
  );
}
