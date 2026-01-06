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
function showNotification(msg, type = "success") {
  const n = document.getElementById("notification");
  n.textContent = msg;
  n.className = `notification show ${type}`;
  setTimeout(() => n.classList.remove("show"), 3000);
}

function logAction(action, details = {}) {
  const timestamp = new Date().toISOString();
  gameLog.push({ timestamp, action, ...details });
}

// ================= LETTER COSTS / DICE =================
const letterCost = { 
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 
};

const diceFaces = {
  1:"assets/dice/32x/front-side-1.png",
  2:"assets/dice/32x/front-2.png",
  3:"assets/dice/32x/front-3.png",
  4:"assets/dice/32x/front-side-4.png",
  5:"assets/dice/32x/front-5.png",
  6:"assets/dice/32x/side-6.png"
};

// ================= TILE / RENDER FUNCTIONS =================
function createTile(letter, cost = null) {
  const tileCost = (letter === "*" || cost === 1) ? 1 : cost ?? letterCost[letter] ?? 1;
  const d = document.createElement("div");
  d.className = "tile";
  if(letter === "*") d.classList.add("wild-tile");
  d.innerHTML = `<div class="tile-letter">${letter}</div><div class="tile-number">${tileCost}</div>`;
  return d;
}

function renderRoll() {
  const rollDiv = document.getElementById("current-roll");
  rollDiv.innerHTML = "";
  let total = 0;
  currentRoll.forEach(tile => {
    const letter = tile.letter;
    const cost = tile.cost ?? (letter === "*" ? 1 : letterCost[letter]);
    total += cost;
    rollDiv.appendChild(createTile(letter, cost));
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
    t.classList.add("wild-tile");
    t.onclick = () => {
      const l = prompt("Wildcard letter A-Z");
      if (!/^[A-Z]$/i.test(l)) return;
      playerTiles.push({ letter: l.toUpperCase(), cost: 1 });
      wildTiles.splice(i, 1);
      renderOwned();
      showNotification(`Wildcard used: ${l.toUpperCase()}`);
      logAction("use_wildcard", { letter: l.toUpperCase(), coins, playerTiles: [...playerTiles] });
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
  showNotification("Game Started!");
  logAction("start_game", { playerId, coins });
};

// ================= ROLL DICE =================
rollBtn.onclick = () => {
  if (!gameStarted) return;

  diceImg.style.display = "block";
  diceImg.classList.remove("shake");

  const allDiceImgs = Object.values(diceFaces);
  let elapsed = 0;
  const interval = 50;
  const duration = 500;

  const anim = setInterval(() => {
    diceImg.src = allDiceImgs[Math.floor(Math.random()*allDiceImgs.length)];
    diceImg.classList.add("shake");
    elapsed += interval;
    if (elapsed >= duration) {
      clearInterval(anim);
      const rollNumber = Math.floor(Math.random()*6)+1;
      diceImg.src = diceFaces[rollNumber];
      currentRoll = Array.from({ length: rollNumber }, () => ({ letter: Object.keys(letterCost)[Math.floor(Math.random()*26)], cost: null }));
      renderRoll();
      showNotification(`Rolled ${rollNumber} letters!`);
      logAction("roll_letters", { rollNumber, letters: currentRoll.map(t=>t.letter) });
    }
  }, interval);
};

// ================= BUY LETTERS =================
buyBtn.onclick = () => {
  if (!gameStarted || !currentRoll.length) return;
  const cost = currentRoll.reduce((s, t) => s + (t.cost ?? letterCost[t.letter]), 0);
  if (coins < cost) return alert("Not enough coins");
  coins -= cost;
  document.getElementById("coins").textContent = coins;
  playerTiles.push(...currentRoll.map(t => ({ letter: t.letter, cost: t.cost ?? letterCost[t.letter] })));
  logAction("buy_letters", { boughtLetters: currentRoll.map(t=>t.letter), cost, coins, playerTiles: [...playerTiles] });
  currentRoll = [];
  renderOwned();
  renderRoll();
};

// ================= DRAG & DROP =================
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  e.preventDefault();
  const i = e.dataTransfer.getData("text/plain");
  if (i === "") return;
  const tileObj = playerTiles.splice(i, 1)[0];
  const t = createTile(tileObj.letter, tileObj.cost);
  if(tileObj.letter === "*" || tileObj.cost === 1) t.classList.add("wild-tile");

  t.onclick = () => {
    playerTiles.push(tileObj);
    wordBuilder.removeChild(t);
    renderOwned();
    updateWordScore();
    logAction("remove_tile_from_word", { letter: tileObj.letter, playerTiles:[...playerTiles] });
  };

  wordBuilder.appendChild(t);
  renderOwned();
  updateWordScore();
  logAction("add_tile_to_word", { letter: tileObj.letter, playerTiles:[...playerTiles] });
};

// ================= CHECK WORD / SELL WITH DICTIONARY API =================
checkWordBtn.onclick = async () => {
  const wordTiles = [...wordBuilder.children];
  if (!wordTiles.length) return alert("Place letters in word builder first!");
  
  let sum = 0;
  const word = [];
  
  wordTiles.forEach(t => {
    const letter = t.querySelector(".tile-letter").textContent;
    const value = Number(t.querySelector(".tile-number").textContent);
    sum += value;
    word.push(letter);
  });

  const wordStr = word.join("").toLowerCase();

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordStr}`);
    if (!res.ok) {
      showNotification(`Invalid word: "${wordStr}"`, "error");
      logAction("wrong_word", { word: wordStr, playerTiles: [...playerTiles] });
      return;
    }

    const score = sum * sum;
    coins += score;
    document.getElementById("coins").textContent = coins;
    wordBuilder.innerHTML = "";
    updateWordScore();
    
    logAction("sell_word", { word: wordStr, score, coins, remainingTiles: [...playerTiles] });
    showNotification(`Sold word "${wordStr}" for $${score}`);
    renderOwned();

  } catch (err) {
    console.error(err);
    showNotification("Dictionary API error", "error");
  }
};

// ================= INITIAL LETTER GRID =================
(function(){
  const g = document.getElementById("letter-price-grid");
  g.innerHTML = "";
  Object.entries(letterCost).forEach(([l,c])=>g.appendChild(createTile(l,c)));
})();

// ================= EXPORT / SERVER UPLOAD =================
exportBtn.style.display = "inline-block";
exportBtn.onclick = async () => {
  if (!gameLog.length) return alert("No game data to export!");

  const fileName = `${playerId || "game"}_log.csv`;
  const keys = Object.keys(gameLog[0]);
  const csvRows = [
    keys.join(","),
    ...gameLog.map(obj =>
      keys.map(k => {
        let val = obj[k];
        if (Array.isArray(val)) val = val.join("|");
        return `"${val}"`;
      }).join(",")
    )
  ];
  const csvContent = csvRows.join("\n");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, csvContent })
    });

    if (res.ok) {
      showNotification(`Game log uploaded to Dropbox!`);
      logAction("dropbox_export", { playerId, path: `/BuyWord-Bentley/${fileName}` });
    } else {
      const errText = await res.text();
      console.error(errText);
      showNotification("Dropbox upload failed", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Server error", "error");
  }
};

