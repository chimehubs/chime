import React from 'react';
import { Navigation } from '../features/landing/components/Navigation';
import { Footer } from '../features/landing/components/Footer';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navigation />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-4">About Chimahub</h1>
        <p className="text-slate-600 leading-relaxed mb-8">
          Chimahub is the digital banking experience from Chima Finance Ltd. We focus on secure, modern
          financial tools that help you manage money with clarity and confidence.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Our Mission</h2>
            <p className="text-slate-600">
              Build a trusted financial platform that keeps customers in control of their money and data.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Security First</h2>
            <p className="text-slate-600">
              We design every feature around privacy, encryption, and safe financial operations.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Transparent Banking</h2>
            <p className="text-slate-600">
              Clear balances, clear activity, and clear controls so you always know where you stand.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Support You Can Reach</h2>
            <p className="text-slate-600">
              Contact us at support@chimafinance.com whenever you need help.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
