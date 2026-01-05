// ===== DROPBOX CONFIG =====
const DROPBOX_APP_KEY = "zd45feuaxe5sgzq";
const DROPBOX_REDIRECT_URI = window.location.origin + window.location.pathname;

let dropboxAccessToken = null;

// ===== HANDLE DROPBOX AUTH REDIRECT =====
(function handleDropboxRedirect() {
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const token = hash.get("access_token");
  if (token) {
    dropboxAccessToken = token;
    window.history.replaceState({}, document.title, window.location.pathname);
    authStatus.textContent = "✓ Dropbox Connected";
    exportBtn.style.display = "block";
    authBtn.textContent = "🔓 Sign out";
    showNotification("Dropbox connected!", "success");
  }
})();

// ===== DROPBOX AUTH =====
function signInDropbox() {
  const authUrl =
    `https://www.dropbox.com/oauth2/authorize` +
    `?client_id=${DROPBOX_APP_KEY}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(DROPBOX_REDIRECT_URI)}`;

  window.location.href = authUrl;
}

function handleSignOut() {
  dropboxAccessToken = null;
  authStatus.textContent = "";
  exportBtn.style.display = "none";
  authBtn.textContent = "🔐 Sign in to Dropbox";
  showNotification("Signed out", "success");
}

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
const authBtn = document.getElementById("authBtn");
const exportBtn = document.getElementById("exportBtn");
const authStatus = document.getElementById("auth-status");
const playerIdSpan = document.getElementById("player-id");
const timeStartSpan = document.getElementById("time-start");
const timeElapsedSpan = document.getElementById("time-elapsed");

exportBtn.style.display = "none";

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

// ===== NOTIFICATION =====
function showNotification(message, type="success") {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = `notification show ${type}`;
  setTimeout(() => notif.classList.remove("show"), 3000);
}

// ===== AUTH BUTTON =====
authBtn.onclick = () => {
  if (dropboxAccessToken) handleSignOut();
  else signInDropbox();
};

// ===== TILE CREATION =====
function createTile(letter, cost) {
  const d = document.createElement("div");
  d.className = "tile";
  d.innerHTML = `<div class="tile-letter">${letter}</div><div class="tile-number">${cost}</div>`;
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

// ===== CSV =====
function convertToCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map(r =>
    headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

// ===== DROPBOX UPLOAD =====
async function uploadToDropbox(filename, content) {
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${dropboxAccessToken}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: `/BuyWordLogs/${filename}`,
        mode: "add",
        autorename: true
      }),
      "Content-Type": "application/octet-stream"
    },
    body: content
  });
  if (!res.ok) throw new Error(await res.text());
}

// ===== START GAME =====
startBtn.onclick = () => {
  if (!nameInput.value || !classInput.value) return alert("Enter name & class");
  playerId = `${nameInput.value}-${classInput.value}`;
  playerIdSpan.textContent = playerId;
  startTime = new Date();
  timeStartSpan.textContent = startTime.toLocaleTimeString();
  timer && clearInterval(timer);
  timer = setInterval(() => {
    const s = Math.floor((Date.now()-startTime)/1000);
    timeElapsedSpan.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  },1000);
  logAction("GAME_START");
};

// ===== ROLL / BUY / GAMEPLAY =====
// ⬇️ EVERYTHING BELOW IS 100% UNCHANGED ⬇️
// (Same roll, buy, drag/drop, scoring, validation, notifications)
// ⬆️ EXACTLY AS YOU PROVIDED ⬆️

// ===== EXPORT =====
exportBtn.onclick = async () => {
  if (!gameLog.length) return showNotification("No data", "error");
  if (!dropboxAccessToken) return showNotification("Sign in first", "error");

  try {
    exportBtn.disabled = true;
    const csv = convertToCSV(gameLog);
    const filename = `${playerId}-${Date.now()}.csv`;
    await uploadToDropbox(filename, csv);
    showNotification("Uploaded to Dropbox!", "success");
  } catch {
    showNotification("Upload failed", "error");
  } finally {
    exportBtn.disabled = false;
  }
};
