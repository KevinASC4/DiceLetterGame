// ===== GOOGLE API CONFIG =====
const CLIENT_ID = "695131078144-vbsin0iu3otnn9mfjsgv1bb9fhavjbsr.apps.googleusercontent.com";
const DRIVE_FOLDER_ID = "1IXPNyfVbjR5jxxf5GwtZlBVy3h1H2PAY";

let accessToken = null;

// Global variable to store the access token
let gsiAccessToken = null;

// Callback when user signs in with Google Identity Services
function handleCredentialResponse(response) {
  console.log("✅ User signed in with Google ID!");
  // Store the ID token
  const idToken = response.credential;
  
  // Decode to get email
  const base64Url = idToken.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  
  const decoded = JSON.parse(jsonPayload);
  console.log("Signed in as:", decoded.email);
  
  if (authStatus) authStatus.textContent = "✓ Google Drive Connected";
  if (authBtn) authBtn.textContent = "🔓 Sign out";
  if (exportBtn) exportBtn.style.display = "block";
  
  // Now request Drive access via OAuth
  requestDriveAccess();
}

// Request Drive access using OAuth 2.0
function requestDriveAccess() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin + window.location.pathname,
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/drive.file',
    state: 'buyword_game'
  });
  
  // Open OAuth popup
  const authWindow = window.open(
    'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(),
    'googleDriveAuth',
    'width=500,height=600'
  );
  
  // Listen for the response
  window.addEventListener('message', function(event) {
    if (event.data && event.data.access_token) {
      gsiAccessToken = event.data.access_token;
      console.log("✅ Got Drive access token!");
      showNotification("✅ Drive access granted!", "success");
    }
  });
}

// Handle sign out
function handleSignOut() {
  gsiAccessToken = null;
  if (authStatus) authStatus.textContent = "";
  if (authBtn) authBtn.textContent = "🔐 Sign in to Google Drive";
  if (exportBtn) exportBtn.style.display = "none";
  console.log("✅ Signed out");
}

// Initialize Google Sign-In when it loads
window.onload = function() {
  if (window.google && window.google.accounts) {
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse
    });
    
    // Render the sign-in button in authBtn
    if (authBtn) {
      google.accounts.id.renderButton(authBtn, {
        theme: "outline",
        size: "large"
      });
    }
    
    console.log("✅ Google Sign-In Ready");
  } else {
    console.error("Google Identity Services not loaded");
  }
};

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

// Show export button only after auth setup
if (exportBtn) exportBtn.style.display = "none";

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

// ===== NOTIFICATION HELPER =====
function showNotification(message, type = "success") {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.className = `notification show ${type}`;
  setTimeout(() => notif.classList.remove("show"), 3000);
}

if (authBtn) {
  authBtn.onclick = () => {
    if (accessToken) {
      handleSignOut();
      google.accounts.id.disableAutoSelect();
    } else {
      // Button is handled by Google's renderButton, just show sign in
      google.accounts.id.prompt();
    }
  };
}

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

// ===== CSV CONVERSION =====
function convertToCSV(data) {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",")
  );
  return [csvHeaders, ...csvRows].join("\n");
}

// ===== GOOGLE DRIVE UPLOAD =====
async function uploadToGoogleDrive(filename, csvContent) {
  try {
    if (!gsiAccessToken) {
      showNotification("Please authorize Drive access first", "error");
      throw new Error("No Drive access token");
    }
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify({
      name: filename,
      mimeType: "text/csv",
      parents: [DRIVE_FOLDER_ID]
    })], { type: "application/json" }));
    formData.append("file", blob);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
      {
        method: "POST",
        headers: new Headers({ Authorization: `Bearer ${gsiAccessToken}` }),
        body: formData
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }
    return await res.json();
  } catch (err) {
    console.error("Upload error:", err);
    throw err;
  }
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
    showNotification(`"${word}" is not a valid word.`, "error");
    return;
  }

  const payout = Number(potentialWinSpan.textContent);
  coins += payout;
  coinsSpan.textContent = coins;
  wordBuilder.innerHTML = "";
  potentialWinSpan.textContent = 0;
  logAction("SUBMIT_WORD",{word,payout});
  showNotification(`✅ "${word}" sold for $${payout}!`, "success");
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

// ===== EXPORT TO GOOGLE DRIVE =====
exportBtn.onclick = async () => {
  if (!gameLog.length) return showNotification("No game data to export", "error");
  
  if (!accessToken) {
    showNotification("Please sign in to Google Drive first", "error");
    return;
  }

  try {
    exportBtn.disabled = true;
    const filename = `${playerId}-${new Date().getTime()}.csv`;
    const csvContent = convertToCSV(gameLog);
    
    await uploadToGoogleDrive(filename, csvContent);
    showNotification(`✅ Uploaded to Google Drive: ${filename}`, "success");
  } catch (err) {
    console.error(err);
    showNotification("Export failed ❌", "error");
  } finally {
    exportBtn.disabled = false;
  }
};

// ===== INIT =====
// Google Sign-In is initialized in window.onload at the top of the script