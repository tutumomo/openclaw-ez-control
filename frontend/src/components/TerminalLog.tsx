import React from 'react';
import { Terminal } from 'lucide-react';

interface TerminalLogProps {
  logs: string[];
}

export default function TerminalLog({ logs }: TerminalLogProps) {
  const logEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="backdrop-blur-glass bg-black/50 rounded-xl p-4 border border-white/10">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-300">
        <Terminal className="w-4 h-4" /> 操作日誌
      </h3>
      <div className="bg-slate-950/80 rounded-lg p-3 h-72 overflow-y-auto font-mono text-xs space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="text-slate-400">{log}</div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}