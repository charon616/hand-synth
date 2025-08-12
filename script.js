import * as THREE from 'three'
import gsap from 'gsap';
import * as Tone from 'tone';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mapRange, isMobile } from './utils.js'; // Import mapRange function

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { detectFrame, video } from './hand-detection.js'
import { startSound, playSound, analyser, playRandomMeow, switchBgm } from './tone-sound.js'

const isDebug = false; // Set to true to enable debug mode
const isMobileDevice = isMobile(); // Check if the device is mobile
let HANDS_NUM;
if(!isMobileDevice){
    HANDS_NUM = 4; // maximum number of hands
} else {
    HANDS_NUM = 1; // maximum number of hands on mobile
}

const DISK_TOUCH_DURATION_THRESHOLD = 0.5; // Duration threshold (in seconds) for touching the disk before switching
let diskTouchTimers = Array(HANDS_NUM).fill(null).map(() => Array(3).fill(null)); // Store touch start times for each hand-disk pair

/**
 * Wgb GL scene settings
 */

/**
 * Base
 */
const canvas = document.querySelector('canvas.webgl') // Canvas
const scene = new THREE.Scene() // Scene

/**
 * Environment map
 */
if(!isMobileDevice){
    const rgbeLoader = new RGBELoader()
    rgbeLoader.load('/textures/environmentMap/studio_small_09_4k.hdr', (environmentMap) =>
    {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping 
        scene.background = new THREE.Color(0xD6D5D9) // gray
        scene.environment = environmentMap
    })
}

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(0, 2, 5)
directionalLight.castShadow = true // Enable shadow
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.intensity = 0.5
scene.add(directionalLight)

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
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Recalculate aspect and update camera
    const aspect = sizes.width / sizes.height;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const aspect = sizes.width / sizes.height;
const frustumSize = 6;

const camera = new THREE.OrthographicCamera( // Create an Orthographic Camera
    frustumSize * aspect / -2, // left
    frustumSize * aspect / 2,  // right
    frustumSize / 2,           // top
    frustumSize / -2,          // bottom
    0.1,                       // near
    100                        // far
);
camera.position.z = 3;
scene.add(camera);

/**
 * Audio
 */
let isStart = false

// After the start button is clicked, start the sound
if(!isMobileDevice) {
    document.getElementById('start-button').addEventListener('click', async () => {
        await startSound();
        console.log("Starting sound...");
        isStart = true;
        document.getElementById('start-screen').style.display = 'none';
    });
} else {
    document.getElementById('start-button-mobile').addEventListener('click', async () => {
        await startSound();
        console.log("Starting sound...");
        isStart = true;
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('start-button-mobile').style.display = 'none'; // Hide the mobile start button
    });
}


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true // Enable shadow
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Controls
 */
if(isDebug) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minZoom = 0.5;
    controls.maxZoom = 2.5;
}

/**
 * Material
 */
const textureLoader = new THREE.TextureLoader();
let material, landmarkMaterial;

if(!isMobileDevice) {
    material = new THREE.MeshPhysicalMaterial() // for notes
    material.metalness = 0
    material.roughness = 0.05
    material.transparent = true
    
    // Clearcoat
    material.clearcoat = 0.5
    material.clearcoatRoughness = 1
    
    // Sheen
    material.sheen = 1
    material.sheenRoughness = 1
    material.sheenColor.set('#949494')
    
    // Iridescence
    material.iridescence = 1
    material.iridescenceIOR = 1
    material.iridescenceThickness = [ 100, 360 ]
    
    // Transmission
    material.transmission = 1
    material.ior = 1.8
    material.thickness = 0.5
    
    material.color = new THREE.Color(0x333333)
    
    landmarkMaterial = new THREE.MeshPhysicalMaterial() // for hand landmarks
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
} else {
    const matcapTexture = textureLoader.load('/textures/matcaps/015 Glass (Blur Options).png');
    const matcapTexture2 = textureLoader.load('/textures/matcaps/Matcap9.png');

    material = new THREE.MeshMatcapMaterial() // for notes
    material.matcap = matcapTexture

    landmarkMaterial = new THREE.MeshMatcapMaterial() // for hand landmarks
    landmarkMaterial.matcap = matcapTexture2
}

/**
 * Postprocessing
 */
let effectComposer, renderScene, gtaoPass, outputPass;
if(!isMobileDevice) {
    effectComposer = new EffectComposer(renderer)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    effectComposer.setSize(sizes.width, sizes.height)
    
    renderScene = new RenderPass(scene, camera)
    effectComposer.addPass(renderScene)
    
    gtaoPass = new GTAOPass(scene, camera);
    effectComposer.addPass(gtaoPass);
    
    outputPass = new OutputPass()
    effectComposer.addPass(outputPass) 
}

let textureUrls;

if(!isMobileDevice) {
    textureUrls = [
        '/textures/jose-fontano-TdPQp3fjzOw-unsplash_min.jpg',
        '/textures/tina-sara-jy-uS8iJhX4-unsplash_min.jpg',
        '/textures/cole-keister-SG4fPCsywj4-unsplash_min.jpg',
        '/textures/c-g-JgDUVGAXsso-unsplash_min.jpg'
    ];
} else {
    textureUrls = [
        '/textures/jose-fontano-TdPQp3fjzOw-unsplash_min.jpg'
    ];
}
let currentTextureIndex = 0;

