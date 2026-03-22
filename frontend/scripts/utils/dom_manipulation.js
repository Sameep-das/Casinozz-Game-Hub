/*Contains helper functions for dom manipulation*/

/*Get the element By class*/

export function getElementByClass(className){
  return document.querySelector(`.${className}`);
}

/*class toggling function*/

export function removeClass(selectorClass, targetClass){
  let element = getElementByClass(selectorClass);
  element.classList.remove(targetClass);
}

export function addClass(selectorClass, targetClass){
  let element = getElementByClass(selectorClass);
  element.classList.add(targetClass);
}

export function removeClassByID(selectorID, targetClass){
  let element = document.getElementById(selectorID);
  element.classList.remove(targetClass);
}

export function addClassByID(selectorID, targetClass){
  let element = document.getElementById(selectorID);
  element.classList.add(targetClass);
}

/*Set CSS properties*/
export function setPropByClass(selectorClass, property, value){
  let element = getElementByClass(selectorClass);
  element.style.setProperty(`${property}`, `${value}`);
}

/*Remove CSS Property*/
export function removePropByClass(selectorClass, property){
  let element = getElementByClass(selectorClass);
  element.style.removeProperty(`${property}`);
}

/*Manipulate Text*/
export function changeText(selectorClass, text){
  let element = getElementByClass(selectorClass);
  element.innerText = `${text}`;
}