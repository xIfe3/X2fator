"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeInUp } from "./Animations";

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeInUp>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Ready to Double Your Income?
          </h2>
        </FadeInUp>

        <FadeInUp>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of successful earners. Start for free today.
          </p>
        </FadeInUp>

        <FadeInUp>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border-2 border-white hover:bg-white/10 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
