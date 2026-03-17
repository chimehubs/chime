import React from 'react';
import { Navigation } from '../features/landing/components/Navigation';
import { Footer } from '../features/landing/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navigation />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-4">Terms of Service</h1>
        <p className="text-slate-600 mb-8">
          These terms govern your use of Chimahub. By using the service, you agree to these terms.
        </p>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Eligibility</h2>
            <p className="text-slate-600">
              You must be legally able to enter into this agreement and provide accurate account information.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Account Responsibility</h2>
            <p className="text-slate-600">
              You are responsible for maintaining the confidentiality of your credentials and activity on your account.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Service Availability</h2>
            <p className="text-slate-600">
              We aim to provide continuous access, but services may be interrupted for maintenance or security reasons.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Termination</h2>
            <p className="text-slate-600">
              We may suspend or terminate access if we detect misuse, fraud, or violations of these terms.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Contact</h2>
            <p className="text-slate-600">
              For questions about these terms, contact support@chimafinance.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
