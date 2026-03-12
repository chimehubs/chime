import { useEffect, useState } from 'react';
import { Button } from '../ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; 
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-4">
        <img
          src="/assets/app-icon-rounded.png"
          alt="chime app icon"
          className="h-12 w-12 rounded-2xl"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Install chime</p>
          <p className="text-xs text-slate-500">Get faster access and a full-screen experience.</p>
        </div>
        <Button onClick={handleInstall} className="bg-[#00b388] hover:bg-[#009670] text-white">
          Install
        </Button>
      </div>
    </div>
  );
}
