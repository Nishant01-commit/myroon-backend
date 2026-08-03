import { SearchBox } from './SearchBox';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-royal-blue">
      {/* Signature arc — reads as both a temple bell's curve and the road to Deoghar. Used
          boldly here, once; everywhere else it's quiet, per the design brief. */}
      <svg
        className="pointer-events-none absolute -right-1/4 -top-1/3 h-[140%] w-[140%] opacity-[0.15] md:-right-1/3"
        viewBox="0 0 800 800"
        fill="none"
        aria-hidden="true"
      >
        <path d="M 50 750 Q 400 100 750 400" stroke="url(#arc-gradient)" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="arc-gradient" x1="0" y1="0" x2="800" y2="800">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-20 md:pt-28">
        <div className="max-w-2xl">
          <p
            className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-gold opacity-0"
            style={{ animationDelay: '0ms' }}
          >
            Deoghar &middot; Baidyanath Temple
          </p>
          <h1
            className="animate-fade-up mt-4 font-display text-4xl font-semibold leading-[1.1] text-white opacity-0 sm:text-5xl md:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            Find the perfect stay at the best price.
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-lg font-display text-lg italic leading-relaxed text-white/70 opacity-0"
            style={{ animationDelay: '160ms' }}
          >
            May Lord Shiva bless every journey with peace, comfort, and divine hospitality.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 opacity-0" style={{ animationDelay: '240ms' }}>
            <Button variant="gold" size="lg" asChild>
              <a href="#search">Search Hotels</a>
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10" asChild>
              <a href="/partner">Become a Hotel Partner</a>
            </Button>
          </div>
        </div>

        <div id="search" className="relative mt-12">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}
