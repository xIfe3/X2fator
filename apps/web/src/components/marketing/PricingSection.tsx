"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { StaggerContainer, FadeInUp, ScaleIn } from "./Animations";

const plans = [
  {
    name: "Starter",
    price: "$0",
    description: "Perfect for getting started",
    features: [
      "5 tasks per day",
      "Basic analytics",
      "Email support",
      "Community access",
      "Monthly earnings limit: $50",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "For serious earners",
    features: [
      "50 tasks per day",
      "Advanced analytics",
      "Priority support",
      "Premium tasks access",
      "Monthly earnings limit: $1,000",
      "Referral bonus: 15%",
      "Early access to new features",
    ],
    cta: "Start 7-Day Trial",
    highlighted: true,
  },
  {
    name: "Elite",
    price: "$29.99",
    period: "/month",
    description: "Maximum earning potential",
    features: [
      "Unlimited tasks",
      "Premium analytics & insights",
      "24/7 VIP support",
      "All premium opportunities",
      "Unlimited earnings",
      "Referral bonus: 25%",
      "Dedicated account manager",
      "Exclusive deals & partnerships",
    ],
    cta: "Start 7-Day Trial",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer>
          <FadeInUp>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Choose the plan that fits your goals. No hidden fees, cancel
                anytime.
              </p>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <ScaleIn key={plan.name}>
                <div
                  className={`rounded-xl border transition-all h-full flex flex-col ${
                    plan.highlighted
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg scale-105"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="bg-blue-600 text-white py-2 text-sm font-semibold text-center">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                      {plan.description}
                    </p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-gray-600 dark:text-gray-400">
                            {plan.period}
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/signup"
                      className={`w-full py-3 rounded-lg font-semibold transition-colors text-center ${
                        plan.highlighted
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>

          <FadeInUp>
            <div className="mt-16 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                All plans include a 7-day free trial. No credit card required.
              </p>
            </div>
          </FadeInUp>
        </StaggerContainer>
      </div>
    </section>
  );
}
