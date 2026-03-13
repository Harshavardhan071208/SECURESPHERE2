
import React, { useState, useEffect } from 'react';
import GlassCard from '../GlassCard';
import { MOCK_ORGS, MOCK_LOGS } from '../../constants';
import {
  Building2,
  Activity,
  ShieldAlert,
  CheckCircle,
  XCircle,
  MoreVertical,
  Globe,
  ArrowUpRight
} from 'lucide-react';

const GovernanceDashboard: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>(MOCK_ORGS);

  useEffect(() => {
    fetch('/api/orgs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrgs(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch orgs globally:", err);
        const pendingOrgs = JSON.parse(localStorage.getItem('pending_org_registrations') || '[]');
        const statusOverrides = pendingOrgs.reduce((acc: any, curr: any) => ({...acc, [curr.id]: curr.status}), {});
        const combinedOrgs = [...MOCK_ORGS];
        pendingOrgs.forEach((pOrg: any) => {
          if (!combinedOrgs.find(o => o.id === pOrg.id)) {
            combinedOrgs.push(pOrg);
          }
        });

        const finalized = combinedOrgs.map(o => statusOverrides[o.id] ? { ...o, status: statusOverrides[o.id] } : o);
        setOrgs(finalized);
      });
  }, []);

  const handleUpdateStatus = (orgId: string, status: string) => {
    const orgToUpdate = orgs.find(o => o.id === orgId) || MOCK_ORGS.find(o => o.id === orgId);
    if (!orgToUpdate) return;
    
    const updatedOrg = { ...orgToUpdate, status };

    // Update global state through API
    fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrg)
    }).catch(console.error);

    const pendingOrgs = JSON.parse(localStorage.getItem('pending_org_registrations') || '[]');
    
    // Update local storage representation natively as fallback
    let updatedPending = pendingOrgs.map((o: any) => o.id === orgId ? updatedOrg : o);
    
    if (!pendingOrgs.find((o: any) => o.id === orgId)) {
        updatedPending = [...updatedPending, updatedOrg];
    }
    
    localStorage.setItem('pending_org_registrations', JSON.stringify(updatedPending));
    setOrgs(orgs.map(o => o.id === orgId ? updatedOrg : o));
  };
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Platform Governance Hub</h2>
          <p className="opacity-40 text-sm">Monitoring cross-organization security health and onboarding requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-400">
            <Globe size={16} /> Global Live Status
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Registered Orgs</p>
              <p className="text-3xl font-bold">{orgs.length}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Global Rejections</p>
              <p className="text-3xl font-bold">{MOCK_LOGS.filter(l => l.action === 'SECURITY_REJECTION').length}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Active Nodes</p>
              <p className="text-3xl font-bold">{orgs.filter(o => o.status === 'active' || o.status === 'Accepted' || o.status === 'accepted').length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard title="Organization Registrations" className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Onboarded</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orgs.map((org) => (
                  <tr key={org.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {org.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{org.name}</p>
                          <p className="text-[10px] opacity-40 uppercase tracking-tighter">{org.industry}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        org.status === 'active' || org.status === 'Accepted' || org.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                        org.status === 'rejected' || org.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {org.status === 'active' ? 'Accepted' : org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs opacity-50">
                      {org.onboardedDate}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(org.status === 'pending' || org.status === 'Pending') && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(org.id, 'Accepted')}
                              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                              title="Accept"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(org.id, 'Rejected')}
                              className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
                              title="Reject"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 opacity-40 hover:opacity-100 transition-all">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard title="Platform Security Feed">
            <div className="space-y-4">
              {MOCK_LOGS.filter(l => l.severity === 'high' || l.action === 'SECURITY_REJECTION').map(log => (
                <div key={log.id} className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 relative group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert size={14} className="text-rose-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Security Breach Blocked</span>
                    </div>
                    <span className="text-[10px] opacity-20">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs font-bold mb-1">{log.fileName || 'Infection Detected'}</p>
                  <p className="text-[10px] opacity-50 leading-relaxed mb-3">{log.details}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[9px] opacity-40 uppercase tracking-tighter font-black">OrgID: {log.orgId}</span>
                    <button className="text-[9px] font-black uppercase text-indigo-400 flex items-center gap-1 hover:underline">
                      Investigate <ArrowUpRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Global Capacity">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                  <span className="opacity-40">Cross-Org Traffic</span>
                  <span className="text-indigo-400">4.2 GB/s</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[65%]" />
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <span className="text-[10px] font-bold opacity-60">Auth System Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <span className="text-[10px] font-bold opacity-60">S3 Gateways Healthy</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default GovernanceDashboard;
