"use client";

import { useState } from "react";
import { VideoCard3D } from "@/components/library/VideoCard3D";
import { PillChip } from "@/components/ui/pill-chip";

const LAWS = Array.from({ length: 17 }, (_, i) => i + 1);
const RESTARTS = ['FREE_KICK', 'PENALTY_KICK', 'CORNER_KICK', 'GOAL_KICK', 'THROW_IN'];
const SANCTIONS = ['YELLOW_CARD', 'RED_CARD', 'NO_CARD'];

export default function VideoSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLaws, setSelectedLaws] = useState<number[]>([]);
  const [selectedRestarts, setSelectedRestarts] = useState<string[]>([]);
  const [selectedSanctions, setSelectedSanctions] = useState<string[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedLaws.length > 0) params.append('laws', selectedLaws.join(','));
      if (selectedRestarts.length > 0) params.append('restarts', selectedRestarts.join(','));
      if (selectedSanctions.length > 0) params.append('sanctions', selectedSanctions.join(','));

      const response = await fetch(`/api/library/videos/search?${params}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLaw = (law: number) => {
    setSelectedLaws(prev => 
      prev.includes(law) ? prev.filter(l => l !== law) : [...prev, law]
    );
  };

  const toggleRestart = (restart: string) => {
    setSelectedRestarts(prev =>
      prev.includes(restart) ? prev.filter(r => r !== restart) : [...prev, restart]
    );
  };

  const toggleSanction = (sanction: string) => {
    setSelectedSanctions(prev =>
      prev.includes(sanction) ? prev.filter(s => s !== sanction) : [...prev, sanction]
    );
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="mx-auto max-w-screen-xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-3">Search Videos</h1>
          <p className="text-text-secondary">
            Find specific scenarios using our powerful multi-dimensional search
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by title, description..."
                className="w-full h-12 pl-12 pr-4 rounded-lg bg-dark-800 border border-dark-500 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="h-12 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-glow hover:shadow-glow-strong disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-6 mb-8 rounded-2xl bg-dark-800/50 border border-dark-600 p-6">
          {/* Laws Filter */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Filter by Law
            </h3>
            <div className="flex flex-wrap gap-2">
              {LAWS.map(law => (
                <PillChip
                  key={law}
                  active={selectedLaws.includes(law)}
                  onClick={() => toggleLaw(law)}
                >
                  Law {law}
                </PillChip>
              ))}
            </div>
          </div>

          {/* Restart Filter */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Filter by Restart
            </h3>
            <div className="flex flex-wrap gap-2">
              {RESTARTS.map(restart => (
                <PillChip
                  key={restart}
                  active={selectedRestarts.includes(restart)}
                  onClick={() => toggleRestart(restart)}
                >
                  {restart.split('_').map(w => w.charAt(0)).join('')}
                </PillChip>
              ))}
            </div>
          </div>

          {/* Sanction Filter */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Filter by Sanction
            </h3>
            <div className="flex flex-wrap gap-2">
              {SANCTIONS.map(sanction => (
                <PillChip
                  key={sanction}
                  active={selectedSanctions.includes(sanction)}
                  onClick={() => toggleSanction(sanction)}
                >
                  {sanction === 'YELLOW_CARD' && '🟨 Yellow'}
                  {sanction === 'RED_CARD' && '🟥 Red'}
                  {sanction === 'NO_CARD' && 'No Card'}
                </PillChip>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
              <p className="text-text-secondary">Searching videos...</p>
            </div>
          ) : videos.length > 0 ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary">
                  Found {videos.length} video{videos.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((video: any) => (
                  <VideoCard3D
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    thumbnailUrl={video.thumbnailUrl}
                    duration={video.duration}
                    viewCount={video.viewCount}
                    lawNumbers={video.lawNumbers}
                    sanctionType={video.sanctionType}
                    restartType={video.restartType}
                  />
                ))}
              </div>
            </>
          ) : searchQuery || selectedLaws.length > 0 || selectedRestarts.length > 0 || selectedSanctions.length > 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-text-secondary">No videos found matching your criteria</p>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-text-secondary">Use the search and filters above to find videos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
