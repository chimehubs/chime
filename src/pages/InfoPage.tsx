import React from 'react';
import { Navigation } from '../features/landing/components/Navigation';
import { Footer } from '../features/landing/components/Footer';

interface InfoSection {
  title: string;
  body: string;
}

interface InfoPageProps {
  title: string;
  subtitle: string;
  sections: InfoSection[];
}

export default function InfoPage({ title, subtitle, sections }: InfoPageProps) {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navigation />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-4">{title}</h1>
        <p className="text-slate-600 mb-8">{subtitle}</p>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
