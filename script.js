// ===== DOM =====
const ownedTilesDiv = document.getElementById('owned-tiles');
const wildTilesDiv = document.getElementById('wild-tiles');
const wordBuilder = document.getElementById('word-builder');
const rollBtn = document.getElementById('roll-dice');
const buyBtn = document.getElementById('buy-tiles-btn');
const coinsSpan = document.getElementById('coins');
const priceDisplay = document.getElementById('total-price');
const potentialWinSpan = document.getElementById('potential-win');

// Player UI
const nameInput = document.getElementById('player-name-input');
const classInput = document.getElementById('player-class-input');
const startBtn = document.getElementById('start-game-btn');
const playerIdSpan = document.getElementById('player-id');
const timeStartSpan = document.getElementById('time-start');
const timeElapsedSpan = document.getElementById('time-elapsed');

// ===== STATE =====
let coins = 200;
let currentRoll = [];
let playerTiles = [];
let wildTiles = Array.from({ length: 7 }, () => ({ type: 'wild' }));
let startTime = null;
let timer = null;
let playerId = "";
let gameLog = [];

// ===== COST =====
const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,
  I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,
  Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// ===== LOGGING =====
function logAction(action, details = {}) {
  if (!startTime) return;
  const now = new Date();
  gameLog.push({
    PlayerID: playerId,
    Action: action,
    Details: JSON.stringify(details),
    Coins: coins,
    Time: now.toLocaleTimeString(),
    ElapsedSeconds: Math.floor((now - startTime) / 1000)
  });
}

// ===== PLAYER START =====
startBtn.onclick = () => {
  const name = nameInput.value.trim();
  const cls = classInput.value.trim();
  if (!name || !cls) return alert("Enter name & class");

  playerId = `${name.toUpperCase()}-${cls.toUpperCase()}`;
  playerIdSpan.textContent = playerId;

  startTime = new Date();
  timeStartSpan.textContent = startTime.toLocaleTimeString();

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    timeElapsedSpan.textContent =
      `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }, 1000);

  logAction("GAME_START", { coins });
};

// ===== DICE =====
rollBtn.onclick = () => {
  if (!startTime) return alert("Start the game first");

  currentRoll = Array.from(
    { length: Math.floor(Math.random() * 6) + 1 },
    () => Object.keys(letterCost)[Math.floor(Math.random() * 26)]
  );

  renderRoll();
  logAction("ROLL", { letters: currentRoll });
};

function renderRoll() {
  const rollDiv = document.getElementById('current-roll');
  rollDiv.innerHTML = '';

  let sum = 0;
  currentRoll.forEach(l => {
    sum += letterCost[l];
    const d = document.createElement('div');
    d.className = 'tile';
    d.textContent = l;
    rollDiv.appendChild(d);
  });

  priceDisplay.textContent =
    currentRoll.length ? `Total Price: $${sum}` : '';
}

// ===== BUY =====
buyBtn.onclick = () => {
  if (!currentRoll.length) return;

  const price = currentRoll.reduce((s, l) => s + letterCost[l], 0);

  if (coins < price) return alert("Not enough coins");

  coins -= price;
  coinsSpan.textContent = coins;

  playerTiles.push(...currentRoll.map(l => ({ letter: l, type: 'normal' })));
  currentRoll = [];

  renderOwned();
  renderRoll();
  logAction("BUY_TILES", { price });
};

// ===== OWNED =====
function renderOwned() {
  ownedTilesDiv.innerHTML = '';
  playerTiles.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'tile';
    d.textContent = t.letter;
    d.draggable = true;
    d.ondragstart = e => e.dataTransfer.setData('i', i);
    ownedTilesDiv.appendChild(d);
  });
  renderWild();
  updateWordScore(); // live update potential payout
}

function renderWild() {
  wildTilesDiv.innerHTML = '';
  wildTiles.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'tile wild-tile';
    d.textContent = '*';
    d.onclick = () => {
      const l = prompt("Wildcard letter A-Z");
      if (!/^[A-Z]$/i.test(l)) return;

      playerTiles.push({ letter: l.toUpperCase(), type: 'wild' });
      wildTiles.splice(i, 1);
      renderOwned();
      logAction("WILDCARD_USED", { letter: l.toUpperCase() });
    };
    wildTilesDiv.appendChild(d);
  });
}

// ===== DRAG TO WORD =====
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  const i = e.dataTransfer.getData('i');
  const t = playerTiles[i];
  if (!t) return;

  playerTiles.splice(i, 1);

  const d = document.createElement('div');
  d.className = 'tile';
  d.textContent = t.letter;
  d.dataset.type = t.type;

  // ===== CLICK TO RETURN =====
  d.onclick = () => {
    playerTiles.push({ letter: t.letter, type: t.type });
    wordBuilder.removeChild(d);
    renderOwned();
    updateWordScore();
    logAction("RETURN_TILE", { letter: t.letter });
  };

  wordBuilder.appendChild(d);

  renderOwned();
  updateWordScore();
};

// ===== SCORE PREVIEW =====
function updateWordScore() {
  let sum = 0;
  [...wordBuilder.children].forEach(d => {
    sum += d.dataset.type === 'wild' ? 1 : letterCost[d.textContent];
  });
  potentialWinSpan.textContent = sum * sum; // BuyWord payout
}

// ===== SUBMIT WORD =====
document.getElementById('check-word-btn').onclick = async () => {
  const tiles = [...wordBuilder.children];
  if (!tiles.length) return alert("No word built");

  const word = tiles.map(t => t.textContent).join('');

  const valid = await isValidWord(word);
  if (!valid) {
    logAction("INVALID_WORD", { word });
    return alert(`"${word}" is not valid`);
  }

  // BuyWord scoring logic
  let sum = 0;
  tiles.forEach(t => {
    sum += t.dataset.type === 'wild' ? 1 : letterCost[t.textContent];
  });

  const payout = sum * sum; // traditional BuyWord payout
  coins += payout;
  coinsSpan.textContent = coins;

  logAction("SUBMIT_WORD", { word, payout });

  wordBuilder.innerHTML = '';
  potentialWinSpan.textContent = 0;

  alert(`"${word}" accepted! +$${payout}`);
};

// ===== LETTER GRID =====
function renderLetterPriceGrid() {
  const grid = document.getElementById('letter-price-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(letterCost).forEach(([l, c]) => {
    const d = document.createElement('div');
    d.className = 'tile';
    d.innerHTML = `<div>${l}</div><small>${c}</small>`;
    grid.appendChild(d);
  });
}
renderLetterPriceGrid();

// ===== DICTIONARY =====
async function isValidWord(word) {
  if (word.length < 2) return false;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toUpperCase()}`
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data);
  } catch {
    return false;
  }
}

// ===== EXPORT TO DROPBOX =====
function exportGameLogToDropbox() {
  if (!gameLog.length) return alert("No data");

  // Create Excel workbook
  const ws = XLSX.utils.json_to_sheet(gameLog);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Game Log");

  // Write as Blob
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });

  // Temporary URL
  const url = URL.createObjectURL(blob);
  const filename = `${playerId}_BuyWord_Log.xlsx`;

  // Dropbox Saver
  Dropbox.save(url, filename);
}

// ===== EXPORT BUTTON =====
document.getElementById("exportBtn").onclick = exportGameLogToDropbox;
