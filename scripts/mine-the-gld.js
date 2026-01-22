import {
  getElementByClass,
  removeClass,
  addClass,
  addClassByID,
  removeClassByID,
  changeText,
} from "./utils/dom_manipulation.js";

import { getRandomInt } from "./utils/helperFuncts.js";
import {
  GAME_MODES,
  popupAnimationDelayMS,
  autoPlayDelayMS,
} from "./utils/constants.js";

//UD
const onReset = new Audio("../resources/welcome.mp3");
const onTouch = new Audio("../resources/onTouch.mp3");

const totalCells = 9; //TOTAL CELLS IN THE GRID
let gameMode = GAME_MODES.EASY; //DEFAULT GAME MODE
let mineCellArr = []; //ARRAY TO HOLD THE MINE CELL INDICES
let userSelectCells = []; //ARRAY TO HOLD THE USER SELECTED CELL INDICES
const cellArr = document.querySelectorAll(".grid-cells");
const modeArr = document.querySelectorAll(".mode-name");

//MULTIPLIER TABLE
let multiplier = {
  EASY: ["0x", "1.2x", "1.4x", "1.6x", "1.9x", "2.3x", "2.6x", "2.9x", "3.5x"],
  MEDIUM: ["0x", "1.3x", "1.7x", "2.0x", "2.4x", "2.8x", "3.0x", "3.5x"],
  HARD: ["0x", "1.5x", "2.0x", "2.5x", "3.0x", "3.5x", "4.0x"],
};

//SCORE OBJECT TO HOLD THE CURRENT WINNINGS
let score = {
  wins: "0x",
};

//ON FIRST RENDER -
generateMineCell(gameMode);

//FUNCTION TO CREATE A POOL OF UNIQUE RANDOM NUMBERS
function createUniqueNumberPool(min, max, quantity) {
  const set = new Set();
  while (set.size < quantity) {
    set.add(getRandomInt(min, max));
  }
  return set;
}

//LISTEN TO EACH MODE SELECTION
modeArr.forEach((val, index) => {
  modeArr[index].addEventListener("click", () => {
    gameMode = modeArr[index].id.toUpperCase();
    removeClass("current-mode-name", "green-result");
    changeText("current-mode-name", gameMode);
    onTouch.play();
    resetGame();
  });
});

//LISTEN TO KEYBOARD EVENTS FOR MODE SELECTION AND WITHDRAWAL
document.body.addEventListener("keydown", (event) => {
  if (event.key === "e" || event.key === "E") {
    gameMode = GAME_MODES.EASY;
    removeClass("current-mode-name", "green-result");
    changeText("current-mode-name", GAME_MODES.EASY);
    resetGame();
  } else if (event.key === "m" || event.key === "M") {
    gameMode = GAME_MODES.MEDIUM;
    removeClass("current-mode-name", "green-result");
    changeText("current-mode-name", GAME_MODES.MEDIUM);
    resetGame();
  } else if (event.key === "h" || event.key === "H") {
    gameMode = GAME_MODES.HARD;
    removeClass("current-mode-name", "green-result");
    changeText("current-mode-name", GAME_MODES.HARD);
    resetGame();
  } else if (event.key === "Enter") {
    handleWithdraw();
  }
});

//LISTEN TO THE WITHDRAW BUTTON
document.querySelector(".withdraw-btn").addEventListener("click", () => {
  handleWithdraw();
});

//LISTEN TO THE GENERATE BUTTON
document.querySelector(".js-generate").addEventListener("click", () => {
  if (userSelectCells.length === 0) generateMineCell(gameMode);
  else changeText("current-mode-name", "Withdraw This Game!");
});

//LISTEN TO EACH CELL CLICK
cellArr.forEach((val, index) => {
  cellArr[index].addEventListener("click", () => {
    let selectID = parseInt(cellArr[index].id);
    onTouch.play();
    let result = getResult(selectID);
    if (!userSelectCells.includes(selectID)) {
      userSelectCells.push(selectID);
      if (result) {
        renderAtVictory(selectID);
      } else {
        renderAtDefeat(selectID);
      }
    } else {
      removeClass("current-mode-name", "green-result");
      changeText("current-mode-name", "Please Select Other Boxes");
    }
  });
});

