
import React, { useEffect } from 'react';
import { CheckCircle2, ShieldAlert, XCircle, Info } from 'lucide-react';

interface GlassToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
    onClose: () => void;
    details?: string; // For additional data like IDs
}

const GlassToast: React.FC<GlassToastProps> = ({ message, type = 'info', isVisible, onClose, details }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // 3 seconds
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const bgColors = {
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    };

    const icons = {
        success: CheckCircle2,
        error: XCircle,
        warning: ShieldAlert,
        info: Info,
    };

    const Icon = icons[type];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300 w-full max-w-md px-4 pointer-events-none">
            <div className={`backdrop-blur-xl border p-4 rounded-xl shadow-2xl flex items-start gap-3 ${bgColors[type]}`}>
                <Icon className="mt-0.5 shrink-0" size={20} />
                <div className="flex-1">
                    <h4 className="font-bold text-sm tracking-wide">{message}</h4>
                    {details && (
                        <div className="mt-2 p-2 bg-black/20 rounded-lg border border-white/5 font-mono text-[10px] text-white/70 whitespace-pre-wrap">
                            {details}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlassToast;
