import * as Tone from "tone"; // sound library

const bgmUrls = [
  "/sounds/578599__auwenngebleau__slow-rain.m4a",
  "/sounds/347848__foolboymedia__new-york-jazz-loop.wav",
  "/sounds/sub-bass-line-by-alien-i-trust-125_bpm-289271.mp3",
  "/sounds/721259__ncone__funky-beats.wav",
];

let currentBgmIndex = 0;

const bgmPlayers = bgmUrls.map(url => new Tone.Player({
  url: url,
  loop: true,
}).toDestination());

export const analyser = new Tone.Analyser("fft", 1024);
Tone.loaded().then(() => {
  bgmPlayers.forEach(player => player.connect(analyser));
});

const sePlayer = new Tone.Player({
  url: "/sounds/698632__suicdxsaturday__meow51252153-1.ogg",
}).toDestination();

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

export function playSE() {
  sePlayer.start();
}

export function playSound(heights) {
  const availableNotes = [
    "C2", "D2", "E2", "F2", "G2", "A2", "B2",
    "C3", "D3", "E3", "F3", "G3", "A3", "B3",
    "C4", "D4", "E4", "F4", "G4", "A4", "B4",
    "C5", "D5", "E5", "F5", "G5", "A5", "B5",
    "C6", "D6", "E6", "F6", "G6", "A6", "B6"
  ];

  let ns = [];
  for (let height of heights) {
    const noteIndex = Math.floor(mapRange(height, -3, 3, 0, availableNotes.length - 1));
    const n = availableNotes[noteIndex];
    ns.push(n);
  }

  const velocity = Math.random() * 0.5 + 0.5;

  //create a synth and connect it to the main output (your speakers)
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({
    voice0: {
      oscillator: {
        type: "triangle4",
      },
      volume: -30,
      envelope: {
        attack: 0.005,
        release: 0.05,
        sustain: 1,
      },
    },
    voice1: {
      volume: -10,
      envelope: {
        attack: 0.005,
        release: 0.05,
        sustain: 1,
      },
    },
  });
  synth.volume.value = -5;

  synth.triggerAttackRelease(ns, "8n", Tone.now(), velocity);
  synth.connect(effect);
  synth.toDestination();
  effect.connect(reverb);
  reverb.toDestination();
}

export async function startSound() {
  await Tone.start();
  bgmPlayers[currentBgmIndex].start();
  console.log("audio is ready");
}

export function switchBgm() {
  bgmPlayers[currentBgmIndex].stop();
  currentBgmIndex = (currentBgmIndex + 1) % bgmPlayers.length;
  bgmPlayers[currentBgmIndex].start();
}