const textures = textureUrls.map(url => textureLoader.load(url));
// Adjust texture repeat to fit the plane
textures.forEach(texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
});

const groundMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd1d4d6,
    envMapIntensity: 0,
    side: THREE.DoubleSide,
    map: textures[currentTextureIndex]
});

// Function to switch the texture
function switchTexture() {
    currentTextureIndex = (currentTextureIndex + 1) % textures.length;
    plane.material.map = textures[currentTextureIndex];
    plane.material.needsUpdate = true;
}

/**
 * Objects
 */

// Notes
let vibrantColors, notePositions;
if (!isMobileDevice) {
    vibrantColors = [
        0xef2a28, // red
        0xffe300, // yellow
        0xa8c7fa, // lightblue
        0xff85c3, // pink
        0x2d5ed5, // blue
        0x48c9b0, // green
        0xf39c12, // orange
        0x85929e, // gray
        0xd580ff, // purple
        0x00b894, // teal
    ];
    notePositions = [-5, -3, -2.5, -1, 0, 0.5, 1, 3, 4, 5]; // x positions for desktop
} else {
    vibrantColors = [
        0xef2a28, // red
        0xffe300, // yellow
        0xa8c7fa, // lightblue
        0xff85c3, // pink
        0x2d5ed5 // blue
    ];
    notePositions = [-2, -1, -0, 1, 2]; // y positions for mobile
}
const notes = [];

for (let i = 0; i < notePositions.length; i++) {
    let geometry, note;
    
    if (!isMobileDevice) {
        // Set random geometry
        const rand = Math.random();
        if (rand < 0.25) {
            geometry = new THREE.SphereGeometry(0.45, 32, 32);
        } else if (rand < 0.5) {
            geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 32);
        } else if (rand < 0.75) {
            geometry = new RoundedBoxGeometry( .85, .85, .85, 7, 0.15 );
        } else {
            geometry = new THREE.ConeGeometry(0.5, 0.9, 32 ); 
        }
    
        // Set random color
        const temp_mat = material.clone();
        const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
        temp_mat.color = new THREE.Color(randomColor);
    
        note = new THREE.Mesh(
            geometry,
            temp_mat
        );

        // Set random rotation speed
        note.rotationSpeed = {
            x: Math.random() * 0.3,
            y: Math.random() * 0.3,
            z: Math.random() * 0.3
        };

        // Desktop: x from notePositions, y random
        const ypos = Math.random() * 6 - 3;
        note.position.x = notePositions[i];
        note.position.y = ypos;
    } else {
        // Set random geometry
        const rand = Math.random();
        if (rand < 0.25) {
            geometry = new THREE.SphereGeometry(0.35, 32, 32);
        } else if (rand < 0.5) {
            geometry = new THREE.CylinderGeometry(0.25, 0.25, .8, 32);
        } else if (rand < 0.75) {
            geometry = new THREE.BoxGeometry( .65, .65, .65);
        } else {
            geometry = new THREE.ConeGeometry(0.4, 0.7, 32); 
        }
    
        // Set random color
        // const temp_mat = material.clone();
        // const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
        // temp_mat.color = new THREE.Color(randomColor);
    
        note = new THREE.Mesh(
            geometry,
            material
        );

        // Set random rotation speed
        note.rotationSpeed = {
            x: Math.random() * 0.2,
            y: Math.random() * 0.2,
            z: Math.random() * 0.2
        };

        // Align vertically: y from notePositions, x fixed
        const xpos = Math.random() * 2 - 1;
        note.position.x = xpos;
        note.position.y = notePositions[i];
    }
    note.position.z = 0;
    note.castShadow = true;
    notes.push(note);
    scene.add(note);
}

// Background plane
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(16 * 0.8, 9 * 0.8),
    groundMaterial
)
plane.rotation.y = Math.PI; 
plane.position.z = -1
plane.receiveShadow = true;
scene.add(plane);

// Progress bar using a metallic cylinder mesh for a guitar string look
const progressBarRadius = 0.045; // thickness of the string
const progressBarLength = 10; // length in world units
const progressBarGeometry = new THREE.CylinderGeometry(progressBarRadius, progressBarRadius, progressBarLength, 32);
const progressBarMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc0c0c0, // silver
    metalness: 1.0,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    reflectivity: 1.0,
    sheen: 1.0,
    sheenColor: new THREE.Color(0xffffff),
    sheenRoughness: 0.2,
    transmission: 0.0,
    ior: 2.0,
});
const progressBar = new THREE.Mesh(progressBarGeometry, progressBarMaterial);
progressBar.castShadow = false;
progressBar.receiveShadow = false;
if(!isMobileDevice) {
    progressBar.rotation.z = 0; // Set to vertical orientation
} else {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2 );
    progressBar.quaternion.copy(quaternion);
}

progressBar.position.set(0, 0, 0.11); // Slightly above the plane
scene.add(progressBar);

/**
 * Models
 */
