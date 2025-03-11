import * as THREE from 'three'
import * as Tone from "tone"; // sound library
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { MeshPostProcessingMaterial } from 'three/addons/materials/MeshPostProcessingMaterial.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import SampleLibrary from '/Tonejs-Instruments.js';

/**
 * Debug
 */
const gui = new GUI()
gui.hide()

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Video
 */
const video = document.getElementById('video')
const vidTexture = new THREE.VideoTexture( video );

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
let landmarkSpheres = [];
let landmarkLines = [];
const scaler = 1;
let handRayOrigins = []; // Array of ray origins for each hand
let isPinching = false; // Flag to indicate if the thumb and index finger or middle finger are pinching

function createLandmarkSphere(size) {
    const geometry = new THREE.SphereGeometry(size || 0.1, 8, 8);

    // const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const sphere = new THREE.Mesh(geometry, matcapMaterial);
    // const sphere = new THREE.Mesh(geometry, landmarkMaterial.clone());
    const sphere = new THREE.Mesh(geometry, landmarkMaterial.clone());
    scene.add(sphere);
    return sphere;
}

function ndcToWorld(ndcX, ndcY) {
    const aspect = (camera.right - camera.left) / (camera.top - camera.bottom);

    const worldX = ndcX * (frustumSize * aspect) / 2;
    const worldY = ndcY * (frustumSize / 2);
    
    return new THREE.Vector3(worldX, worldY, 0); // z=0
}

function drawInterpolatedLines(landmarks, waveform) {
    const numPoints = 10; // Number of points to interpolate

    const interpolate = (start, end, t) => {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t,
        };
    };

    const points1 = [];
    const points2 = [];

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;

        let pos1 = ndcToWorld(-landmarks[1].x * 2 + 1, -landmarks[1].y * 2 + 1);
        let pos2 = ndcToWorld(-landmarks[5].x * 2 + 1, -landmarks[5].y * 2 + 1);
        let pos3 = ndcToWorld(-landmarks[0].x * 2 + 1, -landmarks[0].y * 2 + 1);
        let pos4 = ndcToWorld(-landmarks[17].x * 2 + 1, -landmarks[17].y * 2 + 1);

        // Adjust positions based on waveform data
        const waveformIndex = Math.floor((i / numPoints) * waveform.length);
        const amplitude = waveform[waveformIndex] * 0.1; // Adjust the amplitude scale as needed

        pos1.y += amplitude;
        pos2.y += amplitude;
        pos3.y += amplitude;
        pos4.y += amplitude;

        points1.push(interpolate(pos1, pos2, t));
        points2.push(interpolate(pos3, pos4, t));
    }

    // beginShape();
    // for (let i = 0; i < values.length; i++) {
    //   const amplitude = values[i];
    //   const x = map(i, 0, values.length - 1, 0, width);
    //   const y = height / 2 + amplitude * height;
    //   // Place vertex
    //   vertex(x, y);
    // }
    // endShape();

    let lineIndex = 0;
    for (let i = 0; i < points1.length; i++) {
        let line;
        const points = []
        for (let i = 0; i < waveform.length; i++) {
            const amplitude = waveform[i];
            const x = mapRange(i, 0, waveform.length - 1, 0, 6);
            const y = 10 / 2 + amplitude * 10;
            const z = 0
            const p = new THREE.Vector3(x,y,z);
            points.push(p);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const h = Math.round((i / lineNum) * 360);
        const s = 100;
        const l = Math.round((i / lineNum) * 100);
        const color = new THREE.Color(`hsl(${h},${s}%,${l}%)`);
        
        const material = new THREE.LineBasicMaterial({
            color:color
        });
            
        const l2 = new THREE.Line(geometry,material);
        lineArr[i] = l2;
        // scene.add(lineArr[i]);

        // if (lineIndex < landmarkLines.length) {
        //     // Update existing line
        //     // line = landmarkLines[lineIndex];
        //     // line.geometry.setFromPoints([
        //     //     new THREE.Vector3(points1[i].x, points1[i].y, points1[i].z),
        //     //     new THREE.Vector3(points2[i].x, points2[i].y, points2[i].z),
        //     // ]);
        // } else {
        //     // Create new line
        //     // const geometry = new THREE.BufferGeometry().setFromPoints([
        //     //     new THREE.Vector3(points1[i].x, points1[i].y, points1[i].z),
        //     //     new THREE.Vector3(points2[i].x, points2[i].y, points2[i].z),
        //     // ]);
        //     // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        //     // line = new THREE.Line(geometry, material);
        //     // scene.add(line);
        //     // landmarkLines.push(line);
        // }
        // lineIndex++;
    }

    // Remove any extra lines
    while (lineIndex < landmarkLines.length) {
        const line = landmarkLines.pop();
        scene.remove(line);
    }
}

