import { Hero } from '@/components/home/Hero';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { PopularDestinations } from '@/components/home/PopularDestinations';
import { FeaturedHotels } from '@/components/home/FeaturedHotels';
import { Testimonials } from '@/components/home/Testimonials';

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhyChooseUs />
      <PopularDestinations />
      <FeaturedHotels />
      <Testimonials />
    </>
  );
}
