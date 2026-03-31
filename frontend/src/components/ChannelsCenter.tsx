import React, { useState, useEffect } from 'react';
import { MessageCircle, Key, Users, CopyPlus, Save, Trash2, Power } from 'lucide-react';
import type { TelegramChannelsResponse, TelegramAccount } from '../types';

interface ChannelsCenterProps {
  channels: TelegramChannelsResponse | null;
  busy: string | null;
  onSave: (payload: { enabled: boolean; accounts: Record<string, TelegramAccount> }) => Promise<void>;
}

export default function ChannelsCenter({ channels, busy, onSave }: ChannelsCenterProps) {
  const [enabled, setEnabled] = useState(false);
  const [accounts, setAccounts] = useState<Record<string, TelegramAccount>>({});

  useEffect(() => {
    if (channels) {
      setEnabled(channels.enabled);
      setAccounts(channels.accounts || {});
    }
  }, [channels]);

  const handleAccountChange = (accountId: string, field: keyof TelegramAccount, value: any) => {
    setAccounts(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: value
      }
    }));
  };

  const handleAddAccount = () => {
    const newId = prompt("請輸入新增帳號 ID (例如：my_bot)");
    if (newId && !accounts[newId]) {
      setAccounts(prev => ({
        ...prev,
        [newId]: { botToken: "", dmPolicy: "pairing", groupPolicy: "open", allowFrom: [] }
      }));
    }
  };

  const handleRemoveAccount = (id: string) => {
    if (confirm(`確定刪除 ${id} 帳號設定嗎？`)) {
      const copy = { ...accounts };
      delete copy[id];
      setAccounts(copy);
    }
  };

  const handleSave = () => {
    onSave({ enabled, accounts });
  };

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-glass bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <MessageCircle className="w-7 h-7 text-sky-400" /> Telegram 通訊設定
            </h2>
            <p className="text-slate-400">管理 Telegram 機器人帳號、群組存取權與 Token 列表</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/50 px-4 py-2 rounded-xl border border-white/5">
              <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => setEnabled(e.target.checked)} 
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/50 w-5 h-5"
              />
              <span className={`font-medium ${enabled ? 'text-sky-400' : 'text-slate-400'}`}>啟用 Telegram 通道</span>
            </label>
            <button
              onClick={handleSave}
              disabled={!!busy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-5 rounded-xl transition flex items-center gap-2 disabled:opacity-50 font-medium whitespace-nowrap"
            >
              <Save className="w-5 h-5" />
              儲存設定
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(accounts).map(([id, account]) => (
            <div key={id} className="bg-slate-900/40 rounded-xl p-5 border border-white/10 flex flex-col hover:border-sky-500/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span className="bg-sky-500/20 text-sky-300 px-3 py-1 rounded-md text-sm border border-sky-500/20">@{id}</span>
                </h3>
                <button
                  onClick={() => handleRemoveAccount(id)}
                  className="text-red-400/70 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5"><Key className="w-4 h-4"/> Bot Token</label>
                  <input
                    type="password"
                    value={account.botToken || ''}
                    onChange={(e) => handleAccountChange(id, 'botToken', e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                    placeholder="123456789:ABCDE..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium tracking-wide text-slate-400 mb-1.5">DM Policy</label>
                    <select
                      value={account.dmPolicy || 'pairing'}
                      onChange={(e) => handleAccountChange(id, 'dmPolicy', e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none transition-all"
                    >
                      <option value="pairing">Pairing</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium tracking-wide text-slate-400 mb-1.5">Group Policy</label>
                    <select
                      value={account.groupPolicy || 'open'}
                      onChange={(e) => handleAccountChange(id, 'groupPolicy', e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none transition-all"
                    >
                      <option value="open">Open</option>
                      <option value="allowlist">Allowlist</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5"><Users className="w-4 h-4"/> 授權管理員 (Allow From)</label>
                  <input
                    type="text"
                    value={account.allowFrom?.join(', ') || ''}
                    onChange={(e) => {
                      const list = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                      handleAccountChange(id, 'allowFrom', list);
                    }}
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-sky-500/50 focus:outline-none transition-all"
                    placeholder="5782791568, ..."
                  />
                  <div className="text-xs text-slate-500 mt-1">請填入 Telegram User ID，可用逗號分隔</div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddAccount}
            className="bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-sky-500/50 hover:bg-slate-800/60 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-sky-300 transition-all min-h-[200px]"
          >
            <CopyPlus className="w-8 h-8" />
            <span className="font-medium">新增 Telegram 機器人帳號</span>
          </button>
        </div>
      </div>
    </div>
  );
}
