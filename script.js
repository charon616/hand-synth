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

vidTexture.wrapS = THREE.RepeatWrapping;
vidTexture.repeat.x = -1;


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
        numHands: 2
    }
);

let lastVideoTime = -1;
const landmarkSpheres = [];
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
    0xff5733, // Vibrant Red
    0xffbd33, // Vibrant Orange
    0xff33ff, // Vibrant Pink
    0x33ff57, // Vibrant Green
    0x3357ff, // Vibrant Blue
    0x33fff5, // Vibrant Cyan
    0xff33a8, // Vibrant Magenta
    0xa833ff  // Vibrant Purple
];

const notes = [];
// const notePositions = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const notePositions = [-5, -3, -1, 0, 1, 3, 5];

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

    note.position.x = notePositions[i];
    note.position.z = 0;
    note.castShadow = true;
    notes.push(note);
    scene.add(note);
}


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

    // scene.background = environmentMap
    scene.background = new THREE.Color(0xD6D5D9)
    scene.environment = environmentMap

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

//create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
synth.set({
    envelope: {
        attack: 0.2,
		decay: 0.2,
		sustain: 0.3,
		release: 0.5,
    }
})
let now;

const bgmPlayer = new Tone.Player({
    url: "/sounds/sub-bass-line-by-alien-i-trust-125_bpm-289271.mp3",
    loop: true,
}).toDestination();
// const distortion = new Tone.Distortion(0.4).toDestination();
// const filter = new Tone.Filter(400, "lowpass").toDestination();
const analyser = new Tone.Analyser("fft", 1024);
Tone.loaded().then(() => {
    // bgmPlayer.connect(distortion);
    // bgmPlayer.connect(filter);
    bgmPlayer.connect(analyser);
})

document.getElementById('start-button').addEventListener('click', async () => {
    await Tone.start();
    bgmPlayer.start();
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


function playSingleSound(height) {
    const availableNotes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    const noteIndex = Math.floor(mapRange(height, -3, 3, 0, availableNotes.length - 1));
    const n = availableNotes[noteIndex];
    const mappedValue = mapRange(height, -3, 3, 80, 200);

    // now = Tone.now();
    // synth.triggerAttackRelease(mappedValue, "8n", now);
    synth.triggerAttackRelease(mappedValue, "8n", now);

    // piano.triggerAttackRelease(n);
    // synth.triggerAttackRelease("A4", "8n", now + 1);
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
scene.add(plane);

// video plane
const videoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.5),
    new THREE.MeshBasicMaterial({ map: vidTexture })
)
// videoPlane.rotation.y = Math.PI;
videoPlane.position.x = 2
videoPlane.position.y = -2
videoPlane.position.z = 1
scene.add(videoPlane);

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
let progressIntersects = null

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

    // Animate objects
    notes[0].position.y = Math.sin(elapsedTime * 0.3) * 1.5
    notes[2].position.y = Math.sin(elapsedTime * 1.4) * 1.5

    for (const note of notes) {
        note.rotation.x += note.rotationSpeed.x * deltaTime;
        note.rotation.y += note.rotationSpeed.y * deltaTime;
        note.rotation.z += note.rotationSpeed.z * deltaTime;
    }

    progressBar.position.x += deltaTime * 1.5
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
    
    if(progressBarIntersects.length)
    {
        if(progressIntersects === null)
        {
            if(piano.loaded){
                playSingleSound(progressBarIntersects[0].object.position.y);
            }
        }
        progressIntersects = progressBarIntersects[0]
    } else {
        if(progressIntersects)
        {
        }
        progressIntersects = null
    }


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