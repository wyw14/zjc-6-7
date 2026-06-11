const API_BASE_URL = 'http://localhost:6036/api';

const CARD_EMOJIS = {
  1: '🍎', 2: '🍊', 3: '🍋', 4: '🍇',
  5: '🍓', 6: '🍒', 7: '🍑', 8: '🥝',
  9: '🍌', 10: '🍉', 11: '🍍', 12: '🥭'
};

const MODE_NAMES = {
  normal: '普通模式',
  hard: '困难模式',
  daily: '每日挑战'
};

const CARD_PAIRS = {
  normal: 8,
  hard: 12,
  daily: 8
};

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const profileBtn = document.getElementById('profileBtn');
const gameModeSelect = document.getElementById('gameMode');
const winModal = document.getElementById('winModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const profileModal = document.getElementById('profileModal');
const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const finalModeEl = document.getElementById('finalMode');
const finalRankEl = document.getElementById('finalRank');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardModeSelect = document.getElementById('leaderboardMode');
const newAchievementsSection = document.getElementById('newAchievements');
const newAchievementsList = document.getElementById('newAchievementsList');
const searchProfileBtn = document.getElementById('searchProfileBtn');
const profilePlayerNameInput = document.getElementById('profilePlayerName');
const profileStats = document.getElementById('profileStats');
const statTotalGames = document.getElementById('statTotalGames');
const statHardGames = document.getElementById('statHardGames');
const statDailyStreak = document.getElementById('statDailyStreak');
const statBestNormal = document.getElementById('statBestNormal');
const statBestHard = document.getElementById('statBestHard');
const statBestDaily = document.getElementById('statBestDaily');
const profileAchievements = document.getElementById('profileAchievements');
const profileAchievementsList = document.getElementById('profileAchievementsList');
const achievementCount = document.getElementById('achievementCount');

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;
let currentMode = 'normal';
let currentCardPairs = 8;

async function initGame() {
  currentMode = gameModeSelect.value;
  currentCardPairs = CARD_PAIRS[currentMode] || 8;
  
  if (currentMode === 'hard') {
    gameBoard.classList.add('hard-mode');
  } else {
    gameBoard.classList.remove('hard-mode');
  }
  
  resetGameState();
  const shuffledCards = await fetchShuffledCards(currentMode);
  renderCards(shuffledCards);
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  updateTimerDisplay();
  movesEl.textContent = '0';
  matchedEl.textContent = `0/${currentCardPairs}`;
  gameBoard.innerHTML = '';
}

async function fetchShuffledCards(mode) {
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle?mode=${mode}`);
    const data = await response.json();
    return data.cards;
  } catch (error) {
    console.error('获取洗牌数据失败:', error);
    const fallbackCards = [];
    const pairs = CARD_PAIRS[mode] || 8;
    for (let i = 1; i <= pairs; i++) {
      fallbackCards.push(i, i);
    }
    for (let i = fallbackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackCards[i], fallbackCards[j]] = [fallbackCards[j], fallbackCards[i]];
    }
    return fallbackCards;
  }
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '❓';
    
    card.appendChild(cardBack);
    card.appendChild(cardFront);
    
    card.addEventListener('click', () => handleCardClick(card));
    
    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;
  
  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  if (id1 === id2) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/${currentCardPairs}`;
      flippedCards = [];
      isProcessing = false;
      
      if (matchedPairs === currentCardPairs) {
        endGame();
      }
    }, 500);
  } else {
    setTimeout(() => {
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  clearInterval(timer);
  timer = null;
  
  finalModeEl.textContent = MODE_NAMES[currentMode];
  finalTimeEl.textContent = timerEl.textContent;
  finalMovesEl.textContent = moves;
  finalRankEl.textContent = '--';
  
  newAchievementsSection.classList.add('hidden');
  newAchievementsList.innerHTML = '';
  
  setTimeout(() => {
    winModal.classList.remove('hidden');
  }, 500);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function createAchievementBadge(achievement, isLocked = false, animated = false) {
  const badge = document.createElement('div');
  badge.className = `achievement-badge${isLocked ? ' locked' : ''}${animated ? ' animated' : ''}`;
  badge.innerHTML = `
    <span class="achievement-icon">${achievement.icon}</span>
    <div class="achievement-info">
      <span class="achievement-name">${achievement.name}</span>
      <span class="achievement-desc">${achievement.description}</span>
    </div>
  `;
  return badge;
}

async function submitScore() {
  const playerName = playerNameInput.value.trim() || '匿名玩家';
  const timeInSeconds = Math.floor(elapsedTime / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        moves: moves,
        playerName: playerName,
        mode: currentMode
      })
    });

    const data = await response.json();
    
    if (data.success) {
      finalRankEl.textContent = data.rank > 10 ? `第 ${data.rank} 名` : (data.rank > 0 ? `第 ${data.rank} 名` : '未上榜');
      
      if (data.newAchievements && data.newAchievements.length > 0) {
        newAchievementsList.innerHTML = '';
        data.newAchievements.forEach((achievement, index) => {
          setTimeout(() => {
            const badge = createAchievementBadge(achievement, false, true);
            newAchievementsList.appendChild(badge);
          }, index * 200);
        });
        newAchievementsSection.classList.remove('hidden');
      }
      
      setTimeout(() => {
        alert(`恭喜！你排名第 ${data.rank} 名！`);
        winModal.classList.add('hidden');
        showLeaderboard();
      }, data.newAchievements && data.newAchievements.length > 0 ? data.newAchievements.length * 200 + 500 : 0);
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard() {
  const mode = leaderboardModeSelect.value;
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?mode=${mode}`);
    const data = await response.json();
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li>加载排行榜失败</li>';
  }
  
  leaderboardModal.classList.remove('hidden');
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    
    const timeStr = formatTime(entry.time);
    const modeText = entry.mode ? ` [${MODE_NAMES[entry.mode] || entry.mode}]` : '';
    
    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="name">${entry.playerName}${modeText}</span>
      </span>
      <span class="time">${timeStr} · ${entry.moves}步</span>
    `;
    
    leaderboardList.appendChild(li);
  });
}

