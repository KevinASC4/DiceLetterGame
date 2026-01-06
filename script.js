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
const letterCost = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };
const diceFaces = {
  1:"assets/dice/32x/front-side-1.png",
  2:"assets/dice/32x/front-2.png",
  3:"assets/dice/32x/front-3.png",
  4:"assets/dice/32x/front-side-4.png",
  5:"assets/dice/32x/front-5.png",
  6:"assets/dice/32x/side-6.png"
};

// ================= TILE / RENDER FUNCTIONS =================
function createTile(letter, cost) {
  const d = document.createElement("div");
  d.className = "tile";
  d.innerHTML = `<div class="tile-letter">${letter}</div><div class="tile-number">${cost}</div>`;
  return d;
}

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

function renderOwned() {
  ownedTilesDiv.innerHTML = "";
  playerTiles.forEach((l, i) => {
    const t = createTile(l, letterCost[l]);
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
      playerTiles.push(l.toUpperCase());
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
    sum += t.classList.contains("wild-tile") ? 1 : Number(t.querySelector(".tile-number").textContent);
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
      currentRoll = Array.from({ length: rollNumber }, () => Object.keys(letterCost)[Math.floor(Math.random()*26)]);
      renderRoll();
      showNotification(`Rolled ${rollNumber} letters!`);
      logAction("roll_letters", { rollNumber, letters: [...currentRoll] });
    }
  }, interval);
};

// ================= BUY LETTERS =================
buyBtn.onclick = () => {
  if (!gameStarted || !currentRoll.length) return;
  const cost = currentRoll.reduce((s,l)=>s+letterCost[l],0);
  if (coins<cost) return alert("Not enough coins");
  coins -= cost;
  document.getElementById("coins").textContent = coins;
  playerTiles.push(...currentRoll);
  logAction("buy_letters", { boughtLetters:[...currentRoll], cost, coins, playerTiles:[...playerTiles] });
  currentRoll = [];
  renderOwned();
  renderRoll();
};

// ================= DRAG & DROP =================
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  e.preventDefault();
  const i = e.dataTransfer.getData("text/plain");
  if (i==="") return;
  const l = playerTiles.splice(i,1)[0];
  const t = createTile(l, letterCost[l]);
  t.onclick = () => {
    playerTiles.push(l);
    wordBuilder.removeChild(t);
    renderOwned();
    updateWordScore();
    logAction("remove_tile_from_word", { letter:l, playerTiles:[...playerTiles] });
  };
  if (l === "*") t.classList.add("wild-tile"); // mark wildcard
  wordBuilder.appendChild(t);
  renderOwned();
  updateWordScore();
  logAction("add_tile_to_word", { letter:l, playerTiles:[...playerTiles] });
};

// ================= SELL WORD =================
checkWordBtn.onclick = () => {
  const wordTiles = [...wordBuilder.children];
  if (!wordTiles.length) return alert("Place letters in word builder first!");
  let sum = 0;
  const word = [];
  wordTiles.forEach(t=>{
    const letter = t.querySelector(".tile-letter").textContent;
    const value = t.classList.contains("wild-tile") ? 1 : Number(t.querySelector(".tile-number").textContent);
    sum += value;
    word.push(letter);
  });
  const score = sum*sum;
  coins += score;
  document.getElementById("coins").textContent = coins;
  wordBuilder.innerHTML = "";
  updateWordScore();
  logAction("sell_word", { word: word.join(""), score, coins, remainingTiles: [...playerTiles] });
  showNotification(`Sold word "${word.join("")}" for $${score}`);
  renderOwned();
};

// ================= INITIAL LETTER GRID =================
(function(){
  const g = document.getElementById("letter-price-grid");
  g.innerHTML = "";
  Object.entries(letterCost).forEach(([l,c])=>g.appendChild(createTile(l,c)));
})();

