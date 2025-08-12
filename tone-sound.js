import * as Tone from "tone"; // sound library
import SampleLibrary from '/Tonejs-Instruments.js';
import { mapRange, isMobile } from './utils.js'; // Import mapRange function

const isMobileDevice = isMobile(); // Check if the device is mobile

let bgmUrls;

if(!isMobileDevice) {
  bgmUrls = [
    "/sounds/lluvia-relajante-rain-2-210937.mp3",
    "/sounds/gentle-rain-for-relaxation-and-sleep-337279.mp3",
    "/sounds/cozy-soft-rain-under-umbrella-116183.mp3",
    "/sounds/rain-and-thunder-sfx-12820.mp3",
  ];
} else {
  bgmUrls = [
    "/sounds/lluvia-relajante-rain-2-210937.mp3"
  ];
}

let currentBgmIndex = 0;

const bgmPlayers = bgmUrls.map(url => new Tone.Player({
  url: url,
  loop: true,
  volume: -6
}).toDestination());

let instruments;
if(!isMobileDevice) {
  instruments = SampleLibrary.load({
    instruments: ["piano", "guitar-acoustic", "organ", "violin"],
    // minify: true,
    onload: function() {
    }
  });
} else {
  instruments = SampleLibrary.load({
    instruments: [],
    // minify: true,
    onload: function() {
    }
  });
}

export const analyser = new Tone.Analyser("fft", 1024);
Tone.loaded().then(() => {
  bgmPlayers.forEach(player => player.connect(analyser));
  document.getElementById('start-button').disabled = false; // Enable the button after all buffers are loaded
  document.getElementById('start-button-mobile').disabled = false; // Enable the button after all buffers are loaded
  console.log("All audio buffers are loaded.");
});

// set reverb
const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.2,
  preDelay: 0.25,
});

await reverb.generate();

// Create an effect node that creates a feedback delay
const effect = new Tone.FeedbackDelay("8n", 1 / 3);
effect.wet.value = 0.2;

// global panner to control stereo position
const globalPanner = new Tone.Panner(0);
globalPanner.connect(effect);
effect.connect(reverb);
reverb.toDestination();

let lastPlayTime = 0; // Track the last play time
const MIN_PLAY_INTERVAL = 200; // Minimum interval in milliseconds

export function playSound(heights, instrument = 'default') {
  const now = Date.now();
  if (now - lastPlayTime < MIN_PLAY_INTERVAL) {
    console.warn('Skipping sound to avoid overlap');
    return; // Skip if the interval is too short
  }
  lastPlayTime = now; // Update the last play time

  let availableNotes;
  let synth;

  switch (instrument) {
    case 'guitar-acoustic':
      availableNotes = ['F4', 'G2', 'G3', 'G4', 'A2', 'A3', 'A4', 'B2', 'B3', 'B4', 'C3', 'C4', 'C5', 'D2', 'D3', 'D4', 'D5', 'E2', 'E3', 'E4', 'F2', 'F3'];
      synth = instruments['guitar-acoustic'];
      break;
    case 'piano':
      availableNotes = ['A7', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
      synth = instruments['piano'];
      break;
    case 'violin':
      availableNotes = ['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'C7', 'E4', 'E5', 'E6', 'G4', 'G5', 'G6'];
      synth = instruments['violin'];
      break;
    default:
      availableNotes = [
        "C3", "D3", "E3", "F3", "G3", "A3", "B3",
        "C4", "D4", "E4", "F4", "G4", "A4", "B4"
      ];
      synth = new Tone.PolySynth(Tone.Synth);
      break;
  }

  let ns = [];
  let notePos = 0;
  for (let height of heights) {
    // Use a narrower range for mobile (x: -2 to 2), else default -3 to 3
    let noteIndex;
    if (isMobileDevice) {
      noteIndex = Math.floor(mapRange(height['note'], -2, 2, 0, availableNotes.length - 1));
    } else {
      noteIndex = Math.floor(mapRange(height['note'], -3, 3, 0, availableNotes.length - 1));
    }
    notePos = height['pos'];
    if(notePos < -1){
      notePos = -1;
    } else if(notePos > 1){
      notePos = 1;
    }
    const n = availableNotes[noteIndex];
    ns.push(n);
  }

  const velocity = Math.random() * 0.5 + 0.5;

  // settings for synth
  if(instrument === 'default') {
    synth.set({
      volume: -8,

      envelope: {
        attack: 0.01,
        decay: 0.1,
        release: 1.5,
        sustain: 0.8
      },
    });
  } else {
    synth.attack = 0.005;
    synth.release = 1.0;
    synth.sustain = 1.0;
    synth.volume.value = -12;
  }

  // renew globalPanner
  globalPanner.pan.value = notePos;

  // connect synth to globalPanner
  synth.connect(globalPanner);
  synth.triggerAttackRelease(ns, "8n", Tone.now(), velocity);

  // disconnect synth after a short time
  setTimeout(() => {
    try {
      synth.disconnect(globalPanner);
    } catch(e) {}
    if(instrument === 'default') {
      synth.dispose();
    }
  }, 500); // 8n
}

export async function startSound() {
  await Tone.start();
  bgmPlayers[currentBgmIndex].start();
  console.log("audio is ready");
}

export function switchBgm() {
  const previousBgmIndex = currentBgmIndex;
  bgmPlayers[previousBgmIndex].stop(); // Stop the previous BGM without disposing

  currentBgmIndex = (currentBgmIndex + 1) % bgmPlayers.length;
  bgmPlayers[currentBgmIndex].start();
}

let meowFiles;

if(!isMobileDevice) {
  meowFiles = [
    "/sounds/meow/cat-meow-1-fx-306178.mp3",
    "/sounds/meow/cat-meow-2-fx-306181.mp3",
    "/sounds/meow/cat-meow-4-fx-306180.mp3",
    "/sounds/meow/cat-meow-8-fx-306184.mp3",
    "/sounds/meow/cat-meow-11-fx-306193.mp3",
    "/sounds/meow/cat-meow-13-fx-306192.mp3",
    "/sounds/meow/cat-meow-297927.mp3",
    "/sounds/meow/698632__suicdxsaturday__meow51252153-1.ogg"
  ];
} else {
  meowFiles = [
    "/sounds/meow/cat-meow-1-fx-306178.mp3",
    "/sounds/meow/cat-meow-2-fx-306181.mp3"
  ];
}

const meowPlayers = new Array(meowFiles.length).fill(null).map((_, i) => {
  return new Tone.Player({
    url: meowFiles[i],
    loop: false
  }).toDestination();
});

export function playRandomMeow() {
  console.log("play random meow sound");
  for (const player of meowPlayers) {
    if (player.state === 'started') {
      console.log("Meow player is already playing, skipping this one.");
      return;
    }
  }
  const index = Math.floor(Math.random() * meowPlayers.length);
  const meowPlayer = meowPlayers[index];
  if (meowPlayer.buffer && meowPlayer.buffer.loaded) {
    meowPlayer.start();
    // Remove dispose onstop: Tone.Player is reusable
  } else {
    console.log(`Meow player ${index} buffer not loaded yet.`);
  }
}