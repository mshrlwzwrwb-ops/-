import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlayerStats,
  Projectile,
  Enemy,
  Particle,
  ExpGem,
  FloatingText,
  ShipId,
  UpgradeId,
  UpgradeCardDef,
} from './types';
import { SHIPS, UPGRADES } from './constants';
import { sound } from './sound';
import confetti from 'canvas-confetti';
import {
  Zap,
  Layers,
  Crosshair,
  Shield,
  Flame,
  Heart,
  Magnet,
  Wind,
  Sparkles,
  Radio,
  Trophy,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Target,
  Pause,
} from 'lucide-react';

interface GameCanvasProps {
  selectedShip: ShipId;
  onBackToShipSelect: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  selectedShip,
  onBackToShipSelect,
  isMuted,
  onToggleMute,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game states
  const [gameState, setGameState] = useState<'playing' | 'levelUp' | 'paused' | 'gameOver'>('playing');
  const [levelUpChoices, setLevelUpChoices] = useState<UpgradeCardDef[]>([]);
  const [bossActive, setBossActive] = useState<{ hp: number; maxHp: number; name: string } | null>(null);
  const [autoAim, setAutoAim] = useState<boolean>(true);
  const [autoFire, setAutoFire] = useState<boolean>(true);

  // HUD stats mirror for React UI
  const [hudStats, setHudStats] = useState({
    hp: 100,
    maxHp: 100,
    score: 0,
    level: 1,
    exp: 0,
    expToNext: 100,
    kills: 0,
    time: 0,
  });

  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('galaxy_high_score') || 0);
  });

  // Game loop internal references (to avoid re-renders during 60 FPS)
  const playerRef = useRef<PlayerStats>({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 18,
    angle: 0,
    hp: 100,
    maxHp: 100,
    speed: 5,
    level: 1,
    exp: 0,
    expToNext: 80,
    shipId: selectedShip,
    upgrades: {
      multiShot: 0,
      fireRate: 0,
      homingMissile: 0,
      orbitalShield: 0,
      laserBeam: 0,
      maxHp: 0,
      magnet: 0,
      moveSpeed: 0,
      critChance: 0,
      droneCompanion: 0,
    },
    critChance: 0.1,
    magnetRange: 120,
    lastShotTime: 0,
    invincibleTimer: 0,
    score: 0,
    kills: 0,
    damageDealt: 0,
    timeSurvived: 0,
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const gemsRef = useRef<ExpGem[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<{ x: number; y: number; size: number; speed: number; alpha: number }[]>([]);

  // Input states
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number; y: number; isDown: boolean }>({ x: 400, y: 300, isDown: false });
  const touchJoyRef = useRef<{ active: boolean; startX: number; startY: number; currX: number; currY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0,
  });

  // Game timing
  const lastTimeRef = useRef<number>(performance.now());
  const enemySpawnTimerRef = useRef<number>(0);
  const missileTimerRef = useRef<number>(0);
  const droneTimerRef = useRef<number>(0);
  const orbitalAngleRef = useRef<number>(0);
  const bossTimerRef = useRef<number>(0);
  const shakeTimerRef = useRef<number>(0);
  const shakeIntensityRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Initialize player based on chosen ship
  const initGame = useCallback(() => {
    const shipDef = SHIPS.find((s) => s.id === selectedShip) || SHIPS[0];
    const initialUpgrades: Record<UpgradeId, number> = {
      multiShot: 0,
      fireRate: 0,
      homingMissile: 0,
      orbitalShield: 0,
      laserBeam: 0,
      maxHp: 0,
      magnet: 0,
      moveSpeed: 0,
      critChance: 0,
      droneCompanion: 0,
    };

    if (selectedShip === 'titan') {
      initialUpgrades.orbitalShield = 1;
    } else if (selectedShip === 'spectre') {
      initialUpgrades.homingMissile = 1;
      initialUpgrades.critChance = 1;
    }

    playerRef.current = {
      x: window.innerWidth > 768 ? window.innerWidth / 2 : 300,
      y: window.innerHeight > 600 ? window.innerHeight / 2 : 300,
      vx: 0,
      vy: 0,
      radius: 18,
      angle: -Math.PI / 2,
      hp: shipDef.maxHp,
      maxHp: shipDef.maxHp,
      speed: shipDef.speed,
      level: 1,
      exp: 0,
      expToNext: 80,
      shipId: selectedShip,
      upgrades: initialUpgrades,
      critChance: selectedShip === 'spectre' ? 0.35 : 0.1,
      magnetRange: 130,
      lastShotTime: 0,
      invincibleTimer: 60, // brief start invincibility
      score: 0,
      kills: 0,
      damageDealt: 0,
      timeSurvived: 0,
    };

    projectilesRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    gemsRef.current = [];
    floatingTextsRef.current = [];
    bossTimerRef.current = 0;
    setBossActive(null);
    setGameState('playing');
  }, [selectedShip]);

  // Init stars for background
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    starsRef.current = stars;
  }, []);

  // Set sound mute sync
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Initialize Game on Mount / Ship change
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Trigger level-up cards
  const triggerLevelUp = (newLevel: number) => {
    sound.playLevelUp();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    // Pick 3 random upgrades that are not maxed out
    const available = UPGRADES.filter(
      (up) => (playerRef.current.upgrades[up.id] || 0) < up.maxLevel
    );

    // Shuffle and pick 3
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    if (choices.length > 0) {
      setLevelUpChoices(choices);
      setGameState('levelUp');
    }
  };

  // Choose upgrade card
  const selectUpgrade = (upgradeId: UpgradeId) => {
    const player = playerRef.current;
    player.upgrades[upgradeId] = (player.upgrades[upgradeId] || 0) + 1;

    // Apply immediate effects
    if (upgradeId === 'maxHp') {
      player.maxHp += 35;
      player.hp = Math.min(player.maxHp, player.hp + 30);
    } else if (upgradeId === 'moveSpeed') {
      player.speed += 0.7;
    } else if (upgradeId === 'magnet') {
      player.magnetRange += 65;
    } else if (upgradeId === 'critChance') {
      player.critChance += 0.15;
    }

    sound.playPowerup();
    setGameState('playing');
  };

  // Add floating damage / notification text
  const addFloatingText = (x: number, y: number, text: string, color = '#fbbf24', isCrit = false) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      life: 40,
      maxLife: 40,
      isCrit,
    });
  };

  // Trigger screen shake
  const triggerShake = (intensity: number, duration: number) => {
    shakeIntensityRef.current = intensity;
    shakeTimerRef.current = duration;
  };

  // Particle explosion
  const createExplosion = (x: number, y: number, color: string, count = 18, speedMult = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedMult;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        life: 30 + Math.random() * 20,
        maxLife: 50,
      });
    }
  };

  // Spawn enemy
  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    const player = playerRef.current;
    const time = player.timeSurvived;

    // Determine spawn position off-screen
    let x = 0;
    let y = 0;
    const edge = Math.floor(Math.random() * 4);
    const buffer = 40;

    if (edge === 0) {
      x = Math.random() * canvasWidth;
      y = -buffer;
    } else if (edge === 1) {
      x = canvasWidth + buffer;
      y = Math.random() * canvasHeight;
    } else if (edge === 2) {
      x = Math.random() * canvasWidth;
      y = canvasHeight + buffer;
    } else {
      x = -buffer;
      y = Math.random() * canvasHeight;
    }

    // Determine type
    const rand = Math.random();
    let type: Enemy['type'] = 'scout';
    let hp = 20 + Math.floor(time * 0.8);
    let speed = 2.4 + Math.random() * 0.8;
    let radius = 13;
    let color = '#ef4444';
    let scoreVal = 100;
    let expVal = 15;

    if (time > 20 && rand < 0.28) {
      type = 'meteor';
      hp = 45 + Math.floor(time * 1.2);
      speed = 1.3 + Math.random() * 0.6;
      radius = 20;
      color = '#f97316';
      scoreVal = 200;
      expVal = 25;
    } else if (time > 40 && rand < 0.18) {
      type = 'cruiser';
      hp = 80 + Math.floor(time * 2);
      speed = 1.6;
      radius = 22;
      color = '#8b5cf6';
      scoreVal = 400;
      expVal = 45;
    }

    enemiesRef.current.push({
      id: Math.random().toString(),
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      hp,
      maxHp: hp,
      speed,
      color,
      scoreValue: scoreVal,
      expValue: expVal,
      shootCooldown: 120 + Math.random() * 60,
      lastShot: 0,
    });
  };

  // Spawn Boss Dreadnought
  const spawnBoss = (canvasWidth: number, canvasHeight: number) => {
    sound.playBossAlert();
    triggerShake(12, 45);

    const bossHp = 900 + playerRef.current.level * 250;
    const boss: Enemy = {
      id: 'boss-' + Date.now(),
      type: 'boss',
      x: canvasWidth / 2,
      y: -80,
      vx: 0,
      vy: 1.5,
      radius: 46,
      hp: bossHp,
      maxHp: bossHp,
      speed: 1.2,
      color: '#e11d48',
      scoreValue: 5000,
      expValue: 300,
      shootCooldown: 90,
      lastShot: 0,
      bossPhase: 1,
    };

    enemiesRef.current.push(boss);
    setBossActive({ hp: bossHp, maxHp: bossHp, name: 'DREADNOUGHT X-99' });
    addFloatingText(canvasWidth / 2, 80, '⚠️ אזהרה: ספינת בוס ענקית מתקרבת!', '#ef4444');
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = (currentTime: number) => {
      if (!isRunning) return;

      const delta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const width = canvas.width;
      const height = canvas.height;

      // Handle game states
      if (gameState === 'playing') {
        const player = playerRef.current;
        player.timeSurvived += delta;

        // 1. UPDATE INPUT & PLAYER MOVEMENT
        let moveX = 0;
        let moveY = 0;

        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveY -= 1;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveY += 1;
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveX -= 1;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveX += 1;

        // Touch virtual stick input
        if (touchJoyRef.current.active) {
          const dx = touchJoyRef.current.currX - touchJoyRef.current.startX;
          const dy = touchJoyRef.current.currY - touchJoyRef.current.startY;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            moveX = dx / dist;
            moveY = dy / dist;
          }
        }

        // Normalize
        if (moveX !== 0 && moveY !== 0 && !touchJoyRef.current.active) {
          moveX *= 0.7071;
          moveY *= 0.7071;
        }

        player.vx = moveX * player.speed;
        player.vy = moveY * player.speed;

        player.x += player.vx;
        player.y += player.vy;

        // Screen boundaries
        player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

        // Engine thruster particle trail
        if (moveX !== 0 || moveY !== 0) {
          particlesRef.current.push({
            x: player.x - Math.cos(player.angle) * (player.radius + 4),
            y: player.y - Math.sin(player.angle) * (player.radius + 4),
            vx: -Math.cos(player.angle) * (Math.random() * 2 + 1) + (Math.random() - 0.5),
            vy: -Math.sin(player.angle) * (Math.random() * 2 + 1) + (Math.random() - 0.5),
            color: Math.random() > 0.5 ? '#38bdf8' : '#0284c7',
            size: Math.random() * 3 + 2,
            life: 15,
            maxLife: 15,
          });
        }

        // Player Aiming
        if (autoAim && enemiesRef.current.length > 0) {
          // Auto find closest enemy
          let closestDist = Infinity;
          let targetEnemy = enemiesRef.current[0];
          for (const enemy of enemiesRef.current) {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < closestDist) {
              closestDist = dist;
              targetEnemy = enemy;
            }
          }
          if (targetEnemy) {
            const targetAngle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
            // Smooth rotation towards target
            player.angle = targetAngle;
          }
        } else {
          // Manual mouse aim
          player.angle = Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x);
        }

        if (player.invincibleTimer > 0) {
          player.invincibleTimer--;
        }

        // 2. SHOOTING LOGIC
        const shipDef = SHIPS.find((s) => s.id === player.shipId) || SHIPS[0];
        const fireRateMultiplier = 1 + (player.upgrades.fireRate || 0) * 0.25;
        const cooldown = 1000 / (shipDef.fireRate * fireRateMultiplier);

        const shouldShoot =
          autoFire ||
          mouseRef.current.isDown ||
          keysRef.current['Space'] ||
          touchJoyRef.current.active;

        if (shouldShoot && currentTime - player.lastShotTime > cooldown) {
          player.lastShotTime = currentTime;
          sound.playShoot();

          const multiLevel = player.upgrades.multiShot || 0;
          const bulletSpeed = 12;
          const isPierce = (player.upgrades.laserBeam || 0) > 0;
          const pierceCount = 1 + (player.upgrades.laserBeam || 0);

          const isCrit = Math.random() < player.critChance;
          const baseDamage = selectedShip === 'titan' ? 24 : 18;
          const finalDamage = isCrit ? Math.round(baseDamage * 2.5) : baseDamage;

          if (multiLevel === 0) {
            // Single shot
            projectilesRef.current.push({
              id: Math.random().toString(),
              x: player.x + Math.cos(player.angle) * player.radius,
              y: player.y + Math.sin(player.angle) * player.radius,
              vx: Math.cos(player.angle) * bulletSpeed,
              vy: Math.sin(player.angle) * bulletSpeed,
              radius: isPierce ? 4 : 3,
              color: isCrit ? '#fde047' : isPierce ? '#a855f7' : '#38bdf8',
              damage: finalDamage,
              pierce: pierceCount,
              isEnemy: false,
              life: 60,
              maxLife: 60,
            });
          } else {
            // Spread shot
            const count = 2 + multiLevel;
            const spreadAngle = 0.35 + multiLevel * 0.08;
            const startAngle = player.angle - spreadAngle / 2;
            const step = spreadAngle / (count - 1);

            for (let i = 0; i < count; i++) {
              const shotAngle = startAngle + step * i;
              projectilesRef.current.push({
                id: Math.random().toString(),
                x: player.x + Math.cos(shotAngle) * player.radius,
                y: player.y + Math.sin(shotAngle) * player.radius,
                vx: Math.cos(shotAngle) * bulletSpeed,
                vy: Math.sin(shotAngle) * bulletSpeed,
                radius: 3,
                color: isCrit ? '#fde047' : '#38bdf8',
                damage: finalDamage,
                pierce: pierceCount,
                isEnemy: false,
                life: 60,
                maxLife: 60,
              });
            }
          }
        }

        // 3. HOMING MISSILE LOGIC
        const missileLevel = player.upgrades.homingMissile || 0;
        if (missileLevel > 0) {
          missileTimerRef.current += delta;
          const missileCooldown = Math.max(1.2, 3.5 - missileLevel * 0.6);
          if (missileTimerRef.current >= missileCooldown && enemiesRef.current.length > 0) {
            missileTimerRef.current = 0;
            sound.playHeavyShoot();

            // Find closest enemy
            const target = enemiesRef.current[0];
            projectilesRef.current.push({
              id: 'missile-' + Math.random(),
              x: player.x,
              y: player.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              radius: 5,
              color: '#f97316',
              damage: 40 + missileLevel * 15,
              pierce: 1,
              isEnemy: false,
              isHoming: true,
              targetId: target.id,
              life: 140,
              maxLife: 140,
            });
          }
        }

        // 4. DRONE COMPANION LOGIC
        const droneLevel = player.upgrades.droneCompanion || 0;
        if (droneLevel > 0) {
          droneTimerRef.current += delta;
          if (droneTimerRef.current >= 0.45 && enemiesRef.current.length > 0) {
            droneTimerRef.current = 0;
            // Drone orbits player
            const droneAngle = player.timeSurvived * 3;
            const droneX = player.x + Math.cos(droneAngle) * 45;
            const droneY = player.y + Math.sin(droneAngle) * 45;

            // Shoot towards closest enemy
            const target = enemiesRef.current[0];
            const aimAngle = Math.atan2(target.y - droneY, target.x - droneX);
            projectilesRef.current.push({
              id: 'drone-bullet-' + Math.random(),
              x: droneX,
              y: droneY,
              vx: Math.cos(aimAngle) * 11,
              vy: Math.sin(aimAngle) * 11,
              radius: 2.5,
              color: '#a855f7',
              damage: 12 + droneLevel * 6,
              pierce: 1,
              isEnemy: false,
              life: 45,
              maxLife: 45,
            });
          }
        }

        // 5. ORBITAL SHIELD LOGIC
        const shieldLevel = player.upgrades.orbitalShield || 0;
        if (shieldLevel > 0) {
          orbitalAngleRef.current += 0.05 + shieldLevel * 0.01;
          const orbCount = 1 + shieldLevel;
          const shieldRadius = 55;

          for (let i = 0; i < orbCount; i++) {
            const angle = orbitalAngleRef.current + (i * (Math.PI * 2)) / orbCount;
            const orbX = player.x + Math.cos(angle) * shieldRadius;
            const orbY = player.y + Math.sin(angle) * shieldRadius;

            // Damage enemies touching orbs
            for (const enemy of enemiesRef.current) {
              const d = Math.hypot(enemy.x - orbX, enemy.y - orbY);
              if (d < enemy.radius + 10) {
                enemy.hp -= 2;
                createExplosion(orbX, orbY, '#38bdf8', 3);
                if (enemy.hp <= 0) {
                  sound.playExplosion(enemy.type === 'boss');
                }
              }
            }
          }
        }

        // 6. SPAWN TIMERS
        enemySpawnTimerRef.current += delta;
        const spawnInterval = Math.max(0.4, 2.2 - player.timeSurvived * 0.02);
        if (enemySpawnTimerRef.current >= spawnInterval) {
          enemySpawnTimerRef.current = 0;
          spawnEnemy(width, height);
        }

        // Boss trigger every 60 seconds
        bossTimerRef.current += delta;
        if (bossTimerRef.current >= 65) {
          bossTimerRef.current = 0;
          spawnBoss(width, height);
        }

        // 7. PROJECTILE UPDATES
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          p.life--;

          // Homing logic
          if (p.isHoming) {
            // Find target
            const target = enemiesRef.current.find((e) => e.id === p.targetId) || enemiesRef.current[0];
            if (target) {
              const targetAngle = Math.atan2(target.y - p.y, target.x - p.x);
              p.vx += Math.cos(targetAngle) * 0.8;
              p.vy += Math.sin(targetAngle) * 0.8;
              const spd = Math.hypot(p.vx, p.vy);
              if (spd > 8) {
                p.vx = (p.vx / spd) * 8;
                p.vy = (p.vy / spd) * 8;
              }
            }
            // Smoke trail
            if (Math.random() > 0.4) {
              particlesRef.current.push({
                x: p.x,
                y: p.y,
                vx: -p.vx * 0.2 + (Math.random() - 0.5),
                vy: -p.vy * 0.2 + (Math.random() - 0.5),
                color: '#fdba74',
                size: 2.5,
                life: 15,
                maxLife: 15,
              });
            }
          }

          p.x += p.vx;
          p.y += p.vy;

          // Out of bounds or dead
          if (p.life <= 0 || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
            projectilesRef.current.splice(i, 1);
            continue;
          }

          // Player projectile hitting enemy
          if (!p.isEnemy) {
            for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
              const enemy = enemiesRef.current[j];
              const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
              if (dist < enemy.radius + p.radius) {
                enemy.hp -= p.damage;
                player.damageDealt += p.damage;
                addFloatingText(enemy.x, enemy.y - 10, `${p.damage}`, p.damage > 35 ? '#fde047' : '#ffffff', p.damage > 35);
                createExplosion(p.x, p.y, p.color, 4);

                p.pierce--;
                if (p.pierce <= 0) {
                  projectilesRef.current.splice(i, 1);
                  break;
                }
              }
            }
          } else {
            // Enemy projectile hitting player
            const distToPlayer = Math.hypot(player.x - p.x, player.y - p.y);
            if (distToPlayer < player.radius + p.radius && player.invincibleTimer <= 0) {
              player.hp -= p.damage;
              player.invincibleTimer = 30;
              sound.playHit();
              triggerShake(8, 20);
              createExplosion(p.x, p.y, '#ef4444', 8);
              projectilesRef.current.splice(i, 1);
              continue;
            }
          }
        }

        // 8. ENEMY UPDATES & COLLISIONS
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];

          // Check if dead
          if (enemy.hp <= 0) {
            sound.playExplosion(enemy.type === 'boss');
            createExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 50 : 16);
            player.score += enemy.scoreValue;
            player.kills += 1;

            // Drop EXP gem
            gemsRef.current.push({
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y,
              value: enemy.expValue,
              radius: enemy.type === 'boss' ? 8 : 5,
              color: enemy.type === 'boss' ? '#fbbf24' : '#38bdf8',
            });

            // If meteor, split into 2 smaller chunks
            if (enemy.type === 'meteor' && enemy.radius >= 20) {
              for (let s = 0; s < 2; s++) {
                enemiesRef.current.push({
                  id: Math.random().toString(),
                  type: 'scout',
                  x: enemy.x + (s === 0 ? -15 : 15),
                  y: enemy.y,
                  vx: (s === 0 ? -1 : 1) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  radius: 10,
                  hp: 15,
                  maxHp: 15,
                  speed: 2.8,
                  color: '#f97316',
                  scoreValue: 70,
                  expValue: 10,
                  shootCooldown: 999,
                  lastShot: 0,
                });
              }
            }

            if (enemy.type === 'boss') {
              setBossActive(null);
              triggerShake(16, 50);
              confetti({ particleCount: 120, spread: 80 });
              // Boss drops huge golden chest/orbs
              for (let g = 0; g < 6; g++) {
                gemsRef.current.push({
                  id: 'boss-gem-' + g,
                  x: enemy.x + (Math.random() - 0.5) * 40,
                  y: enemy.y + (Math.random() - 0.5) * 40,
                  value: 80,
                  radius: 7,
                  color: '#fbbf24',
                });
              }
            }

            enemiesRef.current.splice(i, 1);
            continue;
          }

          // Enemy movement towards player
          const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);

          if (enemy.type === 'boss') {
            // Boss smoothly hovers in top half and attacks
            if (enemy.y < 120) {
              enemy.y += enemy.speed;
            } else {
              enemy.x += Math.cos(player.timeSurvived) * enemy.speed * 1.5;
            }

            // Boss firing patterns
            enemy.lastShot++;
            if (enemy.lastShot >= enemy.shootCooldown) {
              enemy.lastShot = 0;
              sound.playHeavyShoot();
              // Fire 8-way bullet ring
              for (let b = 0; b < 8; b++) {
                const ringAngle = (b * Math.PI * 2) / 8 + player.timeSurvived;
                projectilesRef.current.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(ringAngle) * 5,
                  vy: Math.sin(ringAngle) * 5,
                  radius: 4,
                  color: '#ef4444',
                  damage: 18,
                  pierce: 1,
                  isEnemy: true,
                  life: 100,
                  maxLife: 100,
                });
              }
            }

            // Update boss HUD
            setBossActive({ hp: enemy.hp, maxHp: enemy.maxHp, name: 'DREADNOUGHT X-99' });
          } else if (enemy.type === 'cruiser') {
            // Cruisers keep a distance and shoot
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (dist > 220) {
              enemy.x += Math.cos(angleToPlayer) * enemy.speed;
              enemy.y += Math.sin(angleToPlayer) * enemy.speed;
            } else {
              // Strafe
              enemy.x += Math.cos(angleToPlayer + Math.PI / 2) * enemy.speed * 0.8;
              enemy.y += Math.sin(angleToPlayer + Math.PI / 2) * enemy.speed * 0.8;
            }

            enemy.lastShot++;
            if (enemy.lastShot >= enemy.shootCooldown) {
              enemy.lastShot = 0;
              projectilesRef.current.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angleToPlayer) * 6,
                vy: Math.sin(angleToPlayer) * 6,
                radius: 3.5,
                color: '#c084fc',
                damage: 14,
                pierce: 1,
                isEnemy: true,
                life: 90,
                maxLife: 90,
              });
            }
          } else {
            // Regular enemies rush player
            enemy.x += Math.cos(angleToPlayer) * enemy.speed;
            enemy.y += Math.sin(angleToPlayer) * enemy.speed;
          }

          // Enemy touches player
          const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
          if (distToPlayer < player.radius + enemy.radius && player.invincibleTimer <= 0) {
            const touchDamage = enemy.type === 'boss' ? 30 : 15;
            player.hp -= touchDamage;
            player.invincibleTimer = 35;
            sound.playHit();
            triggerShake(10, 25);
            createExplosion(player.x, player.y, '#ef4444', 12);
          }
        }

        // 9. EXP GEMS COLLECTION
        for (let i = gemsRef.current.length - 1; i >= 0; i--) {
          const gem = gemsRef.current[i];
          const dist = Math.hypot(player.x - gem.x, player.y - gem.y);

          // Magnet suction
          if (dist < player.magnetRange) {
            const pullAngle = Math.atan2(player.y - gem.y, player.x - gem.x);
            const pullSpeed = Math.min(14, (player.magnetRange - dist) * 0.15 + 4);
            gem.x += Math.cos(pullAngle) * pullSpeed;
            gem.y += Math.sin(pullAngle) * pullSpeed;
          }

          // Player touches gem
          if (dist < player.radius + gem.radius) {
            sound.playGem();
            player.exp += gem.value;
            player.score += gem.value * 2;
            gemsRef.current.splice(i, 1);

            // Check level up
            if (player.exp >= player.expToNext) {
              player.level += 1;
              player.exp -= player.expToNext;
              player.expToNext = Math.round(player.expToNext * 1.35 + 20);
              triggerLevelUp(player.level);
            }
          }
        }

        // 10. CHECK GAME OVER
        if (player.hp <= 0) {
          sound.playGameOver();
          createExplosion(player.x, player.y, '#38bdf8', 60, 2);
          triggerShake(18, 50);

          if (player.score > highScore) {
            setHighScore(player.score);
            localStorage.setItem('galaxy_high_score', player.score.toString());
            confetti({ particleCount: 150, spread: 90 });
          }

          setGameState('gameOver');
        }

        // Sync React HUD state (throttled to smooth updates)
        setHudStats({
          hp: Math.max(0, Math.round(player.hp)),
          maxHp: player.maxHp,
          score: player.score,
          level: player.level,
          exp: player.exp,
          expToNext: player.expToNext,
          kills: player.kills,
          time: Math.floor(player.timeSurvived),
        });
      }

      // 11. RENDER PHASE (CANVAS DRAWING)
      ctx.save();

      // Screen shake effect
      if (shakeTimerRef.current > 0) {
        shakeTimerRef.current--;
        const ox = (Math.random() - 0.5) * shakeIntensityRef.current;
        const oy = (Math.random() - 0.5) * shakeIntensityRef.current;
        ctx.translate(ox, oy);
      }

      // Deep space background with cosmic nebula layers
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, width, height);

      // Drifting Cosmic Nebulas
      const time = performance.now() * 0.0003;
      const nebula1X = width * 0.3 + Math.sin(time) * 40;
      const nebula1Y = height * 0.4 + Math.cos(time * 0.8) * 30;
      const grad1 = ctx.createRadialGradient(nebula1X, nebula1Y, 20, nebula1X, nebula1Y, 260);
      grad1.addColorStop(0, 'rgba(88, 28, 135, 0.18)');
      grad1.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const nebula2X = width * 0.75 + Math.cos(time * 0.7) * 50;
      const nebula2Y = height * 0.65 + Math.sin(time * 0.9) * 40;
      const grad2 = ctx.createRadialGradient(nebula2X, nebula2Y, 20, nebula2X, nebula2Y, 300);
      grad2.addColorStop(0, 'rgba(14, 116, 144, 0.15)');
      grad2.addColorStop(0.7, 'rgba(99, 102, 241, 0.06)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Distant Stars & Parallax
      const player = playerRef.current;
      for (const star of starsRef.current) {
        star.y += star.speed;
        if (star.y > height) star.y = 0;
        star.x -= player.vx * 0.05 * star.speed;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;

        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Grid lines subtle cyber overlay
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw EXP Gems
      for (const gem of gemsRef.current) {
        ctx.fillStyle = gem.color;
        ctx.shadowColor = gem.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, gem.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.life--;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.size *= 0.96;

        if (pt.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Projectiles
      for (const p of projectilesRef.current) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Enemies
      for (const enemy of enemiesRef.current) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.type === 'boss') {
          // Boss Dreadnought
          ctx.fillStyle = '#991b1b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Rotating outer ring
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 12, player.timeSurvived * 2, player.timeSurvived * 2 + Math.PI * 1.5);
          ctx.stroke();

          // Core eye
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'cruiser') {
          // Triangular armored cruiser
          const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          ctx.rotate(angle);
          ctx.fillStyle = '#6b21a8';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.radius, 0);
          ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
          ctx.lineTo(-enemy.radius * 0.5, 0);
          ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (enemy.type === 'meteor') {
          // Rocky jagged asteroid
          ctx.rotate(player.timeSurvived * 0.8);
          ctx.fillStyle = '#78350f';
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const sides = 7;
          for (let s = 0; s < sides; s++) {
            const a = (s * Math.PI * 2) / sides;
            const r = enemy.radius * (0.8 + (s % 2) * 0.3);
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Scout drone
          const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          ctx.rotate(angle);
          ctx.fillStyle = '#dc2626';
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.radius, 0);
          ctx.lineTo(-enemy.radius, -enemy.radius * 0.7);
          ctx.lineTo(-enemy.radius * 0.4, 0);
          ctx.lineTo(-enemy.radius, enemy.radius * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Mini enemy health bar
        if (enemy.hp < enemy.maxHp && enemy.type !== 'boss') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-enemy.radius, -enemy.radius - 8, enemy.radius * 2, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(
            -enemy.radius,
            -enemy.radius - 8,
            (enemy.radius * 2 * enemy.hp) / enemy.maxHp,
            4
          );
        }

        ctx.restore();
      }

      // Draw Drone Companion
      const droneLevel = player.upgrades.droneCompanion || 0;
      if (droneLevel > 0) {
        const droneAngle = player.timeSurvived * 3;
        const droneX = player.x + Math.cos(droneAngle) * 45;
        const droneY = player.y + Math.sin(droneAngle) * 45;

        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(droneX, droneY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Orbital Plasma Shield Orbs
      const shieldLevel = player.upgrades.orbitalShield || 0;
      if (shieldLevel > 0) {
        const orbCount = 1 + shieldLevel;
        const shieldRadius = 55;
        for (let i = 0; i < orbCount; i++) {
          const angle = orbitalAngleRef.current + (i * (Math.PI * 2)) / orbCount;
          const orbX = player.x + Math.cos(angle) * shieldRadius;
          const orbY = player.y + Math.sin(angle) * shieldRadius;

          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(orbX, orbY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Player Ship
      if (gameState !== 'gameOver') {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        // Flash if invincible
        if (player.invincibleTimer % 4 < 2) {
          const ship = SHIPS.find((s) => s.id === player.shipId) || SHIPS[0];

          // Engine Thruster Flame (animated double plume)
          const flameLength = 12 + Math.random() * 8;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(-player.radius * 0.7, -4);
          ctx.lineTo(-player.radius * 0.7 - flameLength, 0);
          ctx.lineTo(-player.radius * 0.7, 4);
          ctx.closePath();
          ctx.fill();

          // Hot inner core of flame
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(-player.radius * 0.7, -2);
          ctx.lineTo(-player.radius * 0.7 - flameLength * 0.5, 0);
          ctx.lineTo(-player.radius * 0.7, 2);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // Futuristic Spaceship Vector Shape
          ctx.fillStyle = ship.color;
          ctx.strokeStyle = ship.accentColor;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(player.radius + 5, 0); // Nose tip
          ctx.lineTo(-player.radius, -player.radius * 0.85); // Left wing
          ctx.lineTo(-player.radius * 0.45, -player.radius * 0.35); // Left inner
          ctx.lineTo(-player.radius * 0.7, 0); // Engine center
          ctx.lineTo(-player.radius * 0.45, player.radius * 0.35); // Right inner
          ctx.lineTo(-player.radius, player.radius * 0.85); // Right wing
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Wingtip navigation strobe lights
          const strobe = (Date.now() % 400 < 200);
          ctx.fillStyle = strobe ? '#ef4444' : '#22c55e';
          ctx.beginPath();
          ctx.arc(-player.radius, -player.radius * 0.85, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = strobe ? '#22c55e' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(-player.radius, player.radius * 0.85, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Cockpit canopy glow
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(2, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Shield dome ring if shielded
          if ((player.upgrades.orbitalShield || 0) > 0 || player.invincibleTimer > 0) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // Draw Floating Texts (damage numbers, warnings)
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.life--;
        ft.y -= 0.8;

        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }

        const alpha = ft.life / ft.maxLife;
        ctx.font = ft.isCrit ? 'bold 16px sans-serif' : '13px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Render Virtual Touch Joystick on Mobile
      if (touchJoyRef.current.active) {
        const { startX, startY, currX, currY } = touchJoyRef.current;
        // Outer base ring
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(startX, startY, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner thumb knob
        const angle = Math.atan2(currY - startY, currX - startX);
        const dist = Math.min(45, Math.hypot(currX - startX, currY - startY));
        const knobX = startX + Math.cos(angle) * dist;
        const knobY = startY + Math.sin(angle) * dist;

        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [gameState, autoAim, autoFire, selectedShip, highScore]);

  // Window Resize & Canvas Resolution Adjuster
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height || window.innerHeight * 0.75);

      canvas.width = width;
      canvas.height = height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handleMouseDown = () => {
    mouseRef.current.isDown = true;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  // Touch Handlers for Mobile Controls
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchJoyRef.current = {
      active: true,
      startX: x,
      startY: y,
      currX: x,
      currY: y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !touchJoyRef.current.active) return;
    const touch = e.touches[0];
    touchJoyRef.current.currX = touch.clientX - rect.left;
    touchJoyRef.current.currY = touch.clientY - rect.top;
  };

  const handleTouchEnd = () => {
    touchJoyRef.current.active = false;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative flex flex-col w-full h-full select-none overflow-hidden rounded-3xl border border-stone-800 bg-stone-950 shadow-2xl">
      {/* Top Game HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/80 bg-stone-900/90 px-4 py-3 text-xs text-white backdrop-blur-md">
        {/* Left: Health & EXP */}
        <div className="flex items-center gap-4">
          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            <div className="flex flex-col">
              <div className="flex justify-between text-[11px] font-bold">
                <span>חיים:</span>
                <span>
                  {hudStats.hp} / {hudStats.maxHp}
                </span>
              </div>
              <div className="h-2.5 w-28 sm:w-36 overflow-hidden rounded-full bg-stone-800 border border-stone-700">
                <div
                  className="h-full bg-rose-500 transition-all duration-200"
                  style={{ width: `${Math.max(0, (hudStats.hp / hudStats.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Level & EXP Bar */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <div className="flex flex-col">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-amber-300">רמה {hudStats.level}</span>
                <span className="text-stone-400">
                  {hudStats.exp}/{hudStats.expToNext} EXP
                </span>
              </div>
              <div className="h-2.5 w-24 sm:w-32 overflow-hidden rounded-full bg-stone-800 border border-stone-700">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${Math.min(100, (hudStats.exp / hudStats.expToNext) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Score & Survival Time */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <span className="text-[10px] text-stone-400 block uppercase">זמן הישרדות</span>
            <span className="font-mono text-sm font-black text-amber-400">
              {formatTime(hudStats.time)}
            </span>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-stone-400 block uppercase">ניקוד</span>
            <span className="font-mono text-base font-black text-white">
              {hudStats.score.toLocaleString()}
            </span>
          </div>

          <div className="hidden sm:block text-center">
            <span className="text-[10px] text-stone-400 block uppercase">חיסולים</span>
            <span className="font-mono text-sm font-bold text-rose-400">{hudStats.kills}</span>
          </div>
        </div>

        {/* Right: Controls & Toggles */}
        <div className="flex items-center gap-2">
          {/* Auto-Aim toggle */}
          <button
            onClick={() => setAutoAim(!autoAim)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              autoAim
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
            title="כוונת אוטומטית לעבר האויב הקרוב"
          >
            <Target className="h-3.5 w-3.5" />
            <span className="hidden md:inline">כוונת אוטו': {autoAim ? 'פעילה' : 'כבויה'}</span>
          </button>

          {/* Sound Mute */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg border border-stone-800 bg-stone-800 text-stone-300 hover:bg-stone-700"
            title={isMuted ? 'הפעל צלילים' : 'השתק'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-stone-500" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
          </button>

          {/* Pause */}
          <button
            onClick={() => setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'))}
            className="p-1.5 rounded-lg border border-stone-800 bg-stone-800 text-stone-300 hover:bg-stone-700"
            title="השהה משחק"
          >
            {gameState === 'paused' ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Boss Health Bar (When Boss is Active) */}
      {bossActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-80 sm:w-96 rounded-2xl bg-stone-900/90 p-3 border border-rose-600/50 shadow-lg backdrop-blur-md">
          <div className="flex justify-between text-xs font-black text-rose-400 mb-1">
            <span>👾 {bossActive.name}</span>
            <span>
              {bossActive.hp} / {bossActive.maxHp} HP
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-stone-950 overflow-hidden border border-rose-900">
            <div
              className="h-full bg-linear-to-r from-rose-600 to-amber-500 transition-all duration-150"
              style={{ width: `${Math.max(0, (bossActive.hp / bossActive.maxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative flex-1 w-full h-[580px] sm:h-[640px] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block touch-none select-none"
        />

        {/* Level-Up Modal Overlay */}
        {gameState === 'levelUp' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-stone-900/95 p-6 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-amber-400 animate-spin" />
                <h3 className="text-2xl font-black text-white">עלית לרמה חדשה!</h3>
                <Sparkles className="h-6 w-6 text-amber-400 animate-spin" />
              </div>
              <p className="text-xs text-stone-400 mb-6">
                בחר שדרוג אחד מהרשימה כדי לחזק את הספינה שלך לקרבות הבאים:
              </p>

              <div className="space-y-3">
                {levelUpChoices.map((card) => {
                  const currentLvl = playerRef.current.upgrades[card.id] || 0;
                  return (
                    <button
                      key={card.id}
                      onClick={() => selectUpgrade(card.id)}
                      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-700 bg-stone-800/80 p-4 text-right transition-all hover:border-amber-400 hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                          {card.id === 'multiShot' && <Layers className="h-5 w-5" />}
                          {card.id === 'fireRate' && <Zap className="h-5 w-5" />}
                          {card.id === 'homingMissile' && <Crosshair className="h-5 w-5" />}
                          {card.id === 'orbitalShield' && <Shield className="h-5 w-5" />}
                          {card.id === 'laserBeam' && <Flame className="h-5 w-5" />}
                          {card.id === 'maxHp' && <Heart className="h-5 w-5" />}
                          {card.id === 'magnet' && <Magnet className="h-5 w-5" />}
                          {card.id === 'moveSpeed' && <Wind className="h-5 w-5" />}
                          {card.id === 'critChance' && <Sparkles className="h-5 w-5" />}
                          {card.id === 'droneCompanion' && <Radio className="h-5 w-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              {card.name}
                            </span>
                            <span className="rounded-md bg-stone-700 px-1.5 py-0.5 text-[10px] font-semibold text-stone-300">
                              רמה {currentLvl + 1} / {card.maxLevel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-stone-400 leading-snug">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform">
                        בחר ⬅
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-xs">
            <div className="text-center rounded-3xl border border-stone-800 bg-stone-900 p-8 shadow-2xl max-w-sm w-full mx-4">
              <h3 className="text-2xl font-black text-white mb-2">משחק מושהה</h3>
              <p className="text-xs text-stone-400 mb-6">
                לחץ להמשך הקרב או חזור לבחירת ספינה
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setGameState('playing')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-all active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  <span>המשך לשחק</span>
                </button>

                <button
                  onClick={onBackToShipSelect}
                  className="w-full rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  חזרה לתפריט ספינות
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95">
            <div className="w-full max-w-md rounded-3xl border border-rose-900/60 bg-stone-900/95 p-6 text-center shadow-2xl">
              <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/30">
                ספינת הקרב הושמדה
              </span>

              <h2 className="mt-3 text-3xl font-black text-white">המשחק הסתיים!</h2>
              <p className="text-xs text-stone-400 mt-1">שרדת בגבורה בקרב החלל</p>

              {/* Stats Grid */}
              <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-stone-950/60 p-4 border border-stone-800 text-right">
                <div>
                  <span className="text-[11px] text-stone-500 block">זמן הישרדות:</span>
                  <span className="font-mono text-lg font-black text-amber-400">
                    {formatTime(hudStats.time)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-stone-500 block">ניקוד סופי:</span>
                  <span className="font-mono text-lg font-black text-white">
                    {hudStats.score.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-stone-500 block">אויבים שחוסלו:</span>
                  <span className="font-mono text-base font-bold text-rose-400">
                    {hudStats.kills}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-stone-500 block">רמה שהושגה:</span>
                  <span className="font-mono text-base font-bold text-cyan-400">
                    רמה {hudStats.level}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-between border-t border-stone-800 pt-2.5 text-xs">
                  <span className="flex items-center gap-1.5 text-stone-400">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    שיא כל הזמנים:
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {highScore.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={initGame}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 active:scale-95 transition-all shadow-lg"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>שחק שוב עכשיו</span>
                </button>

                <button
                  onClick={onBackToShipSelect}
                  className="rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-xs font-bold text-stone-300 hover:bg-stone-700 transition-colors"
                >
                  החלף ספינה
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Info Banner */}
      <div className="hidden sm:flex items-center justify-between border-t border-stone-800/80 bg-stone-900/60 px-4 py-2 text-[11px] text-stone-400">
        <div className="flex items-center gap-4">
          <span>🎮 מקשים: <strong>W/A/S/D</strong> או <strong>חיצים</strong> לתנועה</span>
          <span>🎯 כיוון: <strong>עכבר</strong> (או כוונת אוטומטית פעילה)</span>
          <span>⚡ ירי: <strong>רווח</strong> או <strong>קליק שמאלי</strong></span>
        </div>
        <div>
          <span>⏸️ <strong>P</strong> להשהיה</span>
        </div>
      </div>
    </div>
  );
};
