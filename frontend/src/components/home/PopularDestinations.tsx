import Link from 'next/link';
import Image from 'next/image';

const DESTINATIONS = [
  {
    city: 'Deoghar',
    tagline: 'Home of the Baidyanath Jyotirlinga',
    href: '/hotels?city=Deoghar',
    // Placeholder — swap for real Deoghar/Baidyanath Temple photography before launch.
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1200&auto=format&fit=crop',
  },
];

export function PopularDestinations() {
  return (
    <section className="bg-soft-gray py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Where to next</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">Popular destinations</h2>
          </div>
          <p className="max-w-xs text-sm text-ink/50">More cities are on the way — Deoghar is where the journey starts.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <Link key={d.city} href={d.href} className="group relative block h-80 overflow-hidden rounded-card shadow-card">
              <Image
                src={d.image}
                alt={`${d.city}, India`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-royal-blue-deep/90 via-royal-blue-deep/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="font-display text-2xl font-semibold text-white">{d.city}</h3>
                <p className="mt-1 text-sm text-white/80">{d.tagline}</p>
              </div>
            </Link>
          ))}

          <div className="flex h-80 flex-col items-center justify-center rounded-card border-2 border-dashed border-ink/10 text-center">
            <p className="font-display text-lg text-ink/40">More cities</p>
            <p className="mt-1 text-sm text-ink/30">Coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
}
