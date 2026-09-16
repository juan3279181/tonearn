import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import type { 
  UserProfile, 
  WithdrawalRequest, 
  SystemSettings, 
  TrafficMetric, 
  LeaderboardEntry,
  ReferralFriend,
  AppNotification
} from './src/types.ts';
import { cleanAndValidateTonAddress } from './src/utils/tonAddress.ts';
import { 
  getDispatcherStatus, 
  dispatchRealTonPayout,
  getHotWalletInfo,
  saveStoredHotWallet,
  clearStoredHotWallet,
  generateNewMnemonic
} from './server/tonPayout.ts';

const PORT = 3000;
const app = express();

// CORS & Headers for Cross-Origin & Telegram iframe embedding
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-memory Database with local persistence (uses /tmp on serverless environments like Vercel)
const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  settings: SystemSettings;
  users: Record<string, UserProfile>;
  withdrawals: WithdrawalRequest[];
  traffic: TrafficMetric[];
  referralsMap: Record<string, ReferralFriend[]>; // userId -> friends
  notifications: Record<string, AppNotification[]>; // userId -> notifications
}

const defaultSettings: SystemSettings = {
  baseMiningRatePerHour: 0.015,
  tapRewardAmount: 0.0001,
  adBoostMultiplier: 2.5,
  adBoostDurationMinutes: 30,
  adRewardInstantTon: 0.005,
  referralBonusTon: 0.05,
  referralCommissionPercent: 12,
  minWithdrawalLimit: 0.01,
  withdrawalFeePercent: 1.5,
  antiCheatMaxTapsPerSec: 12,
  antiCheatSensitivity: 'medium',
  maintenanceMode: false
};

// Initial seed users for lively leaderboard
const initialSeedUsers: Record<string, UserProfile> = {
  'user_1': {
    id: 'user_1',
    telegramId: '829471923',
    username: 'crypto_whale_ton',
    firstName: 'Alexandre',
    tonWalletAddress: 'EQBvW8Z5huBkMJYdn30dcTe8xO4m5N42y2N9G3v8v0784920',
    balance: 14.8521,
    totalMined: 42.6105,
    energy: 950,
    maxEnergy: 1000,
    energyRegenRate: 2,
    minerLevel: 5,
    minerBaseRate: 0.045,
    activeBoosts: [],
    lastActiveTimestamp: Date.now() - 120000,
    lastDailyClaim: Date.now() - 3600000 * 20,
    dailyStreak: 6,
    referralCode: 'TON_WHALE',
    referralsCount: 48,
    referralEarnings: 6.24,
    role: 'user',
    isBanned: false,
    cheatScore: 4,
    botFlags: [],
    adsWatchedCount: 124,
    createdAt: Date.now() - 86400000 * 30
  },
  'user_2': {
    id: 'user_2',
    telegramId: '992019481',
    username: 'ton_rocket_node',
    firstName: 'Elena R.',
    tonWalletAddress: 'UQDFG21lmskwpo1829mskalq01828mznxka91283namskd01',
    balance: 8.3129,
    totalMined: 29.4182,
    energy: 800,
    maxEnergy: 1000,
    energyRegenRate: 2,
    minerLevel: 4,
    minerBaseRate: 0.035,
    activeBoosts: [],
    lastActiveTimestamp: Date.now() - 300000,
    lastDailyClaim: Date.now() - 3600000 * 12,
    dailyStreak: 4,
    referralCode: 'ROCKET_TON',
    referralsCount: 31,
    referralEarnings: 3.85,
    role: 'user',
    isBanned: false,
    cheatScore: 8,
    botFlags: [],
    adsWatchedCount: 88,
    createdAt: Date.now() - 86400000 * 25
  },
  'user_3': {
    id: 'user_3',
    telegramId: '551928472',
    username: 'durov_miner_fan',
    firstName: 'Pavel M.',
    tonWalletAddress: 'EQC38dm1ksu2019smdkqw918239mskd019284jksdfa01827',
    balance: 5.1294,
    totalMined: 19.8291,
    energy: 1000,
    maxEnergy: 1000,
    energyRegenRate: 2,
    minerLevel: 3,
    minerBaseRate: 0.025,
    activeBoosts: [],
    lastActiveTimestamp: Date.now() - 600000,
    lastDailyClaim: Date.now() - 3600000 * 8,
    dailyStreak: 3,
    referralCode: 'DUROV_FAN',
    referralsCount: 22,
    referralEarnings: 2.11,
    role: 'user',
    isBanned: false,
    cheatScore: 12,
    botFlags: [],
    adsWatchedCount: 65,
    createdAt: Date.now() - 86400000 * 18
  },
  'user_demo': {
    id: 'user_demo',
    telegramId: '772910482',
    username: 'ton_champion',
    firstName: 'You (Miner)',
    tonWalletAddress: 'EQA4j3g7YkFm028hjdKmslwq82937mdkQo182js8dj283921',
    balance: 0.7420,
    totalMined: 1.4820,
    energy: 1000,
    maxEnergy: 1000,
    energyRegenRate: 2,
    minerLevel: 2,
    minerBaseRate: 0.020,
    activeBoosts: [
      {
        id: 'boost_welcome',
        title: '2.5x Ad Boost',
        multiplier: 2.5,
        durationSeconds: 1800,
        startedAt: Date.now() - 300000,
        expiresAt: Date.now() + 1500000,
        type: 'ad'
      }
    ],
    lastActiveTimestamp: Date.now(),
    lastDailyClaim: Date.now() - 3600000 * 25,
    dailyStreak: 2,
    referralCode: 'TON_MINER_VIP',
    referralsCount: 3,
    referralEarnings: 0.18,
    role: 'admin', // Demo account has admin privilege to test Admin Panel easily!
    isBanned: false,
    cheatScore: 0,
    botFlags: [],
    adsWatchedCount: 5,
    createdAt: Date.now() - 86400000 * 3
  }
};

