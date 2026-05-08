import { Bell, Calendar, ChevronDown, Filter, Search } from 'lucide-react';

interface TopbarProps {
  withDetail: boolean;
}

export default function Topbar({ withDetail }: TopbarProps) {
  return (
    <header className={`h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-4 fixed top-0 left-56 ${withDetail ? 'right-80' : 'right-0'} z-10 transition-all duration-200`}>
      <button className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors whitespace-nowrap">
        <Calendar size={13} className="text-blue-500" />
        <span>2026-05-01 ~ 2026-05-31</span>
        <ChevronDown size={11} className="text-slate-400" />
      </button>

      <button className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors whitespace-nowrap">
        <Filter size={12} className="text-slate-400" />
        <span>全部渠道</span>
        <ChevronDown size={11} className="text-slate-400" />
      </button>

      <button className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors whitespace-nowrap">
        <span>全部状态</span>
        <ChevronDown size={11} className="text-slate-400" />
      </button>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜索订单号 / 邮箱 / 商品 / 收货人"
          className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400 transition-all"
        />
      </div>

      <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
        <Bell size={15} className="text-slate-500" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>

      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow">
        A
      </div>
    </header>
  );
}
