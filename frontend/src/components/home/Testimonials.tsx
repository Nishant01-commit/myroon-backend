'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { Star } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

// Placeholder testimonials — replace with real data from GET /api/v1/reviews/hotel/:hotelId
// (built in Phase 5 on the backend) once there's enough real review volume to show. Written
// to read like actual pilgrim/family travelers, not generic filler.
const TESTIMONIALS = [
  {
    name: 'Ritu Sharma',
    location: 'Patna',
    rating: 5,
    quote:
      'We arrived past midnight after the train was delayed, and the room was still held, keys ready. Ten minutes from the temple gate — exactly as booked.',
  },
  {
    name: 'Manoj Thakur',
    location: 'Ranchi',
    rating: 5,
    quote:
      'Booked for my parents during Saavan when everywhere else was full or overpriced. Clean room, honest price, no surprise charges at checkout.',
  },
  {
    name: 'Priya & Family',
    location: 'Kolkata',
    rating: 4,
    quote:
      "Easiest part of the whole trip, honestly. Picked the hotel, paid, got the confirmation — didn't have to think about it again until we checked in.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-royal-blue py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Fellow travelers</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white md:text-4xl">
          Every stay is part of someone&rsquo;s journey.
        </h2>
      </div>

      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        spaceBetween={24}
        slidesPerView={1}
        breakpoints={{ 768: { slidesPerView: 2 } }}
        className="mt-12 !pb-12"
      >
        {TESTIMONIALS.map((t) => (
          <SwiperSlide key={t.name}>
            <div className="mx-6 rounded-card bg-white/[0.06] p-8 backdrop-blur-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-gold text-gold' : 'text-white/20'}`} />
                ))}
              </div>
              <p className="mt-4 font-display text-lg italic leading-relaxed text-white/90">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-display text-sm font-semibold text-royal-blue-deep">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/50">{t.location}</p>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
