import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchPublicAuthSettings } from '../lib/authSettings';
import { loginWithGoogleCredential, type AuthUser } from '../lib/authService';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        hd?: string;
      }) => void;
      renderButton: (parent: HTMLElement, options: {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: GoogleButtonText;
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: number;
      }) => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

interface Props {
  mode: 'signin' | 'signup';
  onSuccess: (user: AuthUser) => void;
  onError: (message: string) => void;
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google 登录脚本加载失败')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google 登录脚本加载失败'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export default function GoogleSignInButton({ mode, onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function setup() {
      setLoading(true);
      try {
        const settings = await fetchPublicAuthSettings();
        const google = settings.google;
        if (ignore) return;
        if (!google.enabled || !google.clientId.trim()) {
          setEnabled(false);
          return;
        }

        setEnabled(true);
        await loadGoogleScript();
        if (ignore || !containerRef.current || !window.google?.accounts?.id) return;

        containerRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: google.clientId.trim(),
          callback: async (response) => {
            if (!response.credential) {
              onError('Google 登录没有返回凭证');
              return;
            }
            setSubmitting(true);
            try {
              const user = await loginWithGoogleCredential(response.credential);
              onSuccess(user);
            } catch (error) {
              onError(error instanceof Error ? error.message : 'Google 登录失败');
            } finally {
              setSubmitting(false);
            }
          },
          cancel_on_tap_outside: true,
          hd: google.hostedDomain.trim() || undefined,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(Math.max(containerRef.current.offsetWidth || 320, 220), 400),
        });
      } catch (error) {
        if (!ignore) onError(error instanceof Error ? error.message : 'Google 登录初始化失败');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    setup();
    return () => {
      ignore = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [mode, onError, onSuccess]);

  if (!enabled && !loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="relative min-h-[44px]">
        {loading && (
          <div className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <Loader2 size={14} className="mr-2 animate-spin" />
            正在加载 Google 登录...
          </div>
        )}
        <div ref={containerRef} className={loading ? 'hidden' : 'flex justify-center'} />
        {submitting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-xs font-semibold text-slate-600">
            <Loader2 size={14} className="mr-2 animate-spin" />
            正在验证 Google 账号...
          </div>
        )}
      </div>
    </div>
  );
}
