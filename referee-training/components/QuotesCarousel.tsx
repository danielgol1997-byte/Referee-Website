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
    <div className="relative h-40 overflow-hidden flex items-center justify-center">
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
            <p className="text-2xl lg:text-3xl font-semibold text-white/90 italic leading-relaxed drop-shadow-lg mb-2">
              "{quote.text}"
            </p>
            <footer className="text-sm lg:text-base text-accent/70 font-medium text-right pr-4">
              {quote.author}
            </footer>
          </blockquote>
        </div>
      ))}
    </div>
  );
}
