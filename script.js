const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const bestBadgeEl = document.getElementById('bestBadge');
const leaderboardEl = document.getElementById('leaderboard');
const fastestEl = document.getElementById('fastest');
const solvedCountEl = document.getElementById('solvedCount');
const winModal = document.getElementById('winModal');
const finalMovesEl = document.getElementById('finalMoves');
const finalTimeEl = document.getElementById('finalTime');
const soundBtn = document.getElementById('soundBtn');
const themeBtn = document.getElementById('themeBtn');

const SIZE = 4;
const SCORE_KEY = 'slide15-scores-v1';
const THEME_KEY = 'slide15-light';
let board = [];
let moves = 0;
let elapsedSeconds = 0;
let timer = null;
let started = false;
let soundOn = true;
let scores = loadScores();

const solvedBoard = () => Array.from({length: SIZE * SIZE}, (_, i) => i + 1).map((v, i, a) => i === a.length - 1 ? 0 : v);

function shuffleSolvable() {
  const a = solvedBoard();
  // Start solved, then make many valid random moves. This guarantees solvability.
  let blank = a.length - 1;
  let previous = -1;
  for (let i = 0; i < 220; i++) {
    const neighbors = getNeighbors(blank).filter(n => n !== previous);
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    [a[blank], a[next]] = [a[next], a[blank]];
    previous = blank;
    blank = next;
  }
  if (a.every((v, i) => v === solvedBoard()[i])) return shuffleSolvable();
  return a;
}

function getNeighbors(index) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const n = [];
  if (r > 0) n.push(index - SIZE);
  if (r < SIZE - 1) n.push(index + SIZE);
  if (c > 0) n.push(index - 1);
  if (c < SIZE - 1) n.push(index + 1);
  return n;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer() {
  if (timer || !started) return;
  timer = setInterval(() => {
    elapsedSeconds++;
    timeEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function startGame() {
  stopTimer();
  board = shuffleSolvable();
  moves = 0;
  elapsedSeconds = 0;
  started = false;
  movesEl.textContent = '0';
  timeEl.textContent = '00:00';
  document.getElementById('difficultyLabel').textContent = 'SMART SHUFFLE';
  render();
}

function moveTile(index) {
  const blank = board.indexOf(0);
  if (!getNeighbors(blank).includes(index)) return false;
  if (!started) {
    started = true;
    startTimer();
  }
  [board[index], board[blank]] = [board[blank], board[index]];
  moves++;
  movesEl.textContent = moves;
  playTone(420, .035);
  render(index, blank);
  if (isSolved()) finishGame();
  return true;
}

function render(lastA = -1, lastB = -1) {
  boardEl.innerHTML = '';
  const blank = board.indexOf(0);
  board.forEach((value, index) => {
    const btn = document.createElement('button');
    btn.className = 'tile' + (value === 0 ? ' empty' : '') + (getNeighbors(blank).includes(index) ? ' movable' : '');
    btn.type = 'button';
    btn.setAttribute('role', 'gridcell');
    btn.setAttribute('aria-label', value === 0 ? 'Empty space' : `Tile ${value}`);
    if (value !== 0) {
      btn.textContent = value;
      btn.addEventListener('click', () => moveTile(index));
      if (index === lastA || index === lastB) requestAnimationFrame(() => btn.classList.add('pop'));
    }
    boardEl.appendChild(btn);
  });
}

function isSolved() {
  return board.every((v, i) => v === solvedBoard()[i]);
}

function finishGame() {
  stopTimer();
  const record = {moves, time: elapsedSeconds, date: Date.now()};
  scores.push(record);
  scores.sort((a,b) => a.moves - b.moves || a.time - b.time);
  scores = scores.slice(0, 10);
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  updateScores();
  finalMovesEl.textContent = moves;
  finalTimeEl.textContent = formatTime(elapsedSeconds);
  setTimeout(() => {
    winModal.classList.add('show');
    winModal.setAttribute('aria-hidden', 'false');
  }, 250);
  playWinSound();
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY) || '[]'); }
  catch { return []; }
}