// function drawInterpolatedLines(landmarks) {
//     const numPoints = 100; // Number of points to interpolate

//     const interpolate = (start, end, t) => {
//         return {
//             x: start.x + (end.x - start.x) * t,
//             y: start.y + (end.y - start.y) * t,
//             z: start.z + (end.z - start.z) * t,
//         };
//     };

//     const points1 = [];
//     const points2 = [];

//     for (let i = 0; i <= numPoints; i++) {
//         const t = i / numPoints;

//         let pos1 = ndcToWorld(-landmarks[1].x * 2 + 1, -landmarks[1].y * 2 + 1)
//         let pos2 = ndcToWorld(-landmarks[5].x * 2 + 1, -landmarks[5].y * 2 + 1)
//         let pos3 = ndcToWorld(-landmarks[0].x * 2 + 1, -landmarks[0].y * 2 + 1)
//         let pos4 = ndcToWorld(-landmarks[17].x * 2 + 1, -landmarks[17].y * 2 + 1)

//         points1.push(interpolate(pos1, pos2, t));
//         points2.push(interpolate(pos3, pos4, t));
//     }

//     let lineIndex = 0;
//     for (let i = 0; i < points1.length; i++) {
//         let line;
//         if (lineIndex < landmarkLines.length) {
//             // Update existing line
//             line = landmarkLines[lineIndex];
//             line.geometry.setFromPoints([
//                 new THREE.Vector3(points1[i].x, points1[i].y, points1[i].z),
//                 new THREE.Vector3(points2[i].x, points2[i].y, points2[i].z),
//             ]);
//         } else {
//             // Create new line
//             const geometry = new THREE.BufferGeometry().setFromPoints([
//                 new THREE.Vector3(points1[i].x, points1[i].y, points1[i].z),
//                 new THREE.Vector3(points2[i].x, points2[i].y, points2[i].z),
//             ]);
//             const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
//             line = new THREE.Line(geometry, material);
//             scene.add(line);
//             landmarkLines.push(line);
//         }
//         lineIndex++;
//     }

//     // Remove any extra lines
//     while (lineIndex < landmarkLines.length) {
//         const line = landmarkLines.pop();
//         scene.remove(line);
//     }
// }

