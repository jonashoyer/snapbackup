const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const utils = require('./utils');

module.exports = (filePath) => {

  if(!filePath) {
    console.log('\n Missing file path!\n');
    return;
  }

  console.log(`\n Starting SnapBackup...`);

  const maxQueueFile = 512;

  const startTimestamp = Date.now();

  const getTimestamp = () => {
    return ((Date.now() - startTimestamp) / 1000).toFixed(2);
  }

  const configFile = 
    fs.existsSync(path.join(__dirname, 'config.json')) &&
    fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');

  const filters = configFile ? JSON.parse(configFile) : {
    filterEnabled: false,
    folderFilter: [],
    extensionFilter: [],
    ignoreUnderscore: false
  }

  const totalCount = utils.countFolder(filePath, filters);

  console.log(` File count: ${totalCount}`);

  const folderName = filePath.split('\\').slice(-1)[0];
  const backupName = `${folderName}.${utils.getTimestamp()}.zip`;

  let queuedItems = [];
  let processingCount = 0;

  const onQueue = ([dir, el]) => {
    queuedItems.push([dir, el]);
  }

  const onFile = (path) => {
    processingCount++;
    const localPath = path.slice(filePath.length);
    const readStream = fs.createReadStream(path);
    archive.append(readStream, { name: localPath });
  }

  const shouldQueue = () => {
    return processingCount >= maxQueueFile;
  }


  const releaseQueue = () => {
    const freeProcessingCount = maxQueueFile - processingCount;
    queuedItems.slice(0, freeProcessingCount).forEach(([dir, el]) => {
      processingCount++;
      utils.stepElement(dir, el, onQueue, onFile, shouldQueue, filters);
    })
    queuedItems = queuedItems.slice(freeProcessingCount);
  }

  const archive = archiver('zip', {
    zlib: { level: 6 }
  });


  archive.on('close', () => {
    console.log('close');
  })


  archive.on('warning', err => {
    console.error(err);
  })

  archive.on('error', err => {
    console.error(err);
  })

  let nextProgUpdate = 0;
  archive.on('progress', prog => {
    const { total, processed } = prog.entries;
    processingCount = total - processed;

    const currentProg = (processed / totalCount) * 100;

    if (nextProgUpdate < currentProg) {
      console.log(` ${currentProg.toFixed(2)}% ${processed}/${totalCount}, ${getTimestamp()} s`);
      nextProgUpdate = Math.floor(currentProg / 5) * 5 + 5;
    }

    releaseQueue();

    if (processingCount == 0 && queuedItems.length == 0) {
      console.log('\n Finalizing...');
      archive.finalize();
    }
  })

  function getFileSize(filename) {
    let stats = fs.statSync(filename);
    let {size} = stats;
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
  }

  archive.on('finish', () => {
    console.log(`\n Backup finished!\n Time: ${getTimestamp()} s\n File count: ${totalCount}\n Backup size: ${getFileSize(backupName)}\n`);
  });

  const writeSteam = fs.createWriteStream(backupName);
  archive.pipe(writeSteam, { end: true });

  utils.stepFolder(filePath, onQueue, onFile, shouldQueue, filters);
}
