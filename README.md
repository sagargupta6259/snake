# 🐍 Cyber Snake 2D

A modern, high-octane 2D arcade Snake game built with HTML5 Canvas, modern Vanilla CSS, and synthesized Web Audio API.

![Cyber Snake 2D](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript-blue?style=for-the-badge)

---

## ⚡ Features

- **Cyber Neon Aesthetics**: Sleek dark mode, glassmorphism HUD, dynamic outer glow, and high-DPI Retina display scaling.
- **4 Instant Color Themes**:
  - ⚡ *Cyber Neon* (Cyan & Hot Pink)
  - 💻 *Emerald Matrix* (Phosphor Green & Lime)
  - 🌆 *Synthwave 80s* (Sunset Purple & Magenta)
  - 🔥 *Crimson Inferno* (Ruby Red & Ember Orange)
- **3 Game Modes**:
  - **Classic**: Standard retro walls (walls are fatal).
  - **Portal Wrap**: Snake seamlessly warps through opposite boundaries.
  - **Obstacles**: Random neon barrier obstacles spawn as your score increases.
- **3 Difficulty Presets**: Chill, Normal, and Hyper speed.
- **Combo Multiplier System**: Chain food pickups quickly before the combo gauge drains to boost score multipliers up to 3.0x.
- **Special Power-ups**:
  - 🍎 **Normal Apple**: +10 pts with growth.
  - 🌟 **Golden Apple**: +50 pts, bonus tail growth, and sparkle bursts.
  - ❄️ **Frost Berry**: Slow-Mo time dilation for 7 seconds.
  - ⚡ **Double Star**: 2x score multiplier for 8 seconds.
- **Synthesized Audio**: Procedural Web Audio API sound effects with zero external audio assets (eating blip, golden chime arpeggio, powerup sweep, crash crunch, and combo chords).
- **Responsive Controls**:
  - Keyboard: `Arrow Keys` or `WASD` to steer, `Space`/`P` to pause, `R` to restart, `M` to mute.
  - Mobile: Touch gestures (swiping) and on-screen tactile virtual D-pad.
  - Input queueing to prevent accidental 180-degree self-collisions on rapid key presses.
- **High Score Tracking**: Automatically saved to browser `localStorage` per mode and difficulty.

---

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/sagargupta6259/snake.git
   ```
2. Open `index.html` in any modern web browser or run a simple local server:
   ```bash
   python3 -m http.server 8088
   ```
3. Navigate to `http://localhost:8088` and play!

---

## 🎮 Controls

| Action | Key / Input |
|---|---|
| Move Up / Down / Left / Right | `W` `A` `S` `D` or `Arrow Keys` / Touch Swipe / On-Screen D-pad |
| Pause / Resume | `Space` or `P` |
| Quick Restart | `R` |
| Toggle Sound | `M` or Speaker icon |

---

## 📄 License

MIT License. Free for personal and educational use.