function processResults(results) {
    // Clear previous hand ray origins
    handRayOrigins = [];

    // Create or update spheres based on the number of landmarks
    if (results.landmarks) {
        let sphereIndex = 0;
        for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            for (let j = 0; j < landmarks.length; j++) {
                const landmark = landmarks[j];
                let sphere;
                if (sphereIndex < landmarkSpheres.length) {
                    // Update existing sphere
                    sphere = landmarkSpheres[sphereIndex];
                } else {
                    // Create new sphere
                    if(j === 4 || j === 8 || j === 12) {
                        sphere = createLandmarkSphere(0.15);
                    }
                    else {
                        sphere = createLandmarkSphere(0.1);
                    }
                    landmarkSpheres.push(sphere);
                }
                // Convert landmark coordinates to world coordinates
                // mirror x-axis
                let pos = ndcToWorld(-landmark.x * 2 + 1, -landmark.y * 2 + 1);

                sphere.position.set(pos.x, pos.y, pos.z);
                sphereIndex++;
            }

            // Calculate distance between thumb (j=4) and index finger (j=8) or middle finger (j=12)
            const thumb = landmarks[4];
            const indexFinger = landmarks[8];
            const middleFinger = landmarks[12];

            // mirror x-axis
            handRayOrigins.push(new THREE.Vector3(-indexFinger.x * 2 + 1, -indexFinger.y * 2 + 1, -indexFinger.z));

            const distanceToIndex = Math.sqrt(
                Math.pow(thumb.x - indexFinger.x, 2) +
                Math.pow(thumb.y - indexFinger.y, 2) +
                Math.pow(thumb.z - indexFinger.z, 2)
            );

            const distanceToMiddle = Math.sqrt(
                Math.pow(thumb.x - middleFinger.x, 2) +
                Math.pow(thumb.y - middleFinger.y, 2) +
                Math.pow(thumb.z - middleFinger.z, 2)
            );

            const threshold = 0.1; // Set your threshold distance here

            if (distanceToIndex < threshold || distanceToMiddle < threshold) {
                // Change color of thumb and index finger spheres if distance is below threshold
                landmarkSpheres[4].material.color.set(0x2e46ff); // Change thumb to green
                landmarkSpheres[8].material.color.set(0x2e46ff); // Change index finger to green
                isPinching = true;
            } else {
                // Reset color of thumb and index finger spheres
                landmarkSpheres[4].material.color.set(0xffffff); // Change thumb to red
                landmarkSpheres[8].material.color.set(0xffffff); // Change index finger to red
                isPinching = false;
            }

            // Draw interpolated lines
            // Get waveform data
            // const waveform = analyser.getValue();

            // Draw interpolated lines with waveform data
            // drawInterpolatedLines(landmarks, waveform);
        }
        // Remove any extra spheres
        while (sphereIndex < landmarkSpheres.length) {
            const sphere = landmarkSpheres.pop();
            scene.remove(sphere);
            handRayOrigins = [];
        }
    } else {
        // No landmarks detected, remove all spheres
        while (landmarkSpheres.length > 0) {
            const sphere = landmarkSpheres.pop();
            scene.remove(sphere);
        }
        handRayOrigins = [];
        isPinching = false;
    }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const doorColorTexture = textureLoader.load('/textures/door/color.jpg')
const doorAlphaTexture = textureLoader.load('/textures/door/alpha.jpg')
const doorAmbientOcclusionTexture = textureLoader.load('/textures/door/ambientOcclusion.jpg')
const doorHeightTexture = textureLoader.load('/textures/door/height.jpg')
const doorNormalTexture = textureLoader.load('/textures/door/normal.jpg')
const doorMetalnessTexture = textureLoader.load('/textures/door/metalness.jpg')
const doorRoughnessTexture = textureLoader.load('/textures/door/roughness.jpg')
const matcapTexture = textureLoader.load('/textures/matcaps/3.png')
const gradientTexture = textureLoader.load('/textures/gradients/5.jpg')
doorColorTexture.colorSpace = THREE.SRGBColorSpace
matcapTexture.colorSpace = THREE.SRGBColorSpace

/** 
 * Material
 */
// MeshBasicMaterial
// const basicMaterial = new THREE.MeshBasicMaterial()
// basicMaterial.map = doorColorTexture
// basicMaterial.color = new THREE.Color(0x00ff00)
// basicMaterial.wireframe = true
// basicMaterial.transparent = true
// basicMaterial.alphaMap = doorAlphaTexture
// basicMaterial.side = THREE.DoubleSide

// MeshMatcapMaterial
const matcapMaterial = new THREE.MeshMatcapMaterial()
matcapMaterial.matcap = matcapTexture

// MeshPhysicalMaterial
const material = new THREE.MeshPhysicalMaterial()
material.metalness = 0
material.roughness = 0.05
// material.map = doorColorTexture
// material.aoMap = doorAmbientOcclusionTexture
// material.aoMapIntensity = 1
// material.displacementMap = doorHeightTexture
// material.displacementScale = 0.2
// material.metalnessMap = doorMetalnessTexture
// material.roughnessMap = doorRoughnessTexture
// material.normalMap = doorNormalTexture
// material.normalScale.set(0.5, 0.5)
material.transparent = true
// material.alphaMap = doorAlphaTexture

// Clearcoat
material.clearcoat = 0.5
material.clearcoatRoughness = 1