let db: DatabaseSchema = {
  settings: defaultSettings,
  users: initialSeedUsers,
  withdrawals: [
    {
      id: 'tx_demo_01',
      userId: 'user_1',
      username: 'crypto_whale_ton',
      amount: 5.0,
      fee: 0.075,
      netAmount: 4.925,
      tonAddress: 'EQBvW8Z5huBkMJYdn30dcTe8xO4m5N42y2N9G3v8v0784920',
      status: 'completed',
      createdAt: Date.now() - 86400000 * 2,
      processedAt: Date.now() - 86400000 * 2 + 120000,
      txHash: '9a72b01fc5e8e819fa2c4d9e01824abde92f11c34a1b0283c4821a0f9182390a'
    },
    {
      id: 'tx_demo_02',
      userId: 'user_2',
      username: 'ton_rocket_node',
      amount: 2.5,
      fee: 0.0375,
      netAmount: 2.4625,
      tonAddress: 'UQDFG21lmskwpo1829mskalq01828mznxka91283namskd01',
      status: 'completed',
      createdAt: Date.now() - 86400000,
      processedAt: Date.now() - 86400000 + 45000,
      txHash: '1f82c401aa94b8e2819cd09275a28bce0818274acb91827361928aef01928471'
    },
    {
      id: 'tx_demo_pending',
      userId: 'user_3',
      username: 'durov_miner_fan',
      amount: 1.2,
      fee: 0.018,
      netAmount: 1.182,
      tonAddress: 'EQC38dm1ksu2019smdkqw918239mskd019284jksdfa01827',
      status: 'pending',
      createdAt: Date.now() - 3600000 * 3
    }
  ],
  traffic: [],
  referralsMap: {
    'user_demo': [
      { id: 'ref_1', username: 'ton_fan_99', joinedAt: Date.now() - 86400000 * 2, minedTotal: 0.42, commissionEarned: 0.05, active: true },
      { id: 'ref_2', username: 'telegram_gems', joinedAt: Date.now() - 86400000, minedTotal: 0.81, commissionEarned: 0.09, active: true },
      { id: 'ref_3', username: 'crypto_digger', joinedAt: Date.now() - 3600000 * 5, minedTotal: 0.25, commissionEarned: 0.04, active: true }
    ]
  },
  notifications: {
    'user_demo': [
      {
        id: 'notif_welcome',
        title: 'Welcome to TON Miner!',
        message: 'Start mining TON coin, watch ads for unlimited boost multipliers, and invite friends.',
        timestamp: Date.now() - 86400000 * 2,
        read: true,
        type: 'system'
      },
      {
        id: 'notif_boost',
        title: 'Ad Boost Active!',
        message: 'Your 2.5x mining speed boost is active. You can stack unlimited boosts!',
        timestamp: Date.now() - 300000,
        read: false,
        type: 'boost'
      }
    ]
  }
};

// Persistence helper
function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      db = {
        ...db,
        ...loaded,
        users: { ...initialSeedUsers, ...(loaded.users || {}) }
      };
    }
  } catch (err) {
    console.error('Failed to load database:', err);
  }
}
loadDatabase();

// Traffic monitor middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    
    // Anomaly detection for traffic
    let isSuspicious = false;
    let flagReason: string | undefined;

    if (duration > 1500) {
      isSuspicious = true;
      flagReason = 'High latency spike';
    }

    const metric: TrafficMetric = {
      id: 'trf_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      endpoint: req.originalUrl.split('?')[0],
      method: req.method,
      userId,
      ip: ip.split(',')[0].trim(),
      durationMs: duration,
      isSuspicious,
      flagReason
    };

    // Keep last 150 metrics
    db.traffic.unshift(metric);
    if (db.traffic.length > 150) {
      db.traffic.pop();
    }
  });

  next();
});

// Helper: Calculate total active multiplier for a user
function getUserEffectiveMultiplier(user: UserProfile): number {
  const now = Date.now();
  const validBoosts = user.activeBoosts.filter(b => b.expiresAt > now);
  if (validBoosts.length !== user.activeBoosts.length) {
    user.activeBoosts = validBoosts;
  }
  
  // Base multiplier is 1.0
  let totalMultiplier = 1.0;
  for (const boost of validBoosts) {
    totalMultiplier += (boost.multiplier - 1.0);
  }
  return Math.max(1.0, totalMultiplier);
}

// Helper: Regenerate user energy based on elapsed time (always unlimited/max energy)
function syncUserEnergy(user: UserProfile) {
  user.energy = user.maxEnergy;
  user.lastActiveTimestamp = Date.now();
}

