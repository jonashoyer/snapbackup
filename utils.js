const fs = require('fs');
const path = require('path');

const countFolder = (dir, filters) => {
  const elements = fs.readdirSync(dir);
  return elements.reduce((count, el) => {
    return count + countItem(dir, el, filters);
  }, 0);
}

const countItem = (dir, el, filters) => {

  const { filterEnabled, folderFilter, extensionFilter, ignoreUnderscore } = filters;

  let dirPath = path.join(dir, el);
  let isDir = fs.statSync(dirPath).isDirectory();

  if (isDir) {
    if (filterEnabled) {
      if (folderFilter.some(v => el.includes(v))) return 0;
      if (ignoreUnderscore && el[0] === '_') return 0;
    }
    return countFolder(dirPath, filters);
  }

  if (filterEnabled) {
    let ext = path.extname(el);
    if (extensionFilter.some(v => ext.includes(v))) return 0;
  }

  return 1;
}


const stepFolder = (dir, onQueue, onFile, shouldQueue, filters) => {

  const dirs = fs.readdirSync(dir);
  dirs.forEach(el => {
    stepElement(dir, el, onQueue, onFile, shouldQueue, filters);
  })
}

const stepElement = (dir, el, onQueue, onFile, shouldQueue, filters) => {

  const {filterEnabled, folderFilter, extensionFilter, ignoreUnderscore} = filters;

  if (shouldQueue()) {
    onQueue([dir, el]);
    return;
  }

  let dirPath = path.join(dir, el);
  let isDir = fs.statSync(dirPath).isDirectory();

  if (isDir) {
    if (filterEnabled) {
      if (folderFilter.some(v => el.includes(v))) return;
      if (ignoreUnderscore && el[0] === '_') return;
    }

    return stepFolder(dirPath, onQueue, onFile, shouldQueue, filters);
  }

  
  if (filterEnabled) {
    let ext = path.extname(el);
    if (extensionFilter.some(v => ext.includes(v))) return;
  }

  onFile(dirPath);
}

const getTimestamp = () => {
  const date = new Date();
  const f = num => num < 10 ? `0${num}` : num;
  return `${date.getFullYear()}-${f(date.getMonth())}-${f(date.getDate())} - ${f(date.getHours())}.${f(date.getMinutes())}.${f(date.getSeconds())}`;
}

module.exports = {
  countFolder,
  stepFolder,
  stepElement,
  getTimestamp
}