function updateScores() {
  const best = scores[0];
  bestEl.textContent = best ? best.moves : '—';
  bestBadgeEl.textContent = best ? best.moves : '—';
  solvedCountEl.textContent = scores.length;
  const fastest = scores.reduce((min, s) => min === null || s.time < min ? s.time : min, null);
  fastestEl.textContent = fastest === null ? '—' : formatTime(fastest);
  leaderboardEl.innerHTML = '';
  if (!scores.length) {
    leaderboardEl.innerHTML = '<div class="empty-board">Your best runs will appear here.</div>';
    return;
  }
  scores.slice(0, 5).forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'score-row' + (i === 0 ? ' first' : '');
    row.innerHTML = `<span class="rank">${String(i+1).padStart(2,'0')}</span><span class="score-main"><b>${s.moves} moves</b><small>${formatTime(s.time)}</small></span><strong>${s.moves}</strong>`;
    leaderboardEl.appendChild(row);
  });
}

function playTone(freq = 440, duration = .05) {
  if (!soundOn) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playWinSound() {
  if (!soundOn) return;
  [523,659,784,1047].forEach((f, i) => setTimeout(() => playTone(f, .12), i * 85));
}

function moveByDirection(dir) {
  const blank = board.indexOf(0);
  const r = Math.floor(blank / SIZE), c = blank % SIZE;
  let target = -1;
  // The target is the tile that moves into the blank.
  if (dir === 'up' && r < SIZE - 1) target = blank + SIZE;
  if (dir === 'down' && r > 0) target = blank - SIZE;
  if (dir === 'left' && c < SIZE - 1) target = blank + 1;
  if (dir === 'right' && c > 0) target = blank - 1;
  if (target >= 0) moveTile(target);
}

function closeModal() {
  winModal.classList.remove('show');
  winModal.setAttribute('aria-hidden', 'true');
}

document.getElementById('newGameBtn').addEventListener('click', startGame);
document.getElementById('playAgainBtn').addEventListener('click', () => { closeModal(); startGame(); });
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
winModal.addEventListener('click', (e) => { if (e.target === winModal) closeModal(); });
document.getElementById('clearScoresBtn').addEventListener('click', () => {
  scores = [];
  localStorage.removeItem(SCORE_KEY);
  updateScores();
});

document.querySelectorAll('.mobile-controls button').forEach(btn => btn.addEventListener('click', () => moveByDirection(btn.dataset.dir)));

document.addEventListener('keydown', (e) => {
  const map = {ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', w:'up', W:'up', s:'down', S:'down', a:'left', A:'left', d:'right', D:'right'};
  if (map[e.key]) { e.preventDefault(); moveByDirection(map[e.key]); }
  if (e.key.toLowerCase() === 'n') startGame();
  if (e.key === 'Escape') closeModal();
});

soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '🔊' : '🔇';
});

themeBtn.addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  themeBtn.textContent = document.documentElement.classList.contains('light') ? '☼' : '◐';
  localStorage.setItem(THEME_KEY, document.documentElement.classList.contains('light') ? '1' : '0');
});

if (localStorage.getItem(THEME_KEY) === '1') {
  document.documentElement.classList.add('light');
  themeBtn.textContent = '☼';
}

// Basic drag/swipe controls on the puzzle board for phones.
let touchStart = null;
boardEl.addEventListener('touchstart', (e) => { touchStart = e.changedTouches[0]; }, {passive:true});
boardEl.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.clientX;
  const dy = t.clientY - touchStart.clientY;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  if (Math.abs(dx) > Math.abs(dy)) moveByDirection(dx > 0 ? 'right' : 'left');
  else moveByDirection(dy > 0 ? 'down' : 'up');
}, {passive:true});

startGame();
updateScores();
