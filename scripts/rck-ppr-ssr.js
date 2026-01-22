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

//-------------EVENT LISTENER LIST--------------//

//LISTEN TO THE USER INPUT FOR ROCK
let rckBtn = document.getElementById("rock");
rckBtn.addEventListener("click", () => {
  let compChoice = compChoiceGenerator(getRandomInt(0, 2));
  let result = computeResult(RPS_CHOICES.ROCK, compChoice);
  callReqAnimationFrame(compChoice, RPS_CHOICES.ROCK, result);
  onTouch.play();
});

//LISTEN TO THE USER INPUT FOR PAPER
let pprBtn = document.getElementById("paper");
pprBtn.addEventListener("click", () => {
  let compChoice = compChoiceGenerator(getRandomInt(0, 2));
  let result = computeResult(RPS_CHOICES.PAPER, compChoice);
  callReqAnimationFrame(compChoice, RPS_CHOICES.PAPER, result);
  onTouch.play();
});

//LISTEN TO THE USER INPUT FOR SCISSOR
let ssrBtn = document.getElementById("scissors");
ssrBtn.addEventListener("click", () => {
  let compChoice = compChoiceGenerator(getRandomInt(0, 2));
  let result = computeResult(RPS_CHOICES.SCISSOR, compChoice);
  callReqAnimationFrame(compChoice, RPS_CHOICES.SCISSOR, result);
  onTouch.play();
});

//TAKE INPUT DIRECTLY FROM KEYBOARD
document.body.addEventListener("keydown", (event) => {
  let compChoice = compChoiceGenerator(getRandomInt(0, 2));
  let result;
  if (event.key === "R" || event.key === "r") {
    result = computeResult(RPS_CHOICES.ROCK, compChoice);
    callReqAnimationFrame(compChoice, RPS_CHOICES.ROCK, result);
    onTouch.play();
  } else if (event.key === "P" || event.key === "p") {
    result = computeResult(RPS_CHOICES.PAPER, compChoice);
    callReqAnimationFrame(compChoice, RPS_CHOICES.PAPER, result);
    onTouch.play();
  } else if (event.key === "S" || event.key === "s") {
    result = computeResult(RPS_CHOICES.SCISSOR, compChoice);
    callReqAnimationFrame(compChoice, RPS_CHOICES.SCISSOR, result);
    onTouch.play();
  } else if (event.key === " ") {
    handleAutoPlay();
  }
});

//REQUEST ANIMATION FRAME FOR SMOOTH RENDERING
const callReqAnimationFrame = (compChoice, userChoice, result) => {
  requestAnimationFrame(() => {
    renderCompChoice(compChoice);
    renderUserChoice(userChoice);
    renderResultEffects(result);
  });
};

//COMPUTER CHOICE GENERATOR BASED ON RANDOM INTEGER
function compChoiceGenerator(compInt) {
  if (compInt === 0) return RPS_CHOICES.ROCK;
  else if (compInt == 1) return RPS_CHOICES.PAPER;
  else return RPS_CHOICES.SCISSOR;
}

//COMPUTE THE RESULT BASED ON USER CHOICE AND COMPUTER CHOICE
function computeResult(userChoice, compChoice) {
  if (compChoice === userChoice) return RPS_RESULTS.TIE;
  else {
    if (
      (compChoice === RPS_CHOICES.ROCK && userChoice === RPS_CHOICES.PAPER) ||
      (compChoice === RPS_CHOICES.PAPER &&
        userChoice === RPS_CHOICES.SCISSOR) ||
      (compChoice === RPS_CHOICES.SCISSOR && userChoice === RPS_CHOICES.ROCK)
    ) {
      return RPS_RESULTS.VICTORY;
    } else return RPS_RESULTS.DEFEAT;
  }
}

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
      let compChoice = compChoiceGenerator(getRandomInt(0, 2));
      let compAsUserChoice = compChoiceGenerator(getRandomInt(0, 2));
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