// Helper: Get or create user profile reliably
function getOrCreateUser(userId: string, refCode?: string, username?: string, firstName?: string): UserProfile {
  let user = db.users[userId];
  if (!user) {
    if (userId === 'user_demo') {
      user = {
        id: 'user_demo',
        telegramId: '772910482',
        username: 'ton_champion',
        firstName: 'You (Miner)',
        tonWalletAddress: 'EQA4j3g7YkFm028hjdKmslwq82937mdkQo182js8dj283921',
        balance: 0.7485,
        totalMined: 1.4885,
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
        adsWatchedCount: 6,
        createdAt: Date.now() - 86400000 * 3
      };
    } else {
      const generatedRef = 'TON_' + Math.random().toString(36).substring(2, 7).toUpperCase();
      user = {
        id: userId,
        telegramId: String(Math.floor(100000000 + Math.random() * 900000000)),
        username: username || 'miner_' + Math.random().toString(36).substring(2, 6),
        firstName: firstName || 'Miner',
        tonWalletAddress: '',
        balance: 0.05,
        totalMined: 0.05,
        energy: 1000,
        maxEnergy: 1000,
        energyRegenRate: 2,
        minerLevel: 1,
        minerBaseRate: db.settings.baseMiningRatePerHour,
        activeBoosts: [],
        lastActiveTimestamp: Date.now(),
        lastDailyClaim: 0,
        dailyStreak: 0,
        referralCode: generatedRef,
        referredBy: refCode && db.users[refCode] ? refCode : undefined,
        referralsCount: 0,
        referralEarnings: 0,
        role: 'user',
        isBanned: false,
        cheatScore: 0,
        botFlags: [],
        adsWatchedCount: 0,
        createdAt: Date.now()
      };
    }
    db.users[userId] = user;

    // Handle referral reward if referred
    if (refCode && db.users[refCode]) {
      const inviter = db.users[refCode];
      inviter.referralsCount += 1;
      inviter.balance += db.settings.referralBonusTon;
      inviter.referralEarnings += db.settings.referralBonusTon;

      if (!db.referralsMap[inviter.id]) db.referralsMap[inviter.id] = [];
      db.referralsMap[inviter.id].unshift({
        id: user.id,
        username: user.username,
        joinedAt: Date.now(),
        minedTotal: 0.05,
        commissionEarned: db.settings.referralBonusTon,
        active: true
      });

      if (!db.notifications[inviter.id]) db.notifications[inviter.id] = [];
      db.notifications[inviter.id].unshift({
        id: 'ref_' + Date.now(),
        title: 'New Referral Joined! 🚀',
        message: `@${user.username} joined via your link! You received +${db.settings.referralBonusTon} TON!`,
        timestamp: Date.now(),
        read: false,
        type: 'referral'
      });
    }

    saveDatabase();
  }

  // Auto-clear false-positive cheat scores
  if (user.cheatScore > 0 && !user.isBanned) {
    user.cheatScore = 0;
    user.botFlags = [];
  }

  return user;
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// GET /api/user?id=xxx
app.get('/api/user', (req: Request, res: Response) => {
  const userId = (req.query.id as string) || 'user_demo';
  const user = getOrCreateUser(
    userId,
    req.query.ref as string,
    req.query.username as string,
    req.query.first_name as string
  );

  syncUserEnergy(user);
  const currentMultiplier = getUserEffectiveMultiplier(user);

  res.json({
    user,
    effectiveMultiplier: currentMultiplier,
    settings: db.settings,
    serverTime: Date.now()
  });
});

// POST /api/user/wallet & aliases - Save or connect Gram / TON wallet address
const handleSaveWalletAddress = (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const body = req.body || {};
    const userId = body.userId || (req.query?.userId as string) || 'user_demo';
    const user = getOrCreateUser(userId);

    const rawInput = body.tonWalletAddress ?? body.walletAddress ?? body.address ?? body.tonAddress ?? body.wallet;
    
    // Support disconnecting / unlinking wallet
    if (rawInput === '' || rawInput === 'disconnect' || rawInput === null) {
      user.tonWalletAddress = '';
      saveDatabase();
      return res.json({ success: true, tonWalletAddress: '', disconnected: true });
    }

    if (typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid Gram / TON wallet address.' });
    }

    const validation = cleanAndValidateTonAddress(rawInput);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error || 'Invalid Gram / TON wallet address format' 
      });
    }

    user.tonWalletAddress = validation.cleaned;
    
    // Add success notification
    if (!db.notifications[user.id]) db.notifications[user.id] = [];
    const shortAddr = validation.cleaned.length > 12 
      ? `${validation.cleaned.substring(0, 6)}...${validation.cleaned.substring(validation.cleaned.length - 4)}`
      : validation.cleaned;
    db.notifications[user.id].unshift({
      id: 'wallet_' + Date.now(),
      title: 'Wallet Connected! 💎',
      message: `Gram / TON wallet ${shortAddr} successfully linked for instant payouts.`,
      timestamp: Date.now(),
      read: false,
      type: 'system'
    });

    saveDatabase();
    return res.json({ success: true, tonWalletAddress: user.tonWalletAddress });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update wallet address' });
  }
};

app.post('/api/user/wallet', handleSaveWalletAddress);
app.post('/api/wallet/save', handleSaveWalletAddress);
app.post('/api/wallet/connect', handleSaveWalletAddress);

