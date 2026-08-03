import { ShieldCheck, BadgeCheck, Tag, Headset } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Secure Booking',
    body: 'Payments run through Razorpay with signature verification on every transaction — nothing is charged twice, nothing goes unconfirmed.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified Hotels',
    body: 'Every listing is reviewed by our team before it goes live. What you see matches what you get on arrival.',
  },
  {
    icon: Tag,
    title: 'Best Price Guarantee',
    body: 'No hidden mark-ups. The price you see at search is the price you pay at checkout, GST and fees included upfront.',
  },
  {
    icon: Headset,
    title: '24×7 Support',
    body: "Long travel days don't run on business hours — a real person is reachable whenever your journey needs one.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Why MyRoomm</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
          Booked with confidence, not crossed fingers.
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group rounded-card border border-ink/5 bg-white p-6 shadow-card transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-royal-blue/10 text-royal-blue transition-colors group-hover:bg-gold group-hover:text-royal-blue-deep">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
