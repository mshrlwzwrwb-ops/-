export type ShipId = 'striker' | 'titan' | 'spectre';

export interface ShipDef {
  id: ShipId;
  name: string;
  subName: string;
  description: string;
  color: string;
  accentColor: string;
  maxHp: number;
  speed: number;
  fireRate: number; // shots per sec
  specialTrait: string;
}

export type UpgradeRarity = 'common' | 'rare' | 'epic';

export type UpgradeId =
  | 'multiShot'
  | 'fireRate'
  | 'homingMissile'
  | 'orbitalShield'
  | 'laserBeam'
  | 'maxHp'
  | 'magnet'
  | 'moveSpeed'
  | 'critChance'
  | 'droneCompanion';

export interface UpgradeCardDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  rarity: UpgradeRarity;
  maxLevel: number;
}

export interface PlayerStats {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  exp: number;
  expToNext: number;
  shipId: ShipId;
  upgrades: Record<UpgradeId, number>;
  critChance: number;
  magnetRange: number;
  lastShotTime: number;
  invincibleTimer: number;
  // Stats tracking
  score: number;
  kills: number;
  damageDealt: number;
  timeSurvived: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  pierce: number;
  isEnemy: boolean;
  isHoming?: boolean;
  targetId?: string;
  life: number;
  maxLife: number;
}

export type EnemyType = 'scout' | 'meteor' | 'cruiser' | 'boss';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  scoreValue: number;
  expValue: number;
  shootCooldown: number;
  lastShot: number;
  bossPhase?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface ExpGem {
  id: string;
  x: number;
  y: number;
  value: number;
  radius: number;
  color: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

export interface GameHighScores {
  highScore: number;
  bestTime: number;
  bestKills: number;
  highestLevel: number;
}
