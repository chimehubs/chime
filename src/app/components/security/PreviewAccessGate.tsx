import { useEffect, useState } from 'react';

interface PreviewAccessGateProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'staging_access_granted';
const INITIAL_CHECK_DELAY_MS = 160;

export default function PreviewAccessGate({ children }: PreviewAccessGateProps) {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      const granted = window.localStorage.getItem(STORAGE_KEY) === 'true';
      if (!isMounted) return;
      setHasAccess(granted);
      setIsCheckingAccess(false);
    }, INITIAL_CHECK_DELAY_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  const grantPreviewAccess = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setHasAccess(true);
  };

  if (isCheckingAccess) {
    return <div className="min-h-screen bg-[#0a0a0a]" aria-busy="true" aria-live="polite" />;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('https://img.freepik.com/premium-photo/businessman-giving-thumbs-up_13339-64824.jpg')",
            filter: 'sepia(0.35) saturate(0.8) contrast(0.95) brightness(0.5)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#0a0a0a]/65 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.7)_100%)]" />
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-[#00A36C]/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-[#008080]/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-8 text-white text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-white/70 mb-3">Security Check</p>
        <h1 className="text-3xl font-semibold mb-3">Please confirm you're human</h1>
        <p className="text-sm text-white/80 leading-relaxed">
          This staging environment is restricted. Please confirm you're human to continue.
        </p>

        <button
          type="button"
          onClick={grantPreviewAccess}
          className="w-full mt-8 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#00A36C] to-[#008080] hover:from-[#00b377] hover:to-[#009191] transition-all shadow-lg shadow-black/30"
        >
          Confirm I'm Human
        </button>
      </div>
    </div>
  );
}
