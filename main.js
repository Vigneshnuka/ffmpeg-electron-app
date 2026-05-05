const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { dialog } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

/* ================================
   VIDEO PROCESSING LOGIC
================================ */
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi'] }
    ]
  });

  if (result.canceled) return null;

  return result.filePaths[0];
});

ipcMain.on('process-video', (event, data) => {

  const { filePath, duration } = data;

  if (!filePath) {
    event.reply('process-error', 'No file path received');
    return;
  }

  // Create timestamp folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const outputDir = app.isPackaged
  ? path.join(app.getPath('documents'), 'FFmpegToolOutputs')
  : path.join(__dirname, 'outputs');
  const audioDir = path.join(outputDir, 'audio');
  const framesDir = path.join(outputDir, 'frames');

  [audioDir, framesDir].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  const audioOutput = path.join(audioDir, 'output.mp3');
  const frameOutput = path.join(framesDir, 'frame_%03d.jpg');

  const safeInput = `"${filePath}"`;
  const safeAudio = `"${audioOutput}"`;
  const safeFrames = `"${frameOutput}"`;

  // Duration flag
  const durationFlag = duration && duration > 0 ? `-t ${duration}` : "";

  // Limit frames to 5
  const frameLimit = "-vframes 10";
  const ffmpegPath = require('ffmpeg-static');
  const audioCmd = `"${ffmpegPath}" -y -i ${safeInput} ${durationFlag} -q:a 0 -map a ${safeAudio}`;
  const frameCmd = `"${ffmpegPath}" -y -i ${safeInput} ${durationFlag} ${safeFrames}`;

  exec(audioCmd, (err) => {
    if (err) {
      event.reply('process-error', 'Audio extraction failed');
      return;
    }

    exec(frameCmd, (err) => {
      if (err) {
        event.reply('process-error', 'Frame extraction failed');
        return;
      }

      // Send only 5 frames
      const frames = [];
      for (let i = 1; i <= 5; i++) {
        const frameName = `frame_${String(i).padStart(3, '0')}.jpg`;
        frames.push(path.join(framesDir, frameName));
      }

      event.reply('process-done', {
        audioPath: audioOutput,
        frames: frames
      });
    });
  });

});