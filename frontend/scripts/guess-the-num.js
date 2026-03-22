import { changeText } from "./utils/dom_manipulation.js";
import { GAME_MODES } from "./utils/constants.js";
//CREATE AUDIO OBJECTS
const onReset = new Audio("../resources/welcome.mp3");
const onTouch = new Audio("../resources/onTouch.mp3");

const tracker = new CasinozzTracker('guess');
tracker.startSession('medium');

// ── Adaptive AI State ─────────────────────────────────────
const ML_BASE = window.CASINOZZ_ML || 'http://localhost:5001';
let playerGuessHistory = [];
let currentGuessMode = 'medium';

async function fetchAiCorrectOpt(numOptions) {
  try {
    const res = await fetch(`${ML_BASE}/ml/ai_move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'guess', last_moves: playerGuessHistory, difficulty: currentGuessMode })
    });
    const data = await res.json();
    const idx = (typeof data.ai_choice === 'number') ? data.ai_choice : Math.floor(Math.random() * numOptions);
    return Math.max(0, Math.min(idx, numOptions - 1));
  } catch(e) { return Math.floor(Math.random() * numOptions); }
}

//SET MODE AS MEDIUM BY DEFAULT
let mode = GAME_MODES.MEDIUM;
let choiceProvidedArr = [];
let correctOpt;

let score = JSON.parse(localStorage.getItem("gtnScore"));
if (!score) {
  score = {
    wins: 0,
  };
}

changeText("score", score.wins);

document
  .querySelector(".playground-gtn")
  .addEventListener("keydown", (event) => {
    if (event.key === "Tab") fillOptions();
  });

document.querySelector(".js-generate").addEventListener("click", () => {
  fillOptions();
});

document.getElementById("Easy").addEventListener("click", () => {
  mode = GAME_MODES.EASY;
  tracker.startSession('easy');
  handleMode(GAME_MODES.EASY);
});

document.getElementById("Medium").addEventListener("click", () => {
  mode = GAME_MODES.MEDIUM;
  tracker.startSession('medium');
  handleMode(GAME_MODES.MEDIUM);
});

document.getElementById("Hard").addEventListener("click", () => {
  mode = GAME_MODES.HARD;
  tracker.startSession('hard');
  handleMode(GAME_MODES.HARD);
});

document.querySelector(".js-play-btn").addEventListener("click", () => {
  playGTN();
});

document.querySelector(".js-auto-play").addEventListener("click", () => {
  fillOptions();
  handleAutoPlay(mode);
});

document.querySelector(".reset-btn").addEventListener("click", () => {
  onReset.play();
  handleReset();
});

let userInputVal = document.getElementById("userChoice");
let userSliderVal = document.getElementById("choiceSelector");

let choicesProvided = document.querySelectorAll(".choices-gtn");

choicesProvided.forEach((value, index) => {
  choicesProvided[index].addEventListener("click", () => {
    if (choicesProvided[index].innerText) {
      userInputVal.value = parseInt(choicesProvided[index].innerText);
      onTouch.play();
      handleSlider();
      playGTN();
    }
  });
});

userInputVal.addEventListener("input", () => {
  handleSlider();
});

userInputVal.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    playGTN();
  }
});

userSliderVal.addEventListener("input", () => {
  userInputVal.value = userSliderVal.value;
});

function handleSlider() {
  userSliderVal.value = userInputVal.value;
}

function compChoice() {
  let randomNum = Math.random() * 100;
  return parseInt(randomNum);
}

let option1 = document.getElementById("opt1");
let option2 = document.getElementById("opt2");
let option3 = document.getElementById("opt3");

function choicesArrGenerator() {
  choiceProvidedArr = [];
  if (mode === GAME_MODES.HARD) {
    choiceProvidedArr.push(compChoice());
  } else if (mode === GAME_MODES.MEDIUM) {
    choiceProvidedArr.push(compChoice());
    let ind1 = compChoice();
    let ind2 = compChoice();
    if (choiceProvidedArr.includes(ind1)) {
      if (ind1 >= 95) {
        choiceProvidedArr.push(ind1 - 5);
      } else {
        choiceProvidedArr.push(ind1 + 2);
      }
    } else choiceProvidedArr.push(ind1);
    if (choiceProvidedArr.includes(ind2)) {
      if (ind2 >= 95) {
        choiceProvidedArr.push(ind2 - 5);
      } else {
        choiceProvidedArr.push(ind2 + 2);
      }
    } else choiceProvidedArr.push(ind2);
  } else {
    choiceProvidedArr.push(compChoice());
    let ind1 = compChoice();
    if (choiceProvidedArr.includes(ind1)) {
      if (ind1 >= 95) {
        choiceProvidedArr.push(ind1 - 5);
      } else {
        choiceProvidedArr.push(ind1 + 2);
      }
    } else choiceProvidedArr.push(ind1);
  }
}

function fillOptions() {
  choicesArrGenerator();
  correctOptGenerator();
  if (mode === GAME_MODES.EASY) {
    option1.innerText = choiceProvidedArr[0];
    option3.innerText = choiceProvidedArr[1];
  } else if (mode === GAME_MODES.MEDIUM) {
    option1.innerText = choiceProvidedArr[0];
    option2.innerText = choiceProvidedArr[1];
    option3.innerText = choiceProvidedArr[2];
  }
}

async function correctOptGenerator() {
  const numOptions = (mode === GAME_MODES.HARD) ? 1 : (mode === GAME_MODES.MEDIUM) ? 3 : 2;
  const aiIdx = await fetchAiCorrectOpt(numOptions);
  correctOpt = choiceProvidedArr[Math.min(aiIdx, choiceProvidedArr.length - 1)];
}

let gameResult = document.querySelector(".game-result");

function playGTN() {
  let guessVal = parseInt(userInputVal.value);
  playerGuessHistory.push(guessVal);
  if (playerGuessHistory.length > 20) playerGuessHistory.shift();
  let isWin = correctOpt === guessVal;
  tracker.logEvent('result', { guess: guessVal, actual: correctOpt, playerGuess: guessVal, outcome: isWin ? 'win' : 'loss', mode: mode });
  if (isWin) {
    score.wins += 1;
    gameResult.classList.add("green-result");
    gameResult.innerText = "Victory";
  } else {
    gameResult.classList.remove("green-result");
    if (mode !== GAME_MODES.HARD) {
      gameResult.innerText = "Defeat";
    } else {
      gameResult.innerText = "Defeat correct was  " + correctOpt;
    }
  }
  localStorage.setItem("gtnScore", JSON.stringify(score));
  changeText("score", score.wins);
  setTimeout(() => {
    fillOptions();
  }, 800);
}

function handleMode(mode) {
  if (mode === GAME_MODES.HARD) {
    option2.innerText = "";
    choiceProvidedArr = [];
    option2.classList.add("choices-visibility");
    option1.classList.add("choices-visibility");
    option3.classList.add("choices-visibility");
    fillOptions();
    pausePlay();
  } else if (mode === GAME_MODES.EASY) {
    option3.innerText = "";
    option1.innerText = "";
    choiceProvidedArr = [];
    option1.classList.remove("choices-visibility");
    option3.classList.remove("choices-visibility");
    option2.classList.add("choices-visibility");
    fillOptions();
    pausePlay();
  } else {
    option1.innerText = "";
    option2.innerText = "";
    option3.innerText = "";
    choiceProvidedArr = [];
    option1.classList.remove("choices-visibility");
    option3.classList.remove("choices-visibility");
    option2.classList.remove("choices-visibility");
    fillOptions();
    pausePlay();
  }
}

function handleReset() {
  choiceProvidedArr = [];
  localStorage.removeItem("gtnScore");
  score = JSON.parse(localStorage.getItem("gtnScore"));
  if (!score) {
    score = {
      wins: 0,
    };
  }
  changeText("score", score.wins);
  mode = GAME_MODES.MEDIUM;
  handleMode(mode);
  gameResult.innerText = "";
  fillOptions();
  pausePlay();
}

let isAutoPlay = false;
let intervalId;

function handleAutoPlay() {
  let autoPlayMove;
  if (!isAutoPlay) {
    document.querySelector(".js-auto-play").innerText = "Pause Play";
    if (mode === GAME_MODES.EASY) {
      intervalId = setInterval(() => {
        onTouch.play();
        let i = parseInt((Math.random() * 10) % 2);
        autoPlayMove = choiceProvidedArr[i];
        userInputVal.value = autoPlayMove;
        userSliderVal.value = autoPlayMove;
        playGTN();
      }, 1500);
    } else if (mode === GAME_MODES.MEDIUM) {
      intervalId = setInterval(() => {
        onTouch.play();
        let i = parseInt((Math.random() * 10) % 3);
        autoPlayMove = choiceProvidedArr[i];
        userInputVal.value = autoPlayMove;
        userSliderVal.value = autoPlayMove;
        playGTN();
      }, 1500);
    } else {
      intervalId = setInterval(() => {
        onTouch.play();
        autoPlayMove = compChoice();
        userInputVal.value = autoPlayMove;
        userSliderVal.value = autoPlayMove;
        playGTN();
      }, 1500);
    }
    isAutoPlay = true;
  } else {
    pausePlay();
  }
}

function pausePlay() {
  isAutoPlay = false;
  document.querySelector(".js-auto-play").innerText = "Auto Play";
  clearInterval(intervalId);
}
