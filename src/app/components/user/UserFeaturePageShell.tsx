import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import ImageAnnouncementBar from './ImageAnnouncementBar';
import { FLOW_ANNOUNCEMENT_SLIDES } from './announcementSlides';
import { useAuthContext } from '../../../context/AuthProvider';
import AccountCreationPrompt from './AccountCreationPrompt';
import AccountCreationModal from './AccountCreationModal';
import FloatingSupportButton from './FloatingSupportButton';

interface UserFeaturePageShellProps {
  title: string;
  description: string;
  darkMode: boolean;
  icon: React.ReactNode;
  onBack: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  backgroundImage?: string;
}

export default function UserFeaturePageShell({
  title,
  description,
  darkMode,
  icon,
  onBack,
  headerAction,
  children,
  backgroundImage,
}: UserFeaturePageShellProps) {
  const { user } = useAuthContext();
  const [showAccountCreationPrompt, setShowAccountCreationPrompt] = useState(false);
  const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);

  useEffect(() => {
    if (user?.status === 'UNREGISTERED') {
      setShowAccountCreationPrompt(true);
      return;
    }

    setShowAccountCreationPrompt(false);
    setShowAccountCreationModal(false);
  }, [user?.status]);

  return (
    <>
      <AccountCreationPrompt
        isOpen={showAccountCreationPrompt}
        onClose={() => setShowAccountCreationPrompt(false)}
        onStartCreation={() => {
          setShowAccountCreationPrompt(false);
          setShowAccountCreationModal(true);
        }}
      />
      <AccountCreationModal
        isOpen={showAccountCreationModal}
        onClose={() => setShowAccountCreationModal(false)}
        onSuccess={() => {
          setShowAccountCreationModal(false);
          setShowAccountCreationPrompt(false);
        }}
      />

      <div className={`relative min-h-screen transition-colors ${darkMode ? 'dark bg-[#0d1117] text-white' : 'bg-background'}`}>
        {backgroundImage && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${backgroundImage}')` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,10,0.86),rgba(5,11,10,0.72),rgba(5,11,10,0.88))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,179,136,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_24%)]" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`sticky top-0 z-10 ${darkMode ? 'bg-[#0d1117]/80 border-b border-[#21262d]' : 'bg-background/90 border-b border-border'} backdrop-blur-lg px-6 py-4`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <motion.button
                onClick={onBack}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg bg-[#FFE5E5]"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-[#FF6B6B]" />
              </motion.button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold flex items-center gap-2 truncate">
                  {icon}
                  <span className="truncate">{title}</span>
                </h1>
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              </div>
            </div>
            {headerAction}
          </div>
        </motion.div>

        <div className="relative z-[1] max-w-5xl mx-auto px-6 pt-6 pb-24 space-y-6">
          <ImageAnnouncementBar items={FLOW_ANNOUNCEMENT_SLIDES} className="h-[92px]" />
          {children}
        </div>

        <FloatingSupportButton userId={user?.id} darkMode={darkMode} />
      </div>
    </>
  );
}