// POST /api/mine/tap - Active tap mining (Unlimited energy & no fair play security checks for tap clicks)
app.post('/api/mine/tap', (req: Request, res: Response) => {
  const { userId, tapsCount } = req.body;
  const user = getOrCreateUser(userId || 'user_demo');

  if (user.isBanned) {
    return res.status(403).json({ error: 'Account suspended' });
  }

  // Unlimited energy: keep user energy always at maxEnergy
  user.energy = user.maxEnergy;

  const rawCount = parseInt(tapsCount, 10);
  const count = Math.min(Math.max(1, isNaN(rawCount) ? 1 : rawCount), 50);

  // Calculate yield with full unlimited energy
  const effectiveMultiplier = getUserEffectiveMultiplier(user);
  const earned = count * db.settings.tapRewardAmount * effectiveMultiplier;

  if (earned > 0) {
    user.balance += earned;
    user.totalMined += earned;
  }
  user.lastActiveTimestamp = Date.now();

  // Reset any bot flags / cheat score so no Security Check is ever triggered for tap clicking
  user.cheatScore = 0;
  user.botFlags = [];

  // Credit referral commission to inviter if applicable
  if (earned > 0 && user.referredBy && db.users[user.referredBy]) {
    const commission = earned * (db.settings.referralCommissionPercent / 100);
    db.users[user.referredBy].balance += commission;
    db.users[user.referredBy].referralEarnings += commission;
  }

  saveDatabase();

  res.json({
    success: true,
    earned,
    newBalance: user.balance,
    energy: user.energy,
    effectiveMultiplier
  });
});

// POST /api/mine/claim-passive - Claims passive background mining
app.post('/api/mine/claim-passive', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = getOrCreateUser(userId || 'user_demo');
  if (user.isBanned) return res.status(403).json({ error: 'Account suspended' });

  const now = Date.now();
  const elapsedHours = Math.min(24, Math.max(0, (now - user.lastActiveTimestamp) / (1000 * 3600)));
  
  if (elapsedHours < (1 / 60)) { // minimum 1 minute
    return res.status(400).json({ error: 'Too soon to claim passive mining. Try after a few minutes.' });
  }

  const effectiveMultiplier = getUserEffectiveMultiplier(user);
  const ratePerHour = user.minerBaseRate || db.settings.baseMiningRatePerHour;
  const passiveYield = elapsedHours * ratePerHour * effectiveMultiplier;

  user.balance += passiveYield;
  user.totalMined += passiveYield;
  syncUserEnergy(user);
  user.lastActiveTimestamp = now;

  saveDatabase();

  res.json({
    success: true,
    claimedAmount: passiveYield,
    elapsedMinutes: Math.floor(elapsedHours * 60),
    newBalance: user.balance
  });
});

// POST /api/ads/watch - Watch Ads to Earn Unlimited Boosts & TON
app.post('/api/ads/watch', (req: Request, res: Response) => {
  const { userId, adNetwork = 'Telegram Adsgram' } = req.body;
  const user = getOrCreateUser(userId || 'user_demo');

  const now = Date.now();
  const boostDurationMs = db.settings.adBoostDurationMinutes * 60 * 1000;
  const instantTon = db.settings.adRewardInstantTon;

  // Credit instant TON
  user.balance += instantTon;
  user.totalMined += instantTon;
  user.adsWatchedCount = (user.adsWatchedCount || 0) + 1;

  // Add or extend boost (Unlimited boosts stacking!)
  // If user already has an ad boost active, extend expiration!
  const existingAdBoost = user.activeBoosts.find(b => b.type === 'ad' && b.expiresAt > now);
  if (existingAdBoost) {
    existingAdBoost.expiresAt += boostDurationMs;
    existingAdBoost.multiplier = Math.max(existingAdBoost.multiplier, db.settings.adBoostMultiplier);
  } else {
    user.activeBoosts.push({
      id: 'boost_' + Date.now(),
      title: `${db.settings.adBoostMultiplier}x Speed Boost`,
      multiplier: db.settings.adBoostMultiplier,
      durationSeconds: db.settings.adBoostDurationMinutes * 60,
      startedAt: now,
      expiresAt: now + boostDurationMs,
      type: 'ad'
    });
  }

  // Also instantly refill 300 energy!
  user.energy = Math.min(user.maxEnergy, user.energy + 300);

  // Send in-app notification
  if (!db.notifications[user.id]) db.notifications[user.id] = [];
  db.notifications[user.id].unshift({
    id: 'ad_' + Date.now(),
    title: 'Ad Boost Applied! ⚡',
    message: `Earned +${instantTon} TON & ${db.settings.adBoostMultiplier}x Mining Boost for ${db.settings.adBoostDurationMinutes}m! Refilled +300 Energy.`,
    timestamp: now,
    read: false,
    type: 'boost'
  });

  saveDatabase();

  res.json({
    success: true,
    earnedTon: instantTon,
    newBalance: user.balance,
    energy: user.energy,
    activeBoosts: user.activeBoosts.filter(b => b.expiresAt > now),
    effectiveMultiplier: getUserEffectiveMultiplier(user),
    totalAdsWatched: user.adsWatchedCount
  });
});

