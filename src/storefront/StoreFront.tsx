import { StoreProvider, useStore, type PageType } from './StoreContext';
import { AuthProvider, useAuth } from './AuthContext';
import { SiteSettingsProvider } from './SiteSettingsContext';
import { CmsContentProvider } from './CmsContentContext';
import VisualEditorBridge from './VisualEditorBridge';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import HeroSection from './HeroSection';
import PromoBanner from './PromoBanner';
import CategoryGrid from './CategoryGrid';
import FeaturedProducts from './FeaturedProducts';
import FlashSaleSection from './FlashSaleSection';
import NewArrivals from './NewArrivals';
import BenefitSection from './BenefitSection';
import TrustBadges from './TrustBadges';
import ReviewSection from './ReviewSection';
import NewsletterSection from './NewsletterSection';
import Footer from './Footer';
import ProductDetail from './ProductDetail';
import ProductListing from './ProductListing';
import CartDrawer from './CartDrawer';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import CookieSettings from './CookieSettings';
import PaymentSecurity from './PaymentSecurity';
import CheckoutPage from './checkout/CheckoutPage';
import OrderSuccessPage from './checkout/OrderSuccessPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import AccountPage from './AccountPage';
import AdminLoginPage from './AdminLoginPage';
import AboutPages from './AboutPages';
import CustomerServicePages from './CustomerServicePages';

const STORE_PAGES = ['home', 'product', 'listing', 'order-lookup', 'return-policy', 'logistics', 'faq', 'brand-story', 'contact-us', 'careers', 'media-cooperation', 'privacy', 'terms', 'cookies', 'payment-security'];

const visualPageMap: Record<string, PageType> = {
  home: { type: 'home' },
  'order-lookup': { type: 'order-lookup' },
  'return-policy': { type: 'return-policy' },
  logistics: { type: 'logistics' },
  faq: { type: 'faq' },
  'brand-story': { type: 'brand-story' },
  'contact-us': { type: 'contact-us' },
  careers: { type: 'careers' },
  'media-cooperation': { type: 'media-cooperation' },
  privacy: { type: 'privacy' },
  terms: { type: 'terms' },
  cookies: { type: 'cookies' },
  'payment-security': { type: 'payment-security' },
};

function getVisualInitialPage(): PageType {
  const page = new URLSearchParams(window.location.search).get('visual-page') ?? 'home';
  return visualPageMap[page] ?? { type: 'home' };
}

function getCheckoutReturnInitialPage(): PageType | undefined {
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkout_return') !== 'success') return undefined;

  const orderId = params.get('orderId');
  const orderNumber = params.get('orderNumber');
  if (!orderId || !orderNumber) return undefined;

  window.history.replaceState({}, '', window.location.pathname);
  return { type: 'order-success', orderId, orderNumber };
}

function StorePage() {
  const { page } = useStore();
  return (
    <>
      {page.type === 'home' && (
        <main>
          <HeroSection />
          <PromoBanner />
          <CategoryGrid />
          <FeaturedProducts />
          <FlashSaleSection />
          <NewArrivals />
          <BenefitSection />
          <TrustBadges />
          <ReviewSection />
          <NewsletterSection />
        </main>
      )}
      {page.type === 'product' && <ProductDetail productId={page.productId} />}
      {page.type === 'listing' && (
        <ProductListing categoryId={page.categoryId} categoryName={page.categoryName} title={page.title} filter={page.filter} />
      )}
      {page.type === 'privacy' && <PrivacyPolicy />}
      {page.type === 'terms' && <TermsOfService />}
      {page.type === 'cookies' && <CookieSettings />}
      {page.type === 'payment-security' && <PaymentSecurity />}
      {page.type === 'order-lookup' && <CustomerServicePages kind="order-lookup" />}
      {page.type === 'return-policy' && <CustomerServicePages kind="return-policy" />}
      {page.type === 'logistics' && <CustomerServicePages kind="logistics" />}
      {page.type === 'faq' && <CustomerServicePages kind="faq" />}
      {page.type === 'brand-story' && <AboutPages kind="brand-story" />}
      {page.type === 'contact-us' && <AboutPages kind="contact-us" />}
      {page.type === 'careers' && <AboutPages kind="careers" />}
      {page.type === 'media-cooperation' && <AboutPages kind="media-cooperation" />}
    </>
  );
}

function CheckoutGuard() {
  const { user } = useAuth();
  const { navigate } = useStore();
  if (!user) {
    // Redirect to login when checkout is attempted without auth
    setTimeout(() => navigate({ type: 'login' }), 0);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  return <CheckoutPage />;
}

function StoreApp({ editorMode = false, onOpenAdmin }: { editorMode?: boolean; onOpenAdmin?: () => void }) {
  const { page } = useStore();
  const isStorePage = STORE_PAGES.includes(page.type);

  if (page.type === 'checkout') return <CheckoutGuard />;
  if (page.type === 'order-success') return <OrderSuccessPage orderId={page.orderId} orderNumber={page.orderNumber} />;
  if (page.type === 'login') return <LoginPage />;
  if (page.type === 'register') return <RegisterPage />;
  if (page.type === 'account' || page.type === 'account-orders') return <AccountPage />;
  if (page.type === 'admin-login') return <AdminLoginPage />;

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <VisualEditorBridge enabled={editorMode} />
      <Header onOpenAdmin={onOpenAdmin} />
      <CartDrawer />
      {isStorePage && <StorePage />}
      <Footer />
    </div>
  );
}

export default function StoreFront({ editorMode = false, onOpenAdmin }: { editorMode?: boolean; onOpenAdmin?: () => void }) {
  const initialPage = editorMode ? getVisualInitialPage() : getCheckoutReturnInitialPage();

  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <CmsContentProvider editorMode={editorMode}>
          <StoreProvider initialPage={initialPage}>
            <StoreApp editorMode={editorMode} onOpenAdmin={onOpenAdmin} />
          </StoreProvider>
        </CmsContentProvider>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}
