import Link from "next/link";

const footerLinks = [
  { label: "Laws of the Game", href: "/laws" },
  { label: "Practice", href: "/practice" },
  { label: "Library", href: "/library" },
  { label: "My Training", href: "/my-training" },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-accent/10 bg-dark-900/80 backdrop-blur-sm">
      {/* Accent line at top */}
      <div className="accent-line-thin" />
      
      <div className="mx-auto max-w-screen-xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <svg className="w-6 h-6 text-dark-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-white">
                Referee Training
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-md mb-6">
              Professional training platform for football referees. Master the Laws of the Game, 
              practice with video challenges, and track your progress.
            </p>
            <p className="text-text-muted text-xs">
              Train like a professional. Decide with confidence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
              Training
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/library"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Video Library
                </Link>
              </li>
              <li>
                <Link 
                  href="/laws"
                  className="text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  Laws Reference
                </Link>
              </li>
              <li>
                <span className="text-sm text-text-muted">
                  More coming soon...
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-accent/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Referee Training Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-text-muted">
              Built for referees, by referees
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent/80 animate-pulse" />
              <span className="text-xs text-text-muted">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
