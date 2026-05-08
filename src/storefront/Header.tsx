import { useState, useRef, useEffect } from 'react';
import { Search, Heart, ShoppingCart, User, Menu, X, Zap, Package, LogOut, ChevronDown, Globe } from 'lucide-react';
import { useStore } from './StoreContext';
import { useAuth } from './AuthContext';
import { useT, localeNames, type Locale } from '../i18n';
import { useSiteSettings } from './SiteSettingsContext';

interface NavLink {
  label: string;
  action: () => void;
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  void t;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        title={t('common.language')}
      >
        <Globe size={17} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/60 py-1 z-[60]">
          {(Object.keys(localeNames) as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${locale === loc ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { navigate } = useStore();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (!user) {
    return (
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={() => navigate({ type: 'login' })}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors font-medium"
        >
          <User size={16} />
          <span className="hidden md:inline">{t('common.login')}</span>
        </button>
        <button
          onClick={() => navigate({ type: 'register' })}
          className="hidden md:flex items-center px-3 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {t('common.register')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:inline text-sm font-semibold text-slate-700 max-w-[80px] truncate">{user.name}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 py-2 z-[60]">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="text-sm font-bold text-slate-900 truncate">{user.name}</div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
            <div className="mt-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                {user.role === 'admin' ? t('common.admin') : t('common.member')}
              </span>
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate({ type: 'account' }); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <User size={14} className="text-slate-400" />
              {t('common.account')}
            </button>
            <button
              onClick={() => { setOpen(false); navigate({ type: 'account-orders' }); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <Package size={14} className="text-slate-400" />
              {t('common.myOrders')}
            </button>
          </div>
          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={() => { setOpen(false); logout(); navigate({ type: 'home' }); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut size={14} />
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { navigate, cart, setCartOpen, wishlist } = useStore();
  const { user } = useAuth();
  const { t } = useT();
  const { text, storeForm, storeSwitches } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const cartCount = cart.reduce((a, item) => a + item.qty, 0);

  const navLinks: NavLink[] = [
    { label: t('common.home'), action: () => navigate({ type: 'home' }) },
    { label: t('common.products'), action: () => navigate({ type: 'listing' }) },
    { label: t('common.newArrivals'), action: () => navigate({ type: 'listing', title: t('common.newArrivals') }) },
    { label: t('common.hotDeals'), action: () => navigate({ type: 'listing', title: t('common.hotDeals') }) },
    { label: t('common.flashSale'), action: () => navigate({ type: 'listing', title: t('common.flashSale'), filter: 'flashSale' }) },
    { label: t('common.brandStory'), action: () => navigate({ type: 'home' }) },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate({ type: 'listing', title: `${t('common.search')}：${searchVal.trim()}` });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
            {storeForm.logoUrl ? (
              <img src={storeForm.logoUrl} alt={text('storeName')} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Zap size={16} className="text-white" />
            )}
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {text('storeShortName')}
          </span>
        </button>

        {/* Nav — desktop */}
        <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => { link.action(); setMobileOpen(false); }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={handleSearch} className={`flex-1 max-w-xl mx-auto transition-all duration-200 ${searchFocused ? 'max-w-2xl' : ''}`}>
          <div className={`relative flex items-center border rounded-xl transition-all duration-200 ${searchFocused ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200 bg-slate-50'}`}>
            <Search size={15} className={`absolute left-3.5 ${searchFocused ? 'text-blue-500' : 'text-slate-400'} transition-colors`} />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder={text('searchPlaceholder')}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent focus:outline-none placeholder-slate-400 text-slate-800 rounded-xl"
            />
          </div>
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {storeSwitches.showLanguageSwitch && <LanguageSwitcher />}
          <UserMenu />
          <button
            onClick={() => navigate({ type: 'listing', title: t('common.favorites') })}
            className="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Heart size={18} />
            {wishlist.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => { link.action(); setMobileOpen(false); }}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
            {!user ? (
              <>
                <button onClick={() => { navigate({ type: 'login' }); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50">{t('common.login')}</button>
                <button onClick={() => { navigate({ type: 'register' }); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg text-blue-600 hover:bg-blue-50">{t('common.register')}</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate({ type: 'account' }); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50">{t('common.account')}</button>
                <button onClick={() => { navigate({ type: 'account-orders' }); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50">{t('common.myOrders')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
