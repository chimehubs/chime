import React from 'react';
import {
  Navigation,
  HeroSection,
  TrustBar,
  FeaturesSection,
  HowItWorks,
  SecuritySection,
  CTASection,
  Footer,
} from './components';

const Landing: React.FC = () => {
  return (
    <>
      <Navigation />
      <main className="bg-white overflow-x-hidden">
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <HowItWorks />
        <SecuritySection />
        <CTASection />
        <Footer />
      </main>
    </>
  );
};

export default Landing;