gui.add(material, 'clearcoat').min(0).max(1).step(0.0001)
gui.add(material, 'clearcoatRoughness').min(0).max(1).step(0.0001)
gui.addColor(material, 'color')

// Sheen
material.sheen = 1
material.sheenRoughness = 1
material.sheenColor.set('#949494')

gui.add(material, 'sheen').min(0).max(1).step(0.0001)
gui.add(material, 'sheenRoughness').min(0).max(1).step(0.0001)
gui.addColor(material, 'sheenColor')

// Iridescence
material.iridescence = 1
material.iridescenceIOR = 1
material.iridescenceThickness = [ 100, 360 ]

gui.add(material, 'iridescence').min(0).max(1).step(0.0001)
gui.add(material, 'iridescenceIOR').min(1).max(2.333).step(0.0001)
gui.add(material.iridescenceThicknessRange, '0').min(1).max(1000).step(1)
gui.add(material.iridescenceThicknessRange, '1').min(1).max(1000).step(1)

// Transmission
material.transmission = 1
material.ior = 1.8
material.thickness = 0.5

gui.add(material, 'transmission').min(0).max(1).step(0.0001)
gui.add(material, 'ior').min(1).max(10).step(0.0001)
gui.add(material, 'thickness').min(0).max(1).step(0.0001)

gui.add(material, 'metalness').min(0).max(1).step(0.0001)
gui.add(material, 'roughness').min(0).max(1).step(0.0001)

material.color = new THREE.Color(0x2e46ff)





// MeshPhysicalMaterial
const landmarkMaterial = new THREE.MeshPhysicalMaterial()
landmarkMaterial.metalness = 0
landmarkMaterial.roughness = 0
landmarkMaterial.transparent = true

// Clearcoat
landmarkMaterial.clearcoat = 0.5
landmarkMaterial.clearcoatRoughness = 1

// Transmission
landmarkMaterial.transmission = 1
landmarkMaterial.ior = 2.2
landmarkMaterial.thickness = 0.1


/**
 * Objects
 */
const vibrantColors = [
    0xef2a28, // red
    0xffe300, // yellow
    0xa8c7fa, // lightblue
    0xff85c3, // pink
    0x2d5ed5, // blue
    0x48c9b0, // green
    0xf39c12, // orange
    0x85929e, // gray
    0xd580ff // purple
];

const notes = [];
const notePositions = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
// const notePositions = [-5, -3, -1, 0, 1, 3, 5];

for (let i = 0; i < notePositions.length; i++) {
    let geometry;
    const randomValue = Math.random();
    if (randomValue < 0.25) {
        geometry = new THREE.SphereGeometry(0.4, 16, 16);
    } else if (randomValue < 0.5) {
        geometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 32);
    } else if (randomValue < 0.75) {
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    } else {
        geometry = new THREE.ConeGeometry(0.3, 0.6, 32 ); 
    }

    // random color
    const temp_mat = material.clone();
    const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
    temp_mat.color = new THREE.Color(randomColor);

    const note = new THREE.Mesh(
        geometry,
        temp_mat
    );

    // ランダムな回転速度を設定
    note.rotationSpeed = {
        x: Math.random() * 0.5,
        y: Math.random() * 0.5,
        z: Math.random() * 0.5
    };

    const ypos = Math.random() * 6 - 3;

    note.position.x = notePositions[i];
    note.position.y = ypos;
    note.position.z = 0;
    note.castShadow = true;
    notes.push(note);
    scene.add(note);
}

let lineArr = [];
const lineNum = 50;
const lineLength = 10;
const segmentNum = 100;
const amplitude = 5;

function drawLines() {
    const time = Date.now() / 4000;
    for(let i = 0; i < lineNum; i++){
        const points = [];
    
        for(let j = 0; j <= segmentNum; j++){
            const x = ((lineLength/segmentNum) * j) - lineLength / 2;
            const px = j / (50 + i);
            const py = i / 50 + time;
            const y = amplitude * noise.perlin2(px,py) + 3;
    
            //Z軸を調整
            const z = i * 0.1 - ((lineNum * 0.1) / 2);
    
            const p = new THREE.Vector3(x,y,z);
            points.push(p);
        }
    
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const h = Math.round((i / lineNum) * 360);
        const s = 100;
        const l = Math.round((i / lineNum) * 100);
        const color = new THREE.Color(`hsl(${h},${s}%,${l}%)`);
        
        const material = new THREE.LineBasicMaterial({
            color:color
        });
            
        const line = new THREE.Line(geometry,material);
        lineArr[i] = line
        scene.add(lineArr[i]);
    }
}

