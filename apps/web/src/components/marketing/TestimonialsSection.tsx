"use client";

import { Star } from "lucide-react";
import { StaggerContainer, FadeInUp } from "./Animations";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "College Student",
    image: "👩‍🎓",
    content:
      "I've been using X2Factor for 3 months and made over $500. The tasks are easy and the platform is so intuitive!",
    rating: 5,
  },
  {
    name: "Mike Chen",
    role: "Freelance Developer",
    image: "👨‍💻",
    content:
      "Great side income while I work on client projects. The referral program is amazing - I'm earning passive income!",
    rating: 5,
  },
  {
    name: "Emma Wilson",
    role: "Stay-at-Home Parent",
    image: "👩‍🏫",
    content:
      "Perfect for fitting into my schedule. I can work whenever I have spare time, and the support team is always helpful.",
    rating: 5,
  },
  {
    name: "Alex Rodriguez",
    role: "Entrepreneur",
    image: "👨‍💼",
    content:
      "The Pro plan is worth every penny. The advanced analytics help me optimize my earnings strategy.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StaggerContainer>
          <FadeInUp>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Loved by Thousands
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Real people, real earnings, real success stories
              </p>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial) => (
              <FadeInUp key={testimonial.name}>
                <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <div className="flex gap-4 mb-4">
                    <div className="text-3xl">{testimonial.image}</div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    "{testimonial.content}"
                  </p>
                </div>
              </FadeInUp>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
