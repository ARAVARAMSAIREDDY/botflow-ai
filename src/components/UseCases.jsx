import React, { useState } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Stethoscope, 
  UtensilsCrossed, 
  ShoppingBag, 
  Laptop,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function UseCases({ onOpenChat, onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('hospitals');

  const industries = [
    {
      id: 'hospitals',
      name: 'Hospitals & Clinics',
      icon: Stethoscope,
      badge: 'Healthcare',
      headline: '24/7 Patient Guidance, Doctor Directories & Triage FAQs',
      description: 'Hospitals deploy BotFlow AI to answer patient questions instantly, direct visitors to the right clinics, provide pre-op preparation steps, and relieve burdened phone switchboards.',
      highlights: [
        'OPD hours and department routing',
        'Doctor specialties and consultation timings',
        'Pre-procedure diet and fasting instructions',
        'HIPAA-ready privacy architecture'
      ],
      sampleQuestion: 'What are the visiting hours for the neonatal ICU and do I need a pass?',
      sampleAnswer: 'Visiting hours for the NICU are 2:00 PM – 4:00 PM and 7:00 PM – 8:30 PM. Up to 2 parent passes are provided at the 3rd floor reception.'
    },
    {
      id: 'colleges',
      name: 'Colleges & Universities',
      icon: GraduationCap,
      badge: 'Higher Ed',
      headline: 'Admissions Concierge, Syllabus Queries & Student FAQs',
      description: 'Universities train BotFlow AI on application handbooks, scholarship rules, campus maps, and academic calendars to guide prospective applicants and current students.',
      highlights: [
        'Admissions cutoff and eligibility checklists',
        'Financial aid and scholarship deadlines',
        'Course syllabus lookup and faculty office hours',
        'Campus housing & hostel policy inquiries'
      ],
      sampleQuestion: 'When is the deadline for Fall scholarship applications and what documents are required?',
      sampleAnswer: 'Fall scholarship applications close May 15. You must submit your FAFSA confirmation, 2 letters of recommendation, and latest transcripts through the portal.'
    },
    {
      id: 'restaurants',
      name: 'Restaurants & Hospitality',
      icon: UtensilsCrossed,
      badge: 'Dining',
      headline: 'Interactive Menus, Allergen Information & Table Booking',
      description: 'Restaurants and cafes embed BotFlow AI to showcase current specials, answer gluten/nut allergy questions, share directions, and automate reservation requests.',
      highlights: [
        'Dietary filters (vegan, gluten-free, halal, keto)',
        'Private party and catering package details',
        'Valet parking and location directions',
        'Direct table reservation link routing'
      ],
      sampleQuestion: 'Do you have gluten-free pasta options and can we reserve an outdoor table for 6?',
      sampleAnswer: 'Yes! We offer gluten-free Penne and Rigatoni prepared in a dedicated kitchen area. I can reserve an outdoor patio table for 6—what time suits you?'
    },
    {
      id: 'ecommerce',
      name: 'E-commerce & Retail',
      icon: ShoppingBag,
      badge: 'Retail',
      headline: 'Product Recommendations, Order Tracking & Return Policies',
      description: 'Online merchants train BotFlow on their Shopify or WooCommerce catalog to boost sales conversion, help customers choose sizes, and explain return rules.',
      highlights: [
        'Real-time order status tracking with order ID',
        'Return policy and instant refund guidelines',
        'Product comparison and sizing recommendations',
        'Discount code alerts and abandoned cart assistance'
      ],
      sampleQuestion: 'What is your return policy for international footwear orders?',
      sampleAnswer: 'Unworn shoes in original packaging can be returned within 30 days of delivery. Prepaid return labels are available on your account dashboard.'
    },
    {
      id: 'saas',
      name: 'SaaS & Tech Platforms',
      icon: Laptop,
      badge: 'Tech',
      headline: 'API Documentation Search & Automated Tier-1 Support',
      description: 'Software companies upload API documentation, changelogs, and onboarding guides so developers and users get instant troubleshooting answers.',
      highlights: [
        'Instant code snippet suggestions & curl examples',
        'Troubleshooting authentication and webhook issues',
        'Feature tier comparison and pricing lookups',
        'Direct handover to human support via Slack/Zendesk'
      ],
      sampleQuestion: 'How do I authenticate API requests using Bearer tokens in Python?',
      sampleAnswer: 'Include the Authorization header formatted as: headers={"Authorization": "Bearer YOUR_API_KEY"} in your requests library call.'
    }
  ];

  const current = industries.find((i) => i.id === activeTab) || industries[0];
  const Icon = current.icon;

  return (
    <section className="py-24 bg-purple-50/30 border-y border-purple-100/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-100 px-3.5 py-1 rounded-full">
            Tailored Industry Solutions
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Any Organization That Talks to People
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            See how different industries use BotFlow AI to turn complex documents into helpful, 24/7 conversational agents.
          </p>

          {/* Industry Selection Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {industries.map((ind) => {
              const IndIcon = ind.icon;
              return (
                <button
                  key={ind.id}
                  onClick={() => setActiveTab(ind.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                    activeTab === ind.id
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80'
                  }`}
                >
                  <IndIcon className="w-4 h-4" />
                  <span>{ind.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Industry Card Display */}
        <div className="bg-white rounded-3xl border border-purple-200/80 shadow-xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left details */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full mb-3">
              <Icon className="w-4 h-4" />
              <span>{current.badge} Solution</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {current.headline}
            </h3>

            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              {current.description}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:opacity-95 shadow-md transition"
              >
                Build for {current.badge}
              </button>
              <button
                onClick={onOpenChat}
                className="text-xs sm:text-sm font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1.5"
              >
                <span>Ask bot about this</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right simulated conversational snippet */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Simulated Conversation</span>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Grounded Answer
              </span>
            </div>

            <div className="space-y-3">
              {/* Question bubble */}
              <div className="bg-purple-600 text-white rounded-2xl rounded-tr-xs p-3.5 text-xs sm:text-sm shadow-xs ml-6">
                <p className="font-medium">{current.sampleQuestion}</p>
              </div>

              {/* Answer bubble */}
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs sm:text-sm text-slate-800 shadow-xs mr-6">
                <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{current.name} Assistant:</span>
                </div>
                <p>{current.sampleAnswer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
