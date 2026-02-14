
import React, { useState } from 'react';
import GlassCard from '../GlassCard';
import GlassToast from '../GlassToast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  Files,
  ShieldCheck,
  HardDrive,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  X,
  CreditCard,
  Calendar,
  Gift,
  UserPlus,
  Check,
  Ban
} from 'lucide-react';
import { MOCK_FILES, MOCK_LOGS, MOCK_USERS } from '../../constants';

const ManagerDashboard: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<'uploads' | 'shares'>('uploads');
  const [showPricing, setShowPricing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Toast State
  const [toast, setToast] = useState<{ isVisible: boolean, message: string, type: 'success' | 'error' | 'info' | 'warning', details?: string }>({
    isVisible: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning', details?: string) => {
    setToast({ isVisible: true, message, type, details });
  };

  React.useEffect(() => {
    const loaded = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
    setPendingRequests(loaded.filter((r: any) => r.status === 'PENDING'));
  }, []);

  const handleApprove = (email: string) => {
    const updated = pendingRequests.map(r => r.email === email ? { ...r, status: 'APPROVED' } : r);
    // In reality, this would call an API to confirm the user in Cognito

    // Update local storage to persist the "Approved" state so they can login
    const allRequests = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
    const newAllRequests = allRequests.map((r: any) => r.email === email ? { ...r, status: 'APPROVED' } : r);
    localStorage.setItem('pending_registrations', JSON.stringify(newAllRequests));

    setPendingRequests(updated.filter(r => r.status === 'PENDING'));
    setPendingRequests(updated.filter(r => r.status === 'PENDING'));
    showToast('User Approved', 'success', `Account ${email} is now active.`);
  };

  const handleBlock = (email: string) => {
    const allRequests = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
    const newAllRequests = allRequests.filter((r: any) => r.email !== email); // Remove them or set to BLOCKED
    localStorage.setItem('pending_registrations', JSON.stringify(newAllRequests));

    setPendingRequests(pendingRequests.filter(r => r.email !== email));
    setPendingRequests(pendingRequests.filter(r => r.email !== email));
    showToast('User Blocked', 'error', `Access request for ${email} has been denied.`);
  };

  const chartData = [
    { name: 'Mon', uploads: 400, shares: 120 },
    { name: 'Tue', uploads: 300, shares: 250 },
    { name: 'Wed', uploads: 200, shares: 180 },
    { name: 'Thu', uploads: 278, shares: 320 },
    { name: 'Fri', uploads: 189, shares: 110 },
    { name: 'Sat', uploads: 239, shares: 290 },
    { name: 'Sun', uploads: 349, shares: 410 },
  ];

  const stats = [
    { label: 'Total Files', value: MOCK_FILES.length, icon: Files, color: 'text-indigo-400', bg: 'bg-indigo-500/10', trend: '+12.5%' },
    { label: 'System Users', value: MOCK_USERS.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: '+2' },
    { label: 'Security Health', value: '98%', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'Stable' },
    {
      label: 'Storage Usage',
      value: '1.2 TB',
      icon: HardDrive,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      trend: '5% Free',
      hasUpgrade: true
    },
  ];

  const PricingModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPricing(false)} />
      <GlassCard className="max-w-5xl w-full relative z-10 border-white/20 shadow-2xl p-0 overflow-hidden">
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-3xl font-black text-white">Upgrade Organization Vault</h2>
            <p className="text-white/40">Select the plan that best fits your enterprise data needs.</p>
          </div>
          <button onClick={() => setShowPricing(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trial Plan */}
          <div className="glass p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <Gift size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Standard Trial</h3>
            <p className="text-4xl font-black text-white mb-6">$0<span className="text-sm text-white/40 font-medium">/14 days</span></p>
            <ul className="space-y-3 mb-8 text-left w-full">
              {['10GB Encrypted Storage', 'Up to 5 Users', 'Basic Audit Logs', 'Standard Support'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/60"><CheckCircle2 size={14} className="text-emerald-500" /> {f}</li>
              ))}
            </ul>
            <button className="mt-auto w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold cursor-default opacity-50">Current Plan</button>
          </div>

          {/* Monthly Plan */}
          <div className="glass p-8 rounded-3xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col items-center text-center relative overflow-hidden group scale-105 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
              <CreditCard size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Business Pro</h3>
            <p className="text-4xl font-black text-white mb-6">$99<span className="text-sm text-white/40 font-medium">/month</span></p>
            <ul className="space-y-3 mb-8 text-left w-full">
              {['1TB Isolated Storage', 'Unlimited Users', 'Advanced AI Auditing', '90-Day Log Retention', 'Priority 24/7 Support'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/80"><CheckCircle2 size={14} className="text-indigo-400" /> {f}</li>
              ))}
            </ul>
            <button className="mt-auto w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95">Upgrade Monthly</button>
          </div>

          {/* Yearly Plan */}
          <div className="glass p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Save 20%</span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Enterprise Elite</h3>
            <p className="text-4xl font-black text-white mb-6">$990<span className="text-sm text-white/40 font-medium">/year</span></p>
            <ul className="space-y-3 mb-8 text-left w-full">
              {['Unlimited Storage', 'Complete Audit Archive', 'Custom Governance API', 'Dedicated Success Manager', 'SSO & SAML Integration'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/60"><CheckCircle2 size={14} className="text-purple-400" /> {f}</li>
              ))}
            </ul>
            <button className="mt-auto w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95">Go Yearly</button>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showPricing && <PricingModal />}

      {/* Approval Section */}
      {pendingRequests.length > 0 && (
        <GlassCard className="border-indigo-500/50 bg-indigo-500/5 animate-pulse-once">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400"><UserPlus size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-white">Pending Access Requests</h3>
              <p className="text-white/40 text-sm">Action required for new member onboarding.</p>
            </div>
          </div>
          <div className="grid gap-3">
            {pendingRequests.map((req, i) => (
              <div key={i} className="glass p-4 rounded-xl flex items-center justify-between border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                    {req.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{req.email}</p>
                    <p className="text-xs text-white/40 flex gap-2">
                      <span>ID: {req.id}</span>
                      <span>•</span>
                      <span>Group: {req.groupId}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req.email)} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Check size={14} /> Allow
                  </button>
                  <button onClick={() => handleBlock(req.email)} className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Ban size={14} /> Block
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp size={12} className="mr-1" />
                {stat.trend}
              </div>
            </div>
            <div className="mt-4 flex flex-col h-full">
              <h4 className="text-white/40 text-sm font-medium uppercase tracking-wider">{stat.label}</h4>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              {stat.hasUpgrade && (
                <button
                  onClick={() => setShowPricing(true)}
                  className="mt-4 w-full py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={14} /> Upgrade Plan
                </button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard
          className="lg:col-span-2"
          title="Activity Overview"
          action={
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveMetric('uploads')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeMetric === 'uploads' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                Uploads
              </button>
              <button
                onClick={() => setActiveMetric('shares')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeMetric === 'shares' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                Shares
              </button>
            </div>
          }
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeMetric === 'uploads' ? '#6366f1' : '#a855f7'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={activeMetric === 'uploads' ? '#6366f1' : '#a855f7'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={activeMetric === 'uploads' ? '#6366f1' : '#a855f7'}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                  strokeWidth={4}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Active Members">
          <div className="space-y-6">
            {MOCK_USERS.slice(0, 4).map((user) => (
              <div key={user.id} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-indigo-400 font-bold group-hover:scale-110 transition-transform">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-white/40 truncate">{user.role}</p>
                </div>
                <button className="p-2 text-white/20 hover:text-white transition-colors">
                  <ArrowUpRight size={18} />
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">
            Directory View
          </button>
        </GlassCard>
      </div>

      <GlassCard title="Audit Timeline">
        <div className="space-y-6">
          {MOCK_LOGS.map((log) => (
            <div key={log.id} className="relative flex gap-6 pb-6 last:pb-0">
              <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-white/5 last:hidden"></div>
              <div className={`mt-1 h-6 w-6 rounded-full border-4 border-[#1e1b4b] z-10 ${log.severity === 'high' ? 'bg-rose-500' :
                log.severity === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                }`}></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="text-sm font-semibold text-white/90">{log.action}</h5>
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-white/50">{log.details}</p>
                <div className="mt-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  Agent: {log.userName}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassToast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        details={toast.details}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default ManagerDashboard;
