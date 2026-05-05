const { ipcRenderer } = require('electron');

let selectedFilePath = null;

async function selectFile() {
  const path = await ipcRenderer.invoke('select-file');

  if (!path) {
    document.getElementById('status').innerText = "No file selected";
    return;
  }

  selectedFilePath = path;

  document.getElementById('status').innerText = "Selected: " + path;
}

let currentScale = 1;

function openModal(src) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImg');

  modal.style.display = "flex";
  modalImg.src = src;
}

function closeModal() {
  document.getElementById('imageModal').style.display = "none";
}

document.getElementById('imageModal').addEventListener('click', (e) => {
  if (e.target.id === 'imageModal') {
    closeModal();
  }
});

function handleOutsideClick(event) {
  const content = document.getElementById('modalContent');

  // If click is outside content → close
  if (!content.contains(event.target)) {
    closeModal();
  }
}

function processVideo() {
  const status = document.getElementById('status');
  const durationInput = document.getElementById('duration').value;

  if (!selectedFilePath) {
    status.innerText = "Please select a file first!";
    return;
  }

  const duration = durationInput ? parseInt(durationInput) : null;

  status.innerText = "Processing...";

  ipcRenderer.send('process-video', {
    filePath: selectedFilePath,
    duration: duration
  });
}

ipcRenderer.on('process-done', (event, data) => {
  const { audioPath, frames } = data;

  document.getElementById('status').innerText = "Done!";

  // Set audio
  const audioPlayer = document.getElementById('audioPlayer');
  audioPlayer.src = audioPath;

  // Show frames
  const framesDiv = document.getElementById('frames');
  framesDiv.innerHTML = "";

  frames.forEach(frame => {
    const img = document.createElement('img');
    img.src = frame;
    img.width = 120;
    img.style.cursor = "pointer";

    img.onclick = () => openModal(frame);

    framesDiv.appendChild(img);
  });
});

ipcRenderer.on('process-error', (event, error) => {
  document.getElementById('status').innerText = "Error: " + error;
});