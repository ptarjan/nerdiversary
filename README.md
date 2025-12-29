# Nerdiversary

<p align="center">
  <img src="assets/logo.svg" alt="Nerdiversary Logo" width="200">
</p>

**[Try it now!](https://paultarjan.com/nerdiversary/)**

Calculate and celebrate your nerdy anniversaries! Discover when you've lived a billion seconds, completed a Mars year, or reached other geeky milestones.

## Features

- **Planetary Years** - Celebrate birthdays on Mercury, Venus, Mars, Jupiter, Saturn, Uranus, and Neptune
- **Decimal Milestones** - 1 billion seconds, 10,000 days, 1 million minutes, and more
- **Number Bases** - Binary, octal, hex, ternary, duodecimal, and sexagesimal (Babylonian!) milestones
- **Mathematical Constants** - Mark π × 10^9 seconds, e × 10^8 seconds, φ, τ, and other mathematical milestones
- **Fibonacci & Lucas** - Fibonacci and Lucas sequence milestones in seconds, minutes, and days
- **Number Theory** - Perfect numbers, triangular numbers, palindromes, and repunits
- **Speed of Light** - Light-seconds, light-minutes, and cosmic distance milestones (Moon, Mars, Voyager 1, Proxima Centauri)
- **Pop Culture** - Hitchhiker's Guide (42), 1337 (leet)
- **Nerdy Holidays** - Pi Day (Mar 14), May the 4th, Tau Day (Jun 28) milestones

## Calendar Integration

- **Subscribe** - Auto-updating calendar feed for Google Calendar, Apple Calendar, and Outlook
- **Download** - Export all events as an .ics file
- **Individual Events** - Add single events to Google Calendar

## Live Celebrations

Leave the page open and when your next nerdiversary hits, you'll get a confetti celebration!

## PWA Support

Install Nerdiversary as an app on your phone:
- **iOS**: Open in Safari → Share → Add to Home Screen
- **Android**: Open in Chrome → Menu → Add to Home Screen

## Tech Stack

- Vanilla JavaScript (ES modules, no frameworks)
- CSS with custom properties
- Cloudflare Worker for calendar subscriptions

## Development

Simply open `index.html` in a browser. No build step required.

```bash
# Install dependencies (for testing/linting)
npm install

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Start local server
npm run serve
```

For the calendar subscription feature, deploy the worker:
```bash
cd worker
wrangler deploy
```

## License

MIT
