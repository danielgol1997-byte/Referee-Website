"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

// Map routes to positions (0-6 for 7 positions)
// Order matches the navigation tabs in Header
const NAV_POSITIONS: Record<string, number> = {
  "/": 0, // Home page shows leftmost part
  "/laws": 1,
  "/practice": 2, // Referees practice
  "/practice/var": 3, // VAR practice
  "/practice/ar": 4, // A.R. practice
  "/library": 5,
  "/my-training": 6,
};

export function SlidingBackground() {
  const pathname = usePathname();
  const [position, setPosition] = useState(0); // Default to home position (leftmost)

  useEffect(() => {
    // Find which tab matches the current path
    // Check more specific routes first (like /practice/var before /practice)
    const sortedRoutes = Object.keys(NAV_POSITIONS).sort((a, b) => b.length - a.length);
    
    const matchedRoute = sortedRoutes.find(
      (route) => {
        if (route === "/") {
          return pathname === "/";
        }
        return pathname === route || pathname.startsWith(`${route}/`);
      }
    );

    if (matchedRoute) {
      setPosition(NAV_POSITIONS[matchedRoute]);
    } else {
      // Default to home position for unknown routes
      setPosition(0);
    }
  }, [pathname]);

  // Calculate equal movement across tabs
  // Image is 8345px wide, we want to slide smoothly across the full width
  // For 7 positions (0-6), each step should move equally
  // Using percentage-based transform for smooth, equal movement
  const slidePercentage = position * (100 / 6); // Divide 100% by 6 for 7 positions

  return (
    <div className="sliding-background">
      <img
        src="/stadium-panorama.jpg"
        alt=""
        className="sliding-background-image"
        style={{
          objectPosition: `${slidePercentage}% center`,
        }}
        draggable={false}
      />
    </div>
  );
}
