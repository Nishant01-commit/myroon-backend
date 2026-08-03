'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface HotelCard {
  _id: string;
  name: string;
  slug: string;
  description: string;
  address: { city: string };
  images: { url: string }[];
  rating: { average: number; count: number };
  startingPrice: number | null;
}

async function fetchFeaturedHotels(): Promise<HotelCard[]> {
  const { data } = await api.get('/hotels', { params: { sort: 'rating', limit: 6 } });
  return data.data.hotels;
}

function HotelCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card border border-ink/5 bg-white p-4 shadow-card">
      <div className="h-48 rounded-2xl bg-soft-gray" />
      <div className="mt-4 h-4 w-3/4 rounded bg-soft-gray" />
      <div className="mt-2 h-3 w-1/2 rounded bg-soft-gray" />
      <div className="mt-4 h-8 w-full rounded-full bg-soft-gray" />
    </div>
  );
}

export function FeaturedHotels() {
  const { data: hotels, isLoading } = useQuery({ queryKey: ['featured-hotels'], queryFn: fetchFeaturedHotels });

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Handpicked</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">Featured hotels</h2>
        </div>
        <Link href="/hotels" className="text-sm font-medium text-royal-blue hover:underline">
          View all stays &rarr;
        </Link>
      </div>

      {isLoading && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <HotelCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && (!hotels || hotels.length === 0) && (
        <div className="mt-10 rounded-card border-2 border-dashed border-ink/10 py-16 text-center">
          <p className="font-display text-xl text-ink/60">The first Deoghar stays are being reviewed.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/40">
            Run a hotel near the temple? Get listed before the next Saavan rush.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/partner">Become a Hotel Partner</Link>
          </Button>
        </div>
      )}

      {!isLoading && hotels && hotels.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <Link
              key={hotel._id}
              href={`/hotels/${hotel.slug}`}
              className="group overflow-hidden rounded-card border border-ink/5 bg-white shadow-card transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                {hotel.images[0] && (
                  <Image
                    src={hotel.images[0].url}
                    alt={hotel.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                )}
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-royal-blue">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink">{hotel.name}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {hotel.rating.average.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm text-ink/60">{hotel.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-ink/50">
                    {hotel.startingPrice ? (
                      <>
                        from{' '}
                        <span className="font-display text-lg font-semibold tabular-nums text-royal-blue">
                          &#8377;{hotel.startingPrice}
                        </span>
                        <span className="text-xs">/night</span>
                      </>
                    ) : (
                      'Contact for pricing'
                    )}
                  </p>
                  <Button size="sm">Book Now</Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
