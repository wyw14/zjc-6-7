const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6036;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const CARD_PAIRS = 8;
let leaderboard = [];
let playerAchievements = {};
let playerStats = {};

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
    check: (stats, score, rank) => score.moves <= 10
  },
  under_30_seconds: {
    id: 'under_30_seconds',
    name: '闪电侠',
    description: '30秒内完成游戏',
    icon: '⚡',
    check: (stats, score, rank) => score.time <= 30
  },
  top_3_leaderboard: {
    id: 'top_3_leaderboard',
    name: '榜上有名',
    description: '进入排行榜前三名',
    icon: '🏆',
    check: (stats, score, rank) => rank >= 1 && rank <= 3
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
    check: (stats, score, rank) => score.moves === 8
  },
  speed_demon: {
    id: 'speed_demon',
    name: '疾风迅雷',
    description: '15秒内完成游戏',
    icon: '🌪️',
    check: (stats, score, rank) => score.time <= 15
  },
  veteran: {
    id: 'veteran',
    name: '老玩家',
    description: '累计完成50次游戏',
    icon: '🎖️',
    check: (stats, score, rank) => stats.totalGames >= 50
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

function calculateAchievements(playerName, score, rank) {
  if (!playerStats[playerName]) {
    playerStats[playerName] = {
      totalGames: 0,
      bestTime: Infinity,
      bestMoves: Infinity,
      games: []
    };
  }

  const stats = playerStats[playerName];
  stats.totalGames++;
  stats.bestTime = Math.min(stats.bestTime, score.time);
  stats.bestMoves = Math.min(stats.bestMoves, score.moves);
  stats.games.push({
    time: score.time,
    moves: score.moves,
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
  const cardIds = [];
  for (let i = 1; i <= CARD_PAIRS; i++) {
    cardIds.push(i, i);
  }
  const shuffled = shuffle(cardIds);
  res.json({ cards: shuffled });
});

app.post('/api/score', (req, res) => {
  const { time, moves, playerName } = req.body;
  
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
    date: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);
  leaderboard.sort((a, b) => a.time - b.time);
  leaderboard = leaderboard.slice(0, 10);

  const rank = leaderboard.findIndex(e => e.id === entry.id) + 1;
  const newAchievements = calculateAchievements(entry.playerName, { time, moves }, rank);

  res.json({
    success: true,
    rank: rank,
    leaderboard: leaderboard,
    newAchievements: newAchievements,
    allAchievements: playerAchievements[entry.playerName] || []
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: leaderboard });
});

app.get('/api/achievements', (req, res) => {
  res.json({ achievements: Object.values(ACHIEVEMENTS) });
});

app.get('/api/player/:playerName', (req, res) => {
  const playerName = req.params.playerName;
  const achievements = playerAchievements[playerName] || [];
  const stats = playerStats[playerName] || {
    totalGames: 0,
    bestTime: null,
    bestMoves: null,
    games: []
  };
  
  res.json({
    playerName,
    stats: {
      totalGames: stats.totalGames,
      bestTime: stats.bestTime === Infinity ? null : stats.bestTime,
      bestMoves: stats.bestMoves === Infinity ? null : stats.bestMoves
    },
    achievements,
    allAchievements: Object.values(ACHIEVEMENTS)
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
