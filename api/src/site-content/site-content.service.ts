import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, siteContent } from '../database';

// Landing-page copy, editable by admins, rendered on the public site.
// Each `section` is a free-form JSON blob so the frontend can shape it
// however each part of the page needs without further backend changes.
//
// NOTE: requires a `site_content` table in the ../database schema:
//   section   text primary key   -- 'hero' | 'features' | 'about' | 'contact' | 'legal'
//   content   jsonb not null default '{}'
//   updated_at timestamp not null default now()
const DEFAULT_SECTIONS: Record<string, Record<string, unknown>> = {
  hero: {
    eyebrow: 'Earn on your terms',
    headline: 'Build a better earning habit, one task at a time.',
    subheadline:
      'X2Factor brings tasks, rewards, referrals, and withdrawals into one clear place so your progress never feels out of reach.',
    primaryCta: 'Get started',
    secondaryCta: 'Explore how it works',
    note: 'Simple tasks. Clear rewards. Your pace.',
  },
  features: {
    items: [
      {
        title: 'Pick a plan',
        description:
          'Choose a subscription that matches your goals and budget.',
      },
      {
        title: 'Complete tasks',
        description:
          'Watch videos, try apps, and submit proof — it only takes minutes a day.',
      },
      {
        title: 'Get paid',
        description:
          'Earnings land in your wallet once tasks are reviewed and approved.',
      },
    ],
  },
  about: {
    heading: 'About us',
    body: 'We built X2Factor for people who want a practical way to turn spare moments into measurable progress. Every task, reward, and withdrawal is designed to be easy to understand.',
    values: [
      {
        title: 'Clarity first',
        description: 'See what you can earn before you commit your time.',
      },
      {
        title: 'Progress that counts',
        description:
          'Small actions add up through tasks, bonuses, and referrals.',
      },
      {
        title: 'People over noise',
        description:
          'A focused platform without confusing jargon or hidden steps.',
      },
    ],
  },
  contact: {
    heading: 'Get in touch',
    email: 'support@example.com',
    phone: '',
    address: '',
  },
  legal: {
    termsTitle: 'Terms of service',
    termsBody:
      'These Terms of Service govern your use of X2Factor. By creating an account, you agree to use the platform lawfully, provide accurate information, and follow the rules for tasks, subscriptions, rewards, and withdrawals. Rewards are subject to review, eligibility, and the terms displayed when you participate.',
    privacyTitle: 'Privacy policy',
    privacyBody:
      'This Privacy Policy explains how X2Factor collects and uses information needed to provide accounts, tasks, payments, support, security, and compliance services. We do not sell your personal information. You may contact support to ask about your data or request an update where applicable.',
    termsUpdated: 'Last updated: August 22, 2026',
    privacyUpdated: 'Last updated: August 22, 2026',
  },
  stats: {
    items: [
      { value: '24/7', label: 'Access to your earning hub' },
      { value: '3 ways', label: 'To grow your balance' },
      { value: '1 place', label: 'To track every step' },
    ],
  },
  testimonials: {
    items: [
      {
        quote: 'The best part is knowing exactly what I need to do next.',
        name: 'Amina K.',
        role: 'X2Factor member',
      },
      {
        quote:
          'I started with small tasks and built a routine that works for me.',
        name: 'David O.',
        role: 'X2Factor member',
      },
    ],
  },
  faq: {
    items: [
      {
        question: 'How does X2Factor work?',
        answer:
          'Choose an available plan, complete eligible tasks, and track approved rewards in your wallet.',
      },
      {
        question: 'Can I use X2Factor on my phone?',
        answer:
          'Yes. The platform is designed for modern browsers on phones, tablets, and desktop.',
      },
      {
        question: 'How do withdrawals work?',
        answer:
          'Once your balance meets the current minimum, submit a withdrawal request from your wallet for review.',
      },
    ],
  },
  daily_bonus: {
    enabled: true,
    amount: '50.00',
    milestoneAmount: '5000.00',
  },
  welcome_bonus: {
    enabled: true,
    amount: '5000.00',
  },
  ad_pricing: {
    app_download: '50.00',
    followers: '30.00',
    subscribers: '30.00',
    comments: '20.00',
    likes: '10.00',
  },
  feature_flags: {
    // When false, registration activates the account immediately —
    // skipping the plan-purchase/Flutterwave payment step entirely.
    requirePlanPurchase: true,
    // When false, the ads/"promote" feature is fully locked — creation
    // is rejected server-side (not just hidden in the UI).
    adsEnabled: true,
  },
  telegram: {
    enabled: true,
    channelUrl: '',
    groupUrl: '',
  },
};

@Injectable()
export class SiteContentService {
  /**
   * Public: every section, with defaults filled in for anything an
   * admin hasn't customized yet.
   */
  async getAll() {
    const rows = await db.query.siteContent.findMany();
    const bySection = new Map(rows.map((r) => [r.section, r.content]));

    const merged: Record<string, Record<string, unknown>> = {};
    for (const section of Object.keys(DEFAULT_SECTIONS)) {
      merged[section] = {
        ...DEFAULT_SECTIONS[section],
        ...((bySection.get(section) as Record<string, unknown>) ?? {}),
      };
    }
    return merged;
  }

  /**
   * Admin: upsert a single section's content.
   */
  async updateSection(section: string, content: Record<string, unknown>) {
    await db
      .insert(siteContent)
      .values({ section, content, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteContent.section,
        set: { content, updatedAt: new Date() },
      });

    return this.getAll();
  }
}
