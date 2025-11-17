// ===== DOM Elements =====
const diceImg = document.getElementById('dice');
const rollBtn = document.getElementById('roll-dice');
const currentRollDiv = document.getElementById('current-roll');
const ownedTilesDiv = document.getElementById('owned-tiles');
const wildTilesDiv = document.getElementById('wild-tiles');
const wordBuilder = document.getElementById('word-builder');
const checkWordBtn = document.getElementById('check-word-btn');
const usedWordBank = document.getElementById('used-word-bank');
const finishBtn = document.getElementById('finish-game-btn');
const coinsSpan = document.getElementById('coins');
const notification = document.getElementById('notification');

const buyTilesBtn = document.getElementById('buy-tiles-btn');
const discardTilesBtn = document.getElementById('discard-tiles-btn');

// ===== Game State =====
let coins = 200;
let playerTiles = [];
let wildTiles = Array(8).fill('*');
let usedWords = [];
let currentRoll = [];
let actionLog = [];

// ===== Dice Images =====
const diceFaces = [
  "assets/dice/32x/front-side-1.png",
  "assets/dice/32x/front-2.png",
  "assets/dice/32x/front-3.png",
  "assets/dice/32x/front-side-4.png",
  "assets/dice/32x/front-5.png",
  "assets/dice/32x/front-6.png"
];

// ===== Letter groups & cost =====
const letterGroupsBase = {
  1: ['Q','Z','X','J'],
  2: ['K','V','W','Y'],
  3: ['B','C','M','P'],
  4: ['F','H','G','L','D'],
  5: ['A','E','I','O','U','S','T','R'],
  6: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
};

const letterCost = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

// ===== Initialize finite letter pool =====
let letterInventory = {};
for (let group in letterGroupsBase) {
  letterInventory[group] = {};
  letterGroupsBase[group].forEach(letter => {
    letterInventory[group][letter] = 5; // start with 5 of each letter
  });
}

// ===== Price Display =====
const priceDisplay = document.createElement('p'); // shows total price
priceDisplay.id = 'total-price';
buyTilesBtn.parentNode.insertBefore(priceDisplay, buyTilesBtn);

// ===== Roll Dice =====
rollBtn.addEventListener('click', () => {
  const roll = Math.floor(Math.random()*6)+1;
  diceImg.src = diceFaces[roll-1];
  handleLetterRoll(roll);
  logAction(`Rolled dice: ${roll}`);
});

// ===== Handle Letter Roll with limited inventory =====
function handleLetterRoll(roll){
  currentRoll = [];
  const availableLetters = Object.keys(letterInventory[roll]).filter(l => letterInventory[roll][l] > 0);

  if(availableLetters.length === 0){
    showNotification('error', 'No letters left in this group!');
    renderCurrentRoll();
    return;
  }

  for(let i=0; i<roll; i++){
    if(availableLetters.length === 0) break;
    const letter = availableLetters[Math.floor(Math.random()*availableLetters.length)];
    currentRoll.push(letter);
  }

  renderCurrentRoll();
}

// ===== Render Current Roll with Total Price =====
function renderCurrentRoll(){
  currentRollDiv.innerHTML='';
  currentRoll.forEach((letter)=> {
    const div = document.createElement('div');
    div.classList.add('tile');
    div.textContent = letter;
    currentRollDiv.appendChild(div);
  });

  // Show total price
  if(currentRoll.length > 0){
    let totalPips = currentRoll.reduce((sum,l)=>sum+(letterCost[l]||1),0);
    let price = totalPips * totalPips;
    priceDisplay.textContent = `Total Price to Buy: $${price}`;
  } else {
    priceDisplay.textContent = '';
  }
}

// ===== Buy All Tiles =====
buyTilesBtn.addEventListener('click', ()=> {
  if(currentRoll.length===0) return showNotification('error','No tiles to buy!');
  let totalPips = currentRoll.reduce((sum,l)=>sum+(letterCost[l]||1),0);
  let price = totalPips * totalPips;
  if(coins<price) return showNotification('error','Not enough coins!');

  coins -= price;
  coinsSpan.textContent = coins;
  playerTiles.push(...currentRoll);

  // Deduct from inventory
  currentRoll.forEach(letter => {
    for (let group in letterInventory) {
      if(letterInventory[group][letter] > 0){
        letterInventory[group][letter]--;
        break;
      }
    }
  });

  logAction(`Bought tiles for $${price}: ${currentRoll.join(',')}`);
  currentRoll = [];
  renderCurrentRoll();
  renderOwnedTiles();
  showNotification('success', `Bought tiles for $${price}`);
});

