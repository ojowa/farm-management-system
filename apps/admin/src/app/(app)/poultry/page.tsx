'use client';

import Link from 'next/link';
import { Bird, Home, Egg, Syringe, Skull, Pill, DollarSign } from 'lucide-react';

const sections = [
  { label: 'Flocks', href: '/poultry/flocks', icon: Bird, description: 'Manage bird flocks and batches' },
  { label: 'Houses & Pens', href: '/poultry/houses', icon: Home, description: 'Poultry houses and pen management' },
  { label: 'Feeding', href: '/poultry/feeding', icon: Egg, description: 'Feeding records and schedules' },
  { label: 'Vaccinations', href: '/poultry/vaccinations', icon: Syringe, description: 'Vaccination tracking' },
  { label: 'Medications', href: '/poultry/medications', icon: Pill, description: 'Medication records' },
  { label: 'Mortality', href: '/poultry/mortality', icon: Skull, description: 'Mortality tracking' },
  { label: 'Egg Production', href: '/poultry/egg-production', icon: Egg, description: 'Egg production logs' },
  { label: 'Sales', href: '/poultry/sales', icon: DollarSign, description: 'Poultry sales records' },
];

export default function PoultryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Poultry Management</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block p-6 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <s.icon className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold">{s.label}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
