import {
  getElementByClass,
  removeClass,
  addClass,
  setPropByClass,
  changeText,
} from "./utils/dom_manipulation.js";

import { getRandomInt } from "./utils/helperFuncts.js";

import {
  RPS_CHOICES,
  RPS_RESULTS,
  popupAnimationDelayMS,
  autoPlayDelayMS,
} from "./utils/constants.js";

const onReset = new Audio("../resources/welcome.mp3");
const onTouch = new Audio("../resources/onTouch.mp3");

const tracker = new CasinozzTracker('rps');
tracker.startSession('easy');
const aiQueue = window.CasinozzAI.create({ game: 'rps', tracker });

//-------------EVENT LISTENER LIST--------------//

//LISTEN TO THE USER INPUT FOR ROCK
// let playerMove = null;
class PlayerMove {
  constructor(size = 20) {
    this.currentIndex = 0;
    this.size = size;
    this.playerMoveHistory = [];
  }

  #isFull() {
    return this.currentIndex >= this.size;
  }

  push(playerMove) {
    if(!playerMove) return;
    if(this.#isFull()) {
      this.playerMoveHistory.shift();
      this.currentIndex--;
    }
    this.playerMoveHistory.push(playerMove);
    this.currentIndex++;
  }
}

const player = new PlayerMove();

let rckBtn = document.getElementById("rock");
rckBtn.addEventListener("click", async () => {
  handleMove(RPS_CHOICES.ROCK);
});

//LISTEN TO THE USER INPUT FOR PAPER
let pprBtn = document.getElementById("paper");
pprBtn.addEventListener("click", async () => {
  handleMove(RPS_CHOICES.PAPER);
});

//LISTEN TO THE USER INPUT FOR SCISSOR
let ssrBtn = document.getElementById("scissors");
ssrBtn.addEventListener("click", async () => {
  handleMove(RPS_CHOICES.SCISSOR);
});



//TAKE INPUT DIRECTLY FROM KEYBOARD
document.body.addEventListener("keydown", (event) => {
  let playerMove = null;
  if(event.key === " "){
    handleAutoPlay();
    return;
  }
  if (event.key === "R" || event.key === "r") {
    playerMove = RPS_CHOICES.ROCK;
  } else if (event.key === "P" || event.key === "p") {
    playerMove = RPS_CHOICES.PAPER;
  } else if (event.key === "S" || event.key === "s") {
    playerMove = RPS_CHOICES.SCISSOR;
  }
  handleMove(playerMove);
});

async function handleMove(playerMove){
  if(!playerMove) return;
  player.push(playerMove);
  aiQueue.recordPlayerMove(playerMove);
  tracker.logEvent('move', { actor: 'player', player_move: playerMove });
  let compChoice = randomRPS();
  let result = computeResult(playerMove, compChoice);
  callReqAnimationFrame(compChoice, playerMove, result);
  onTouch.play();
}

function randomRPS() {
  // BUGFIX: RPS used to call the ML service directly and sometimes returned
  // "SCISSORS", which broke result calculation because this game uses "SCISSOR".
  // Easy mode now stays local; harder modes consume normalized queued moves.
  return aiQueue.nextMove({ mode: 'easy' });
}

const COUNTERS = { [RPS_CHOICES.ROCK]: RPS_CHOICES.PAPER, [RPS_CHOICES.PAPER]: RPS_CHOICES.SCISSOR, [RPS_CHOICES.SCISSOR]: RPS_CHOICES.ROCK };
function computeResult(playerMove, cpuMove) {
    if (playerMove === cpuMove) return RPS_RESULTS.TIE;
    if (COUNTERS[cpuMove] === playerMove) return RPS_RESULTS.VICTORY;
    return RPS_RESULTS.DEFEAT;
}
  


//CREATING OR FETCHING THE SCORE OBJECT IN OR FROM LOCAL STORAGE
let score = JSON.parse(localStorage.getItem("rpsScore"));
if (score === null) {
  score = {
    wins: 0,
    losses: 0,
    ties: 0,
  };
}
//SET SCOREBOAD TO SCORE.WINS ON EACH REFRESH
changeText("score", score.wins);
changeText(
  "js-score",
  `Wins : ${score.wins} | Losses : ${score.losses} | Ties : ${score.ties}`,
);



//REQUEST ANIMATION FRAME FOR SMOOTH RENDERING
const callReqAnimationFrame = (compChoice, userChoice, result) => {
  let outcomeStr = 'tie';
  if (result === RPS_RESULTS.VICTORY) outcomeStr = 'win';
  else if (result === RPS_RESULTS.DEFEAT) outcomeStr = 'loss';
  tracker.logEvent('round_result', {
    actor: 'system',
    player_move: userChoice,
    ai_move: compChoice,
    outcome: outcomeStr
  });

  requestAnimationFrame(() => {
    renderCompChoice(compChoice);
    renderUserChoice(userChoice);
    renderResultEffects(result);
  });
};

