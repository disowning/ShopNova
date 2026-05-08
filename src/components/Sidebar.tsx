import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FolderOpen,
  Languages,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Zap,
} from 'lucide-react';

export type Page =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'tags'
  | 'translations'
  | 'customers'
  | 'payments'
  | 'risk'
  | 'analytics'
  | 'settings';

const navItems: { icon: React.ElementType; label: string; page: Page; badge?: number }[] = [
  { icon: LayoutDashboard, label: '仪表盘', page: 'dashboard' },
  { icon: ShoppingCart, label: '订单管理', page: 'orders' },
  { icon: Package, label: '商品管理', page: 'products' },
  { icon: FolderOpen, label: '分类管理', page: 'categories' },
  { icon: Tag, label: '标签管理', page: 'tags' },
  { icon: Languages, label: '翻译管理', page: 'translations' },
  { icon: Users, label: '客户管理', page: 'customers' },
  { icon: CreditCard, label: '支付信息', page: 'payments' },
  { icon: AlertTriangle, label: '风险订单', page: 'risk', badge: 3 },
  { icon: BarChart3, label: '数据分析', page: 'analytics' },
  { icon: Settings, label: '设置', page: 'settings' },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-[#0f172a] flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">电商后台</div>
            <div className="text-blue-400/70 text-[10px] leading-tight">Admin Dashboard</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest px-3 pb-2 pt-1">主菜单</div>
        {navItems.slice(0, 6).map((item) => (
          <NavItem key={item.page} {...item} active={currentPage === item.page} onNavigate={onNavigate} />
        ))}
        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest px-3 pb-2 pt-4">管理</div>
        {navItems.slice(6).map((item) => (
          <NavItem key={item.page} {...item} active={currentPage === item.page} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">A</div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">管理员</div>
            <div className="text-slate-400 text-[10px] truncate">admin@shop.com</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  page,
  onNavigate,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  page: Page;
  onNavigate: (p: Page) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(page)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
          {badge}
        </span>
      )}
      {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-300 rounded-l-full" />}
    </button>
  );
}
