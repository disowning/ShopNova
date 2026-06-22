import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  FileText,
  FolderOpen,
  Images,
  Languages,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Users,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export type Page =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'tags'
  | 'media'
  | 'content'
  | 'site'
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
  { icon: Images, label: '图片管理', page: 'media' },
  { icon: FileText, label: '内容管理', page: 'content' },
  { icon: SlidersHorizontal, label: '站点配置', page: 'site' },
  { icon: Languages, label: '翻译管理', page: 'translations' },
  { icon: Users, label: '客户管理', page: 'customers' },
  { icon: CreditCard, label: '支付管理', page: 'payments' },
  { icon: AlertTriangle, label: '风险订单', page: 'risk' },
  { icon: BarChart3, label: '数据分析', page: 'analytics' },
  { icon: Settings, label: '设置', page: 'settings' },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [pendingRiskCount, setPendingRiskCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadPendingRiskCount() {
      const { count, error } = await supabase
        .from('risk_orders')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', '待审核');
      if (!ignore) setPendingRiskCount(error ? 0 : count ?? 0);
    }

    loadPendingRiskCount();
    const timer = window.setInterval(loadPendingRiskCount, 30000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const itemsWithBadges = navItems.map((item) => (
    item.page === 'risk' && pendingRiskCount > 0 ? { ...item, badge: pendingRiskCount } : item
  ));

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-56 flex-col bg-[#0f172a]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-white">电商后台</div>
            <div className="text-[10px] leading-tight text-blue-400/70">Admin Dashboard</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">主菜单</div>
        {itemsWithBadges.slice(0, 8).map((item) => (
          <NavItem key={item.page} {...item} active={currentPage === item.page} onNavigate={onNavigate} />
        ))}
        <div className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">管理</div>
        {itemsWithBadges.slice(8).map((item) => (
          <NavItem key={item.page} {...item} active={currentPage === item.page} onNavigate={onNavigate} />
        ))}
      </nav>

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
      type="button"
      onClick={() => onNavigate(page)}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={16} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
      {active && <div className="absolute right-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-l-full bg-blue-300" />}
    </button>
  );
}