const gltfLoader = new GLTFLoader()

let cat = null; // normal
let cat2 = null; // material changed
let playerModel = null;
let playerMixer = null;
let diskRotationEnabled = true; // Animation toggle
let playerActions = [];
let currentPlayerActionIndex = 0;
let diskModels = [];
let currentDiskIndex = 0;

let diskTransitioning = false;

if(!isMobileDevice) {
    // Load cat models
    gltfLoader.load(
        '/models/cat.glb',
        (gltf) =>
        {
            cat = gltf.scene
            cat.scale.set(0.5, 0.5, 0.5)
    
            // set position to the bottom-left
            const offsetX = 0.75; // Adjust as needed
            const offsetY = 0.1; // Adjust as needed
            const x = camera.left + offsetX;
            const y = camera.bottom - offsetY;
    
            gltf.scene.position.set(x, y, 0)
            cat.rotation.set(0.5, 0.67, -0.1) 
    
            cat.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true;
                }
            });
    
            cat2 = cat.clone()
            cat2.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                }
            });
    
            scene.add(cat)
            scene.add(cat2)
            return cat
        }
    )
} else {
    // Load cat models
    gltfLoader.load(
        '/models/cat.glb',
        (gltf) =>
        {
            cat = gltf.scene
            cat.scale.set(0.5, 0.5, 0.5)
    
            // set position to the bottom-left
            const offsetX = 0.75; // Adjust as needed
            const offsetY = 0.1; // Adjust as needed
            const x = camera.left + offsetX;
            const y = camera.bottom - offsetY;
    
            gltf.scene.position.set(x, y, 0)
            cat.rotation.set(0.5, 0.67, -0.1) 
    
            cat.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true;
                }
            });
    
            scene.add(cat)
            return cat
        }
    )
}

// Load player_anim.glb (with Start/Stop animations)
if(!isMobileDevice) {
    gltfLoader.load(
        '/models/player_anim.glb',
        (gltf) => {
            playerModel = gltf.scene;
            playerModel.scale.set(1.5, 1.5, 1.5);

            // set position to the bottom-right
            const offsetX = 1.15; // Adjust as needed
            const offsetY = -0.75; // Adjust as needed
            const x = camera.right - offsetX;
            const y = camera.bottom - offsetY;

            playerModel.position.set(x, y, -3)
            playerModel.rotation.set(Math.PI/2, 0, 0);

            // Animation setup for Start/Stop
            if (gltf.animations && gltf.animations.length > 0) {
                playerMixer = new THREE.AnimationMixer(playerModel);
                playerActions = {};
                gltf.animations.forEach(clip => {
                    playerActions[clip.name] = playerMixer.clipAction(clip);
                    playerActions[clip.name].loop = THREE.LoopOnce;
                    playerActions[clip.name].clampWhenFinished = true;
                });
            }
            scene.add(playerModel);
        }
    );
}

if(!isMobileDevice) {
    // Load disk1.glb
    gltfLoader.load(
        '/models/disk1.glb',
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);
    
            // set position to the bottom-right
            const offsetX = 1.15; // Adjust as needed
            const offsetY = -0.75; // Adjust as needed
            const x = camera.right - offsetX;
            const y = camera.bottom - offsetY;
            model.position.set(x, y, -3)
            model.rotation.set(Math.PI/2, 0, 0);
            model.visible = true;
            diskModels[0] = model;
            scene.add(model);
            updateDiskPositions();
        }
    );
    // Load disk2.glb
    gltfLoader.load(
        '/models/disk2.glb',
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);

            // set position to the bottom-right
            const offsetX = 1.15; // Adjust as needed
            const offsetY = -0.75; // Adjust as needed
            const x = camera.right - offsetX;
            const y = camera.bottom - offsetY; // stack above if needed
            model.position.set(x, y, -3)
            model.rotation.set(Math.PI/2, 0, 0);
            model.visible = false;
            diskModels[1] = model;
            scene.add(model);
            updateDiskPositions();
        }
    );
    // Load disk3.glb
    gltfLoader.load(
        '/models/disk3.glb',
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);

            // set position to the bottom-right
            const offsetX = 1.15; // Adjust as needed
            const offsetY = -0.75; // Adjust as needed
            const x = camera.right - offsetX;
            const y = camera.bottom - offsetY; // stack above if needed
            model.position.set(x, y, -3)
            model.rotation.set(Math.PI/2, 0, 0);
            model.visible = false;
            diskModels[2] = model;
            scene.add(model);
            updateDiskPositions();
        }
    );
    // Load disk4.glb
    gltfLoader.load(
        '/models/disk4.glb',
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(1.5, 1.5, 1.5);

            // set position to the bottom-right
            const offsetX = 1.15; // Adjust as needed
            const offsetY = -0.75; // Adjust as needed
            const x = camera.right - offsetX;
            const y = camera.bottom - offsetY; // stack above if needed
            model.position.set(x, y, -3)
            model.rotation.set(Math.PI/2, 0, 0);
            model.visible = false;
            diskModels[3] = model;
            scene.add(model);
            updateDiskPositions();
        }
    );
}