// ===== Discard Tiles =====
discardTilesBtn.addEventListener('click', ()=> {
  if(currentRoll.length===0) return showNotification('error','No tiles to discard!');
  logAction(`Discarded tiles: ${currentRoll.join(',')}`);
  currentRoll = [];
  renderCurrentRoll();
  showNotification('success','Tiles discarded');
});

// ===== Render Owned Tiles =====
function renderOwnedTiles(){
  ownedTilesDiv.innerHTML='';
  playerTiles.forEach((tile, idx)=> {
    if(!tile) return;
    const span = document.createElement('span');
    span.textContent = tile;
    span.classList.add('tile');
    span.draggable = true;
    span.addEventListener('dragstart',(e)=>{e.dataTransfer.setData('text/plain',idx)});
    ownedTilesDiv.appendChild(span);
  });
  renderWildTiles();
}

// ===== Render Wild Tiles =====
function renderWildTiles(){
  wildTilesDiv.innerHTML='';
  wildTiles.forEach((tile, idx)=>{
    const span = document.createElement('span');
    span.textContent = tile;
    span.classList.add('wild-tile');
    span.title = "Click to assign letter";
    span.addEventListener('click', ()=>{
      const chosen = prompt("Choose a letter for this wild tile (A-Z)");
      if(!chosen) return;
      const chosenLetter = chosen.toUpperCase();
      if(/^[A-Z]$/.test(chosenLetter)){
        playerTiles.push(chosenLetter);
        wildTiles.splice(idx,1);
        showNotification('success',`Wild tile used as ${chosenLetter}`);
        logAction(`Wild tile assigned as ${chosenLetter}`);
        renderOwnedTiles();
      }
    });
    wildTilesDiv.appendChild(span);
  });
}

// ===== Word Builder Drag & Drop =====
wordBuilder.addEventListener('dragover', e=> e.preventDefault());
wordBuilder.addEventListener('drop', e=>{
  e.preventDefault();
  const idx = e.dataTransfer.getData('text');
  const tile = playerTiles[idx];
  if(!tile) return;
  playerTiles[idx] = null;
  const div = document.createElement('div');
  div.textContent = tile;
  div.classList.add('tile');
  div.addEventListener('click', ()=>{
    playerTiles[idx] = tile;
    wordBuilder.removeChild(div);
    renderOwnedTiles();
  });
  wordBuilder.appendChild(div);
  renderOwnedTiles();
});

// ===== Sell Word =====
checkWordBtn.addEventListener('click', ()=>{
  const word = Array.from(wordBuilder.children).map(d=>d.textContent).join('');
  if(!word) return showNotification('error','No word to sell!');
  const score = calculateWordScore(word);
  coins += score;
  coinsSpan.textContent = coins;
  usedWords.push({word, score});
  renderUsedWords();
  logAction(`Sold word: ${word} for $${score}`);
  wordBuilder.innerHTML='';
});

// ===== Calculate Word Score =====
function calculateWordScore(word){
  let base = 0;
  for(let ch of word) base += letterCost[ch]||1;
  return base*base;
}

// ===== Render Sold Words =====
function renderUsedWords(){
  usedWordBank.innerHTML='';
  usedWords.forEach(w=>{
    const div = document.createElement('div');
    div.textContent = `${w.word} (+$${w.score})`;
    usedWordBank.appendChild(div);
  });
}

// ===== Finish & Export CSV =====
finishBtn.addEventListener('click', ()=>{
  const name = document.getElementById('player-name').value || "NoName";
  const semester = document.getElementById('player-semester').value || "NOSEM";
  const filename = `BuyWord_${name.replaceAll(" ","")}_${semester}.csv`;
  let csv = "Action,Details\n";
  actionLog.forEach(r=>{
    csv += `${r.action},${r.details}\n`;
  });
  const encoded = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  const link = document.createElement('a');
  link.setAttribute('href',encoded);
  link.setAttribute('download',filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('success','CSV Exported!');
});

// ===== Notifications =====
function showNotification(type,msg){
  notification.textContent = msg;
  notification.className = `notification show ${type}`;
  setTimeout(()=>notification.className='notification',2000);
}

// ===== Action Log =====
function logAction(action, details=""){
  actionLog.push({action, details});
}
