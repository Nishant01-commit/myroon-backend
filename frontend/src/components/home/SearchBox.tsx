'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchBox() {
  const router = useRouter();
  const [city, setCity] = useState('Deoghar');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ city, guests: String(guests) });
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    router.push(`/hotels?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="grid gap-3 rounded-3xl border border-ink/5 bg-white p-4 shadow-card md:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] md:items-end md:p-5"
    >
      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink/50">
          <MapPin className="h-3.5 w-3.5" /> Destination
        </span>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Where are you headed?" />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink/50">
          <Calendar className="h-3.5 w-3.5" /> Check-in
        </span>
        <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink/50">
          <Calendar className="h-3.5 w-3.5" /> Check-out
        </span>
        <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink/50">
          <Users className="h-3.5 w-3.5" /> Guests
        </span>
        <Input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
      </label>

      <Button type="submit" size="lg" className="w-full md:w-auto">
        <Search className="h-4 w-4" />
        <span className="md:hidden">Search</span>
      </Button>
    </form>
  );
}
