import * as Tone from "tone"; // sound library
import SampleLibrary from '/Tonejs-Instruments.js';

const bgmPlayer = new Tone.Player({
  url: "/sounds/578599__auwenngebleau__slow-rain.m4a",
  loop: true,
}).toDestination();
// const analyser = new Tone.Analyser("fft", 1024);
const analyser = new Tone.Analyser('waveform', 128);
Tone.loaded().then(() => {
  bgmPlayer.connect(analyser);
})

var piano = SampleLibrary.load({
  instruments: "violin"
});
  
piano.toDestination();

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

export function playSound(heights) {
  const availableNotes = [
      "C2", "D2", "E2", "F2", "G2", "A2", "B2",
      "C3", "D3", "E3", "F3", "G3", "A3", "B3",
      "C4", "D4", "E4", "F4", "G4", "A4", "B4",
      "C5", "D5", "E5", "F5", "G5", "A5", "B5",
      "C6", "D6", "E6", "F6", "G6", "A6", "B6"
    ];

  let ns = []
  for(let height of heights){
      const noteIndex = Math.floor(mapRange(height, -3, 3, 0, availableNotes.length - 1));
      const n = availableNotes[noteIndex];
      ns.push(n)
  }
  
  // const mappedValue = mapRange(height, -3, 3, 80, 200);
  // now = Tone.now();
  // synth.triggerAttackRelease(mappedValue, "8n", now);
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
  // synth.triggerAttackRelease(n, "8n", Date.now, velocity);
  synth.connect(effect);
  synth.toDestination();
  effect.connect(reverb);
  reverb.toDestination();
}

export async function startSound() {
  await Tone.start();
  bgmPlayer.start();
  console.log("audio is ready");
}