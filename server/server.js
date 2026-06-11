﻿const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6036;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const CARD_PAIRS_NORMAL = 8;
const CARD_PAIRS_HARD = 12;

let leaderboard = {
  normal: [],
  hard: [],
  daily: []
};

let playerAchievements = {};
let playerStats = {};
let dailyChallengeData = null;
let dailyChallengeDate = null;

function getDailyChallengeSeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function seededShuffle(array, seed) {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDailyChallengeCards() {
  const today = new Date().toDateString();
  if (dailyChallengeDate !== today) {
    dailyChallengeDate = today;
    const seed = getDailyChallengeSeed();
    const cardIds = [];
    for (let i = 1; i <= CARD_PAIRS_NORMAL; i++) {
      cardIds.push(i, i);
    }
    dailyChallengeData = seededShuffle(cardIds, seed);
    leaderboard.daily = [];
  }
  return dailyChallengeData;
}

const ACHIEVEMENTS = {
  first_completion: {
    id: 'first_completion',
    name: '初出茅庐',
    description: '首次完成游戏',
    icon: '🎯',
    check: (stats, score, rank) => stats.totalGames >= 1
  },
  under_10_moves: {
    id: 'under_10_moves',
    name: '步步为营',
    description: '十步内完成游戏',
    icon: '👣',
    check: (stats, score, rank) => score.moves <= 10 && score.mode !== 'hard'
  },
  under_30_seconds: {
    id: 'under_30_seconds',
    name: '闪电侠',
    description: '30秒内完成游戏',
    icon: '⚡',
    check: (stats, score, rank) => score.time <= 30 && score.mode !== 'hard'
  },
  top_3_leaderboard: {
    id: 'top_3_leaderboard',
    name: '榜上有名',
    description: '进入排行榜前三名',
    icon: '🏆',
    check: (stats, score, rank) => rank >= 1 && rank <= 3 && rank > 0 && score.mode === 'normal'
  },
  completion_master: {
    id: 'completion_master',
    name: '百战百胜',
    description: '累计完成10次游戏',
    icon: '💯',
    check: (stats, score, rank) => stats.totalGames >= 10
  },
  perfect_memory: {
    id: 'perfect_memory',
    name: '过目不忘',
    description: '无错误完成游戏（步数=8）',
    icon: '🧠',
    check: (stats, score, rank) => score.moves === 8 && score.mode !== 'hard'
  },
  speed_demon: {
    id: 'speed_demon',
    name: '疾风迅雷',
    description: '15秒内完成游戏',
    icon: '🌪️',
    check: (stats, score, rank) => score.time <= 15 && score.mode !== 'hard'
  },
  veteran: {
    id: 'veteran',
    name: '老玩家',
    description: '累计完成50次游戏',
    icon: '🎖️',
    check: (stats, score, rank) => stats.totalGames >= 50
  },
  hard_mode_first: {
    id: 'hard_mode_first',
    name: '挑战者',
    description: '首次完成困难模式',
    icon: '🔥',
    check: (stats, score, rank) => score.mode === 'hard' && stats.hardGames === 1
  },
  hard_mode_perfect: {
    id: 'hard_mode_perfect',
    name: '完美挑战者',
    description: '困难模式无错误完成（步数=12）',
    icon: '💎',
    check: (stats, score, rank) => score.mode === 'hard' && score.moves === 12
  },
  hard_mode_master: {
    id: 'hard_mode_master',
    name: '困难征服者',
    description: '累计完成5次困难模式',
    icon: '👑',
    check: (stats, score, rank) => stats.hardGames >= 5
  },
  hard_mode_speed: {
    id: 'hard_mode_speed',
    name: '疾风挑战者',
    description: '困难模式60秒内完成',
    icon: '🚀',
    check: (stats, score, rank) => score.mode === 'hard' && score.time <= 60
  },
  daily_champion: {
    id: 'daily_champion',
    name: '每日冠军',
    description: '获得每日挑战第一名',
    icon: '🥇',
    check: (stats, score, rank) => score.mode === 'daily' && rank === 1
  },
  daily_runner_up: {
    id: 'daily_runner_up',
    name: '每日亚军',
    description: '获得每日挑战第二名',
    icon: '🥈',
    check: (stats, score, rank) => score.mode === 'daily' && rank === 2
  },
  daily_third_place: {
    id: 'daily_third_place',
    name: '每日季军',
    description: '获得每日挑战第三名',
    icon: '🥉',
    check: (stats, score, rank) => score.mode === 'daily' && rank === 3
  },
  daily_streak_7: {
    id: 'daily_streak_7',
    name: '坚持不懈',
    description: '连续7天完成每日挑战',
    icon: '📅',
    check: (stats, score, rank) => stats.dailyStreak >= 7
  }
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateDailyStreak(stats) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (stats.lastDailyDate === today) {
    return;
  }
  
  if (stats.lastDailyDate === yesterday) {
    stats.dailyStreak = (stats.dailyStreak || 0) + 1;
  } else {
    stats.dailyStreak = 1;
  }
  
  stats.lastDailyDate = today;
}

function calculateAchievements(playerName, score, rank) {
  if (!playerStats[playerName]) {
    playerStats[playerName] = {
      totalGames: 0,
      hardGames: 0,
      bestTime: { normal: Infinity, hard: Infinity, daily: Infinity },
      bestMoves: { normal: Infinity, hard: Infinity, daily: Infinity },
      dailyStreak: 0,
      lastDailyDate: null,
      games: []
    };
  }

  const stats = playerStats[playerName];
  const mode = score.mode || 'normal';
  
  stats.totalGames++;
  if (mode === 'hard') {
    stats.hardGames++;
  }
  if (mode === 'daily') {
    updateDailyStreak(stats);
  }
  
  stats.bestTime[mode] = Math.min(stats.bestTime[mode], score.time);
  stats.bestMoves[mode] = Math.min(stats.bestMoves[mode], score.moves);
  
  stats.games.push({
    time: score.time,
    moves: score.moves,
    mode: mode,
    date: new Date().toISOString()
  });

  if (!playerAchievements[playerName]) {
    playerAchievements[playerName] = [];
  }

  const unlockedAchievements = [];
  const existingIds = new Set(playerAchievements[playerName].map(a => a.id));

  for (const key of Object.keys(ACHIEVEMENTS)) {
    const achievement = ACHIEVEMENTS[key];
    if (!existingIds.has(achievement.id) && achievement.check(stats, score, rank)) {
      const unlocked = {
        ...achievement,
        unlockedAt: new Date().toISOString()
      };
      playerAchievements[playerName].push(unlocked);
      unlockedAchievements.push(unlocked);
    }
  }

  return unlockedAchievements;
}

app.get('/api/shuffle', (req, res) => {
  const mode = req.query.mode || 'normal';
  let cardPairs = CARD_PAIRS_NORMAL;
  let shuffled;
  
  if (mode === 'hard') {
    cardPairs = CARD_PAIRS_HARD;
    const cardIds = [];
    for (let i = 1; i <= cardPairs; i++) {
      cardIds.push(i, i);
    }
    shuffled = shuffle(cardIds);
  } else if (mode === 'daily') {
    shuffled = getDailyChallengeCards();
  } else {
    const cardIds = [];
    for (let i = 1; i <= cardPairs; i++) {
      cardIds.push(i, i);
    }
    shuffled = shuffle(cardIds);
  }
  
  res.json({ cards: shuffled, mode: mode });
});

app.post('/api/score', (req, res) => {
  const { time, moves, playerName, mode } = req.body;
  const gameMode = mode || 'normal';
  
  if (typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: '无效的成绩数据' });
  }

  if (typeof moves !== 'number' || moves <= 0) {
    return res.status(400).json({ error: '无效的步数数据' });
  }

  const entry = {
    id: Date.now(),
    time: time,
    moves: moves,
    playerName: playerName || '匿名玩家',
    mode: gameMode,
    date: new Date().toLocaleString('zh-CN')
  };

  if (!leaderboard[gameMode]) {
    leaderboard[gameMode] = [];
  }

  leaderboard[gameMode].push(entry);
  leaderboard[gameMode].sort((a, b) => a.time - b.time);
  
  const rank = leaderboard[gameMode].findIndex(e => e.id === entry.id) + 1;
  
  leaderboard[gameMode] = leaderboard[gameMode].slice(0, 10);

  const newAchievements = calculateAchievements(entry.playerName, { time, moves, mode: gameMode }, rank);

  res.json({
    success: true,
    rank: rank,
    leaderboard: leaderboard[gameMode],
    mode: gameMode,
    newAchievements: newAchievements,
    allAchievements: playerAchievements[entry.playerName] || []
  });
});