// ================= DROPBOX EXPORT =================
exportBtn.style.display = "inline-block";
exportBtn.onclick = async () => {
  if (!gameLog.length) return alert("No game data to export!");

  const fileName = `${playerId || "game"}_log.csv`;
  const keys = Object.keys(gameLog[0]);
  const csvRows = [
    keys.join(","),
    ...gameLog.map(obj =>
      keys.map(k=>{
        let val = obj[k];
        if (Array.isArray(val)) val = val.join("|");
        return `"${val}"`;
      }).join(",")
    )
  ];
  const csvContent = csvRows.join("\n");

  // ===== DROPBOX TOKEN =====
  const DROPBOX_TOKEN ="sl.u.AGPFetsNtrJ3aeQU5JvX502P8mAFBxqdsb6yKzQpFeOjtobNkza_tdNlaiDryG-D_FN1GNyUZO3v26huMbfnfwlTTx7NiTtiwaKM1m-a8cXJRbXNwT6HGNGRcSJexkES5YClqRcU4LPow8L2xA-AYWrLeBGW-B6N7Ggx3Rx6ZdvgCyAZh1PT-F98FlDQgCqG6jaDsSo7twnUVf62X5n11kL-FnJthNkLlFiAA-axX0B0NFNg4tf5j_a1L1GmvI9XU-ZBSQf-fnxHGYsANA1F2ekBxt0lB-KJCJcENf7bvvfxQ62P49O5AeoOUhuIo-vGipl_nTGhmwfaTgYRHKaUN3Fn7DZPd-n9Y1ms116KLkfYd-Bx5MAMU0mTIusrcWDpOXAgTZXN49OCleNpPL2YC8Uk18SSlh6BXgyF5DFgy-U61AS5C_5JrPr6IgjZZypadK06sKDWar1g27_Q6r2PwjpfjkB5DjbTvdEiJDUIkCPvk7Mc3NFXg9eCk9pgMMG7HaQw2F6dNRKoUEXC6fExIWYqOCrgeHhSlUydcAgK0Paz8KoPxcwXg3EV3oAeGGvKJnLoqrhGaE_J8OT5QymKbjTSWcfdGiqQ7G8W6e_QVY0Nu2hn54ElwH4Bqz-9pQyOVEUXKx63CIYpfe2Qvuh4Ywm5rS_dcjzaC7hq-zcwtv-VBliWmz9fnJBnKtJkcc48h9SiLfTZ3CurP3NiKeZfGNScHxAx8XdWCs9td0pexN6UtcWj1FVxdRDaGTptYypcD6r-EG8Wu8gsaFAHjrQPIdSnBf6zNwzj3rqQ1pyFZW04Fmb9icUgwPXP42_EBGNrFWniwz0XwZ6QKQYklvEsyP7UxemGBt39HiRSx-q1IsV6Utv6NB8v5bAE_OsUFLdWI-aY-yn15x50B65P_sYSQVmOGz2rUhxXvHnT9c4gHCTMMqcRZT35gdpYW79Utjvpob8MaC0AT56OrPdelzhA8JTVsxObWkYqfzaoR2woeyxk9oq64dZ3U69oI2x-3yrOsc3UP19kX1-po9pslliwM2mw2VH_vkx7M7ygmXDy9JZhQ2vAX7bJAmTM2okZElJeZPkWd7Qh7Z8CZUOfIUBGEwhUZIhjZDvz-hVPMRropsqi4NmcvJW7nRFoRTKqZBsUIznG-1LIJEaEeX06Sa4nseJp_Ji_xHUSRqUoZ_NY7HGFhEeWm2PlBVtGwMR7uC6ibfHlyciIwlW2Rvv_wxtC_dLA4LLyH1ox9cia8pxmqdtKD8ihPGpTKH4gi3WoDOwvzRFk7DXv7AGe6q6iPgZY754Br7U2bWjpnYeXbjPxkNn61BvgJY0moI9VS9-TsP9pJuKU0UXe6V31gD3BXquFpliBe-3Emx6six3joyF8ZTJh7VtuZp1Xud6Zq-ts9mIjU2FtrRAXHtzPOWvjuXUU0CIeP75hKjwqm6CUExr-w5W4AQ";

  try {
    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DROPBOX_TOKEN}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/BuyWord-Bentley/${fileName}`,
          mode: "overwrite",
          autorename: true,
          mute: true
        }),
        "Content-Type": "application/octet-stream"
      },
      body: csvContent
    });

    if (res.ok) {
      showNotification(`Game log uploaded automatically to Dropbox!`);
      logAction("dropbox_export", { playerId, path: `/${fileName}` });
    } else {
      const errText = await res.text();
      console.error(errText);
      showNotification("Dropbox upload failed", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Dropbox upload error", "error");
  }
};
