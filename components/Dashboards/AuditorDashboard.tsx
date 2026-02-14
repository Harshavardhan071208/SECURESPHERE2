
import React from 'react';
import GlassCard from '../GlassCard';
import { MOCK_LOGS } from '../../constants';
import { ShieldAlert, Filter, Sparkles, ShieldCheck, Lock, Stamp, Bug, ArrowDownToLine } from 'lucide-react';
import { analyzeSecurityLogs } from '../../services/geminiService';

const AuditorDashboard: React.FC = () => {
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const triggerAnalysis = async () => {
    setIsAnalyzing(true);
    const summary = await analyzeSecurityLogs(MOCK_LOGS);
    setAiSummary(summary);
    setIsAnalyzing(false);
  };

  /* State for Logs */
  const [logs, setLogs] = React.useState<any[]>(MOCK_LOGS);

  React.useEffect(() => {
    fetch('/api/audit-log')
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
      })
      .catch(err => console.error("Failed to load audit logs", err));
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'SECURITY_SCAN': return <ShieldCheck size={14} className="text-emerald-400" />;
      case 'SECURITY_REJECTION': return <Bug size={14} className="text-rose-400" />;
      case 'ENCRYPTION': return <Lock size={14} className="text-indigo-400" />;
      case 'WATERMARK': return <Stamp size={14} className="text-purple-400" />;
      case 'FILE_DOWNLOAD': return <ArrowDownToLine size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Security & Audit Control</h2>
          <p className="text-white/40 text-sm">Traceability: From scan to encryption to delivery</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all">
            <Filter size={18} />
            Security Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
            Export Legal Report
          </button>
        </div>
      </div>

      <GlassCard
        className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border-indigo-500/30"
        action={
          <button
            onClick={triggerAnalysis}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-900 text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50`}
          >
            <Sparkles size={18} />
            {isAnalyzing ? 'Analyzing Security Trends...' : 'AI Risk Assessment'}
          </button>
        }
      >
        <div className="flex gap-6 items-start">
          <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/40">
            <ShieldAlert className="text-indigo-400" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Advanced Security Analysis</h3>
            {aiSummary ? (
              <p className="text-white/80 leading-relaxed max-w-2xl">{aiSummary}</p>
            ) : (
              <p className="text-white/40 italic">Gemini is ready to analyze encryption headers, watermark integrity, and scanning logs for anomalous behavior.</p>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard title="Security & Governance Feed">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 font-semibold text-white/50 text-xs uppercase tracking-widest px-4">Timestamp</th>
                <th className="pb-4 font-semibold text-white/50 text-xs uppercase tracking-widest px-4">Agent</th>
                <th className="pb-4 font-semibold text-white/50 text-xs uppercase tracking-widest px-4">Security Phase</th>
                <th className="pb-4 font-semibold text-white/50 text-xs uppercase tracking-widest px-4">Integrity Details</th>
                <th className="pb-4 font-semibold text-white/50 text-xs uppercase tracking-widest px-4">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 whitespace-nowrap text-sm text-white/70">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-white/90">{log.userName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                        {log.action.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-white/50">
                    {log.details}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${log.severity === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' :
                        log.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></div>
                      <span className="text-xs font-medium text-white/70 uppercase">{log.severity}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <GlassCard title="Encryption Health">
          <div className="text-center py-4">
            <Lock className="mx-auto mb-4 text-indigo-400" size={40} />
            <p className="text-3xl font-black">100%</p>
            <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest mt-1">AES-128 + RSA Enforcement</p>
          </div>
        </GlassCard>
        <GlassCard title="Threat Interceptions">
          <div className="text-center py-4">
            <ShieldCheck className="mx-auto mb-4 text-emerald-400" size={40} />
            <p className="text-3xl font-black">0</p>
            <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest mt-1">Malware Detected</p>
          </div>
        </GlassCard>
        <GlassCard title="Traceability Baseline">
          <div className="text-center py-4">
            <Stamp className="mx-auto mb-4 text-purple-400" size={40} />
            <p className="text-3xl font-black">Active</p>
            <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest mt-1">Dynamic Watermarking</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AuditorDashboard;
