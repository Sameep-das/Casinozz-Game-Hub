//THIS FUNCTION IS USED TO GENERATE A RANDOM GUESS USING CRYPTOGRAPHIC TECHNIQUE PROVIDED BY WEB APIS
//GENERATES A RANDOM NUMBER BETWEEN MIN AND MAX INTEGER (INCLUSIVE RANGE)
function secureRandomInt(min, max) {
  const range = max - min + 1; //DETERMINE THE INCLUSIVE RANGE
  //ALLOCATES BUFFER-SPACE FOR AN UNSIGNED INTEGER (1 SINGLE POSITIVE INTEGER)
  const randomBuffer = new Uint32Array(1); //THUS 1 IN THE ARGUMENT
  crypto.getRandomValues(randomBuffer); //FILLS THE 0TH INDEX WITH THE RANDOM GUESS GENERATED
  //SINCE THE RANDOM INTEGER WOULD BE VERY LARGE THUS SHRINK IT DOWN INTO THE RANGE DEFINED EARLIER
  return min + (randomBuffer[0] % range);
}

//A SAFE WRAPPER IF THE ABOVE FUNCTION DOES NOT WORK
export function getRandomInt(min, max) {
  min = Math.ceil(min); //INTEGER MIN
  max = Math.floor(max); //INTEGER MAX
  if (min > max) throw new RangeError("min must be <= max");
  if (
    typeof crypto === "object" &&
    typeof crypto.getRandomValues === "function"
  ) {
    try {
      return secureRandomInt(min, max);
    } catch (e) {
      // fall through to Math.random fallback
      // return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  // FALLBACK TO THIS IF THE TRY BLOCK DOES NOT RUN
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

