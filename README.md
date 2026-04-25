# 🎵 Virtuoso Studio

A premium, zero-latency web-based musical instrument featuring **Piano** and **Trumpet** modes with real-time recording and playback.

![Virtuoso Studio](https://img.shields.io/badge/Status-Ready-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **Zero-Latency Playback** — Audio buffers pre-loaded into RAM via Tone.js with `interactive` latency hint
- **Dual Instrument Engine** — Instant switching between Salamander Grand Piano (samples) and FM-synthesized Trumpet
- **Recording Module** — Internal audio capture (not microphone) with a strict 90-second limit
- **Premium Dark UI** — Glassmorphism keyboard with smooth animations and visual feedback
- **Keyboard Mapping** — Physical keyboard support with anti-repeat protection
- **Touch Support** — Fully functional on mobile devices
- **Responsive Design** — Adapts from desktop to mobile

## 🎹 Keyboard Shortcuts

| Key | Note |
|:---:|:----:|
| A | C4 |
| S | D4 |
| D | E4 |
| F | F4 |
| G | G4 |
| H | A4 |
| J | B4 |
| K | C5 |

## 🚀 Getting Started

### Prerequisites
- A modern web browser with WebAudio support (Chrome, Firefox, Edge, Safari 14.1+)
- A local HTTP server (browsers block audio files loaded via `file://`)

### Local Hosting

**Option 1: Python (built-in)**
```bash
cd musical-instrument
python -m http.server 8080
# Open http://localhost:8080
```

**Option 2: Node.js (npx)**
```bash
cd musical-instrument
npx serve .
# Open the URL shown in terminal
```

**Option 3: VS Code Live Server**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

## 🌐 Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all project files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Virtuoso Studio"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/virtuoso-studio.git
   git push -u origin main
   ```
3. Go to **Settings → Pages**
4. Under "Source", select **Deploy from a branch**
5. Choose **main** branch, **/ (root)** folder
6. Click **Save**
7. Your app will be live at `https://YOUR_USERNAME.github.io/virtuoso-studio/`

## 🏗️ Technical Architecture

### Audio Engine
- **Piano**: `Tone.Sampler` loading Salamander Grand Piano samples from `tonejs.github.io/audio/salamander/`
- **Trumpet**: `Tone.FMSynth` with sawtooth carrier, square modulator, vibrato LFO, and convolution reverb
- **Recording**: `Tone.Recorder` connected to `Tone.Destination` for internal stream capture

### File Structure
```
musical-instrument/
├── index.html      # App structure, splash screen, keyboard layout
├── style.css       # Design system (dark mode, glassmorphism, animations)
├── script.js       # Audio engine, keyboard mapping, recording logic
└── README.md       # This file
```

## ⚠️ Known Limitations

1. **MediaRecorder Support**: Recording uses the browser's `MediaRecorder` API. Output format is `.webm` (Opus codec). Safari may require a polyfill.
2. **Sample Loading**: Piano samples (~2MB total) are loaded from a CDN on first launch. Initial load time depends on network speed.
3. **FM Synthesis**: The trumpet uses synthesis rather than real samples — the timbre is approximated, not recorded from a real instrument.

## 📄 License

MIT License — free for personal and commercial use.
