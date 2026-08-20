import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, siteContent } from '@2xfactor/database';

// Landing-page copy, editable by admins, rendered on the public site.
// Each `section` is a free-form JSON blob so the frontend can shape it
// however each part of the page needs without further backend changes.
//
// NOTE: requires a `site_content` table in the @2xfactor/database schema:
//   section   text primary key   -- 'hero' | 'features' | 'about' | 'contact' | 'legal'
//   content   jsonb not null default '{}'
//   updated_at timestamp not null default now()
const DEFAULT_SECTIONS: Record<string, Record<string, unknown>> = {
  hero: {
    eyebrow: 'Earn on your terms',
    headline: 'Turn small daily tasks into steady income.',
    subheadline:
      'Subscribe to a plan, complete simple tasks, and withdraw your earnings — no experience required.',
    primaryCta: 'Get started',
    secondaryCta: 'See how it works',
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
    body: 'We built this platform to make everyday earning simple, transparent, and fast.',
  },
  contact: {
    heading: 'Get in touch',
    email: 'support@example.com',
    phone: '',
    address: '',
  },
  legal: {
    termsTitle: 'Terms of service',
    termsBody: 'Add your terms of service here.',
    privacyTitle: 'Privacy policy',
    privacyBody: 'Add your privacy policy here.',
  },
  daily_bonus: {
    enabled: true,
    amount: '50.00',
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