// POST /api/daily-bonus/claim - Claim daily streak bonus
app.post('/api/daily-bonus/claim', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = getOrCreateUser(userId || 'user_demo');

  const now = Date.now();
  const ONE_DAY = 86400000;
  const elapsedSinceClaim = now - (user.lastDailyClaim || 0);

  if (user.lastDailyClaim && elapsedSinceClaim < ONE_DAY * 0.8) {
    return res.status(400).json({ error: 'Daily bonus already claimed for today! Check back tomorrow.' });
  }

  // Check streak
  if (!user.lastDailyClaim || elapsedSinceClaim > ONE_DAY * 2.2) {
    user.dailyStreak = 1;
  } else {
    user.dailyStreak = (user.dailyStreak % 7) + 1;
  }

  // Escalating reward table
  const streakRewards: Record<number, { ton: number; boostMult: number; boostMins: number; energy: number }> = {
    1: { ton: 0.002, boostMult: 1.2, boostMins: 15, energy: 200 },
    2: { ton: 0.005, boostMult: 1.5, boostMins: 20, energy: 300 },
    3: { ton: 0.010, boostMult: 1.8, boostMins: 30, energy: 400 },
    4: { ton: 0.020, boostMult: 2.0, boostMins: 30, energy: 500 },
    5: { ton: 0.035, boostMult: 2.2, boostMins: 45, energy: 600 },
    6: { ton: 0.050, boostMult: 2.5, boostMins: 60, energy: 800 },
    7: { ton: 0.100, boostMult: 3.0, boostMins: 120, energy: 1000 }
  };

  const reward = streakRewards[user.dailyStreak] || streakRewards[1];

  user.balance += reward.ton;
  user.totalMined += reward.ton;
  user.energy = Math.min(user.maxEnergy, user.energy + reward.energy);
  user.lastDailyClaim = now;

  // Add streak boost
  user.activeBoosts.push({
    id: 'streak_boost_' + Date.now(),
    title: `Day ${user.dailyStreak} Streak Boost (${reward.boostMult}x)`,
    multiplier: reward.boostMult,
    durationSeconds: reward.boostMins * 60,
    startedAt: now,
    expiresAt: now + (reward.boostMins * 60 * 1000),
    type: 'daily'
  });

  // Notification
  if (!db.notifications[user.id]) db.notifications[user.id] = [];
  db.notifications[user.id].unshift({
    id: 'daily_' + Date.now(),
    title: `Day ${user.dailyStreak} Streak Claimed! 🔥`,
    message: `Received +${reward.ton} TON, +${reward.energy} Energy and a ${reward.boostMult}x Mining Boost!`,
    timestamp: now,
    read: false,
    type: 'mining'
  });

  saveDatabase();

  res.json({
    success: true,
    day: user.dailyStreak,
    reward,
    newBalance: user.balance,
    energy: user.energy
  });
});

// GET /api/wallet/dispatcher-status - Check status of server TON hot wallet dispatcher
app.get('/api/wallet/dispatcher-status', async (req: Request, res: Response) => {
  try {
    const status = await getDispatcherStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to check dispatcher status' });
  }
});

// POST /api/wallet/refund - Refund pending or unfulfilled payout back to user's mining balance
app.post('/api/wallet/refund', (req: Request, res: Response) => {
  try {
    const { withdrawalId, userId } = req.body || {};
    if (!withdrawalId) {
      return res.status(400).json({ error: 'Missing withdrawalId parameter.' });
    }

    const item = db.withdrawals.find(w => w.id === withdrawalId);
    if (!item) {
      return res.status(404).json({ error: 'Withdrawal record not found.' });
    }

    if (userId && item.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to refund this withdrawal.' });
    }

    if (item.status === 'refunded') {
      return res.status(400).json({ error: 'This withdrawal has already been refunded.' });
    }

    // Protect against double-spending if it was an actual verified on-chain transfer
    if (item.status === 'completed' && item.mode === 'live_onchain') {
      return res.status(400).json({ error: 'Cannot refund a completed on-chain blockchain transaction.' });
    }

    const user = getOrCreateUser(item.userId);
    user.balance += item.amount;
    item.status = 'refunded';
    item.refundedAt = Date.now();

    if (!db.notifications[user.id]) db.notifications[user.id] = [];
    db.notifications[user.id].unshift({
      id: 'refund_' + Date.now(),
      title: 'TON Refunded to Balance! 💎',
      message: `Your withdrawal request of ${item.amount} TON was refunded back to your mining balance.`,
      timestamp: Date.now(),
      read: false,
      type: 'payout'
    });

    saveDatabase();

    return res.json({
      success: true,
      refundedAmount: item.amount,
      newBalance: user.balance,
      withdrawal: item
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to refund withdrawal' });
  }
});

// POST /api/wallet/withdraw & aliases - Secure Gram / TON withdrawal integration
const handleWithdrawRequest = async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { userId, tonAddress, amount, memo } = req.body || {};
    const user = getOrCreateUser(userId || 'user_demo');

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account suspended. Withdrawals blocked.' });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid withdrawal amount greater than 0.' });
    }

    const minLimit = db.settings.minWithdrawalLimit ?? 0.01;
    if (withdrawAmount < minLimit) {
      return res.status(400).json({ 
        error: `Minimum withdrawal amount is ${minLimit} TON` 
      });
    }

    if (user.balance < withdrawAmount - 0.000001) {
      return res.status(400).json({ 
        error: `Insufficient balance. You have ${user.balance.toFixed(4)} TON available.` 
      });
    }

    // Validate and sanitize Gram / TON address
    const rawTarget = (tonAddress || user.tonWalletAddress || '').trim();
    const validation = cleanAndValidateTonAddress(rawTarget);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error || 'Invalid Gram / TON destination wallet address format' 
      });
    }

    const targetAddress = validation.cleaned;
    const fee = withdrawAmount * ((db.settings.withdrawalFeePercent || 1.5) / 100);
    const netAmount = Math.max(0, withdrawAmount - fee);

    // Deduct balance
    user.balance = Math.max(0, user.balance - withdrawAmount);
    user.tonWalletAddress = targetAddress;

    const withdrawal: WithdrawalRequest = {
      id: 'tx_' + Math.random().toString(36).substring(2, 10),
      userId: user.id,
      username: user.username,
      amount: withdrawAmount,
      fee,
      netAmount,
      tonAddress: targetAddress,
      memo: memo ? String(memo).substring(0, 64) : undefined,
      status: 'pending',
      mode: 'pending_hotwallet',
      createdAt: Date.now()
    };

    // Check if live server hot wallet is ready to broadcast on-chain
    const dispatcher = await getDispatcherStatus();
    if (dispatcher.mode === 'live_ready') {
      const dispatchResult = await dispatchRealTonPayout({
        toAddress: targetAddress,
        amountTon: netAmount,
        memo: memo ? String(memo).substring(0, 64) : undefined
      });

      if (dispatchResult.success && dispatchResult.onChain) {
        withdrawal.status = 'completed';
        withdrawal.mode = 'live_onchain';
        withdrawal.txHash = dispatchResult.txHash;
        withdrawal.processedAt = Date.now();
      } else {
        withdrawal.status = 'pending';
        withdrawal.mode = 'pending_hotwallet';
        withdrawal.dispatchError = dispatchResult.error;
      }
    } else {
      withdrawal.status = 'pending';
      withdrawal.mode = 'pending_hotwallet';
      withdrawal.dispatchError = dispatcher.message;
    }

    if (!Array.isArray(db.withdrawals)) {
      db.withdrawals = [];
    }
    db.withdrawals.unshift(withdrawal);

    // Payout notification
    if (!db.notifications[user.id]) db.notifications[user.id] = [];
    const addrDisplay = targetAddress.length > 12 
      ? `${targetAddress.substring(0, 6)}...${targetAddress.substring(targetAddress.length - 4)}` 
      : targetAddress;

    if (withdrawal.status === 'completed' && withdrawal.mode === 'live_onchain') {
      db.notifications[user.id].unshift({
        id: 'wdraw_' + Date.now(),
        title: 'Payout Broadcast On-Chain! 💎',
        message: `Successfully broadcast ${netAmount.toFixed(4)} TON to ${addrDisplay} on the TON blockchain!`,
        timestamp: Date.now(),
        read: false,
        type: 'payout'
      });
    } else {
      db.notifications[user.id].unshift({
        id: 'wdraw_' + Date.now(),
        title: 'Withdrawal Queued 💎',
        message: `Payout request of ${withdrawAmount} TON to ${addrDisplay} recorded. Awaiting on-chain broadcast (can be refunded to balance anytime).`,
        timestamp: Date.now(),
        read: false,
        type: 'payout'
      });
    }

    saveDatabase();

    return res.json({
      success: true,
      withdrawal,
      newBalance: user.balance
    });
  } catch (err: any) {
    console.error('Error processing payout request:', err);
    return res.status(500).json({ 
      error: 'Failed to process payout: ' + (err?.message || 'Internal server error') 
    });
  }
};

