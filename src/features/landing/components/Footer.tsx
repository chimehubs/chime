import React from 'react';
import { Mail, Linkedin, Twitter, Github } from 'lucide-react';
import { Logo } from '../../../app/components/Logo';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Security', href: '/security' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Mobile App', href: '/mobile-app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Compliance', href: '/compliance' },
      { label: 'Licenses', href: '/licenses' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help-center' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'System Status', href: '/system-status' },
      { label: 'FAQs', href: '/faqs' },
    ],
  },
];

const socialLinks = [
  { icon: <Twitter className="w-5 h-5" />, href: 'https://twitter.com', label: 'Twitter' },
  { icon: <Linkedin className="w-5 h-5" />, href: 'https://linkedin.com', label: 'LinkedIn' },
  { icon: <Github className="w-5 h-5" />, href: 'https://github.com', label: 'GitHub' },
  { icon: <Mail className="w-5 h-5" />, href: 'mailto:support@chimafinance.com', label: 'Email' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#00b388] text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                <Logo className="w-5 h-5" innerClassName="text-white font-bold text-sm" />
              </div>
              <span className="text-xl font-bold">Chimahub</span>
            </div>
            <p className="text-white/85 text-sm leading-relaxed">
              Secure digital banking for modern financial management.
            </p>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/80 hover:text-white transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 py-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/80 text-sm text-center md:text-left">
            &copy; 2026 Chima Finance Ltd. Contact: support@chimafinance.com.{' '}
            <a className="underline" href="/privacy-policy">Privacy Policy</a> |{' '}
            <a className="underline" href="/terms">Terms</a>.
          </p>

          {/* Social Links */}
          <div className="flex gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white hover:text-white transition-all duration-300"
                aria-label={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
