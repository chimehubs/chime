import React from 'react';
import { motion } from 'motion/react';
import { Lock, Bell, Shield } from 'lucide-react';
import { fadeUpVariants, staggerContainer } from '../animations';

interface SecurityFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const securityFeatures: SecurityFeature[] = [
  {
    icon: <Lock className="w-8 h-8 text-charcoal-900" />,
    title: 'Bank-Level Encryption',
    description:
      '256-bit SSL encryption protects every transaction and keeps your data secure.',
  },
  {
    icon: <Shield className="w-8 h-8 text-charcoal-900" />,
    title: 'Multi-Layer Fraud Protection',
    description:
      'Advanced AI monitors your account 24/7 to detect and prevent suspicious activity.',
  },
  {
    icon: <Bell className="w-8 h-8 text-charcoal-900" />,
    title: 'Account Monitoring',
    description:
      'Real-time alerts for all account activity. You\'re always in control.',
  },
];

export const SecuritySection: React.FC = () => {
  return (
    <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 bg-transparent text-charcoal-900">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUpVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-charcoal-900">
            Security You Can Trust
          </h2>
          <p className="text-xl text-charcoal-700 max-w-3xl mx-auto leading-relaxed">
            Your money and data are protected with enterprise-grade security standards. We use the same security protocols as major financial institutions.
          </p>
        </motion.div>

        {/* Security Features Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        >
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeUpVariants}
              className="p-8 rounded-xl border border-[#00b388]/40 bg-white/40 backdrop-blur-sm hover:bg-white/60 hover:border-[#00b388]/80 transition-all duration-300"
            >
              <div className="mb-5 p-4 bg-[#00b388]/15 rounded-lg w-fit">
                {feature.icon}
              </div>

              <h3 className="text-xl font-semibold mb-3 text-charcoal-900">
                {feature.title}
              </h3>

              <p className="text-charcoal-700 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUpVariants}
          transition={{ delay: 0.3 }}
          className="bg-white/40 backdrop-blur-sm border border-[#00b388]/50 rounded-xl p-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-[#00b388]" />
            <p className="text-lg font-semibold text-[#00b388]">
              Compliance-Ready Controls
            </p>
          </div>
          <p className="text-charcoal-700 max-w-2xl mx-auto">
            We implement security controls aligned with modern regulatory and data protection standards.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
