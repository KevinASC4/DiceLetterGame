// ================= DOM ELEMENTS =================
const rollBtn = document.getElementById("roll-dice");
const buyBtn = document.getElementById("buy-tiles-btn");
const diceImg = document.getElementById("dice-img");
const ownedTilesDiv = document.getElementById("owned-tiles");
const wildTilesDiv = document.getElementById("wild-tiles");
const wordBuilder = document.getElementById("word-builder");
const priceDisplay = document.getElementById("total-price");
const potentialWinSpan = document.getElementById("potential-win");
const nameInput = document.getElementById("player-name-input");
const classInput = document.getElementById("player-class-input");
const startBtn = document.getElementById("start-game-btn");
const playerIdSpan = document.getElementById("player-id");
const timeStartSpan = document.getElementById("time-start");
const timeElapsedSpan = document.getElementById("time-elapsed");
const exportBtn = document.getElementById("exportBtn");
const checkWordBtn = document.getElementById("check-word-btn");

// ================= GAME STATE =================
let coins = 200;
let currentRoll = [];
let playerTiles = [];
let wildTiles = Array.from({ length: 7 });
let startTime = null;
let timer = null;
let playerId = "";
let gameLog = [];
let gameStarted = false;

rollBtn.disabled = true;
buyBtn.disabled = true;

// ================= HELPERS =================
function renderLetterPriceGrid() {
  const grid = document.getElementById("letter-price-grid");
  if (!grid) return;

  grid.innerHTML = "";
  Object.entries(letterCost).forEach(([letter, cost]) => {
    grid.appendChild(createTile(letter, cost));
  });
}

function showNotification(msg, type = "success") {
  const n = document.getElementById("notification");
  n.textContent = msg;
  n.className = `notification show ${type}`;
  setTimeout(() => n.classList.remove("show"), 3000);
}

/**
 * Centralized logger — ALWAYS use this
 */
function logAction(action, meta = {}) {
  gameLog.push({
    timestamp: new Date().toISOString(),
    action,
    playerId,
    coins,
    ...meta
  });
}

// ================= LETTER COSTS / DICE =================
const letterCost = { 
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 
};

const diceFaces = {
  1:"assets/dice/32x/front-side-1.png",
  2:"assets/dice/32x/front-2.png",
  3:"assets/dice/32x/front-3.png",
  4:"assets/dice/32x/front-side-4.png",
  5:"assets/dice/32x/front-5.png",
  6:"assets/dice/32x/side-6.png"
};

// ================= TILE / RENDER =================
function createTile(letter, cost = null) {
  const tileCost = (letter === "*" || cost === 1) ? 1 : cost ?? letterCost[letter];
  const d = document.createElement("div");
  d.className = "tile";
  if (letter === "*") d.classList.add("wild-tile");
  d.innerHTML = `
    <div class="tile-letter">${letter}</div>
    <div class="tile-number">${tileCost}</div>
  `;
  return d;
}

function renderRoll() {
  const rollDiv = document.getElementById("current-roll");
  rollDiv.innerHTML = "";
  let total = 0;

  currentRoll.forEach(t => {
    const cost = t.cost ?? letterCost[t.letter];
    total += cost;
    rollDiv.appendChild(createTile(t.letter, cost));
  });

  priceDisplay.textContent = total ? `Total Price: $${total}` : "";
}

function renderOwned() {
  ownedTilesDiv.innerHTML = "";
  playerTiles.forEach((tileObj, i) => {
    const t = createTile(tileObj.letter, tileObj.cost);
    t.draggable = true;
    t.ondragstart = e => e.dataTransfer.setData("text/plain", i);
    ownedTilesDiv.appendChild(t);
  });
  renderWild();
}

function renderWild() {
  wildTilesDiv.innerHTML = "";
  wildTiles.forEach((_, i) => {
    const t = createTile("*", 1);
    t.onclick = () => {
      const l = prompt("Wildcard letter A-Z");
      if (!/^[A-Z]$/i.test(l)) return;
      playerTiles.push({ letter: l.toUpperCase(), cost: 1 });
      wildTiles.splice(i, 1);
      renderOwned();
      logAction("use_wildcard", { letter: l.toUpperCase() });
    };
    wildTilesDiv.appendChild(t);
  });
}

