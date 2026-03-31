import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavBarProps {
  items: NavItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function NavBar({ items, active, onChange }: NavBarProps) {
  return (
    <nav className="backdrop-blur-glass bg-slate-900/80 border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">OC</span>
            </div>
            <h1 className="text-xl font-semibold text-white">OpenClaw EZ-Control</h1>
          </div>
          
          <div className="flex gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}