function showProfile() {
  profilePlayerNameInput.value = '';
  profileStats.classList.add('hidden');
  profileAchievements.classList.add('hidden');
  profileAchievementsList.innerHTML = '';
  profileModal.classList.remove('hidden');
}

async function searchProfile() {
  const playerName = profilePlayerNameInput.value.trim();
  if (!playerName) {
    alert('请输入玩家名称');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/player/${encodeURIComponent(playerName)}`);
    const data = await response.json();
    
    statTotalGames.textContent = data.stats.totalGames;
    statHardGames.textContent = data.stats.hardGames || 0;
    statDailyStreak.textContent = `${data.stats.dailyStreak || 0}天`;
    
    statBestNormal.textContent = data.stats.bestTime.normal ? `${formatTime(data.stats.bestTime.normal)} · ${data.stats.bestMoves.normal}步` : '--';
    statBestHard.textContent = data.stats.bestTime.hard ? `${formatTime(data.stats.bestTime.hard)} · ${data.stats.bestMoves.hard}步` : '--';
    statBestDaily.textContent = data.stats.bestTime.daily ? `${formatTime(data.stats.bestTime.daily)} · ${data.stats.bestMoves.daily}步` : '--';
    
    profileStats.classList.remove('hidden');
    
    profileAchievementsList.innerHTML = '';
    const unlockedIds = new Set(data.achievements.map(a => a.id));
    
    achievementCount.textContent = `${data.achievements.length}/${data.allAchievements.length}`;
    
    data.allAchievements.forEach(achievement => {
      const isUnlocked = unlockedIds.has(achievement.id);
      const badge = createAchievementBadge(achievement, !isUnlocked);
      profileAchievementsList.appendChild(badge);
    });
    
    profileAchievements.classList.remove('hidden');
  } catch (error) {
    console.error('获取玩家信息失败:', error);
    alert('获取玩家信息失败，请稍后重试');
  }
}

restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
  winModal.classList.add('hidden');
  initGame();
});
leaderboardBtn.addEventListener('click', () => {
  leaderboardModeSelect.value = currentMode;
  showLeaderboard();
});
closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});
profileBtn.addEventListener('click', showProfile);
closeProfileBtn.addEventListener('click', () => {
  profileModal.classList.add('hidden');
});
submitScoreBtn.addEventListener('click', submitScore);
searchProfileBtn.addEventListener('click', searchProfile);
profilePlayerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchProfile();
  }
});
leaderboardModeSelect.addEventListener('change', showLeaderboard);
gameModeSelect.addEventListener('change', initGame);

initGame();
