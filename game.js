/**
 * CYBER SNAKE 2D - Core Game Engine
 * Features: High-DPI Canvas, Input Buffering, Particle System, Combos, Powerups, Obstacles, Themes
 */

(function () {
    'use strict';

    // Game Configuration Constants
    const GRID_SIZE = 24; // 24x24 tiles
    const BASE_CANVAS_SIZE = 600;
    const TILE_SIZE = BASE_CANVAS_SIZE / GRID_SIZE; // 25px per tile

    const SPEEDS = {
        chill: 260,   // ms per tick (extra slow, very calm)
        normal: 200,  // ms per tick (classic slow & steady)
        hyper: 150    // ms per tick (moderate pacing)
    };

    const FOOD_TYPES = {
        NORMAL: { type: 'NORMAL', points: 10, color: '#ff2a5f', glow: 'rgba(255, 42, 95, 0.7)' },
        GOLDEN: { type: 'GOLDEN', points: 50, color: '#ffd700', glow: 'rgba(255, 215, 0, 0.8)', duration: 12000 },
        FREEZE: { type: 'FREEZE', points: 20, color: '#00d2ff', glow: 'rgba(0, 210, 255, 0.8)', duration: 7000 },
        DOUBLE: { type: 'DOUBLE', points: 25, color: '#b5179e', glow: 'rgba(181, 23, 158, 0.8)', duration: 8000 }
    };

    class Game {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.viewport = document.getElementById('viewport');

            // UI Elements
            this.ui = {
                score: document.getElementById('currentScore'),
                highScore: document.getElementById('highScore'),
                comboStreak: document.getElementById('comboStreak'),
                comboMultiplier: document.getElementById('comboMultiplier'),
                comboGaugeFill: document.getElementById('comboGaugeFill'),
                speedLevel: document.getElementById('speedLevel'),
                startOverlay: document.getElementById('startOverlay'),
                pauseOverlay: document.getElementById('pauseOverlay'),
                gameOverOverlay: document.getElementById('gameOverOverlay'),
                finalScore: document.getElementById('finalScore'),
                statApples: document.getElementById('statApples'),
                statMaxCombo: document.getElementById('statMaxCombo'),
                statTime: document.getElementById('statTime'),
                newRecordBadge: document.getElementById('newRecordBadge'),
                soundToggle: document.getElementById('soundToggle'),
                soundIcon: document.getElementById('soundIcon'),
                themeSelect: document.getElementById('themeSelect'),
                helpModal: document.getElementById('helpModal'),
                helpBtn: document.getElementById('helpBtn'),
                closeHelpBtn: document.getElementById('closeHelpBtn')
            };

            // Options & Settings
            this.mode = 'classic'; // 'classic', 'portal', 'obstacles'
            this.difficulty = 'normal'; // 'chill', 'normal', 'hyper'

            // Game State
            this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
            this.snake = [];
            this.direction = { x: 1, y: 0 };
            this.inputQueue = [];
            this.food = null;
            this.specialFood = null;
            this.specialFoodTimer = 0;
            this.obstacles = [];

            // Score & Combo
            this.score = 0;
            this.applesEaten = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.comboTimer = 0;
            this.comboMaxTime = 4000; // 4 seconds window
            this.startTime = 0;
            this.elapsedSeconds = 0;

            // Active Powerup Effects
            this.activeEffects = {
                freeze: 0,
                double: 0
            };

            // Visual Effects (Particles, Floating Text)
            this.particles = [];
            this.floatingTexts = [];
            this.lastFrameTime = 0;
            this.tickAccumulator = 0;

            this.setupCanvasDpi();
            this.setupEventListeners();
            this.initThemes();
            this.updateSoundUi();
            this.updateHighScoreDisplay();

            // Start Animation Loop
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        setupCanvasDpi() {
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = BASE_CANVAS_SIZE * dpr;
            this.canvas.height = BASE_CANVAS_SIZE * dpr;
            this.ctx.scale(dpr, dpr);
        }

        getHighScoreKey() {
            return `snake_hs_${this.mode}_${this.difficulty}`;
        }

        getHighScore() {
            return parseInt(localStorage.getItem(this.getHighScoreKey()) || '0', 10);
        }

        saveHighScore(newScore) {
            const current = this.getHighScore();
            if (newScore > current) {
                localStorage.setItem(this.getHighScoreKey(), newScore.toString());
                return true;
            }
            return false;
        }

        updateHighScoreDisplay() {
            this.ui.highScore.textContent = this.getHighScore();
        }

        resetGame() {
            const startX = 6;
            const startY = 12;
            this.snake = [
                { x: startX, y: startY },
                { x: startX - 1, y: startY },
                { x: startX - 2, y: startY }
            ];
            this.direction = { x: 1, y: 0 };
            this.inputQueue = [];
            this.score = 0;
            this.applesEaten = 0;
            this.combo = 0;
            this.maxCombo = 0;
            this.comboTimer = 0;
            this.activeEffects = { freeze: 0, double: 0 };
            this.particles = [];
            this.floatingTexts = [];
            this.obstacles = [];
            this.specialFood = null;
            this.startTime = Date.now();
            this.elapsedSeconds = 0;
            this.tickAccumulator = 0;

            this.updateHud();
            this.spawnFood();
        }

        startGame() {
            window.soundSystem.playClick();
            this.resetGame();
            this.state = 'PLAYING';
            this.ui.startOverlay.classList.add('hidden');
            this.ui.gameOverOverlay.classList.add('hidden');
            this.ui.pauseOverlay.classList.add('hidden');
            this.updateHighScoreDisplay();
        }

        pauseGame() {
            if (this.state === 'PLAYING') {
                this.state = 'PAUSED';
                window.soundSystem.playClick();
                this.ui.pauseOverlay.classList.remove('hidden');
            } else if (this.state === 'PAUSED') {
                this.resumeGame();
            }
        }

        resumeGame() {
            if (this.state === 'PAUSED') {
                this.state = 'PLAYING';
                window.soundSystem.playClick();
                this.ui.pauseOverlay.classList.add('hidden');
            }
        }

        gameOver() {
            this.state = 'GAMEOVER';
            window.soundSystem.playDie();
            this.triggerScreenShake();

            // Create blast particles at snake head
            if (this.snake.length > 0) {
                const head = this.snake[0];
                this.createExplosion(
                    head.x * TILE_SIZE + TILE_SIZE / 2,
                    head.y * TILE_SIZE + TILE_SIZE / 2,
                    '#ff0055',
                    40
                );
            }

            const isNewHs = this.saveHighScore(this.score);
            this.ui.newRecordBadge.classList.toggle('hidden', !isNewHs);
            this.ui.finalScore.textContent = this.score;
            this.ui.statApples.textContent = this.applesEaten;
            this.ui.statMaxCombo.textContent = this.maxCombo;
            this.ui.statTime.textContent = `${Math.floor((Date.now() - this.startTime) / 1000)}s`;

            this.updateHighScoreDisplay();

            setTimeout(() => {
                this.ui.gameOverOverlay.classList.remove('hidden');
            }, 350);
        }

        triggerScreenShake() {
            this.viewport.classList.remove('hit-shake');
            void this.viewport.offsetWidth; // trigger reflow
            this.viewport.classList.add('hit-shake');
        }

        // ================= INPUT HANDLING =================
        queueDirection(x, y) {
            if (this.state !== 'PLAYING') return;

            // Get the last planned direction (either from queue or current)
            const lastDir = this.inputQueue.length > 0
                ? this.inputQueue[this.inputQueue.length - 1]
                : this.direction;

            // Prevent reversing direction directly
            if (x === -lastDir.x && y === -lastDir.y) return;
            if (x === lastDir.x && y === lastDir.y) return;

            if (this.inputQueue.length < 3) {
                this.inputQueue.push({ x, y });
            }
        }

        setupEventListeners() {
            // Keyboard Controls
            window.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                        e.preventDefault();
                        this.queueDirection(0, -1);
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        e.preventDefault();
                        this.queueDirection(0, 1);
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        e.preventDefault();
                        this.queueDirection(-1, 0);
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        e.preventDefault();
                        this.queueDirection(1, 0);
                        break;
                    case ' ':
                    case 'p':
                    case 'P':
                        e.preventDefault();
                        this.pauseGame();
                        break;
                    case 'r':
                    case 'R':
                        if (this.state === 'PLAYING' || this.state === 'GAMEOVER') {
                            this.startGame();
                        }
                        break;
                    case 'm':
                    case 'M':
                        this.toggleSound();
                        break;
                }
            });

            // Virtual D-pad for mobile
            const setupTouchBtn = (id, x, y) => {
                const el = document.getElementById(id);
                if (!el) return;
                const handler = (e) => {
                    e.preventDefault();
                    if (this.state === 'PLAYING') {
                        this.queueDirection(x, y);
                    }
                };
                el.addEventListener('touchstart', handler, { passive: false });
                el.addEventListener('mousedown', handler);
            };

            setupTouchBtn('dpadUp', 0, -1);
            setupTouchBtn('dpadDown', 0, 1);
            setupTouchBtn('dpadLeft', -1, 0);
            setupTouchBtn('dpadRight', 1, 0);

            // Swipe Gestures on Canvas
            let touchStartX = 0;
            let touchStartY = 0;
            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            this.canvas.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 0 || this.state !== 'PLAYING') return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                if (Math.max(absDx, absDy) > 25) {
                    if (absDx > absDy) {
                        this.queueDirection(dx > 0 ? 1 : -1, 0);
                    } else {
                        this.queueDirection(0, dy > 0 ? 1 : -1);
                    }
                }
            }, { passive: true });

            // Button Event Listeners
            document.getElementById('startBtn').addEventListener('click', () => this.startGame());
            document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
            document.getElementById('restartFromPauseBtn').addEventListener('click', () => this.startGame());
            document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());

            // Mode Selector
            const modeButtons = document.querySelectorAll('#modeSelector .pill-btn');
            modeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    modeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.mode = btn.dataset.mode;
                    this.updateHighScoreDisplay();
                    window.soundSystem.playClick();
                });
            });

            // Difficulty Selector
            const diffButtons = document.querySelectorAll('#diffSelector .pill-btn');
            diffButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    diffButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.difficulty = btn.dataset.diff;
                    this.updateHighScoreDisplay();
                    window.soundSystem.playClick();
                });
            });

            // Theme Selector
            this.ui.themeSelect.addEventListener('change', (e) => {
                document.body.setAttribute('data-theme', e.target.value);
                localStorage.setItem('snake_theme', e.target.value);
                window.soundSystem.playClick();
            });

            // Sound Toggle
            this.ui.soundToggle.addEventListener('click', () => {
                this.toggleSound();
            });

            // Help Modal
            this.ui.helpBtn.addEventListener('click', () => {
                if (typeof this.ui.helpModal.showModal === 'function') {
                    this.ui.helpModal.showModal();
                } else {
                    this.ui.helpModal.setAttribute('open', '');
                }
            });

            this.ui.closeHelpBtn.addEventListener('click', () => {
                if (typeof this.ui.helpModal.close === 'function') {
                    this.ui.helpModal.close();
                } else {
                    this.ui.helpModal.removeAttribute('open');
                }
            });
        }

        initThemes() {
            const savedTheme = localStorage.getItem('snake_theme') || 'cyber';
            document.body.setAttribute('data-theme', savedTheme);
            this.ui.themeSelect.value = savedTheme;
        }

        toggleSound() {
            const isMuted = window.soundSystem.toggleMute();
            this.updateSoundUi();
        }

        updateSoundUi() {
            const isMuted = window.soundSystem.isMuted;
            this.ui.soundIcon.textContent = isMuted ? '🔇' : '🔊';
            this.ui.soundToggle.title = isMuted ? 'Unmute (M)' : 'Mute (M)';
        }

        // ================= SPAWNING ITEMS =================
        getRandomEmptyTile() {
            const occupied = new Set();
            this.snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));
            this.obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`));
            if (this.food) occupied.add(`${this.food.x},${this.food.y}`);
            if (this.specialFood) occupied.add(`${this.specialFood.x},${this.specialFood.y}`);

            const emptyTiles = [];
            for (let x = 1; x < GRID_SIZE - 1; x++) {
                for (let y = 1; y < GRID_SIZE - 1; y++) {
                    if (!occupied.has(`${x},${y}`)) {
                        emptyTiles.push({ x, y });
                    }
                }
            }

            if (emptyTiles.length === 0) return { x: 0, y: 0 };
            return emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        }

        spawnFood() {
            const pos = this.getRandomEmptyTile();
            this.food = {
                ...FOOD_TYPES.NORMAL,
                x: pos.x,
                y: pos.y,
                pulse: 0
            };

            // Chance to spawn special power-up food
            if (!this.specialFood && Math.random() < 0.28) {
                this.spawnSpecialFood();
            }

            // In obstacles mode, spawn obstacle occasionally
            if (this.mode === 'obstacles' && this.applesEaten > 0 && this.applesEaten % 4 === 0) {
                this.spawnObstacle();
            }
        }

        spawnSpecialFood() {
            const roll = Math.random();
            let type = FOOD_TYPES.GOLDEN;
            if (roll < 0.4) {
                type = FOOD_TYPES.GOLDEN;
            } else if (roll < 0.7) {
                type = FOOD_TYPES.FREEZE;
            } else {
                type = FOOD_TYPES.DOUBLE;
            }

            const pos = this.getRandomEmptyTile();
            this.specialFood = {
                ...type,
                x: pos.x,
                y: pos.y,
                timer: type.duration || 10000,
                maxTimer: type.duration || 10000,
                pulse: 0
            };
        }

        spawnObstacle() {
            const pos = this.getRandomEmptyTile();
            // Ensure not right in front of snake
            const head = this.snake[0];
            if (Math.abs(pos.x - head.x) < 2 && Math.abs(pos.y - head.y) < 2) return;

            this.obstacles.push(pos);
            this.createExplosion(
                pos.x * TILE_SIZE + TILE_SIZE / 2,
                pos.y * TILE_SIZE + TILE_SIZE / 2,
                '#ff5500',
                12
            );
        }

        // ================= GAME LOGIC STEP =================
        getCurrentTickInterval() {
            let interval = SPEEDS[this.difficulty] || 200;
            // Freeze slows down speed by 40%
            if (this.activeEffects.freeze > 0) {
                interval *= 1.45;
            }
            return interval;
        }

        tick() {
            if (this.state !== 'PLAYING') return;

            // Apply queued direction
            if (this.inputQueue.length > 0) {
                this.direction = this.inputQueue.shift();
            }

            const head = this.snake[0];
            let newX = head.x + this.direction.x;
            let newY = head.y + this.direction.y;

            // Wall Collision Handling
            if (this.mode === 'portal') {
                // Wrap around walls
                if (newX < 0) newX = GRID_SIZE - 1;
                if (newX >= GRID_SIZE) newX = 0;
                if (newY < 0) newY = GRID_SIZE - 1;
                if (newY >= GRID_SIZE) newY = 0;
            } else {
                // Classic & Obstacles: Walls are fatal
                if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
                    this.gameOver();
                    return;
                }
            }

            // Self Collision Check
            for (let i = 0; i < this.snake.length - 1; i++) {
                if (this.snake[i].x === newX && this.snake[i].y === newY) {
                    this.gameOver();
                    return;
                }
            }

            // Obstacle Collision Check
            if (this.mode === 'obstacles') {
                for (const obs of this.obstacles) {
                    if (obs.x === newX && obs.y === newY) {
                        this.gameOver();
                        return;
                    }
                }
            }

            const newHead = { x: newX, y: newY };
            this.snake.unshift(newHead);

            let ateFood = false;

            // Check Normal Food Collision
            if (this.food && newX === this.food.x && newY === this.food.y) {
                this.consumeFood(this.food);
                this.spawnFood();
                ateFood = true;
            }

            // Check Special Food Collision
            if (this.specialFood && newX === this.specialFood.x && newY === this.specialFood.y) {
                this.consumeSpecialFood(this.specialFood);
                this.specialFood = null;
                ateFood = true;
            }

            // If no food was eaten, drop the tail segment
            if (!ateFood) {
                this.snake.pop();
            }
        }

        consumeFood(food) {
            this.applesEaten++;
            this.combo++;
            this.comboTimer = this.comboMaxTime;
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }

            // Calculate multiplier
            let multiplier = 1 + Math.min(this.combo * 0.2, 3.0);
            if (this.activeEffects.double > 0) {
                multiplier *= 2;
            }

            const earned = Math.round(food.points * multiplier);
            this.score += earned;

            // Audio & FX
            window.soundSystem.playEat();
            if (this.combo > 1) {
                window.soundSystem.playCombo(this.combo);
            }

            this.createExplosion(
                food.x * TILE_SIZE + TILE_SIZE / 2,
                food.y * TILE_SIZE + TILE_SIZE / 2,
                food.color,
                16
            );

            this.addFloatingText(
                `+${earned}`,
                food.x * TILE_SIZE + TILE_SIZE / 2,
                food.y * TILE_SIZE,
                food.color
            );

            this.updateHud();
        }

        consumeSpecialFood(food) {
            this.applesEaten++;
            let earned = food.points;
            if (this.activeEffects.double > 0) earned *= 2;
            this.score += earned;

            if (food.type === 'GOLDEN') {
                window.soundSystem.playGolden();
                this.addFloatingText(`+${earned} GOLD!`, food.x * TILE_SIZE, food.y * TILE_SIZE, '#ffd700');
                // Grow extra segments
                this.snake.push({ ...this.snake[this.snake.length - 1] });
            } else if (food.type === 'FREEZE') {
                window.soundSystem.playPowerup();
                this.activeEffects.freeze = 6000;
                this.addFloatingText(`❄ SLOW-MO!`, food.x * TILE_SIZE, food.y * TILE_SIZE, '#00d2ff');
            } else if (food.type === 'DOUBLE') {
                window.soundSystem.playPowerup();
                this.activeEffects.double = 8000;
                this.addFloatingText(`⚡ 2X POINTS!`, food.x * TILE_SIZE, food.y * TILE_SIZE, '#b5179e');
            }

            this.createExplosion(
                food.x * TILE_SIZE + TILE_SIZE / 2,
                food.y * TILE_SIZE + TILE_SIZE / 2,
                food.color,
                24
            );

            this.updateHud();
        }

        // ================= PARTICLES & FX =================
        createExplosion(x, y, color, count = 16) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.2 + Math.random() * 3.5;
                this.particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 2.5 + Math.random() * 3.5,
                    color: color,
                    alpha: 1,
                    decay: 0.02 + Math.random() * 0.03
                });
            }
        }

        addFloatingText(text, x, y, color = '#fff') {
            this.floatingTexts.push({
                text,
                x,
                y,
                vy: -0.9,
                alpha: 1,
                color
            });
        }

        updateHud() {
            this.ui.score.textContent = this.score;
            this.ui.comboStreak.textContent = this.combo;
            
            let mult = (1 + Math.min(this.combo * 0.2, 3.0));
            if (this.activeEffects.double > 0) mult *= 2;
            this.ui.comboMultiplier.textContent = `x${mult.toFixed(1)}`;

            // Level computation based on score
            const level = Math.floor(this.score / 100) + 1;
            this.ui.speedLevel.textContent = level;
        }

        // ================= MAIN RENDER & GAME LOOP =================
        gameLoop(timestamp) {
            if (!this.lastFrameTime) this.lastFrameTime = timestamp;
            const dt = Math.min(timestamp - this.lastFrameTime, 120);
            this.lastFrameTime = timestamp;

            // Handle Timing & Subsystems
            if (this.state === 'PLAYING') {
                this.tickAccumulator += dt;
                const tickInterval = this.getCurrentTickInterval();

                if (this.tickAccumulator >= tickInterval) {
                    this.tick();
                    this.tickAccumulator = Math.min(this.tickAccumulator - tickInterval, tickInterval * 0.5);
                }

                // Combo Timer Countdown
                if (this.comboTimer > 0) {
                    this.comboTimer -= dt;
                    if (this.comboTimer <= 0) {
                        this.combo = 0;
                        this.comboTimer = 0;
                        this.updateHud();
                    }
                }
                const gaugePercent = (this.comboTimer / this.comboMaxTime) * 100;
                this.ui.comboGaugeFill.style.width = `${Math.max(0, gaugePercent)}%`;

                // Powerup Timers
                if (this.activeEffects.freeze > 0) {
                    this.activeEffects.freeze -= dt;
                }
                if (this.activeEffects.double > 0) {
                    this.activeEffects.double -= dt;
                }

                // Special Food Timer
                if (this.specialFood) {
                    this.specialFood.timer -= dt;
                    if (this.specialFood.timer <= 0) {
                        this.createExplosion(
                            this.specialFood.x * TILE_SIZE + TILE_SIZE / 2,
                            this.specialFood.y * TILE_SIZE + TILE_SIZE / 2,
                            '#888',
                            8
                        );
                        this.specialFood = null;
                    }
                }
            }

            // Update & Render Frame
            this.render();

            requestAnimationFrame(this.gameLoop.bind(this));
        }

        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, BASE_CANVAS_SIZE, BASE_CANVAS_SIZE);

            // Draw subtle cyber grid
            this.drawGrid(ctx);

            // Draw Obstacles
            this.drawObstacles(ctx);

            // Draw Food Items
            this.drawFood(ctx);

            // Draw Snake
            this.drawSnake(ctx);

            // Draw Dynamic Particle Bursts
            this.drawParticles(ctx);

            // Draw Floating Score Indicators
            this.drawFloatingTexts(ctx);
        }

        drawGrid(ctx) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;

            for (let i = 0; i <= GRID_SIZE; i++) {
                const pos = i * TILE_SIZE;
                ctx.beginPath();
                ctx.moveTo(pos, 0);
                ctx.lineTo(pos, BASE_CANVAS_SIZE);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, pos);
                ctx.lineTo(BASE_CANVAS_SIZE, pos);
                ctx.stroke();
            }

            // Border glow
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, BASE_CANVAS_SIZE, BASE_CANVAS_SIZE);

            ctx.restore();
        }

        drawObstacles(ctx) {
            ctx.save();
            this.obstacles.forEach(obs => {
                const x = obs.x * TILE_SIZE;
                const y = obs.y * TILE_SIZE;

                ctx.shadowColor = '#ff3b30';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ff3b30';

                // Neon barrier with cross pattern
                this.drawRoundedRect(ctx, x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
                ctx.fill();

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x + 6, y + 6);
                ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
                ctx.moveTo(x + TILE_SIZE - 6, y + 6);
                ctx.lineTo(x + 6, y + TILE_SIZE - 6);
                ctx.stroke();
            });
            ctx.restore();
        }

        drawFood(ctx) {
            const time = performance.now() * 0.005;

            // Normal Food
            if (this.food) {
                const x = this.food.x * TILE_SIZE;
                const y = this.food.y * TILE_SIZE;
                const pulse = Math.sin(time * 3) * 1.5;

                ctx.save();
                ctx.shadowColor = this.food.glow;
                ctx.shadowBlur = 14 + pulse * 2;
                ctx.fillStyle = this.food.color;

                const radius = (TILE_SIZE / 2 - 3) + pulse;
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, radius, 0, Math.PI * 2);
                ctx.fill();

                // Leaf stem
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(x + TILE_SIZE / 2 - 1, y + 3, 2, 4);

                // Gloss specular highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2 - 3, y + TILE_SIZE / 2 - 3, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            // Special Food
            if (this.specialFood) {
                const x = this.specialFood.x * TILE_SIZE;
                const y = this.specialFood.y * TILE_SIZE;
                const pulse = Math.sin(time * 6) * 2;

                ctx.save();
                ctx.shadowColor = this.specialFood.glow;
                ctx.shadowBlur = 20 + pulse * 4;
                ctx.fillStyle = this.specialFood.color;

                const cx = x + TILE_SIZE / 2;
                const cy = y + TILE_SIZE / 2;
                const radius = (TILE_SIZE / 2 - 2) + pulse;

                if (this.specialFood.type === 'GOLDEN') {
                    // Star/Sparkle polygon
                    this.drawStar(ctx, cx, cy, 5, radius + 2, radius / 2);
                    ctx.fill();
                } else if (this.specialFood.type === 'FREEZE') {
                    // Diamond Ice crystal
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - radius);
                    ctx.lineTo(cx + radius, cy);
                    ctx.lineTo(cx, cy + radius);
                    ctx.lineTo(cx - radius, cy);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Double multiplier ring
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Lifespan Ring
                const remainingRatio = this.specialFood.timer / this.specialFood.maxTimer;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainingRatio);
                ctx.stroke();

                ctx.restore();
            }
        }

        drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
            let rot = (Math.PI / 2) * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
        }

        drawSnake(ctx) {
            if (this.snake.length === 0) return;

            const style = getComputedStyle(document.body);
            const headColor = style.getPropertyValue('--snake-head').trim() || '#00f3ff';
            const bodyStart = style.getPropertyValue('--snake-body-start').trim() || '#00d2ff';
            const bodyEnd = style.getPropertyValue('--snake-body-end').trim() || '#7928ca';

            ctx.save();

            // Connect segments with smooth line join or pill capsules
            for (let i = this.snake.length - 1; i >= 0; i--) {
                const seg = this.snake[i];
                const x = seg.x * TILE_SIZE;
                const y = seg.y * TILE_SIZE;
                const isHead = i === 0;

                // Color interpolation along length
                const t = i / Math.max(1, this.snake.length - 1);
                const segColor = isHead ? headColor : this.interpolateColor(bodyStart, bodyEnd, t);

                ctx.shadowColor = isHead ? headColor : segColor;
                ctx.shadowBlur = isHead ? 16 : 6;
                ctx.fillStyle = segColor;

                // Scale tail segments slightly down for organic look
                const shrink = isHead ? 1 : Math.max(0.65, 1 - (t * 0.3));
                const pad = (TILE_SIZE * (1 - shrink)) / 2;
                const size = TILE_SIZE * shrink;

                this.drawRoundedRect(
                    ctx,
                    x + pad + 1.5,
                    y + pad + 1.5,
                    size - 3,
                    size - 3,
                    isHead ? 8 : 6
                );
                ctx.fill();

                // Draw cute animated eyes on head
                if (isHead) {
                    this.drawEyes(ctx, x, y, this.direction);
                }
            }

            ctx.restore();
        }

        drawEyes(ctx, x, y, dir) {
            const eyeSize = 3.5;
            const pupilSize = 1.8;
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;

            let eye1X, eye1Y, eye2X, eye2Y;
            let pOffsetX = dir.x * 1.2;
            let pOffsetY = dir.y * 1.2;

            if (dir.x === 1) { // Right
                eye1X = x + TILE_SIZE - 7; eye1Y = y + 6;
                eye2X = x + TILE_SIZE - 7; eye2Y = y + TILE_SIZE - 6;
            } else if (dir.x === -1) { // Left
                eye1X = x + 7; eye1Y = y + 6;
                eye2X = x + 7; eye2Y = y + TILE_SIZE - 6;
            } else if (dir.y === -1) { // Up
                eye1X = x + 6; eye1Y = y + 7;
                eye2X = x + TILE_SIZE - 6; eye2Y = y + 7;
            } else { // Down
                eye1X = x + 6; eye1Y = y + TILE_SIZE - 7;
                eye2X = x + TILE_SIZE - 6; eye2Y = y + TILE_SIZE - 7;
            }

            // Eye Whites
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#05070f';
            ctx.beginPath();
            ctx.arc(eye1X + pOffsetX, eye1Y + pOffsetY, pupilSize, 0, Math.PI * 2);
            ctx.arc(eye2X + pOffsetX, eye2Y + pOffsetY, pupilSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        drawRoundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        interpolateColor(color1, color2, factor) {
            const hexToRgb = (hex) => {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                const num = parseInt(hex, 16);
                return [num >> 16, (num >> 8) & 255, num & 255];
            };

            const rgb1 = hexToRgb(color1);
            const rgb2 = hexToRgb(color2);

            const r = Math.round(rgb1[0] + factor * (rgb2[0] - rgb1[0]));
            const g = Math.round(rgb1[1] + factor * (rgb2[1] - rgb1[1]));
            const b = Math.round(rgb1[2] + factor * (rgb2[2] - rgb1[2]));

            return `rgb(${r}, ${g}, ${b})`;
        }

        drawParticles(ctx) {
            ctx.save();
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        drawFloatingTexts(ctx) {
            ctx.save();
            ctx.font = 'bold 15px "Orbitron", monospace';
            ctx.textAlign = 'center';

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= 0.022;

                if (ft.alpha <= 0) {
                    this.floatingTexts.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = ft.alpha;
                ctx.fillStyle = ft.color;
                ctx.shadowColor = ft.color;
                ctx.shadowBlur = 8;
                ctx.fillText(ft.text, ft.x, ft.y);
            }
            ctx.restore();
        }
    }

    // Initialize Game on Window Load
    window.addEventListener('DOMContentLoaded', () => {
        window.gameInstance = new Game();
    });
})();
