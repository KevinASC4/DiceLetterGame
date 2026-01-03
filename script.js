// ===== DOM =====
const ownedTilesDiv = document.getElementById("owned-tiles");
const wildTilesDiv = document.getElementById("wild-tiles");
const wordBuilder = document.getElementById("word-builder");
const rollBtn = document.getElementById("roll-dice");
const buyBtn = document.getElementById("buy-tiles-btn");
const coinsSpan = document.getElementById("coins");
const priceDisplay = document.getElementById("total-price");
const potentialWinSpan = document.getElementById("potential-win");

const nameInput = document.getElementById("player-name-input");
const classInput = document.getElementById("player-class-input");
const startBtn = document.getElementById("start-game-btn");
const playerIdSpan = document.getElementById("player-id");
const timeStartSpan = document.getElementById("time-start");
const timeElapsedSpan = document.getElementById("time-elapsed");

let coins = 200;
let currentRoll = [];
let playerTiles = [];
let wildTiles = Array.from({ length: 7 });
let startTime = null;
let timer = null;
let playerId = "";
let gameLog = [];

const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,
  I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,
  Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// ===== TILE CREATION =====
function createTile(letter, cost) {
  const d = document.createElement("div");
  d.className = "tile";
  d.innerHTML = `
    <div class="tile-letter">${letter}</div>
    <div class="tile-number">${cost}</div>
  `;
  return d;
}

// ===== LOGGING =====
function logAction(action, details={}) {
  if (!startTime) return;
  gameLog.push({
    PlayerID: playerId,
    Game: "BuyWord",
    Action: action,
    Details: JSON.stringify(details),
    Coins: coins,
    Score: Number(potentialWinSpan.textContent),
    Timestamp: new Date().toISOString()
  });
}

// ===== START GAME =====
startBtn.onclick = () => {
  if (!nameInput.value || !classInput.value) return alert("Enter name & class");
  playerId = `${nameInput.value}-${classInput.value}`;
  playerIdSpan.textContent = playerId;
  startTime = new Date();
  timeStartSpan.textContent = startTime.toLocaleTimeString();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    timeElapsedSpan.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  }, 1000);
  logAction("GAME_START");
};

// ===== DICE ROLL =====
rollBtn.onclick = () => {
  currentRoll = Array.from({ length: Math.floor(Math.random()*5)+2 },
    () => Object.keys(letterCost)[Math.floor(Math.random()*26)]
  );
  renderRoll();
  logAction("ROLL", { currentRoll });
};

function renderRoll() {
  const rollDiv = document.getElementById("current-roll");
  rollDiv.innerHTML = "";
  let total = 0;
  currentRoll.forEach(l => {
    total += letterCost[l];
    rollDiv.appendChild(createTile(l, letterCost[l]));
  });
  priceDisplay.textContent = total ? `Total Price: $${total}` : "";
}

// ===== BUY LETTERS =====
buyBtn.onclick = () => {
  if (!currentRoll.length) return;
  const cost = currentRoll.reduce((s,l)=>s+letterCost[l],0);
  if (coins < cost) return alert("Not enough coins");
  coins -= cost;
  coinsSpan.textContent = coins;
  playerTiles.push(...currentRoll);
  currentRoll = [];
  renderOwned();
  renderRoll();
  logAction("BUY", { cost });
};

// ===== RENDER OWNED LETTERS =====
function renderOwned() {
  ownedTilesDiv.innerHTML = "";
  playerTiles.forEach((l,i)=>{
    const t = createTile(l, letterCost[l]);
    t.draggable = true;
    t.ondragstart = e => e.dataTransfer.setData("i", i);
    ownedTilesDiv.appendChild(t);
  });
  renderWild();
}

// ===== RENDER WILD TILES =====
function renderWild() {
  wildTilesDiv.innerHTML = "";
  wildTiles.forEach((_,i)=>{
    const t = createTile("*",1);
    t.classList.add("wild-tile");
    t.onclick = () => {
      const l = prompt("Wildcard letter A-Z");
      if (!/^[A-Z]$/i.test(l)) return;
      playerTiles.push(l.toUpperCase());
      wildTiles.splice(i,1);
      renderOwned();
      logAction("WILD_USED",{letter:l.toUpperCase()});
    };
    wildTilesDiv.appendChild(t);
  });
}

// ===== DRAG & DROP TO WORD BUILDER =====
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  const i = e.dataTransfer.getData("i");
  const l = playerTiles.splice(i,1)[0];
  const t = createTile(l, letterCost[l]);
  t.onclick = () => {
    playerTiles.push(l);
    wordBuilder.removeChild(t);
    renderOwned();
    updateWordScore();
  };
  wordBuilder.appendChild(t);
  renderOwned();
  updateWordScore();
};

// ===== UPDATE WORD SCORE =====
function updateWordScore() {
  let sum = 0;
  [...wordBuilder.children].forEach(t=>{
    sum += Number(t.querySelector(".tile-number").textContent);
  });
  potentialWinSpan.textContent = sum * sum;
}

// ===== SUBMIT WORD =====
document.getElementById("check-word-btn").onclick = async () => {
  const tiles = [...wordBuilder.children];
  if (!tiles.length) return alert("Build a word first!");
  const word = tiles.map(t=>t.querySelector(".tile-letter").textContent).join("");
  
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!res.ok) throw new Error("Invalid word");
  } catch {
    logAction("INVALID_WORD",{word});
    return alert(`"${word}" is not a valid word.`);
  }

  const payout = Number(potentialWinSpan.textContent);
  coins += payout;
  coinsSpan.textContent = coins;
  wordBuilder.innerHTML = "";
  potentialWinSpan.textContent = 0;
  logAction("SUBMIT_WORD",{word,payout});
};

// ===== LETTER PRICE GRID =====
function renderLetterPriceGrid() {
  const g = document.getElementById("letter-price-grid");
  g.innerHTML = "";
  Object.entries(letterCost).forEach(([l,c])=>{
    g.appendChild(createTile(l,c));
  });
}
renderLetterPriceGrid();

// ===== GOOGLE DRIVE EXPORT =====
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbbz4uRo-Si9UyX_EtSCtk7OZN5-SBkUKSKQwS3Sbldl-zOBurLidMaymcn2zD9PdK-w/exec";

document.getElementById("exportBtn").onclick = async () => {
  if (!gameLog.length) return alert("No data to export");

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ data: gameLog })
    });
    const result = await res.json();
    if (res.ok && result.success) alert("Uploaded to Google Drive ✅");
    else alert("Upload failed ❌");
  } catch(err) {
    console.error(err);
    alert("Upload failed ❌");
  }
};