// Helper: set disk positions based on target
function updateDiskPositions(transition = false, fromIndex = null, toIndex = null) {
    const mainY = camera.bottom + 0.75; // main position (visible)
    const standbyY = camera.bottom - 3; // below window
    for (let i = 0; i < diskModels.length; i++) {
        if (diskModels[i]) {
            diskModels[i].visible = true;
            if (transition && (i === fromIndex || i === toIndex)) {
                // handled by GSAP
                continue;
            }
            diskModels[i].position.y = (i === currentDiskIndex) ? mainY : standbyY;
        }
    }
}

/**
 * Raycaster
 */
const raycaster = new Array(HANDS_NUM).fill().map(() => new THREE.Raycaster());
let basePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0 xy plane
const progressRaycaster = new THREE.Raycaster();

/**
 * Animate
 */
const clock = new THREE.Clock()

let currentIntersect = null // Current intersected objects with the hand
let currentModelIntersect = null // Current intersected object with the model
let modelIntersects = null // Current intersected object for the model
let currentProgressIntersectsObjects = null // Current intersected objects with the progress bar

let landmarkSpheres = new Array(HANDS_NUM).fill().map(() => []);
let handRayOrigins = []; // Array of ray origins for each hand
let isPinching = new Array(HANDS_NUM).fill(false) // Flag to indicate if the thumb and index finger or middle finger are pinching
let grabbedNotes = new Array(HANDS_NUM).fill(null); // Array to store grabbed notes for each hand

// 直前の手の位置を保存する配列
let prevHandRayOrigins = [];

// Convert ndc coordinates to world coordinates
function ndcToWorld(ndcX, ndcY) {
    const aspect = (camera.right - camera.left) / (camera.top - camera.bottom);

    const worldX = ndcX * (frustumSize * aspect) / 2;
    const worldY = ndcY * (frustumSize / 2);
    
    return new THREE.Vector3(worldX, worldY, 0); // z=0
}

function mapPositionXToNDC(positionX) {
    const left = camera.left;
    const right = camera.right;
    return (positionX - left) / (right - left) * 2 - 1;
}

// Create a sphere for each hand landmark
function createLandmarkSphere(size) {
    const geometry = new THREE.SphereGeometry(size || 0.1, 8, 8);
    const sphere = new THREE.Mesh(geometry, landmarkMaterial.clone());
    scene.add(sphere);
    return sphere;
}

// Process hand landmarks for each frame
function processResults(results) {
    // Clear previous hand ray origins
    handRayOrigins = [];

    if (!isMobileDevice) {
        // for desktop: at most 4 hands
        if (results.landmarks && results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
                const landmarks = results.landmarks[i];
                let sphereIndex = 0;
                for (let j = 0; j < landmarks.length; j++) {
                    const landmark = landmarks[j];
                    let sphere;
                    if (sphereIndex < landmarkSpheres[i].length) {
                        sphere = landmarkSpheres[i][sphereIndex];
                    } else {
                        if(j === 4 || j === 8 || j === 12) {
                            sphere = createLandmarkSphere(0.15);
                        } else {
                            sphere = createLandmarkSphere(0.1);
                        }
                        landmarkSpheres[i].push(sphere);
                    }
                    let pos = ndcToWorld(-landmark.x * 2 + 1, -landmark.y * 2 + 1);
                    sphere.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), 0.6);
                    sphereIndex++;
                }
                const thumb = landmarks[4];
                const indexFinger = landmarks[8];
                const middleFinger = landmarks[12];
                const rawOrigin = new THREE.Vector3(-indexFinger.x * 2 + 1, -indexFinger.y * 2 + 1, -indexFinger.z);
                handRayOrigins.push(rawOrigin);
                prevHandRayOrigins[i] = rawOrigin;
                const distanceToIndex = Math.sqrt(
                    Math.pow(thumb.x - indexFinger.x, 2) +
                    Math.pow(thumb.y - indexFinger.y, 2) +
                    Math.pow(thumb.z - indexFinger.z, 2)
                );
                const threshold = 0.1;
                if (distanceToIndex < threshold) {
                    landmarkSpheres[i][4].material.color.set(0x2e46ff);
                    landmarkSpheres[i][8].material.color.set(0x2e46ff);
                    isPinching[i] = true;
                } else {
                    landmarkSpheres[i][4].material.color.set(0xffffff);
                    landmarkSpheres[i][8].material.color.set(0xffffff);
                    isPinching[i] = false;
                }
                while (sphereIndex < landmarkSpheres[i].length) {
                    const sphere = landmarkSpheres[i].pop();
                    scene.remove(sphere);
                }
            }
            for (let i = results.landmarks.length; i < HANDS_NUM; i++) {
                while (landmarkSpheres[i].length > 0) {
                    const sphere = landmarkSpheres[i].pop();
                    scene.remove(sphere);
                }
            }
        } else {
            for(let i = 0; i < HANDS_NUM; i++) {
                while (landmarkSpheres[i].length > 0) {
                    const sphere = landmarkSpheres[i].pop();
                    scene.remove(sphere);
                }
            }
            handRayOrigins = [];
            for(let p of isPinching){ p = false }
        }
    } else {
        // for mobile: at most 1 hand
        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            let sphereIndex = 0;
            for (let j = 0; j < landmarks.length; j++) {
                const landmark = landmarks[j];
                let sphere;
                if (sphereIndex < landmarkSpheres[0].length) {
                    sphere = landmarkSpheres[0][sphereIndex];
                } else {
                    if(j === 4 || j === 8 || j === 12) {
                        sphere = createLandmarkSphere(0.15);
                    } else {
                        sphere = createLandmarkSphere(0.1);
                    }
                    landmarkSpheres[0].push(sphere);
                }
                let pos = ndcToWorld(-landmark.x * 2 + 1, -landmark.y * 2 + 1);
                sphere.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), 0.6);
                sphereIndex++;
            }
            const thumb = landmarks[4];
            const indexFinger = landmarks[8];
            const middleFinger = landmarks[12];
            const rawOrigin = new THREE.Vector3(-indexFinger.x * 2 + 1, -indexFinger.y * 2 + 1, -indexFinger.z);
            handRayOrigins.push(rawOrigin);
            prevHandRayOrigins[0] = rawOrigin;
            const distanceToIndex = Math.sqrt(
                Math.pow(thumb.x - indexFinger.x, 2) +
                Math.pow(thumb.y - indexFinger.y, 2) +
                Math.pow(thumb.z - indexFinger.z, 2)
            );
            const threshold = 0.15;
            if (distanceToIndex < threshold) {
                landmarkSpheres[0][4].material.color.set(0x2e46ff);
                landmarkSpheres[0][8].material.color.set(0x2e46ff);
                isPinching[0] = true;
            } else {
                landmarkSpheres[0][4].material.color.set(0xffffff);
                landmarkSpheres[0][8].material.color.set(0xffffff);
                isPinching[0] = false;
            }
            while (sphereIndex < landmarkSpheres[0].length) {
                const sphere = landmarkSpheres[0].pop();
                scene.remove(sphere);
            }
        } else {
            while (landmarkSpheres[0].length > 0) {
                const sphere = landmarkSpheres[0].pop();
                scene.remove(sphere);
            }
            handRayOrigins = [];
            isPinching[0] = false;
        }
    }
}

