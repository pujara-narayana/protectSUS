
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

export const systemHealth = [
  { name: 'FastAPI Backend', status: 'Healthy', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { name: 'MongoDB', status: 'Healthy', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { name: 'Neo4j', status: 'Healthy', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { name: 'Redis', status: 'Healthy', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { name: 'Celery Workers', status: '12/12 Online', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { name: 'Anthropic API', status: 'Healthy (32ms Latency)', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
];

export const kpiMetrics = [
  { title: 'Total Users', value: '1,284', icon: 'users' },
  { title: 'Analyses (24h)', value: '142', icon: 'activity' },
  { title: 'Vulnerabilities Found', value: '892', icon: 'shield-alert' },
  { title: 'Monthly Token Spend', value: '$412.50', icon: 'dollar-sign' },
];

export const recentAnalyses = [
  { repo: 'eth-global/dapp-scaffold', commit: 'a1b2c3d', status: 'COMPLETED', timestamp: '2m ago', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { repo: 'uniswap/v3-core', commit: 'f4e5d6c', status: 'COMPLETED', timestamp: '5m ago', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { repo: 'aave/aave-protocol', commit: 'b3c4d5e', status: 'PENDING', timestamp: '10m ago', icon: <Clock className="h-4 w-4 text-yellow-500" /> },
  { repo: 'yearn/yearn-finance', commit: 'c4d5e6f', status: 'FAILED', timestamp: '15m ago', icon: <AlertTriangle className="h-4 w-4 text-red-500" />, error: 'Error: Neo4j Connection Timeout - Traceback (most recent call last)..' },
  { repo: 'sushiswap/sushiswap', commit: 'd5e6f7g', status: 'COMPLETED', timestamp: '20m ago', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { repo: 'makerdao/dss', commit: 'e6f7g8h', status: 'COMPLETED', timestamp: '25m ago', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
  { repo: 'compound-finance/compound-protocol', commit: 'f7g8h9i', status: 'PENDING', timestamp: '30m ago', icon: <Clock className="h-4 w-4 text-yellow-500" /> },
  { repo: 'curvefi/curve-contract', commit: 'g8h9i0j', status: 'COMPLETED', timestamp: '35m ago', icon: <ShieldCheck className="h-4 w-4 text-green-500" /> },
];

export const userList = [
  { username: 'cryptodev_99', lastActive: '2h ago' },
  { username: 'solidity_wizard', lastActive: '5h ago' },
  { username: 'defi-master', lastActive: '1d ago' },
  { username: 'nft-king', lastActive: '2d ago' },
  { username: 'blockchain-babe', lastActive: '3d ago' },
];

export const tokenConsumption = [
  { audit: 'Uniswap V3 Audit', tokens: 120000, cost: '$12.00' },
  { audit: 'Aave V2 Audit', tokens: 95000, cost: '$9.50' },
  { audit: 'Curve Finance Audit', tokens: 80000, cost: '$8.00' },
  { audit: 'Synthetix Audit', tokens: 75000, cost: '$7.50' },
  { audit: 'Yearn Finance Audit', tokens: 60000, cost: '$6.00' },
];