app.post('/api/wallet/withdraw', handleWithdrawRequest);
app.post('/api/wallet/payout', handleWithdrawRequest);
app.post('/api/withdraw', handleWithdrawRequest);

// GET /api/wallet/history?userId=xxx
app.get('/api/wallet/history', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const history = db.withdrawals.filter(w => !userId || w.userId === userId);
  res.json({ withdrawals: history });
});

// GET /api/referrals?userId=xxx
app.get('/api/referrals', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_demo';
  const user = getOrCreateUser(userId);

  const friends = db.referralsMap[userId] || [];
  res.json({
    referralCode: user.referralCode,
    referralsCount: user.referralsCount,
    referralEarnings: user.referralEarnings,
    friends,
    commissionPercent: db.settings.referralCommissionPercent,
    bonusPerReferral: db.settings.referralBonusTon
  });
});

// GET /api/leaderboard
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const currentUserId = req.query.userId as string;
  const allUsers = Object.values(db.users);

  // Top Miners
  const topMiners: LeaderboardEntry[] = allUsers
    .sort((a, b) => b.totalMined - a.totalMined)
    .slice(0, 20)
    .map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      username: u.username,
      totalMined: parseFloat(u.totalMined.toFixed(4)),
      referralsCount: u.referralsCount,
      minerLevel: u.minerLevel,
      isCurrentUser: u.id === currentUserId
    }));

  // Top Referrers
  const topReferrers: LeaderboardEntry[] = allUsers
    .sort((a, b) => b.referralsCount - a.referralsCount)
    .slice(0, 20)
    .map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      username: u.username,
      totalMined: parseFloat(u.totalMined.toFixed(4)),
      referralsCount: u.referralsCount,
      minerLevel: u.minerLevel,
      isCurrentUser: u.id === currentUserId
    }));

  res.json({ topMiners, topReferrers });
});

// GET /api/notifications?userId=xxx
app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_demo';
  const userNotifs = db.notifications[userId] || [];
  res.json({ notifications: userNotifs });
});

// POST /api/notifications/mark-read
app.post('/api/notifications/mark-read', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (db.notifications[userId]) {
    db.notifications[userId].forEach(n => (n.read = true));
    saveDatabase();
  }
  res.json({ success: true });
});

// Anti-cheat verification challenge
app.post('/api/anticheat/verify-challenge', (req: Request, res: Response) => {
  const { userId, answer, expected } = req.body;
  const user = db.users[userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (parseInt(answer, 10) === parseInt(expected, 10)) {
    user.cheatScore = Math.max(0, user.cheatScore - 30);
    user.botFlags = [];
    saveDatabase();
    return res.json({ success: true, message: 'Human verification successful! Gameplay unlocked.' });
  } else {
    user.cheatScore = Math.min(100, user.cheatScore + 10);
    saveDatabase();
    return res.status(400).json({ success: false, error: 'Incorrect challenge answer. Try again.' });
  }
});

// -------------------------------------------------------------
// ADMIN PANEL ENDPOINTS
// -------------------------------------------------------------

// Check Admin authorization middleware
function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'];
  const userId = req.headers['x-user-id'] as string;
  const user = userId ? db.users[userId] : null;

  // Allow if user is admin role or master key
  if ((user && user.role === 'admin') || adminKey === 'ton_admin_secret_2026' || !userId) {
    return next();
  }
  return res.status(403).json({ error: 'Admin authorization required' });
}

