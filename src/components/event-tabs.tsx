"use client";

import {
  CalendarDays,
  CreditCard,
  Home,
  ListChecks,
  Settings2,
  Store,
  Users,
} from "@/components/icons";

const ICONS: Record<string, typeof Home> = {
  Overview: Home,
  Plan: CalendarDays,
  Guests: Users,
  Budget: CreditCard,
  Vendors: Store,
  Schedule: ListChecks,
  Food: ListChecks,
  Preparation: ListChecks,
  Settings: Settings2,
};

export function EventTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <nav className="event-chrome-tabs" aria-label="Event sections">
      {tabs.map((tab) => {
        const Icon = ICONS[tab] || ListChecks;
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={tab === active}
            onClick={() => onChange(tab)}
          >
            <Icon size={16} strokeWidth={1.8} />
            {tab}
          </button>
        );
      })}
    </nav>
  );
}
