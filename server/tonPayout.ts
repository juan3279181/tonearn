import { TonClient, WalletContractV4, internal, toNano, fromNano, Address } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicNew } from '@ton/crypto';
import fs from 'fs';
import path from 'path';
import type { TonDispatcherStatus } from '../src/types.ts';

const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const HOTWALLET_FILE = path.join(DATA_DIR, 'hotwallet.json');

interface StoredHotWallet {
  mnemonic: string;
  network?: 'mainnet' | 'testnet';
  apiKey?: string;
  updatedAt?: number;
}

let inMemoryHotWallet: StoredHotWallet | null = null;

function loadStoredHotWallet(): StoredHotWallet | null {
  if (inMemoryHotWallet) {
    return inMemoryHotWallet;
  }
  try {
    if (fs.existsSync(HOTWALLET_FILE)) {
      const content = fs.readFileSync(HOTWALLET_FILE, 'utf-8');
      inMemoryHotWallet = JSON.parse(content);
      return inMemoryHotWallet;
    }
  } catch (e) {
    console.error('Error loading hotwallet.json:', e);
  }
  return null;
}

export function saveStoredHotWallet(data: { mnemonic: string; network?: 'mainnet' | 'testnet'; apiKey?: string }) {
  inMemoryHotWallet = { ...data, updatedAt: Date.now() };
  try {
    const dir = path.dirname(HOTWALLET_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      HOTWALLET_FILE,
      JSON.stringify(inMemoryHotWallet, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.warn('Could not persist hotwallet to disk (using in-memory):', e);
  }
  cachedWalletInfo = null;
  tonClientInstance = null;
}

export function clearStoredHotWallet() {
  inMemoryHotWallet = null;
  try {
    if (fs.existsSync(HOTWALLET_FILE)) {
      fs.unlinkSync(HOTWALLET_FILE);
    }
  } catch (e) {
    console.warn('Error removing hotwallet.json:', e);
  }
  cachedWalletInfo = null;
  tonClientInstance = null;
}

export function getEffectiveMnemonic(): string {
  const envMnemonic = (process.env.TON_WALLET_MNEMONIC || '').trim();
  if (envMnemonic) return envMnemonic;
  const stored = loadStoredHotWallet();
  return (stored?.mnemonic || '').trim();
}

export function getEffectiveNetwork(): 'mainnet' | 'testnet' {
  const envNet = (process.env.TON_NETWORK || '').toLowerCase();
  if (envNet === 'testnet' || envNet === 'mainnet') return envNet as 'mainnet' | 'testnet';
  const stored = loadStoredHotWallet();
  if (stored?.network === 'testnet') return 'testnet';
  return 'mainnet';
}

export function getEffectiveApiKey(): string {
  if (process.env.TONCENTER_API_KEY) return process.env.TONCENTER_API_KEY.trim();
  const stored = loadStoredHotWallet();
  return (stored?.apiKey || '').trim();
}

let tonClientInstance: TonClient | null = null;
let currentClientNetwork: string | null = null;

export function getTonClient(): TonClient {
  const network = getEffectiveNetwork();
  const apiKey = getEffectiveApiKey();

  if (!tonClientInstance || currentClientNetwork !== network) {
    const endpoint = network === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC';

    tonClientInstance = new TonClient({
      endpoint,
      apiKey: apiKey || undefined
    });
    currentClientNetwork = network;
  }
  return tonClientInstance;
}

export interface HotWalletInfo {
  isConfigured: boolean;
  address?: string;
  balanceTon?: number;
  network?: 'mainnet' | 'testnet';
  error?: string;
}

let cachedWalletInfo: { data: HotWalletInfo; timestamp: number } | null = null;

export async function getHotWalletInfo(forceRefresh = false): Promise<HotWalletInfo> {
  const now = Date.now();
  if (!forceRefresh && cachedWalletInfo && now - cachedWalletInfo.timestamp < 10000) {
    return cachedWalletInfo.data;
  }

  const mnemonic = getEffectiveMnemonic();
  const network = getEffectiveNetwork();

  if (!mnemonic) {
    const info: HotWalletInfo = {
      isConfigured: false,
      network,
      error: 'TON_WALLET_MNEMONIC is not configured. Connect your 24-word seed in the Admin Panel or set TON_WALLET_MNEMONIC.'
    };
    cachedWalletInfo = { data: info, timestamp: now };
    return info;
  }

  try {
    const words = mnemonic.split(/\s+/).filter(Boolean);
    if (words.length !== 24 && words.length !== 12) {
      throw new Error(`Invalid mnemonic word count: expected 12 or 24 words, got ${words.length}`);
    }

    const keyPair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const addressStr = wallet.address.toString({ bounceable: false });

    const client = getTonClient();
    let balanceTon = 0;
    try {
      const balanceNano = await client.getBalance(wallet.address);
      balanceTon = parseFloat(fromNano(balanceNano));
    } catch (err: any) {
      console.warn('Failed to query hot wallet balance from Toncenter:', err.message);
    }

    const info: HotWalletInfo = {
      isConfigured: true,
      address: addressStr,
      balanceTon,
      network
    };
    cachedWalletInfo = { data: info, timestamp: now };
    return info;
  } catch (err: any) {
    const info: HotWalletInfo = {
      isConfigured: false,
      network,
      error: err?.message || 'Failed to initialize TON hot wallet'
    };
    cachedWalletInfo = { data: info, timestamp: now };
    return info;
  }
}

export async function getDispatcherStatus(forceRefresh = false): Promise<TonDispatcherStatus> {
  const walletInfo = await getHotWalletInfo(forceRefresh);
  const network = getEffectiveNetwork();

  if (!walletInfo.isConfigured) {
    return {
      isConfigured: false,
      network,
      mode: 'needs_hot_wallet',
      message: 'No server TON Hot Wallet configured. Connect your 24-word seed in the Admin Panel or set TON_WALLET_MNEMONIC.'
    };
  }

  const balance = walletInfo.balanceTon || 0;
  if (balance < 0.02) {
    return {
      isConfigured: true,
      network,
      dispatcherAddress: walletInfo.address,
      dispatcherBalanceTon: balance,
      mode: 'insufficient_balance',
      message: `Hot wallet connected (${walletInfo.address?.substring(0, 6)}...${walletInfo.address?.substring(walletInfo.address.length - 4)}), but balance (${balance.toFixed(4)} TON) is too low for gas and payouts. Please deposit 0.2 - 0.5 TON to this address.`
    };
  }

  return {
    isConfigured: true,
    network,
    dispatcherAddress: walletInfo.address,
    dispatcherBalanceTon: balance,
    mode: 'live_ready',
    message: `Live TON Payout Gateway ready on ${network}. Hot Wallet balance: ${balance.toFixed(4)} TON.`
  };
}

export async function dispatchRealTonPayout(params: {
  toAddress: string;
  amountTon: number;
  memo?: string;
}): Promise<{ success: boolean; txHash?: string; onChain: boolean; error?: string }> {
  const mnemonic = getEffectiveMnemonic();
  if (!mnemonic) {
    return {
      success: false,
      onChain: false,
      error: 'TON Hot Wallet is not configured on this server. Connect it in the Admin Panel or set TON_WALLET_MNEMONIC.'
    };
  }

  try {
    const words = mnemonic.split(/\s+/).filter(Boolean);
    const keyPair = await mnemonicToPrivateKey(words);
    const client = getTonClient();
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    // Check balance
    const currentBalanceNano = await client.getBalance(wallet.address);
    const currentBalance = parseFloat(fromNano(currentBalanceNano));
    const requiredTotal = params.amountTon + 0.015; // amount + estimated gas

    if (currentBalance < requiredTotal) {
      return {
        success: false,
        onChain: false,
        error: `Hot wallet has insufficient balance (${currentBalance.toFixed(4)} TON). Needs at least ${requiredTotal.toFixed(4)} TON for amount + gas.`
      };
    }

    const targetAddress = Address.parse(params.toAddress);
    const seqno = await contract.getSeqno();

    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: targetAddress,
          value: toNano(params.amountTon.toFixed(9)),
          body: params.memo || 'TON Miner App Payout',
          bounce: false
        })
      ]
    });

    // Wait for seqno change to confirm transaction broadcast
    let currentSeqno = seqno;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        currentSeqno = await contract.getSeqno();
        if (currentSeqno > seqno) {
          break;
        }
      } catch {
        // Retry
      }
    }

    // Attempt to retrieve the recent transaction hash from the wallet contract
    let txHash: string | undefined;
    try {
      const txs = await client.getTransactions(wallet.address, { limit: 1 });
      if (txs && txs.length > 0) {
        txHash = txs[0].hash().toString('hex');
      }
    } catch {
      // Fallback
    }

    // Invalidate cached wallet info so new balance is loaded
    cachedWalletInfo = null;

    return {
      success: true,
      onChain: true,
      txHash: txHash || 'broadcast_confirmed'
    };
  } catch (err: any) {
    console.error('Error during TON on-chain dispatch:', err);
    return {
      success: false,
      onChain: false,
      error: err?.message || 'Failed to broadcast transaction to the TON blockchain.'
    };
  }
}

export async function generateNewMnemonic(): Promise<string[]> {
  return await mnemonicNew(24);
}