const vidTexture = new THREE.VideoTexture( video );

// video plane
const videoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.5),
    new THREE.MeshBasicMaterial({ map: vidTexture })
)
videoPlane.position.x = 2
videoPlane.position.y = -2
videoPlane.position.z = 1

if(isDebug) {
    scene.add(videoPlane);
}

let currentInstrumentIndex = 0;

let instruments;
if(!isMobileDevice) {
    instruments = ['default', 'piano', 'guitar-acoustic', 'violin'];
} else {
    // Mobile devices have fewer instruments
    instruments = ['default'];
}

function switchInstrument() {
    currentInstrumentIndex = (currentInstrumentIndex + 1) % instruments.length;
}

const tickMobile = () =>
{
    // Change cat scale based on audio input
    const values = analyser.getValue();
    if (!values || values.length === 0) {
        return;
    }

    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    const scaleValue = mapRange(averageValue, -120, -90, 0.75, 0.25);

    if (cat) {
        if (scaleValue && isFinite(scaleValue)) {
            const targetScale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
            cat.scale.lerp(targetScale, 0.8); // Smoothly interpolate to the target scale
        }
    }

    // Animation
    // Rotate notes
    const deltaTime = clock.getDelta();
    for (const note of notes) {
        note.rotation.x += note.rotationSpeed.x * deltaTime;
        note.rotation.y += note.rotationSpeed.y * deltaTime;
        note.rotation.z += note.rotationSpeed.z * deltaTime;
    }

    if (playerMixer) {
        playerMixer.update(deltaTime); // Update player model animation
    }

    // Cast rays
    const objectsToTest = notes;
    if (handRayOrigins.length > 0) {
        let intersects = [];
        for (let i = 0; i < handRayOrigins.length; i++) {
            const rayOrigin = handRayOrigins[i];
            raycaster[i].setFromCamera(rayOrigin, camera);
            let tempIntersects = raycaster[i].intersectObjects(objectsToTest);
            for (const intersect of tempIntersects) {
                intersect.rayIndex = i;
            }
            intersects = intersects.concat(tempIntersects);

            // Cat interaction (existing)
            if (cat) {
                modelIntersects = raycaster[i].intersectObject(cat, true);
                if (modelIntersects.length) {
                    if (currentModelIntersect === null) {
                        playRandomMeow();
                    }
                    currentModelIntersect = modelIntersects[0];
                } else {
                    currentModelIntersect = null;
                }
            }
        }

        // reset to default
        for (const object of objectsToTest) {
            object.scale.set(1, 1, 1);
        }

        // change scale if intersect
        for (const intersect of intersects) {
            intersect.object.scale.set(1.3, 1.3, 1.3);
        }

        if (intersects.length) {
            currentIntersect = intersects; // Store all intersects
        } else {
            currentIntersect = null;
        }

        // Move objects if pinching
        for (let i = 0; i < handRayOrigins.length; i++) {
            if (isPinching[i]) {
                // if pinching, check if we can grab a note
                if (!grabbedNotes[i]) {
                    raycaster[i].setFromCamera(handRayOrigins[i], camera);
                    const intersects = raycaster[i].intersectObjects(objectsToTest);
                    if (intersects.length > 0) {
                        grabbedNotes[i] = intersects[0].object;
                    }
                }
                // if we have a grabbed note, update its position
                if (grabbedNotes[i]) {
                    const intersection = new THREE.Vector3();
                    raycaster[i].ray.intersectPlane(basePlane, intersection);
                    if (!grabbedNotes[i].intersections) {
                        grabbedNotes[i].intersections = new Array(HANDS_NUM).fill(null);
                    }
                    grabbedNotes[i].intersections[i] = intersection.clone();

                    // Add smoothing using lerp
                    grabbedNotes[i].position.lerp(grabbedNotes[i].intersections[i], 0.3);
                }
            } else {
                // when not pinching, reset grabbed note
                grabbedNotes[i] = null;
            }
        }
    }

    // Move Progress bar (keep original movement)
    progressBar.position.y -= deltaTime * 1.5;
    if(progressBar.position.y < -4) {
        progressBar.position.y = 4;
    }

    // Progress bar raycast (horizontal direction)
    const progressPosition = new THREE.Vector3(-10, progressBar.position.y, progressBar.position.z);
    const progressBarDirection = new THREE.Vector3(1, 0, 0);
    progressRaycaster.set(progressPosition, progressBarDirection);
    const progressIntersects = progressRaycaster.intersectObjects(objectsToTest);
    
    if(isStart){
        if(progressIntersects.length) {
            for(const intersect of progressIntersects){
                intersect.object.scale.set(1.3, 1.3, 1.3);
            }
            // Play sound if progress intersects with objects
            if(currentProgressIntersectsObjects === null || currentProgressIntersectsObjects.length < progressIntersects.length) {
                const heights = [];
                for (const intersect of progressIntersects) {
                    if(currentProgressIntersectsObjects === null){
                        const ndcX = mapPositionXToNDC(intersect.object.position.x);
                        heights.push({
                            'note': intersect.object.position.x, // use x for pitch on mobile
                            'pos': ndcX
                        });
                    } else {
                        for (let k of currentProgressIntersectsObjects){
                            if(k.uuid !== intersect.object.uuid){
                                const ndcX = mapPositionXToNDC(intersect.object.position.x);
                                heights.push({
                                    'note': intersect.object.position.x, // use x for pitch on mobile
                                    'pos': ndcX
                                });
                            }
                        }
                    }
                }
                if(heights.length > 0){
                    playSound(heights, instruments[currentInstrumentIndex]);
                }
            }
            const temp = progressIntersects.map(inter => inter.object);
            currentProgressIntersectsObjects = temp;
        } else {
            if(currentProgressIntersectsObjects) {
                for(const object of objectsToTest) {
                    object.scale.set(1, 1, 1);
                }
            }
            currentProgressIntersectsObjects = null;
        }
    }

    // Update hand landmarks
    if (isStart) {
        const result = detectFrame();
        if(result){
            processResults(result);
        }
    }
    
    if(isDebug){
        updateMemoryDisplay();
    }
    renderer.render(scene, camera);
    window.requestAnimationFrame(tickMobile); // Call tickDesktop again on the next frame
}

