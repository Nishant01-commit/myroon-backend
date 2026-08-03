import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { NewsletterForm } from './NewsletterForm';

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cancellation-policy', label: 'Cancellation Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/contact', label: 'Contact' },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/5 bg-royal-blue-deep text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <span className="font-display text-xl font-semibold">
              MyRoomm<span className="text-gold">.in</span>
            </span>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              Verified stays near Baidyanath Temple, Deoghar — booked in minutes, ready when your journey ends.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="#" aria-label="Facebook" className="text-white/60 transition-colors hover:text-gold">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="text-white/60 transition-colors hover:text-gold">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-white/60 transition-colors hover:text-gold">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Company</p>
            <ul className="mt-4 space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Stay in the loop</p>
            <p className="mt-4 text-sm text-white/70">Fresh Deoghar stays and fewer-crowds tips, once in a while.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          &copy; {new Date().getFullYear()} MyRoomm.in. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
