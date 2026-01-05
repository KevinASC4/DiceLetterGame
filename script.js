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
const authBtn = document.getElementById("authBtn");
const exportBtn = document.getElementById("exportBtn");
const authStatus = document.getElementById("auth-status");

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

// Disable roll/buy buttons until game starts
rollBtn.disabled = true;
buyBtn.disabled = true;

// Letter costs
const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,
  I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,
  Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// Dice face images
const diceFaces = {
  1:"assets/dice/32x/front-side-1.png",
  2:"assets/dice/32x/front-2.png",
  3:"assets/dice/32x/front-3.png",
  4:"assets/dice/32x/front-5.png",
  5:"assets/dice/32x/front-6.png",
  6:"assets/dice/32x/side-6.png"
};

// ================= FUNCTIONS =================
function showNotification(msg,type="success") {
  const n = document.getElementById("notification");
  n.textContent = msg;
  n.className = `notification show ${type}`;
  setTimeout(()=>n.classList.remove("show"),3000);
}

function createTile(letter,cost) {
  const d = document.createElement("div");
  d.className = "tile";
  d.innerHTML = `<div class="tile-letter">${letter}</div><div class="tile-number">${cost}</div>`;
  return d;
}

function renderRoll() {
  const rollDiv = document.getElementById("current-roll");
  rollDiv.innerHTML = "";
  let total = 0;
  currentRoll.forEach(l=>{
    total += letterCost[l];
    rollDiv.appendChild(createTile(l, letterCost[l]));
  });
  priceDisplay.textContent = total ? `Total Price: $${total}` : "";
}

function renderOwned() {
  ownedTilesDiv.innerHTML="";
  playerTiles.forEach((l,i)=>{
    const t = createTile(l, letterCost[l]);
    t.draggable = true;
    t.ondragstart = e => e.dataTransfer.setData("text/plain", i);
    ownedTilesDiv.appendChild(t);
  });
  renderWild();
}

function renderWild() {
  wildTilesDiv.innerHTML="";
  wildTiles.forEach((_,i)=>{
    const t = createTile("*",1);
    t.classList.add("wild-tile");
    t.onclick = ()=>{
      const l = prompt("Wildcard letter A-Z");
      if(!/^[A-Z]$/i.test(l)) return;
      playerTiles.push(l.toUpperCase());
      wildTiles.splice(i,1);
      renderOwned();
      showNotification(`Wildcard used: ${l.toUpperCase()}`);
    };
    wildTilesDiv.appendChild(t);
  });
}

function updateWordScore() {
  let sum=0;
  [...wordBuilder.children].forEach(t=>{
    sum += Number(t.querySelector(".tile-number").textContent);
  });
  potentialWinSpan.textContent = sum*sum;
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
    const s = Math.floor((Date.now()-startTime)/1000);
    timeElapsedSpan.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  },1000);

  gameStarted = true;
  rollBtn.disabled = false;
  buyBtn.disabled = false;
  showNotification("Game Started!");
};

// ================= ROLL DICE =================
rollBtn.onclick = () => {
  if(!gameStarted) return;

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
    if(elapsed >= duration) {
      clearInterval(anim);
      const rollNumber = Math.floor(Math.random()*6)+1;
      diceImg.src = diceFaces[rollNumber];
      currentRoll = Array.from({length: rollNumber},()=>Object.keys(letterCost)[Math.floor(Math.random()*26)]);
      renderRoll();
      showNotification(`Rolled ${rollNumber} letters!`);
    }
  }, interval);
};

// ================= BUY LETTERS =================
buyBtn.onclick = () => {
  if(!gameStarted || !currentRoll.length) return;
  const cost = currentRoll.reduce((s,l)=>s+letterCost[l],0);
  if(coins<cost) return alert("Not enough coins");
  coins -= cost;
  document.getElementById("coins").textContent = coins;
  playerTiles.push(...currentRoll);
  currentRoll=[];
  renderOwned();
  renderRoll();
};

// ================= DRAG & DROP =================
wordBuilder.ondragover = e => e.preventDefault();
wordBuilder.ondrop = e => {
  e.preventDefault();
  const i = e.dataTransfer.getData("text/plain");
  if(i==="") return;
  const l = playerTiles.splice(i,1)[0];
  const t = createTile(l, letterCost[l]);
  t.onclick = ()=>{
    playerTiles.push(l);
    wordBuilder.removeChild(t);
    renderOwned();
    updateWordScore();
  };
  wordBuilder.appendChild(t);
  renderOwned();
  updateWordScore();
};

// ================= INITIAL LETTER GRID =================
(function(){
  const g = document.getElementById("letter-price-grid");
  g.innerHTML="";
  Object.entries(letterCost).forEach(([l,c])=>g.appendChild(createTile(l,c)));
})();

// ================= DROPBOX BUTTON FIX =================
// Open Dropbox auth in new window so it works on GitHub Pages
authBtn.onclick = () => {
  const DROPBOX_APP_KEY = "zd45feuaxe5sgzq";
  const redirectUri = window.location.origin + window.location.pathname;

  if(authBtn.dataset.connected==="true") {
    authBtn.dataset.connected = "false";
    authStatus.textContent = "";
    exportBtn.style.display = "none";
    showNotification("Dropbox disconnected", "error");
  } else {
    const url = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.open(url,"_blank","width=600,height=600");
    showNotification("Connect Dropbox in popup window", "success");
  }
};
