"use client";

import React, { useState, useEffect } from "react";

export function QuotesCarousel() {
  const quotes = [
    {
      text: "The game is bigger than any of us. Our job is to serve it.",
      author: "Pierluigi Collina"
    },
    {
      text: "Excellence is not a singular act, but a habit.",
      author: "Howard Webb"
    },
    {
      text: "Respect the game, and it will respect you back.",
      author: "Stéphanie Frappart"
    },
    {
      text: "Every decision shapes the integrity of football.",
      author: "Björn Kuipers"
    },
    {
      text: "Authority without fairness is tyranny.",
      author: "Pierluigi Collina"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 9000); // Change quote every 9 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden flex items-center justify-center" style={{ height: 'clamp(72px, 10vh, 120px)' }}>
      {quotes.map((quote, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-700 ease-in-out flex items-center justify-center ${
            index === currentIndex
              ? 'opacity-100 translate-y-0'
              : index < currentIndex
              ? 'opacity-0 -translate-y-8'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <blockquote className="max-w-4xl text-center relative px-8">
            <p className="text-xl lg:text-2xl font-semibold text-white italic leading-snug drop-shadow-lg mb-1"
              style={{ fontSize: 'clamp(1rem, 2.5vh, 1.5rem)', textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
            >
              "{quote.text}"
            </p>
            <footer className="text-sm lg:text-base text-accent font-semibold text-right pr-4">
              {quote.author}
            </footer>
          </blockquote>
        </div>
      ))}
    </div>
  );
}