const tickDesktop = () => {
    // Change cat scale based on audio input
    const values = analyser.getValue();
    if (!values || values.length === 0) {
        return;
    }

    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    const scaleValue = mapRange(averageValue, -120, -90, 0.75, 0.25);

    if (cat) {
        if (scaleValue && isFinite(scaleValue)) {
            const targetScale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);
            cat.scale.lerp(targetScale, 0.8); // Smoothly interpolate to the target scale
            cat2.scale.lerp(targetScale, 0.8); // Smoothly interpolate to the target scale
        }
    }

    // Animation
    // Rotate notes
    const deltaTime = clock.getDelta();
    for (const note of notes) {
        note.rotation.x += note.rotationSpeed.x * deltaTime;
        note.rotation.y += note.rotationSpeed.y * deltaTime;
        note.rotation.z += note.rotationSpeed.z * deltaTime;
    }

    // Disk rotation animation
    if (diskModels.length > 0 && diskRotationEnabled) {
        const disk = diskModels[currentDiskIndex];
        if (disk) disk.rotation.y += 0.03;
    }

    if (playerMixer) {
        playerMixer.update(deltaTime); // Update player model animation
    }

    // Cast rays
    const objectsToTest = notes;
    if (handRayOrigins.length > 0) {
        let intersects = [];
        for (let i = 0; i < handRayOrigins.length; i++) {
            const rayOrigin = handRayOrigins[i];
            raycaster[i].setFromCamera(rayOrigin, camera);
            let tempIntersects = raycaster[i].intersectObjects(objectsToTest);
            for (const intersect of tempIntersects) {
                intersect.rayIndex = i;
            }
            intersects = intersects.concat(tempIntersects);

            // Cat interaction (existing)
            if (cat) {
                modelIntersects = raycaster[i].intersectObject(cat, true);
                if (modelIntersects.length) {
                    cat2.visible = true;
                    cat.visible = false;
                    if (currentModelIntersect === null) {
                        playRandomMeow();
                    }
                    currentModelIntersect = modelIntersects[0];
                } else {
                    cat.visible = true;
                    cat2.visible = false;
                    currentModelIntersect = null;
                }
            }
            // Player and Disk interaction
            if (diskModels.length > 0) {
                for (let d = 0; d < diskModels.length; d++) {
                    const disk = diskModels[d];
                    if (disk) {
                        const diskIntersects = raycaster[i].intersectObject(disk, true);
                        if (diskIntersects.length && !diskTransitioning) {
                            // Start or update timer
                            if (!diskTouchTimers[i][d]) {
                                diskTouchTimers[i][d] = performance.now();
                            }
                            const elapsed = (performance.now() - diskTouchTimers[i][d]) / 1000;
                            if (elapsed >= DISK_TOUCH_DURATION_THRESHOLD) {
                                // Reset all timers for this hand
                                diskTouchTimers[i] = Array(3).fill(null);
                                // Animate current disk down, next disk up
                                const fromIndex = currentDiskIndex;
                                const toIndex = (currentDiskIndex + 1) % diskModels.length;
                                diskTransitioning = true;
                                const mainY = camera.bottom - 0.75;
                                const standbyY = camera.bottom - 5;
                                // Play Stop animation
                                if (playerActions && playerActions["Stop"]) {
                                    playerActions["Stop"].reset().play();
                                }
                                gsap.to(diskModels[fromIndex].position, {
                                    y: standbyY,
                                    duration: 0.5,
                                    ease: 'power2.inOut',
                                    onComplete: () => {
                                        // Play Start animation
                                        if (playerActions && playerActions["Start"]) {
                                            playerActions["Start"].reset().play();
                                        }
                                        // Switch BGM when disk switches
                                        switchBgm();
                                        // Switch background image when disk switches
                                        switchTexture();
                                        // Switch instrument when disk switches
                                        switchInstrument();
                                        diskModels[toIndex].position.y = standbyY;
                                        gsap.to(diskModels[toIndex].position, {
                                            y: mainY,
                                            duration: 0.5,
                                            ease: 'power2.inOut',
                                            onComplete: () => {
                                                currentDiskIndex = toIndex;
                                                updateDiskPositions();
                                                diskTransitioning = false;
                                            }
                                        });
                                    }
                                });
                                // Optionally, play animation or sound here
                                break;
                            }
                        } else {
                            // Reset timer if not intersecting
                            diskTouchTimers[i][d] = null;
                        }
                    }
                }
            }
        }

        // reset to default
        for (const object of objectsToTest) {
            object.scale.set(1, 1, 1);
        }

        // change scale if intersect
        for (const intersect of intersects) {
            intersect.object.scale.set(1.3, 1.3, 1.3);
        }

        if (intersects.length) {
            currentIntersect = intersects; // Store all intersects
        } else {
            currentIntersect = null;
        }

        // Move objects if pinching
        for (let i = 0; i < handRayOrigins.length; i++) {
            if (isPinching[i]) {
                // if pinching, check if we can grab a note
                if (!grabbedNotes[i]) {
                    raycaster[i].setFromCamera(handRayOrigins[i], camera);
                    const intersects = raycaster[i].intersectObjects(objectsToTest);
                    if (intersects.length > 0) {
                        grabbedNotes[i] = intersects[0].object;
                    }
                }
                // if we have a grabbed note, update its position
                if (grabbedNotes[i]) {
                    const intersection = new THREE.Vector3();
                    raycaster[i].ray.intersectPlane(basePlane, intersection);
                    if (!grabbedNotes[i].intersections) {
                        grabbedNotes[i].intersections = new Array(HANDS_NUM).fill(null);
                    }
                    grabbedNotes[i].intersections[i] = intersection.clone();

                    // Add smoothing using lerp
                    grabbedNotes[i].position.lerp(grabbedNotes[i].intersections[i], 0.3);
                }
            } else {
                // when not pinching, reset grabbed note
                grabbedNotes[i] = null;
            }
        }
    }

    // Move Progress bar 
    progressBar.position.x += deltaTime * 1.5;
    if(progressBar.position.x > 7) {
        progressBar.position.x = -7;
    }

    // Progress bar raycast
    const progressPosition = new THREE.Vector3(progressBar.position.x, 10, progressBar.position.z);
    const progressBarDirection = new THREE.Vector3(0, -1, 0);
    progressRaycaster.set(progressPosition, progressBarDirection);
    const progressIntersects = progressRaycaster.intersectObjects(objectsToTest);
    
    if(isStart){
        if(progressIntersects.length) {
            for(const intersect of progressIntersects){
                intersect.object.scale.set(1.3, 1.3, 1.3);
            }
            // Play sound if progress intersects with objects
            if(currentProgressIntersectsObjects === null || currentProgressIntersectsObjects.length < progressIntersects.length) {
                const heights = [];
                for (const intersect of progressIntersects) {
                    if(currentProgressIntersectsObjects === null){
                        const ndcX = mapPositionXToNDC(intersect.object.position.x);
                        heights.push({
                            'note':intersect.object.position.y,
                            'pos': ndcX
                        });
                    } else {
                        for (let k of currentProgressIntersectsObjects){
                            if(k.uuid !== intersect.object.uuid){
                                const ndcX = mapPositionXToNDC(intersect.object.position.x);
                                heights.push({
                                    'note':intersect.object.position.y,
                                    'pos': ndcX
                                });
                            }
                        }
                    }
                }
                if(heights.length > 0){
                    playSound(heights, instruments[currentInstrumentIndex]);
                }
            }
            const temp = progressIntersects.map(inter => inter.object);
            currentProgressIntersectsObjects = temp;
        } else {
            if(currentProgressIntersectsObjects) {
                for(const object of objectsToTest) {
                    object.scale.set(1, 1, 1);
                }
            }
            currentProgressIntersectsObjects = null;
        }
    }

    // Update hand landmarks
    if (isStart) {
        const result = detectFrame();
        if(result){
            processResults(result);
        }
    }
    
    if(isDebug){
        updateMemoryDisplay();
    }
    
    effectComposer.render(); // Render with effects
    window.requestAnimationFrame(tickDesktop); // Call tickDesktop again on the next frame
}

