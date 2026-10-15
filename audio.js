// Procedural Web Audio API Sound Effects (Zero external dependencies)
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('snake_muted') === 'true';
        this.volume = 0.7; // Clear, punchy volume
        this.setupAudioUnlock();
    }

    setupAudioUnlock() {
        // Modern browsers block audio until an explicit user interaction (click/touch/key)
        const unlock = () => {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => {
                    // Audio unlocked
                }).catch(() => {});
            }
        };

        ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
            window.addEventListener(evt, unlock, { passive: true });
        });
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('snake_muted', this.isMuted.toString());
        if (!this.isMuted) {
            this.init();
            this.playClick();
        }
        return this.isMuted;
    }

    playTone(frequency, type, duration, startGain = 0.4, endGain = 0.001) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, now);

            gain.gain.setValueAtTime(startGain * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endGain), now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.warn('Audio playback error', e);
        }
    }

    playEat() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const now = this.ctx.currentTime;
            
            // Primary cheerful pop (rising sweep from 380Hz to 780Hz)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(380, now);
            osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);

            gain.gain.setValueAtTime(0.55 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);

            // Crispy harmonic chime for juicy bite feel
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(600, now);
            osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

            gain2.gain.setValueAtTime(0.35 * this.volume, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);

            osc2.start(now);
            osc2.stop(now + 0.1);
        } catch (e) {
            console.warn('Eat sound error', e);
        }
    }

    playGolden() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const now = this.ctx.currentTime + idx * 0.06;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0.45 * this.volume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.15);
            });
        } catch (e) {}
    }

    playPowerup() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(1300, now + 0.22);

            gain.gain.setValueAtTime(0.35 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    playDie() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

            gain.gain.setValueAtTime(0.55 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    playCombo(streak) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const baseFreq = 480;
            const noteOffset = Math.min(streak, 8) * 55;
            this.playTone(baseFreq + noteOffset, 'sine', 0.14, 0.4, 0.001);
        } catch (e) {}
    }

    playClick() {
        this.playTone(850, 'sine', 0.05, 0.35, 0.001);
    }
}

window.soundSystem = new SoundSystem();
