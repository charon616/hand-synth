import * as Tone from "tone"; // sound library
import SampleLibrary from '/Tonejs-Instruments.js';

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

var instruments = SampleLibrary.load({
    instruments: ["piano", "guitar-acoustic", "organ", "violin"],
    // minify: true,
    onload: function() {
    }
});

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

export function playSound(heights, instrument = 'default') {
  let availableNotes;
  let synth;

  switch (instrument) {
    case 'guitar-acoustic':
      availableNotes = ['F4', 'G2', 'G3', 'G4', 'A2', 'A3', 'A4', 'B2', 'B3', 'B4', 'C3', 'C4', 'C5', 'D2', 'D3', 'D4', 'D5', 'E2', 'E3', 'E4', 'F2', 'F3'];
        synth = instruments['guitar-acoustic'];
        break;
    case 'piano':
      console.log("piano");
      availableNotes = ['A7', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
        synth = instruments['piano'];
        break;
    case 'violin':
      availableNotes = ['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'C7', 'E4', 'E5', 'E6', 'G4', 'G5', 'G6'];
        synth = instruments['violin'];
        break;
    default:
        availableNotes = [
          "C2", "D2", "E2", "F2", "G2", "A2", "B2",
          "C3", "D3", "E3", "F3", "G3", "A3", "B3",
          "C4", "D4", "E4", "F4", "G4", "A4", "B4",
          "C5", "D5", "E5", "F5", "G5", "A5", "B5",
          "C6", "D6", "E6", "F6", "G6", "A6", "B6"
        ];
        synth = new Tone.PolySynth(Tone.Synth);
        break;
  }

  let ns = [];
  let notePos = 0;
  for (let height of heights) {
    const noteIndex = Math.floor(mapRange(height['note'], -3, 3, 0, availableNotes.length - 1));
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

  // シンセの設定（個別のボイスではなく、全体の設定を変更）
  if(instrument === 'default') {
    synth.set({
      volume: -8,
      envelope: {
        attack: 0.005,
        release: 0.05,
        sustain: 1,
      },
    });
  } else {
    synth.attack = 0.005;
    synth.release = 1.0;
    synth.sustain = 1.0;
    synth.volume.value = -12;
  }

  // エフェクトチェーンの作成
  const panner = new Tone.Panner(notePos);
  // シンセをエフェクトチェーンに接続
  synth.connect(panner);
  panner.connect(effect);
  effect.connect(reverb);
  reverb.toDestination(); // 最後にスピーカーへ

  // 音を鳴らす
  // synth.triggerAttackRelease(ns, "8n", Tone.now(), velocity);
  console.log('ns', ns);
  synth.triggerAttackRelease(ns, "8n", Tone.now(), velocity);

  // シンセをエフェクトチェーンから切断
  // synth.disconnect(panner);
  // panner.disconnect(effect);
  // effect.disconnect(reverb);
  // 音が鳴り終わった後にシンセをエフェクトチェーンから切断
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