//GENERATES THE MINE CELLS BASED ON THE SELECTED GAME MODE
function generateMineCell(gameMode) {
  //In Easy mode only one mine will be present
  if (gameMode === GAME_MODES.EASY) {
    const mineCells = createUniqueNumberPool(0, 8, 1);
    mineCellArr = [...mineCells];
  }
  //In Medium mode the mineCellArr would contain 2 discrete indices representing the mines
  else if (gameMode === GAME_MODES.MEDIUM) {
    const mineCells = createUniqueNumberPool(0, 8, 2);
    mineCellArr = [...mineCells];
  }
  //In Hard mode the mineCellArr would contain 3 discrete indices representing the mines
  else if (gameMode === GAME_MODES.HARD) {
    const mineCells = createUniqueNumberPool(0, 8, 3);
    mineCellArr = [...mineCells];
  }
}

//EVALUATES RESULT //CHECKS IF THE USER SELECTED CELL IS A MINE OR NOT
function getResult(userChoice) {
  return !mineCellArr.includes(userChoice);
}

//SHOW VICTORY POPUP
function showVictoryPopup() {
  setTimeout(() => {
    removeClass("victory-popup", "show-popup");
  }, popupAnimationDelayMS);
  addClass("victory-popup", "show-popup");
}

//SHOW DEFEAT POPUP
function showDefeatPopup() {
  setTimeout(() => {
    removeClass("defeat-popup", "show-popup");
  }, popupAnimationDelayMS);
  addClass("defeat-popup", "show-popup");
}

//ALERT AT VICTORY BY CHANGING TEXT AND COLOR
function victoryAlert() {
  addClass("current-mode-name", "green-result");
  changeText("current-mode-name", "Victory");
}

//ALERT AT DEFEAT BY CHANGING TEXT AND COLOR
function defeatAlert() {
  removeClass("current-mode-name", "green-result");
  changeText("current-mode-name", "Oops! Deafeat");
}

//RENDER AT VICTORY
function renderAtVictory(userChoice) {
  // count += 1;
  let currCount = userSelectCells.length;
  let mineCount = mineCellArr.length;
  score.wins = multiplier[`${gameMode}`][currCount];
  addClassByID(`${userChoice}`, "gold-cell");
  changeText("score", score.wins);
  changeText("victory-popup", score.wins);
  showVictoryPopup();
  let selectedAllCells = totalCells - mineCount === currCount;
  if (
    (gameMode === GAME_MODES.EASY && selectedAllCells) ||
    (gameMode === GAME_MODES.MEDIUM && selectedAllCells) ||
    (gameMode === GAME_MODES.HARD && selectedAllCells)
  ) {
    setTimeout(() => {
      resetGame();
    }, autoPlayDelayMS);
    victoryAlert();
  }
}

//RENDER AT DEFEAT
function renderAtDefeat() {
  mineCellArr.forEach((val) => {
    addClassByID(`${val}`, "mine-cell");
  });
  showDefeatPopup();
  setTimeout(() => {
    resetGame();
  }, autoPlayDelayMS);
  defeatAlert();
}

//CLEAR ALL THE CELLS
function clearCells() {
  userSelectCells.forEach((val) => {
    removeClassByID(`${val}`, "gold-cell");
  });
  mineCellArr.forEach((val) => {
    removeClassByID(`${val}`, "mine-cell");
  });
}

//RESET THE GAME TO INITIAL STATE
function resetGame() {
  score.wins = multiplier[`${gameMode}`][0];
  requestAnimationFrame(() => {
    removeClass("current-mode-name", "green-result");
    removeClass("defeat-popup", "show-popup");
    removeClass("victory-popup", "show-popup");
    changeText("current-mode-name", gameMode);
    changeText("score", score.wins);
  });
  clearCells();
  mineCellArr = [];
  userSelectCells = [];
  generateMineCell(gameMode);
}

//HANDLE THE WITHDRAW FUNCTIONALITY
function handleWithdraw() {
  setTimeout(() => {
    resetGame();
  }, autoPlayDelayMS);
  onReset.play();
  victoryAlert();
}
