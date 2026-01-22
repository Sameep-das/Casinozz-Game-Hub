import {
  getElementByClass,
  removeClass,
  addClass,
  removePropByClass,
  addClassByID,
  removeClassByID,
  changeText,
  setPropByClass,
} from "./utils/dom_manipulation.js";

import { getRandomInt } from "./utils/randomness.js";

import {
  TOSS,
  popupAnimationDelayMS,
  autoPlayDelayMS,
} from "./utils/constants.js";

//THE AUDIO FILES
const onReset = new Audio("../resources/welcome.mp3");
const onTouch = new Audio("../resources/onTouch.mp3");

//LOCAL STORAGE SAVES AN OBJECT CALLED SCORE WITH
// OBJECT NAME = SCORE AND MEMBER IS WINS, INITIALLY SET TO 0
let score = JSON.parse(localStorage.getItem("ftpScore"));
if (!score) {
  score = {
    wins: 0,
  };
}

//-------------EVENT LISTENER LIST--------------//

//GET THE INPUT FROM THE USER (HEADS OR TAILS)

let tailInput = getElementByClass("js-tail-input");
//LISTEN TO THE USER INPUT FOR TAILS
tailInput.addEventListener("click", () => {
  const compMove = defineToss(getRandomInt(0, 1));
  let result = getResult(TOSS.TAILS, compMove);
  updateDOMByBatch(compMove, result);
  onTouch.play();
});

let headInput = getElementByClass("js-head-input");
//LISTEN TO THE USER INPUT FOR HEADS
headInput.addEventListener("click", () => {
  const compMove = defineToss(getRandomInt(0, 1));
  let result = getResult(TOSS.HEADS, compMove);
  updateDOMByBatch(compMove, result);
  onTouch.play();
});

//LISTEN TO THE RESET BUTTON
let resetBtn = getElementByClass("reset-btn");
resetBtn.addEventListener("click", () => {
  handleReset();
});

//LISTEN TO THE AUTO PLAY BUTTON
let autoPlayBtn = getElementByClass("js-auto-play");
autoPlayBtn.addEventListener("click", () => {
  handleAutoPlay();
});

//EACH TIME PAGE IS RERENDERED THE SCORE IS UPDATED FROM THE LOCAL STORAGE DATA
changeText("score", score.wins);

//COMPUTER'S CHOICE IS CONVERTED INTO HEADS AND TAILS ACCORDINGLY
function defineToss(compMove) {
  return compMove === 0 ? TOSS.HEADS : TOSS.TAILS;
}

//BATCH DOM UPDATES
const updateDOMByBatch = (compMove, result) => {
  renderComputerMove(compMove);
  renderResultEffects(result);
  renderResultPopup(result);
};

//FUNCTION TO RENDER THE COMPUTER'S CHOICE ON THE SCREEN
function renderComputerMove(computerMove) {
  if (computerMove === TOSS.HEADS) {
    removeClass("js-output-icon", "tail-icon");
    addClass("js-output-icon", "head-icon");
  } else {
    removeClass("js-output-icon", "head-icon");
    addClass("js-output-icon", "tail-icon");
  }
}

//FUNCTION TO UPDATE THE SCORE AND UPDATE THE OBJECT IN THE LOCAL STORAGE
function updateScore(isVictory) {
  if (!isVictory && score.wins > 0) {
    score.wins -= 1;
  } else {
    score.wins += 1;
  }
  localStorage.setItem("ftpScore", JSON.stringify(score));
  changeText("score", score.wins);
}

//FUNCTION TO RENDER THE ANIMATION POPUP ACCORDING TO THE RESULT
function renderResultPopup(isVictory) {
  if (isVictory) {
    setTimeout(() => {
      removeClass("victory-popup", "show-popup");
    }, popupAnimationDelayMS);
    addClass("victory-popup", "show-popup");
    updateScore(true);
  } else {
    setTimeout(() => {
      removeClass("defeat-popup", "show-popup");
    }, popupAnimationDelayMS);
    addClass("defeat-popup", "show-popup");
    updateScore(false);
  }
}

//COMPUTES THE RESULT //SIMPLE COMAPRISON
function getResult(userChoice, computerMove) {
  return computerMove === userChoice ? true : false;
}

//RENDERS THE SCREEN AS PER THE RESULT
function renderResultEffects(result) {
  removeClass("toss-result", "emote-disabled");
  if (result) {
    addClass("toss-result", "green-result");
    changeText("toss-result", "Victory!");
  } else {
    removeClass("toss-result", "green-result");
    changeText("toss-result", "Oops! Defeat");
  }
}

//REMOVE THE SIDE EFFECTS WHEN PAUSE OR RESET IS CLICKED
function updateSideEffectsOnReset() {
  removePropByClass("js-head-input", "opacity");
  removePropByClass("js-tail-input", "opacity");
  removeClass("js-head-input", "choice-select");
  removeClass("js-tail-input", "choice-select");
}

//HANDLE THE RESET FUNCTIONALITY
function handleReset() {
  onReset.play(); //PLAY MUSIC
  updateSideEffectsOnReset(); //REMOVE THE SIDE EFFECTS OF PREVIOUS RENDERS
  localStorage.removeItem("ftpScore"); //UPDATE LOCAL STORAGE ITEM TO NULL
  score = JSON.parse(localStorage.getItem("ftpScore")); //CREATE ITEM
  if (score === null) {
    //SET ITEM
    score = {
      wins: 0,
    };
  }
  //REMOVE SIDE EFFECTS IF ANY
  addClass("toss-result", "emote-disabled");
  removeClass("js-output-icon", "head-icon");
  removeClass("js-output-icon", "tail-icon");
  changeText("score", score.wins);
}

//FUNCTION TO RENDER COMPUTER AS AN USER
function renderComputerAsUser(computerMove) {
  if (computerMove === TOSS.HEADS) {
    setPropByClass("js-tail-input", "opacity", "0.7"); //DIMS THE OPPOSITE OPTION TO CHOICE
    removePropByClass("js-head-input", "opacity"); //REMOVES PREVIOUS DIMMED EFFECT ON CURR CHOICE
    removeClass("js-tail-input", "choice-select"); //REMOVES PREVIOUS SELECT BORDER ON OPPOSITE OPTION
    addClass("js-head-input", "choice-select"); //HIGHLIGHTS THE CURRENT CHOICE
  } else {
    setPropByClass("js-head-input", "opacity", "0.7");
    removePropByClass("js-tail-input", "opacity");
    removeClass("js-head-input", "choice-select");
    addClass("js-tail-input", "choice-select");
  }
  onTouch.play(); //PLAYS THE AUDIO
}

let isAutoPlay = false;
let intervalID;
//HANDLE THE AUTO-PLAY FUNCTIONALITY
function handleAutoPlay() {
  if (!isAutoPlay) {
    changeText("js-auto-play", "Pause Play");
    intervalID = setInterval(() => {
      let compAsUserMove = defineToss(getRandomInt(0, 1));
      renderComputerAsUser(compAsUserMove);
      let compMove = defineToss(getRandomInt(0, 1));
      renderComputerMove(compMove);
      let result = getResult(compAsUserMove, compMove);
      renderResultEffects(result);
      renderResultPopup(result);
    }, autoPlayDelayMS);
    isAutoPlay = !isAutoPlay;
  } else {
    updateSideEffectsOnReset();
    changeText("js-auto-play", "Auto Play");
    clearInterval(intervalID);
    isAutoPlay = !isAutoPlay;
  }
}
