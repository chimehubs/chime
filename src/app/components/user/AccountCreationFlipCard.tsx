import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import AccountCreationLoading from './AccountCreationLoading';
import AccountCreationSuccess from './AccountCreationSuccess';
import './AccountCreationFlipCard.css';

interface AccountCreationFlipCardProps {
  progress: number;
  successData: {
    fullName: string;
    routingNumber: string;
    accountNumber: string;
  } | null;
  onContinue: () => void;
  onClose?: () => void;
}

export default function AccountCreationFlipCard({ progress, successData, onContinue, onClose }: AccountCreationFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => setFlipped(true), 400);
    }
  }, [progress]);

  return (
    <div className="perspective-1200 w-full h-full p-3 sm:p-4 account-creation-no-blur">
      <motion.div
        className="relative w-full h-full"
        style={{ perspective: 1200 }}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0.2, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 backface-hidden bg-white rounded-2xl overflow-y-auto">
            <AccountCreationLoading progress={progress} />
          </div>
          <div className="absolute inset-0 backface-hidden bg-white rounded-2xl flip-card-back overflow-y-auto">
            {successData && (
              <AccountCreationSuccess
                fullName={successData.fullName}
                routingNumber={successData.routingNumber}
                accountNumber={successData.accountNumber}
                onContinue={onContinue}
                onClose={onClose}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