app.get('/api/leaderboard', (req, res) => {
  const mode = req.query.mode || 'normal';
  res.json({ leaderboard: leaderboard[mode] || [], mode: mode });
});

app.get('/api/achievements', (req, res) => {
  res.json({ achievements: Object.values(ACHIEVEMENTS) });
});

app.get('/api/player/:playerName', (req, res) => {
  const playerName = req.params.playerName;
  const achievements = playerAchievements[playerName] || [];
  const stats = playerStats[playerName] || {
    totalGames: 0,
    hardGames: 0,
    bestTime: { normal: null, hard: null, daily: null },
    bestMoves: { normal: null, hard: null, daily: null },
    dailyStreak: 0,
    lastDailyDate: null,
    games: []
  };
  
  res.json({
    playerName,
    stats: {
      totalGames: stats.totalGames,
      hardGames: stats.hardGames || 0,
      dailyStreak: stats.dailyStreak || 0,
      bestTime: {
        normal: stats.bestTime.normal === Infinity || stats.bestTime.normal === undefined ? null : stats.bestTime.normal,
        hard: stats.bestTime.hard === Infinity || stats.bestTime.hard === undefined ? null : stats.bestTime.hard,
        daily: stats.bestTime.daily === Infinity || stats.bestTime.daily === undefined ? null : stats.bestTime.daily
      },
      bestMoves: {
        normal: stats.bestMoves.normal === Infinity || stats.bestMoves.normal === undefined ? null : stats.bestMoves.normal,
        hard: stats.bestMoves.hard === Infinity || stats.bestMoves.hard === undefined ? null : stats.bestMoves.hard,
        daily: stats.bestMoves.daily === Infinity || stats.bestMoves.daily === undefined ? null : stats.bestMoves.daily
      }
    },
    achievements,
    allAchievements: Object.values(ACHIEVEMENTS)
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