// drawLines();

/**
 * Models
 */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let cat = null;
gltfLoader.load(
    '/models/cat3.glb',
    (gltf) =>
    {
        cat = gltf.scene
        cat.scale.set(0.5, 0.5, 0.5)
        gltf.scene.position.set(-4, -3.2, 0)
        cat.rotation.set(0.5, 0.67, -0.1) // set param from gui
        // // gltf.scene.rotation.z = Math.PI * 0.5

        // cat.traverse((child) => {
        //     if (child.isMesh) {
        //         child.material = material
        //     }
        // });

        scene.add(cat)
        return cat
    }
)

/**
 * Draw Progress Bar
 */

const lineGeometry = new THREE.CylinderGeometry(0.05, 0.05, 10, 16);
const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8
});
const progressBar = new THREE.Mesh(lineGeometry, lineMaterial);
progressBar.position.x = -5
scene.add(progressBar);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(0, 2, 5)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.intensity = 0.5
scene.add(directionalLight)

// const directionalLightHelper = new THREE.DirectionalLightHelper( directionalLight );
// scene.add( directionalLightHelper );

const pointLight = new THREE.PointLight(0xffffff, 30)
pointLight.position.x = 2
pointLight.position.y = 3
pointLight.position.z = 4
scene.add(pointLight)

/**
 * Environment map
 */
const rgbeLoader = new RGBELoader()
rgbeLoader.load('/textures/environmentMap/studio_small_09_4k.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping
    // set intensity
    environmentMap.encoding = THREE.RGBEEncoding

    scene.background = new THREE.Color(0xD6D5D9)
    scene.environment = environmentMap
    // scene.background = environmentMap
})

/**
 * Raycaster
 */
const raycaster = new THREE.Raycaster();
let offset = new THREE.Vector3();
let basePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0のxy平面

const progressRaycaster = new THREE.Raycaster();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
// const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)

// Calculate aspect ratio
const aspect = sizes.width / sizes.height;

// Define the frustum size
const frustumSize = 6;

// const camera = new THREE.PerspectiveCamera(

// )

// Create an Orthographic Camera
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2, // left
    frustumSize * aspect / 2,  // right
    frustumSize / 2,           // top
    frustumSize / -2,          // bottom
    0.1,                       // near
    100                        // far
);

camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Audio
 */

const bgmPlayer = new Tone.Player({
    url: "/sounds/578599__auwenngebleau__slow-rain.m4a",
    // url: "/sounds/sub-bass-line-by-alien-i-trust-125_bpm-289271.mp3",
    loop: true,
}).toDestination();
// const distortion = new Tone.Distortion(0.4).toDestination();
// const filter = new Tone.Filter(400, "lowpass").toDestination();
// const analyser = new Tone.Analyser("fft", 1024);
const analyser = new Tone.Analyser('waveform', 128);
Tone.loaded().then(() => {
    // bgmPlayer.connect(distortion);
    // bgmPlayer.connect(filter);
    bgmPlayer.connect(analyser);
})

let isStart = false
document.getElementById('start-button').addEventListener('click', async () => {
    await Tone.start();
    bgmPlayer.start();
    isStart = true
    document.getElementById('start-screen').style.display = 'none';
});

var piano = SampleLibrary.load({
    instruments: "violin"
});
    
piano.toMaster();

// //play a middle 'C' for the duration of an 8th note
// window.addEventListener('click', async() => {
//     // player.start();
//     now = Tone.now();
//     // synth.triggerAttackRelease(80, "8n", now);
//     // synth.triggerAttackRelease(40, "8n", now + 0.5);
//     synth.triggerAttackRelease("A4", "8n", now + 1);
//     synth.triggerAttackRelease("C5", "8n", now + 1.5);
//     synth.triggerAttackRelease("E5", "8n", now + 2);

