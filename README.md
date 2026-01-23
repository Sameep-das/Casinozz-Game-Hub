# CASINOZZ - A Game Hub

Casinozz is a game hub which includes various single player games in different game mode options.

## Games Included

    1. Rock Paper Scissors
    2. Mine The Gold
    3. Guess The Number
    4. Flip The Coin

## Features

- Contains different Game Levels - 'Easy', 'Medium', 'Hard'
- Keyboard interactions are present.
- Responsive Design
- Scores are not reset when refreshed.

## Tech Stack

**Client:** HTML, CSS, Vanilla JavaScript

## Deployment Link

- <a href="https://sameep-das.github.io/Casinozz-Game-Hub-/" target="_blank" title="Casinozz">Casinozz-game hub</a>

## API Documentation

### Helper Functions

#### DOM Manipulation (`scripts/utils/dom_manipulation.js`)

- `getElementByClass(className)`: Retrieves the first element with the specified class name.
  - **Parameters**: `className` (string) - The class name to search for.
  - **Returns**: DOM element or null.

- `removeClass(selectorClass, targetClass)`: Removes a CSS class from the element with the specified class.
  - **Parameters**:
    - `selectorClass` (string) - The class of the element to modify.
    - `targetClass` (string) - The class to remove.

- `addClass(selectorClass, targetClass)`: Adds a CSS class to the element with the specified class.
  - **Parameters**:
    - `selectorClass` (string) - The class of the element to modify.
    - `targetClass` (string) - The class to add.

- `removeClassByID(selectorID, targetClass)`: Removes a CSS class from the element with the specified ID.
  - **Parameters**:
    - `selectorID` (string) - The ID of the element to modify.
    - `targetClass` (string) - The class to remove.

- `addClassByID(selectorID, targetClass)`: Adds a CSS class to the element with the specified ID.
  - **Parameters**:
    - `selectorID` (string) - The ID of the element to modify.
    - `targetClass` (string) - The class to add.

- `setPropByClass(selectorClass, property, value)`: Sets a CSS property on the element with the specified class.
  - **Parameters**:
    - `selectorClass` (string) - The class of the element to modify.
    - `property` (string) - The CSS property to set.
    - `value` (string) - The value to set for the property.

- `removePropByClass(selectorClass, property)`: Removes a CSS property from the element with the specified class.
  - **Parameters**:
    - `selectorClass` (string) - The class of the element to modify.
    - `property` (string) - The CSS property to remove.

- `changeText(selectorClass, text)`: Changes the inner text of the element with the specified class.
  - **Parameters**:
    - `selectorClass` (string) - The class of the element to modify.
    - `text` (string) - The new text content.

#### Utility Functions (`scripts/utils/helperFuncts.js`)

- `getRandomInt(min, max)`: Generates a random integer between min and max (inclusive). Uses cryptographic random if available, falls back to Math.random.
  - **Parameters**:
    - `min` (number) - The minimum value.
    - `max` (number) - The maximum value.
  - **Returns**: Random integer between min and max.

#### Constants (`scripts/utils/constants.js`)

- `TOSS`: Object with HEADS and TAILS constants.
- `GAME_MODES`: Object with EASY, MEDIUM, HARD constants.
- `RPS_CHOICES`: Object with ROCK, PAPER, SCISSOR constants.
- `RPS_RESULTS`: Object with VICTORY, DEFEAT, TIE constants.
- `popupAnimationDelayMS`: Delay for popup animations (700ms).
- `autoPlayDelayMS`: Delay for auto-play (1800ms).

## How Each Game Works

### 1. Rock Paper Scissors

A classic game where you compete against the computer. Choose Rock, Paper, or Scissors by clicking the buttons or using keyboard shortcuts (R, P, S). The computer randomly selects its choice. The winner is determined by standard rules:

- Rock beats Scissors
- Scissors beat Paper
- Paper beats Rock
- Same choices result in a tie

Scores are tracked for wins, losses, and ties. Features auto-play mode where the computer plays against itself. Reset button clears all scores.

### 2. Mine The Gold

A mining game with a 3x3 grid. The goal is to select cells to mine gold while avoiding mines. Different difficulty modes:

- **Easy**: 1 mine
- **Medium**: 2 mines
- **Hard**: 3 mines

Each safe selection increases your multiplier. You can withdraw at any time to cash out your current winnings. If you hit a mine, the game ends and you lose. After successfully mining all safe cells, you win the maximum multiplier for that mode.

### 3. Guess The Number

The computer generates a random number between 0 and 100. Your task is to guess it correctly. Difficulty modes affect the hints provided:

- **Easy**: 3 number options, one is correct
- **Medium**: 3 number options, one is correct
- **Hard**: No options shown, input your guess manually (correct number revealed on defeat)

Use the slider or input field to make your guess. Click on option buttons or press Enter to submit. Scores track total wins.

### 4. Flip The Coin

A simple coin flip betting game. Choose Heads or Tails before the computer flips the coin. If your choice matches the result, you win and your score increases. If not, you lose (score decreases if above 0). Features auto-play mode for continuous flipping.

## Demo

![Screenshot 2025-06-26 115857](https://github.com/user-attachments/assets/03c0fd7c-4447-4eba-8fb4-7f7bf488e86c)

![Screenshot 2025-06-26 115754](https://github.com/user-attachments/assets/c51d38de-70ff-46a3-826e-3bb8f94f5e5a)

![Screenshot 2025-06-26 115737](https://github.com/user-attachments/assets/9dd11167-d356-4571-b109-58f3ea0411d1)

![Screenshot 2025-06-26 115823](https://github.com/user-attachments/assets/ffc46943-e052-47b7-9237-ff5d2415338f)

![Screenshot 2025-06-26 115811](https://github.com/user-attachments/assets/7cbb1a3f-d534-4404-b188-dbd0110ab470)

## Author

Sameep Das
