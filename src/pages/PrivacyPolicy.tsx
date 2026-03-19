import React from 'react';
import { Navigation } from '../features/landing/components/Navigation';
import { Footer } from '../features/landing/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navigation />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">
          This policy explains how Chimehubs and Chima Finance Ltd collect, use, and protect your information.
        </p>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Information We Collect</h2>
            <p className="text-slate-600">
              We collect information you provide when creating an account, completing transactions, or contacting
              support, as well as technical data needed to secure your session.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">How We Use Information</h2>
            <p className="text-slate-600">
              We use your data to provide banking services, verify activity, prevent fraud, and improve the
              product experience. We do not sell your data.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Data Sharing</h2>
            <p className="text-slate-600">
              We share data only with service providers required to operate the platform or where legally required.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Security</h2>
            <p className="text-slate-600">
              We apply technical and organizational safeguards to protect your information from unauthorized access.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Contact</h2>
            <p className="text-slate-600">
              Questions about privacy can be sent to support@chimafinance.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}


