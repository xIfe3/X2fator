"use client";

import {
  Zap,
  TrendingUp,
  Shield,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";
import { StaggerContainer, FadeInUp } from "./Animations";

const features = [
  {
    icon: Zap,
    title: "Quick Tasks",
    description:
      "Earn money by completing simple tasks. Takes just minutes per day.",
  },
  {
    icon: TrendingUp,
    title: "Growth Potential",
    description:
      "Unlock premium plans and increase your daily earning capacity.",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description:
      "Your funds and data are protected with enterprise-grade encryption.",
  },
  {
    icon: Users,
    title: "Referral Rewards",
    description:
      "Earn commissions by inviting friends. Passive income at scale.",
  },
  {
    icon: Wallet,
    title: "Instant Payouts",
    description:
      "Withdraw your earnings anytime. Multiple payment methods available.",
  },
  {
    icon: BarChart3,
    title: "Track Everything",
    description:
      "Real-time dashboard showing all your earnings and statistics.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer>
          <FadeInUp>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Everything you need to maximize your earnings and grow your
                wealth
              </p>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <FadeInUp key={feature.title}>
                  <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800 hover:shadow-lg dark:hover:shadow-blue-900/20 transition-shadow">
                    <div className="mb-4 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </FadeInUp>
              );
            })}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
