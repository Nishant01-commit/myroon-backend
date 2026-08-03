'use client';

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function NewsletterForm() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // No newsletter endpoint on the backend yet — this is a placeholder until one exists.
    toast.success("Thanks — we'll be in touch once we're taking sign-ups.");
    setEmail('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
      />
      <Button variant="gold" type="submit">
        Join
      </Button>
    </form>
  );
}
