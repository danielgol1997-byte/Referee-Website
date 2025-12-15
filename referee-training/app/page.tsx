import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
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
              <span className="text-accent">LAWS OF THE GAME</span>
              <span className="block mt-2 text-white/90">Training Platform</span>
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

// Post-login dashboard
function PostLoginPage() {
  const practiceCategories = [
    { 
      title: "Laws of the Game Test", 
      href: "/laws/test", 
      description: "Text-based multiple choice practice with instant explanations.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      title: "Referees Practice", 
      href: "/practice", 
      description: "Video challenges for Offside, Handball, DOGSO/SPA, and more.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      title: "VAR Practice", 
      href: "/practice/var", 
      description: "Referee decision + VAR recommendation scenarios.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      title: "A.R. Practice", 
      href: "/practice/ar", 
      description: "Offside and teamwork clips for assistant referees.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      )
    },
    { 
      title: "Library", 
      href: "/library", 
      description: "Conceptual guides for handball, offside, DOGSO/SPA.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      title: "My Training", 
      href: "/my-training", 
      description: "Assignments, recent scores, and category progress.",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {practiceCategories.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className="group relative card p-6 hover:border-accent/20 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center text-accent/80 group-hover:bg-accent/10 transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-accent transition-colors mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
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