// GET /api/admin/stats - Network traffic, metrics, and summary
app.get('/api/admin/stats', checkAdmin, (req: Request, res: Response) => {
  const usersList = Object.values(db.users);
  const totalUsers = usersList.length;
  const totalMinedTon = usersList.reduce((sum, u) => sum + (u.totalMined || 0), 0);
  const totalPendingPayouts = db.withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.netAmount, 0);
  
  const suspiciousCount = db.traffic.filter(t => t.isSuspicious).length;
  const totalAdsWatched = usersList.reduce((sum, u) => sum + (u.adsWatchedCount || 0), 0);

  res.json({
    totalUsers,
    totalMinedTon,
    totalPendingPayouts,
    totalAdsWatched,
    trafficCount: db.traffic.length,
    suspiciousTrafficCount: suspiciousCount,
    pendingWithdrawalsCount: db.withdrawals.filter(w => w.status === 'pending').length,
    recentTraffic: db.traffic.slice(0, 30),
    settings: db.settings
  });
});

// GET /api/admin/users
app.get('/api/admin/users', checkAdmin, (req: Request, res: Response) => {
  const { search, filter } = req.query;
  let list = Object.values(db.users);

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.id.toLowerCase().includes(q) ||
      u.telegramId.toLowerCase().includes(q) ||
      (u.tonWalletAddress && u.tonWalletAddress.toLowerCase().includes(q))
    );
  }

  if (filter === 'banned') {
    list = list.filter(u => u.isBanned);
  } else if (filter === 'suspicious') {
    list = list.filter(u => u.cheatScore > 20 || u.botFlags.length > 0);
  }

  res.json({ users: list });
});

// POST /api/admin/users/action - Ban, unban, adjust balance, reset score
app.post('/api/admin/users/action', checkAdmin, (req: Request, res: Response) => {
  const { targetUserId, action, value } = req.body;
  const target = db.users[targetUserId];
  if (!target) return res.status(404).json({ error: 'Target user not found' });

  if (action === 'toggle_ban') {
    target.isBanned = !target.isBanned;
  } else if (action === 'adjust_balance') {
    const delta = parseFloat(value);
    if (!isNaN(delta)) {
      target.balance = Math.max(0, target.balance + delta);
      if (delta > 0) target.totalMined += delta;
    }
  } else if (action === 'reset_cheat_score') {
    target.cheatScore = 0;
    target.botFlags = [];
  } else if (action === 'make_admin') {
    target.role = target.role === 'admin' ? 'user' : 'admin';
  }

  saveDatabase();
  res.json({ success: true, user: target });
});

// GET /api/admin/payouts
app.get('/api/admin/payouts', checkAdmin, (req: Request, res: Response) => {
  res.json({ withdrawals: db.withdrawals });
});

