export const APP_VERSION = '1.0.0';   // was '1.0.0'

export type Release = { version: string; date: string; notes: string[] };

// Newest first.
export const CHANGELOG: Release[] = [
  {
    version: '1.0.0',
    date: 'June 2026',
    notes: [
      'First release of the Ephix Pulse mobile app',
      'Live Top 100 with search, sort (Pulse / source / rating / title) and Film/TV filters',
      'Biggest Movers (24h / 7d) and Most Anticipated',
      'My List, saved on your device',
      'Title details: trailer, where to watch, 7-day Pulse Spark, and TMDB / IMDb / Google / Share links',
      'Animated, glowing EPHIX PULSE splash and header',
    ],
  },
];