// controll scroll direction
gsap.registerPlugin(ScrollTrigger);
let scrollTarget = document.querySelector('.scrolling-wrapper');
let scrollSet = gsap.quickSetter(scrollTarget, "scrollLeft");

// Get the left and right arrows and the scrolling wrapper
const leftArrow = document.querySelector('.leftArrow');
const rightArrow = document.querySelector('.rightArrow');
const scrollWrapper = document.querySelector('.scrolling-wrapper');

if (scrollWrapper && leftArrow && rightArrow) {
    // Define the initial visibility of arrows
    const updateArrowVisibility = () => {
        if (scrollWrapper.scrollWidth <= scrollWrapper.clientWidth) {
            leftArrow.style.display = 'none';
            rightArrow.style.display = 'none';
        } else {
            leftArrow.style.display = scrollWrapper.scrollLeft === 0 ? 'none' : 'block';
            rightArrow.style.display = scrollWrapper.scrollLeft + scrollWrapper.clientWidth >= scrollWrapper.scrollWidth ? 'none' : 'block';
        }
    };

    // Initial visibility check
    updateArrowVisibility();

    ScrollTrigger.observe({
        target: scrollTarget, // can be any element (selector text is fine)
        type: "wheel,touch", // comma-delimited list of what to listen for ("wheel,touch,scroll,pointer")
        onChangeY: (self) => {
            scrollSet(scrollSet(scrollTarget.scrollLeft + self.deltaY));
            updateArrowVisibility();
        }
    });


    // Scroll left when the left arrow is clicked
    leftArrow.addEventListener('click', () => {
        gsap.to(scrollWrapper, {
            scrollLeft: scrollWrapper.scrollLeft - 300,
            duration: 0.5,
            ease: 'power2.inOut',
            onUpdate: updateArrowVisibility
        });
    });

    // Scroll right when the right arrow is clicked
    rightArrow.addEventListener('click', () => {
        gsap.to(scrollWrapper, {
            scrollLeft: scrollWrapper.scrollLeft + 300,
            duration: 0.5,
            ease: 'power2.inOut',
            onUpdate: updateArrowVisibility
        });
    });

    // Update arrow visibility on window resize
    window.addEventListener('resize', updateArrowVisibility);
}

