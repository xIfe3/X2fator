"use client";

import {
  StaggerContainer,
  FadeInUp,
  SlideInLeft,
  SlideInRight,
} from "./Animations";

const steps = [
  {
    number: "01",
    title: "Sign Up",
    description:
      "Create your account in seconds. No verification or complex setup needed.",
  },
  {
    number: "02",
    title: "Choose Your Plan",
    description:
      "Select the plan that matches your earning goals. Start with free and upgrade anytime.",
  },
  {
    number: "03",
    title: "Complete Tasks",
    description:
      "Browse available tasks and start earning. Tasks range from watching videos to app testing.",
  },
  {
    number: "04",
    title: "Track & Withdraw",
    description:
      "Monitor your earnings in real-time and withdraw whenever you want via your preferred method.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer>
          <FadeInUp>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Simple, straightforward process to start earning
              </p>
            </div>
          </FadeInUp>

          <div className="space-y-12">
            {steps.map((step, index) => (
              <FadeInUp key={step.number}>
                <div className="flex gap-8 items-stretch">
                  {/* Left - Number circle */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-1 h-20 bg-gradient-to-b from-blue-600 to-purple-600 mt-4" />
                    )}
                  </div>

                  {/* Right - Content */}
                  <div className="flex-1 pb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>

          <FadeInUp>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  5 min
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Average task completion time
                </div>
              </div>
              <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  ∞
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Unlimited earning potential
                </div>
              </div>
              <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  24/7
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Access tasks anytime, anywhere
                </div>
              </div>
            </div>
          </FadeInUp>
        </StaggerContainer>
      </div>
    </section>
  );
}
