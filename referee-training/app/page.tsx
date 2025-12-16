import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { QuotesCarousel } from "@/components/QuotesCarousel";

// Pre-login landing page
function PreLoginPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Pre-login */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background with IFAB slate gray gradient and animated soccer ball */}
        <div className="absolute inset-0 bg-dark-900">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700" />
          
          {/* Animated soccer ball background */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-dark-900/60" />
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="min-w-full min-h-full object-cover opacity-25"
              style={{ 
                mixBlendMode: 'screen',
                filter: 'brightness(0.7) contrast(1.1)',
                transform: 'scale(1.08)',
                transformOrigin: 'center'
              }}
            >
              <source src="/soccer-ball-bg.mp4" type="video/mp4" />
            </video>
          </div>
          
          {/* Subtle pitch lines pattern */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2">
            <svg className="absolute bottom-0 left-0 right-0 h-80 opacity-[0.015]" viewBox="0 0 100 40" preserveAspectRatio="none">
              <line x1="50" y1="0" x2="50" y2="40" stroke="#E8E09A" strokeWidth="0.3" />
              <circle cx="50" cy="20" r="8" fill="none" stroke="#E8E09A" strokeWidth="0.3" />
              <rect x="0" y="8" width="12" height="24" fill="none" stroke="#E8E09A" strokeWidth="0.3" />
              <rect x="88" y="8" width="12" height="24" fill="none" stroke="#E8E09A" strokeWidth="0.3" />
            </svg>
          </div>
          
          {/* Subtle gold glow effects */}
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/[0.015] rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-screen-xl px-6 py-20 w-full">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Accent line */}
            <div className="w-20 h-[2px] bg-accent/40 mx-auto" />
            
            <p className="text-sm font-medium text-accent/80 uppercase tracking-[0.3em]">
              Professional Training Platform
            </p>
            
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-premium-accent">LAWS OF THE GAME</span>
              <span className="block mt-2 text-white/90 text-premium">Training Platform</span>
            </h1>
            
            <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Master the Laws of the Game, practice with real match scenarios, 
              and elevate your officiating skills.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button asChild size="lg" className="text-base px-8 py-6">
                <Link href="/auth/register">Create Account</Link>
              </Button>
              <Button 
                variant="outline" 
                asChild 
                size="lg" 
                className="text-base px-8 py-6"
              >
                <Link href="/auth/login">Log In</Link>
              </Button>
            </div>

            {/* Simple feature list */}
            <div className="pt-12 max-w-xl mx-auto">
              <div className="w-full h-[1px] bg-accent/20 mb-8" />
              <div className="grid grid-cols-1 gap-4 text-center">
                {[
                  "Comprehensive Laws of the Game testing",
                  "Real match video scenarios and challenges",
                  "VAR and Assistant Referee specific training",
                  "Track your progress and improvement"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 justify-center">
                    <div className="w-5 h-5 rounded-full border border-accent/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-text-secondary text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { CategoryCard } from "@/components/ui/tilt-card";

// Post-login dashboard
function PostLoginPage() {
  const practiceCategories = [
    { 
      title: "Laws of the Game Test", 
      href: "/laws/test", 
      description: "Text-based multiple choice practice with instant explanations.",
      gif: "/logo/whistle-laws.webp", // Using webp as per Header.tsx
      backgroundImage: "/card-backgrounds/laws-bg.png"
    },
    { 
      title: "Referees Practice", 
      href: "/practice", 
      description: "Video challenges for Offside, Handball, DOGSO/SPA, and more.",
      gif: "/logo/whistle-practice-new.gif",
      backgroundImage: "/card-backgrounds/referee-practice-bg.png"
    },
    { 
      title: "VAR Practice", 
      href: "/practice/var", 
      description: "Referee decision + VAR recommendation scenarios.",
      gif: "/logo/whistle-var-liquid.gif",
      backgroundImage: "/card-backgrounds/var-bg.png"
    },
    { 
      title: "A.R. Practice", 
      href: "/practice/ar", 
      description: "Offside and teamwork clips for assistant referees.",
      gif: "/logo/whistle-ar-liquid.gif",
      backgroundImage: "/card-backgrounds/ar-bg.png"
    },
    { 
      title: "Video Library", 
      href: "/library", 
      description: "Conceptual guides for handball, offside, DOGSO/SPA.",
      gif: "/logo/whistle-library-liquid.gif",
      backgroundImage: "/card-backgrounds/video-library-bg.png"
    },
    { 
      title: "Stats", 
      href: "/stats", 
      description: "Assignments, recent scores, and category progress.",
      gif: "/logo/whistle-training-liquid.gif",
      backgroundImage: "/card-backgrounds/stats-bg.png"
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Post-login */}
      <section className="relative overflow-hidden">
        {/* Background - IFAB slate with animated soccer ball */}
        <div className="absolute inset-0 bg-dark-900">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700" />
          
          {/* Animated soccer ball background */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-dark-900/60" />
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="min-w-full min-h-full object-cover opacity-25"
              style={{ 
                mixBlendMode: 'screen',
                filter: 'brightness(0.7) contrast(1.1)',
                transform: 'scale(1.08)',
                transformOrigin: 'center'
              }}
            >
              <source src="/soccer-ball-bg.mp4" type="video/mp4" />
            </video>
          </div>
          
          {/* Subtle gold glow */}
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent/[0.02] rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-screen-xl px-6 py-16">
          <div className="max-w-3xl">
            <QuotesCarousel />
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="relative py-12 bg-dark-800/40">
        <div className="mx-auto max-w-screen-xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {practiceCategories.map((item, idx) => (
              <CategoryCard
                key={item.href}
                href={item.href}
                title={item.title}
                gif={item.gif}
                index={idx}
                backgroundImage={item.backgroundImage}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Show different page based on authentication status
  if (session?.user) {
    return <PostLoginPage />;
  }

  return <PreLoginPage />;
}
