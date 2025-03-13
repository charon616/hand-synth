import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const video = document.getElementById('video')

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
    })
    .catch(function(err) {
        console.log("An error occurred! " + err);
    });

// Media Pipe
const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 4
    }
);

let lastVideoTime = -1;
// Detect hand landmarks for each frame
export function detectFrame() {
  // Detect hands
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    const handLandmarkerResult = handLandmarker.detectForVideo(video, Date.now());
    lastVideoTime = video.currentTime;
    return handLandmarkerResult;
  }
  return null;
}
