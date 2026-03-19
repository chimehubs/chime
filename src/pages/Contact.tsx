import React from 'react';
import { Navigation } from '../features/landing/components/Navigation';
import { Footer } from '../features/landing/components/Footer';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navigation />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-4">Contact Us</h1>
        <p className="text-slate-600 mb-8">
          For assistance, reach us at support@chimafinance.com. You can also use the in-app chat for faster support.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Email Support</h2>
            <p className="text-slate-600">support@chimafinance.com</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Customer Support</h2>
            <p className="text-slate-600">Use the chat feature inside your Chimehubs dashboard for help.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


