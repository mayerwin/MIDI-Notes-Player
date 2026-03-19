# MIDI Notes Player

A beautiful web app that plays sequences of MIDI notes directly in your browser. Supports both MIDI numbers and note name notation, with 50+ instrument sounds.

**[Try it live](https://mayerwin.github.io/MIDI-Notes-Player/)**

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Flexible input** — Enter MIDI numbers (`0`–`127`), note names (`C4`, `Eb5`, `F#3`), or solfège (`do`, `ré`, `sol#`, `solb3`). Octave is optional and defaults to 4. Use any separator: commas, spaces, pipes, dashes, semicolons, or anything else.
- **50+ instruments** — Grand Piano (default), strings, brass, woodwinds, guitars, and more. Powered by SoundFont samples.
- **Real-time validation** — Each note is parsed and displayed as a token. Invalid notes are highlighted in red.
- **Adjustable tempo & duration** — Control playback speed (40–300 BPM) and note duration independently.
- **Visual playback** — See a progress bar and each note highlighted as it plays.
- **Keyboard shortcuts** — Press `Space` to play/stop, `Escape` to stop.
- **Für Elise built-in** — One-click demo with Beethoven's classic opening theme.

## Input Formats

| Format | Example |
|---|---|
| MIDI numbers | `60, 64, 67, 72` |
| Note names | `C4 E4 G4 C5` |
| Note names (no octave) | `C E G` (defaults to octave 4) |
| Solfège | `do mi sol` |
| Solfège with octave | `do4 mi4 sol4` |
| Solfège with accidentals | `solb3`, `sol#4`, `sold4` (`d` = dièse) |
| Mixed | `C4, 64, sol, 72` |
| Any separator | `60\|64\|67` or `60-64-67` or `60;64;67` |
| Accidentals | `Eb5`, `F#3`, `Db4`, `C##4`, `Bbb3` |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

This project includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages on every push to `main`.

### Setup

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the site will deploy automatically

The live URL will be: `https://<your-username>.github.io/MIDI-Notes-Player/`

## Tech Stack

- [Vite](https://vitejs.dev/) — Fast build tool
- [soundfont-player](https://github.com/danigb/soundfont-player) — SoundFont instrument playback via Web Audio API
- Vanilla JavaScript — No frameworks, just clean JS/HTML/CSS

## License

[MIT](LICENSE)