//     // openHiHatPart.start(now);
//     // closedHatPart.start(now);
// })

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// const openHiHatPart = new Tone.Part(((time) => {
//     openHiHat.triggerAttack(time);
// }), [{ "8n": 2 }, { "8n": 6 }])

// const closedHiHat = new Tone.NoiseSynth({
//     volume: -10,
//     envelope: {
//         attack: 0.01,
//         decay: 0.15
//     },
// }).toDestination();

// Setup a reverb with ToneJS
const reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.2,
    preDelay: 0.25,
});

// Load the reverb
await reverb.generate();

// Create an effect node that creates a feedback delay
const effect = new Tone.FeedbackDelay("8n", 1 / 3);
effect.wet.value = 0.2;

function playSound(heights) {
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

    // const testsynth = new Tone.PolySynth().toDestination();
    // //play a chord
    // testsynth.triggerAttackRelease(["C4", "E4", "A4"], 1);

    synth.triggerAttackRelease(ns, "8n", Tone.now(), velocity);
    // synth.triggerAttackRelease(n, "8n", Date.now, velocity);
    // // Wire up our nodes:
    synth.connect(effect);
    synth.connect(Tone.Master);
    effect.connect(reverb);
    reverb.connect(Tone.Master);
}

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Postprocessing
 */
const effectComposer = new EffectComposer(renderer)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.setSize(sizes.width, sizes.height)

const renderScene = new RenderPass(scene, camera)
effectComposer.addPass(renderScene)

// const glitchPass = new GlitchPass()
// effectComposer.addPass(glitchPass)
const gtaoPass = new GTAOPass(scene, camera);
// gtaoPass.output = GTAOPass.OUTPUT.Off;
effectComposer.addPass(gtaoPass);

const outputPass = new OutputPass()
effectComposer.addPass(outputPass) 

const groundMaterial = new MeshPostProcessingMaterial({ 
    color: 0xd1d4d6,
    envMapIntensity: 0,
    aoPassMap: gtaoPass.gtaoMap,
    side: THREE.DoubleSide
});

// background plane
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    groundMaterial
)
plane.rotation.y = Math.PI; 
plane.position.z = -1
plane.receiveShadow = true;
// scene.add(plane);

// video plane
// const videoPlane = new THREE.Mesh(
//     new THREE.PlaneGeometry(2, 1.5),
//     new THREE.MeshBasicMaterial({ map: vidTexture })
// )
// // videoPlane.rotation.y = Math.PI;
// videoPlane.position.x = 2
// videoPlane.position.y = -2
// videoPlane.position.z = 1
// scene.add(videoPlane);

/**
 * Mouse
 */
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (event) =>
{
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1
})

/**
 * Animate
 */
const clock = new THREE.Clock()

let currentIntersect = null
let modelIntersects = null
let currentProgressIntersectsObjects = null