//----RENDERING FUNCTIONS ---//

//FUNCTION TO RENDER THE USER'S CHOICE ON THE SCREEN
function renderCompChoice(computerMove) {
  removeClass("js-compChoice", "paper-icon");
  removeClass("js-compChoice", "scissor-icon");
  removeClass("js-compChoice", "rock-icon");
  if (computerMove === RPS_CHOICES.ROCK) {
    addClass("js-compChoice", "rock-icon");
  } else if (computerMove === RPS_CHOICES.PAPER) {
    addClass("js-compChoice", "paper-icon");
  } else {
    addClass("js-compChoice", "scissor-icon");
  }
}

function renderUserChoice(userMove) {
  removeClass("js-userChoice", "paper-icon");
  removeClass("js-userChoice", "scissor-icon");
  removeClass("js-userChoice", "rock-icon");
  if (userMove === RPS_CHOICES.ROCK) {
    addClass("js-userChoice", "rock-icon");
  } else if (userMove === RPS_CHOICES.PAPER) {
    addClass("js-userChoice", "paper-icon");
  } else {
    addClass("js-userChoice", "scissor-icon");
  }
}

//SET EFFECTS FOR VICTORY
function renderVictoryEffect() {
  score.wins += 1;
  localStorage.setItem("rpsScore", JSON.stringify(score));
  removeClass("js-result", "white-result");
  addClass("js-result", "green-result");
  changeText("js-result", "Victory!");
}

//SET EFFECTS FOR DEFEAT
function renderDefeatEffect() {
  score.losses += 1;
  localStorage.setItem("rpsScore", JSON.stringify(score));
  changeText("js-result", "Oops! Defeat");
  removeClass("js-result", "green-result");
  removeClass("js-result", "white-result");
}

//SET EFFECTS FOR TIE
function renderTieEffect() {
  score.ties += 1;
  localStorage.setItem("rpsScore", JSON.stringify(score));
  changeText("js-result", "Game Tie");
  removeClass("js-result", "green-result");
  addClass("js-result", "white-result");
}

//REMOVE ALL SIDE EFFECTS BEFORE RENDERING NEW ONES
function removeSideEffects() {
  removeClass("js-compChoice", "emote-disabled");
  removeClass("js-userChoice", "emote-disabled");
  removeClass("js-result", "emote-disabled");
}

//UPDATE THE SCOREBOARD
function updateScoreBoard() {
  changeText("score", score.wins);
  changeText(
    "js-score",
    `Wins : ${score.wins} | Losses : ${score.losses} | Ties : ${score.ties}`,
  );
}

//RENDER THE EFFECTS BASED ON THE RESULT
function renderResultEffects(result) {
  removeSideEffects();

  if (result === RPS_RESULTS.VICTORY) {
    renderVictoryEffect();
  } else if (result === RPS_RESULTS.TIE) {
    renderTieEffect();
  } else {
    renderDefeatEffect();
  }

  updateScoreBoard();
}

//---RENDERING FUNCTIONS END---//

//RESET BUTTON FUNCTIONALITY
let resetBtn = getElementByClass("reset-btn");
resetBtn.addEventListener("click", () => {
  handleReset();
  onReset.play();
});

//HANDLE THE RESET FUNCTIONALITY
function handleReset() {
  localStorage.removeItem("rpsScore");
  score = JSON.parse(localStorage.getItem("rpsScore"));
  if (score === null) {
    score = {
      wins: 0,
      losses: 0,
      ties: 0,
    };
  }
  changeText(
    "js-score",
    `Wins : ${score.wins} | Losses : ${score.losses} | Ties : ${score.ties}`,
  );
  removeSideEffects();
  changeText("score", score.wins);
  changeText("js-auto-play", "Auto Play");
  clearInterval(autoPlayID);
  isAutoPlay = false;
}

//AUTO-PLAY BUTTON FUNCTIONALITY
let autoPlayBtn = getElementByClass("js-auto-play");
autoPlayBtn.addEventListener("click", () => {
  handleAutoPlay();
});

//HANDLE THE AUTO-PLAY FUNCTIONALITY
let autoPlayID;
let isAutoPlay = false;
function handleAutoPlay() {
  if (!isAutoPlay) {
    changeText("js-auto-play", "Pause Play");
    autoPlayID = setInterval(function () {
      let compChoice = randomRPS();
      let compAsUserChoice = randomRPS();
      player.push(compAsUserChoice);
      aiQueue.recordPlayerMove(compAsUserChoice);
      tracker.logEvent('move', { actor: 'autoplay', player_move: compAsUserChoice });
      let result = computeResult(compAsUserChoice, compChoice);
      callReqAnimationFrame(compChoice, compAsUserChoice, result);
      onTouch.play();
    }, autoPlayDelayMS);
    isAutoPlay = !isAutoPlay;
  } else {
    changeText("js-auto-play", "Auto Play");
    clearInterval(autoPlayID);
    isAutoPlay = !isAutoPlay;
  }
}