// Mute button functionality
const muteBtn = document.getElementById('mute-toggle');
const muteIcon = document.getElementById('mute-icon');
let isMuted = false;
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        Tone.Destination.mute = isMuted;
        muteBtn.className = isMuted ? 'mute-off' : 'mute-on';
        muteIcon.src = isMuted ? '/guide/speaker-slash.svg' : '/guide/speaker-high.svg';
        muteBtn.querySelector('span').textContent = isMuted ? 'OFF' : 'ON';
    });
}

// Display memory usage for debugging
let memoryDiv;
if(isDebug) {
    memoryDiv = document.createElement('div');
    memoryDiv.style.position = 'fixed';
    memoryDiv.style.right = '10px';
    memoryDiv.style.bottom = '10px';
    memoryDiv.style.background = 'rgba(0,0,0,0.7)';
    memoryDiv.style.color = '#fff';
    memoryDiv.style.fontSize = '14px';
    memoryDiv.style.padding = '6px 12px';
    memoryDiv.style.borderRadius = '8px';
    memoryDiv.style.zIndex = '9999';
    memoryDiv.innerText = 'Memory: --';
    document.body.appendChild(memoryDiv);
}

function updateMemoryDisplay() {
    if (window.performance && window.performance.memory) {
        const used = window.performance.memory.usedJSHeapSize / 1024 / 1024;
        const total = window.performance.memory.totalJSHeapSize / 1024 / 1024;
        memoryDiv.innerText = `Memory: ${used.toFixed(1)}MB / ${total.toFixed(1)}MB`;
    } else {
        memoryDiv.innerText = 'Memory: N/A';
    }
}

function tick() {
    if (isMobileDevice) {
        tickMobile();
    } else {
        tickDesktop();
    }
}

tick()