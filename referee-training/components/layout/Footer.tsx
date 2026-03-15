export function Footer() {
  return (
    <footer className="relative z-10 border-t border-accent/25 bg-dark-900/70 backdrop-blur-sm">
      {/* Accent line at top */}
      <div className="accent-line-thin" />
      
      {/* Bottom bar - compact copyright only */}
      <div className="mx-auto max-w-screen-xl px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} Referee Training Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-text-secondary">
              Built for referees, by referees
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-text-secondary">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