function updateWordScore() {
  let sum = 0;
  [...wordBuilder.children].forEach(t => {
    sum += Number(t.querySelector(".tile-number").textContent);
  });
  potentialWinSpan.textContent = sum * sum;
}

// ================= START GAME =================
startBtn.onclick = () => {
  if (!nameInput.value || !classInput.value) return alert("Enter name & class");

  playerId = `${nameInput.value}-${classInput.value}`;
  playerIdSpan.textContent = playerId;

  startTime = new Date();
  timeStartSpan.textContent = startTime.toLocaleTimeString();

  timer && clearInterval(timer);
  timer = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    timeElapsedSpan.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`;
  }, 1000);

  gameStarted = true;
  rollBtn.disabled = false;
  buyBtn.disabled = false;

  logAction("start_game");
  showNotification("Game Started!");
};

// ================= ROLL DICE =================
rollBtn.onclick = () => {
  if (!gameStarted) return;

  const rollNumber = Math.floor(Math.random() * 6) + 1;
  diceImg.src = diceFaces[rollNumber];
  currentRoll = Array.from({ length: rollNumber }, () => ({
    letter: Object.keys(letterCost)[Math.floor(Math.random() * 26)]
  }));

  renderRoll();
  logAction("roll_letters", {
    rollNumber,
    letters: currentRoll.map(t => t.letter)
  });
};

// ================= BUY LETTERS =================
buyBtn.onclick = () => {
  if (!currentRoll.length) return;

  const cost = currentRoll.reduce((s, t) => s + letterCost[t.letter], 0);
  if (coins < cost) return alert("Not enough coins");

  coins -= cost;
  document.getElementById("coins").textContent = coins;

  playerTiles.push(...currentRoll.map(t => ({
    letter: t.letter,
    cost: letterCost[t.letter]
  })));

  logAction("buy_letters", {
    letters: currentRoll.map(t => t.letter),
    cost
  });

  currentRoll = [];
  renderRoll();
  renderOwned();
};

// ================= DRAG & DROP =================
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  e.preventDefault();
  const i = e.dataTransfer.getData("text/plain");
  if (i === "") return;

  const tileObj = playerTiles.splice(i, 1)[0];
  const t = createTile(tileObj.letter, tileObj.cost);

  t.onclick = () => {
    playerTiles.push(tileObj);
    wordBuilder.removeChild(t);
    renderOwned();
    updateWordScore();
    logAction("remove_tile_from_word", { letter: tileObj.letter });
  };

  wordBuilder.appendChild(t);
  renderOwned();
  updateWordScore();
  logAction("add_tile_to_word", { letter: tileObj.letter });
};

// ================= CHECK WORD =================
checkWordBtn.onclick = async () => {
  if (!wordBuilder.children.length) return;

  const letters = [...wordBuilder.children].map(t =>
    t.querySelector(".tile-letter").textContent
  );
  const word = letters.join("").toLowerCase();

  const sum = [...wordBuilder.children]
    .map(t => Number(t.querySelector(".tile-number").textContent))
    .reduce((a,b) => a + b, 0);

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) {
      logAction("invalid_word", { word });
      return showNotification("Invalid word", "error");
    }

    const score = sum * sum;
    coins += score;
    document.getElementById("coins").textContent = coins;

    wordBuilder.innerHTML = "";
    updateWordScore();
    renderOwned();

    logAction("sell_word", { word, score });
    showNotification(`Sold "${word}" for $${score}`);
  } catch {
    showNotification("Dictionary error", "error");
  }
};

// ================= EXPORT TO DROPBOX =================
exportBtn.onclick = async () => {
  if (!gameLog.length) return alert("No data");

  const fileName = `${playerId}_log.csv`;
  const keys = [...new Set(gameLog.flatMap(o => Object.keys(o)))];

  const csv = [
    keys.join(","),
    ...gameLog.map(o =>
      keys.map(k => `"${o[k] ?? ""}"`).join(",")
    )
  ].join("\n");

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, csvContent: csv })
  });

  if (res.ok) {
    logAction("dropbox_export", { fileName });
    showNotification("Uploaded to Dropbox!");
  } else {
    showNotification("Upload failed", "error");
  }
};
renderLetterPriceGrid();