// POST /api/admin/payouts/process - Approve or reject payout
app.post('/api/admin/payouts/process', checkAdmin, async (req: Request, res: Response) => {
  const { withdrawalId, action, rejectionReason } = req.body;
  const item = db.withdrawals.find(w => w.id === withdrawalId);
  if (!item) return res.status(404).json({ error: 'Withdrawal not found' });

  if (item.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal is already ${item.status}` });
  }

  if (action === 'approve') {
    const dispatcher = await getDispatcherStatus();
    if (dispatcher.mode === 'live_ready') {
      const dispatchResult = await dispatchRealTonPayout({
        toAddress: item.tonAddress,
        amountTon: item.netAmount,
        memo: item.memo
      });

      if (dispatchResult.success && dispatchResult.onChain) {
        item.status = 'completed';
        item.mode = 'live_onchain';
        item.processedAt = Date.now();
        item.txHash = dispatchResult.txHash;

        if (!db.notifications[item.userId]) db.notifications[item.userId] = [];
        db.notifications[item.userId].unshift({
          id: 'payout_done_' + Date.now(),
          title: 'Payout Broadcast On-Chain! 💎',
          message: `Your withdrawal of ${item.netAmount.toFixed(4)} TON has been broadcast to the TON network. Tx: ${item.txHash?.substring(0, 10)}...`,
          timestamp: Date.now(),
          read: false,
          type: 'payout'
        });
      } else {
        return res.status(400).json({ 
          error: 'On-chain broadcast failed: ' + (dispatchResult.error || 'Unknown error') 
        });
      }
    } else {
      // Completed in demo/simulated mode
      item.status = 'completed';
      item.mode = 'simulated';
      item.processedAt = Date.now();
      item.dispatchError = 'Approved in Demo Mode: No funded TON Hot Wallet (TON_WALLET_MNEMONIC) configured on server.';

      if (!db.notifications[item.userId]) db.notifications[item.userId] = [];
      db.notifications[item.userId].unshift({
        id: 'payout_done_' + Date.now(),
        title: 'Payout Approved (Demo Mode)',
        message: `Your payout of ${item.netAmount.toFixed(4)} TON was approved in test mode. Note: No server hot wallet is configured, so no on-chain crypto was sent. You can refund to balance anytime.`,
        timestamp: Date.now(),
        read: false,
        type: 'payout'
      });
    }
  } else if (action === 'reject') {
    item.status = 'rejected';
    item.processedAt = Date.now();
    item.rejectionReason = rejectionReason || 'Failed verification checks';

    // Refund TON to user
    const user = db.users[item.userId];
    if (user) {
      user.balance += item.amount;
    }

    if (!db.notifications[item.userId]) db.notifications[item.userId] = [];
    db.notifications[item.userId].unshift({
      id: 'payout_rej_' + Date.now(),
      title: 'Withdrawal Rejected',
      message: `Your withdrawal of ${item.amount} TON was refunded: ${item.rejectionReason}`,
      timestamp: Date.now(),
      read: false,
      type: 'payout'
    });
  }

  saveDatabase();
  res.json({ success: true, withdrawal: item });
});

// POST /api/admin/payouts/batch-approve
app.post('/api/admin/payouts/batch-approve', checkAdmin, async (req: Request, res: Response) => {
  const pending = db.withdrawals.filter(w => w.status === 'pending');
  const dispatcher = await getDispatcherStatus();
  let count = 0;

  for (const item of pending) {
    if (dispatcher.mode === 'live_ready') {
      const dispatchResult = await dispatchRealTonPayout({
        toAddress: item.tonAddress,
        amountTon: item.netAmount,
        memo: item.memo
      });
      if (dispatchResult.success && dispatchResult.onChain) {
        item.status = 'completed';
        item.mode = 'live_onchain';
        item.processedAt = Date.now();
        item.txHash = dispatchResult.txHash;
        count++;
      }
    } else {
      item.status = 'completed';
      item.mode = 'simulated';
      item.processedAt = Date.now();
      item.dispatchError = 'Approved in Demo Mode: No funded TON Hot Wallet configured.';
      count++;
    }

    if (!db.notifications[item.userId]) db.notifications[item.userId] = [];
    db.notifications[item.userId].unshift({
      id: 'payout_done_' + Date.now() + Math.random(),
      title: item.mode === 'live_onchain' ? 'Payout Broadcast On-Chain! 💎' : 'Payout Approved (Demo)',
      message: item.mode === 'live_onchain' 
        ? `Your withdrawal of ${item.netAmount.toFixed(4)} TON has been sent on-chain!` 
        : `Your withdrawal of ${item.netAmount.toFixed(4)} TON was approved in demo mode (can be refunded to balance).`,
      timestamp: Date.now(),
      read: false,
      type: 'payout'
    });
  }

  saveDatabase();
  res.json({ success: true, approvedCount: count });
});

// POST /api/admin/settings - Update custom reward rates & parameters
app.post('/api/admin/settings', checkAdmin, (req: Request, res: Response) => {
  const newSettings = req.body;
  db.settings = {
    ...db.settings,
    ...newSettings
  };
  saveDatabase();
  res.json({ success: true, settings: db.settings });
});

// GET /api/admin/hotwallet - Get hot wallet status & on-chain balance
app.get('/api/admin/hotwallet', checkAdmin, async (req: Request, res: Response) => {
  try {
    const info = await getHotWalletInfo(true);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch hot wallet info' });
  }
});

// POST /api/admin/hotwallet - Configure server hot wallet with mnemonic seed
app.post('/api/admin/hotwallet', checkAdmin, async (req: Request, res: Response) => {
  try {
    const { mnemonic, network, apiKey } = req.body;
    if (!mnemonic || typeof mnemonic !== 'string') {
      return res.status(400).json({ error: 'Mnemonic phrase is required' });
    }

    const words = mnemonic.trim().split(/\s+/).filter(Boolean);
    if (words.length !== 24 && words.length !== 12) {
      return res.status(400).json({ error: `Invalid mnemonic length: expected 12 or 24 words, got ${words.length}` });
    }

    // Save and verify
    saveStoredHotWallet({
      mnemonic: words.join(' '),
      network: network === 'testnet' ? 'testnet' : 'mainnet',
      apiKey: (apiKey || '').trim()
    });

    const info = await getHotWalletInfo(true);
    if (!info.isConfigured) {
      return res.status(400).json({ error: info.error || 'Failed to initialize wallet from provided mnemonic' });
    }

    res.json({ success: true, info });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save hot wallet' });
  }
});

// POST /api/admin/hotwallet/disconnect - Disconnect and clear server hot wallet
app.post('/api/admin/hotwallet/disconnect', checkAdmin, async (req: Request, res: Response) => {
  try {
    clearStoredHotWallet();
    const info = await getHotWalletInfo(true);
    res.json({ success: true, info });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to disconnect hot wallet' });
  }
});

// POST /api/admin/hotwallet/generate - Generate fresh 24-word seed phrase
app.post('/api/admin/hotwallet/generate', async (req: Request, res: Response) => {
  try {
    const words = await generateNewMnemonic();
    res.json({ success: true, words, mnemonic: words.join(' ') });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate mnemonic' });
  }
});

// -------------------------------------------------------------
// VITE & STATIC FILES
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      const viteName = 'vite';
      const { createServer: createViteServer } = await import(viteName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware not loaded:', e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TON Miner Bot Server running on http://localhost:${PORT}`);
  });
}

// Only start standalone server if not invoked in a serverless environment like Vercel
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.NOW_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.DENO_DEPLOYMENT_ID
);

if (!isServerless) {
  startServer();
}

export default app;
export { app };
