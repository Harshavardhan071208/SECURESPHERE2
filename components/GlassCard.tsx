
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  // Added optional onClick prop to match usage in App.tsx
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, action, onClick }) => {
  return (
    <div 
      className={`glass rounded-2xl p-6 overflow-hidden relative ${className}`}
      // Fixed: Apply the onClick handler to the root element
      onClick={onClick}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-xl font-bold text-white/90 tracking-tight">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
      {/* Decorative Blur Circle */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default GlassCard;
