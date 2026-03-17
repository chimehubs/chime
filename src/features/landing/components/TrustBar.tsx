import React from 'react';
import { motion } from 'motion/react';
import { Lock, Clock, CheckCircle, Shield } from 'lucide-react';
import { fadeUpVariants, staggerContainer } from '../animations';

interface TrustItem {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}

const trustItems: TrustItem[] = [
  {
    icon: <Shield className="w-6 h-6 text-[#00b388]" />,
    label: 'Fraud Monitoring',
    sublabel: 'Continuous Activity Checks',
  },
  {
    icon: <Lock className="w-6 h-6 text-[#00b388]" />,
    label: 'Bank-Level Security',
    sublabel: '256-bit Encryption',
  },
  {
    icon: <Clock className="w-6 h-6 text-[#00b388]" />,
    label: '24/7 Support',
    sublabel: 'Always Available',
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-[#00b388]" />,
    label: 'No Hidden Fees',
    sublabel: 'Transparent Pricing',
  },
];

export const TrustBar: React.FC = () => {
  return (
    <section className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 border-y border-gray-200">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {trustItems.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeUpVariants}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-3 p-3 bg-[#e6f9f4] rounded-lg">
                {item.icon}
              </div>
              <p className="text-sm font-semibold text-charcoal-900">
                {item.label}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {item.sublabel}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