const tick = () =>
{
    const values = analyser.getValue();
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    const scaleValue = mapRange(averageValue, -120, -90, 0.75, 0.25);

    if(cat) {
        cat.scale.set(scaleValue, scaleValue, scaleValue);
    }

    const deltaTime = clock.getDelta()
    const elapsedTime = clock.getElapsedTime()

    // // Animate objects
    // notes[0].position.y = Math.sin(elapsedTime * 0.3) * 1.5
    // notes[2].position.y = Math.sin(elapsedTime * 1.4) * 1.5

    for (const note of notes) {
        note.rotation.x += note.rotationSpeed.x * deltaTime;
        note.rotation.y += note.rotationSpeed.y * deltaTime;
        note.rotation.z += note.rotationSpeed.z * deltaTime;
    }

    progressBar.position.x += deltaTime * 1.75
    if(progressBar.position.x > 7)
    {
        progressBar.position.x = -7
    }

    // Cast a ray
    const objectsToTest = notes

    // Cast rays from all index fingers
    if(handRayOrigins.length > 0) {
        const rayOrigin = handRayOrigins[0];
        // const rayDirection = new THREE.Vector3(0, 0, -1); // Assuming the ray direction is along the negative z-axis
        // raycaster.set(rayOrigin, rayDirection);
        // raycaster.setFromCamera(new THREE.Vector2(rayOrigin.x, rayOrigin.y), camera);
        raycaster.setFromCamera(rayOrigin, camera);
        const intersects = raycaster.intersectObjects(objectsToTest);

        if(cat){
            modelIntersects = raycaster.intersectObject(cat, true)
    
            if(modelIntersects.length)
            {
                cat.scale.set(0.6, 0.6, 0.6)
            } 
        }
    
        // reset to default1
        for(const object of objectsToTest)
        {
            object.scale.set(1, 1, 1)
            // object.material.color.set('#2e46ff')
        }
    
        // change if intersect
        for(const intersect of intersects)
        {
            intersect.object.scale.set(1.3, 1.3, 1.3)
            // intersect.object.material.color.set('#ff0000')
        }
    
        if(intersects.length)
        {
            if(currentIntersect === null)
            {
            }
            currentIntersect = intersects[0]
        } else {
            if(currentIntersect)
            {
            }
            currentIntersect = null
        }

        if (isPinching && currentIntersect) {
            // Convert screen coordinates to world coordinates
            const intersection = new THREE.Vector3();
            raycaster.ray.intersectPlane(basePlane, intersection); // move objects on xy plane
            currentIntersect.object.position.copy(intersection);
        }
    }

    const progressBarPosition = new THREE.Vector3(progressBar.position.x, 10, progressBar.position.z);
    const progressBarDirection = new THREE.Vector3(0, -1, 0);
    progressRaycaster.set(progressBarPosition, progressBarDirection);
    const progressBarIntersects = progressRaycaster.intersectObjects(objectsToTest);
    
    if(isStart){
        if(progressBarIntersects.length)
        {
            for(const intersect of progressBarIntersects){
                intersect.object.scale.set(1.3, 1.3, 1.3)
            }
    
            if(currentProgressIntersectsObjects === null || currentProgressIntersectsObjects.length < progressBarIntersects.length)
            {
                const heights = []
                for (const intersect of progressBarIntersects) {
                    // heights.push(intersect.object.position.y);
                    if(currentProgressIntersectsObjects === null){
                        heights.push(intersect.object.position.y);
                    } else {
                        for (let k of currentProgressIntersectsObjects){
                            if(k.uuid !== intersect.object.uuid){
                                console.log('new')
                                heights.push(intersect.object.position.y)
                            }
                        }
                    }
                }
                console.log(heights.length)
                playSound(heights);
            }
            const tests = progressBarIntersects.map(inter => inter.object)
            currentProgressIntersectsObjects = tests
        } else {
            if(currentProgressIntersectsObjects)
            {
                for(const object of objectsToTest)
                    {
                        object.scale.set(1, 1, 1)
                        // object.material.color.set('#2e46ff')
                    }
            }
            currentProgressIntersectsObjects = null
        }
    }

    // for(let i = 0; i < lineNum; i++){
    //     const line = lineArr[i];
    //     const positions = line.geometry.attributes.position.array;
    //     const time = Date.now() / 4000;
 
    //     for(let j = 0; j <= segmentNum; j++){
    //         const x = ((lineLength/segmentNum) * j) - lineLength / 2;
    //         const px = j / (50 + i);
    //         const py = i / 50 + time;
    //         const y =  amplitude * noise.perlin2(px,py);
    //         const z = i * 0.3 - ((lineNum * 0.3) / 2);
    //         positions[j * 3] = x;
    //         positions[j * 3 + 1] = y;
    //         positions[j * 3 + 2 ] = z;
    //     }
 
    //     const h = Math.round((i / lineNum) * 360);
    //     const s = 100;
    //     const l = Math.round((i / lineNum) * 100);
    //     const color = new THREE.Color(`hsl(${h},${s}%,${l}%)`);
 
    //     line.material.color = color;
 
    //     line.geometry.attributes.position.needsUpdate = true;
    // }
 


    // Detect hands
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        const handLandmarkerResult = handLandmarker.detectForVideo(video, Date.now());
        processResults(handLandmarkerResult);
        lastVideoTime = video.currentTime;
    }

    // Update controls
    controls.update()

    // Render
    // renderer.render(scene, camera)
    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()