"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeInUp, FloatingElement, StaggerContainer } from "./Animations";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 flex items-center overflow-hidden pt-20">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen opacity-20 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-8 right-20 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen opacity-20 blur-3xl"
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <StaggerContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <FadeInUp>
                <div className="inline-block">
                  <span className="px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium">
                    ✨ Now Live: Premium Plans
                  </span>
                </div>
              </FadeInUp>

              <FadeInUp>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Earn 2x Faster
                </h1>
              </FadeInUp>

              <FadeInUp>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Join thousands of users earning rewards through tasks,
                  referrals, and exclusive opportunities. No hidden fees. No
                  strings attached.
                </p>
              </FadeInUp>

              <FadeInUp>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </FadeInUp>

              <FadeInUp>
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      50K+
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Active Users
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      $2M+
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Paid Out
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      100%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Safe & Secure
                    </div>
                  </div>
                </div>
              </FadeInUp>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 lg:h-full">
              <FloatingElement>
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl blur-2xl opacity-30 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-700 rounded-2xl p-8 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-6xl font-bold mb-4">2X</div>
                      <div className="text-xl font-semibold">Your Earnings</div>
                    </div>
                  </div>
                </div>
              </FloatingElement>
            </div>
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
