import * as THREE from 'three'

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { detectFrame ,video } from './hand-detection.js'
import { startSound, playSound, analyser, playSE, switchBgm } from './tone-sound.js'

const HANDS_NUM = 4; // maximum number of hands

/**
 * Base
 */
const canvas = document.querySelector('canvas.webgl') // Canvas
const scene = new THREE.Scene() // Scene

/**
 * Environment map
 */
const rgbeLoader = new RGBELoader()
rgbeLoader.load('/textures/environmentMap/studio_small_09_4k.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping 
    environmentMap.encoding = THREE.RGBEEncoding
    scene.background = new THREE.Color(0xD6D5D9) // gray
    scene.environment = environmentMap
})

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

// Point light
const pointLight = new THREE.PointLight(0xffffff, 30)
pointLight.position.x = 2
pointLight.position.y = 3
pointLight.position.z = 4
scene.add(pointLight)

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
camera.position.z = 3
scene.add(camera)

/**
 * Audio
 */
let isStart = false
// After the start button is clicked, start the sound
document.getElementById('start-button').addEventListener('click', async () => {
    await startSound();
    isStart = true
    document.getElementById('start-screen').style.display = 'none';
});

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
 * Material
 */
// MeshPhysicalMaterial for notes elements
const material = new THREE.MeshPhysicalMaterial()
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

// MeshPhysicalMaterial for hand landmarks
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
 * Postprocessing
 */
const effectComposer = new EffectComposer(renderer)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.setSize(sizes.width, sizes.height)

const renderScene = new RenderPass(scene, camera)
effectComposer.addPass(renderScene)

const gtaoPass = new GTAOPass(scene, camera);
effectComposer.addPass(gtaoPass);

const outputPass = new OutputPass()
effectComposer.addPass(outputPass) 

const textureUrls = [
    '/textures/jose-fontano-TdPQp3fjzOw-unsplash_min.jpg',
    '/textures/tina-sara-jy-uS8iJhX4-unsplash_min.jpg',
    '/textures/cole-keister-SG4fPCsywj4-unsplash_min.jpg',
    '/textures/c-g-JgDUVGAXsso-unsplash_min.jpg'
];
let currentTextureIndex = 0;

const textureLoader = new THREE.TextureLoader();
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
const notePositions = [-5, -4.5, -3, -2.5, -2, -1, 0, 0.5, 1, 2.5, 3, 4, 4.5, 5]; // x positions

for (let i = 0; i < notePositions.length; i++) {
    let geometry;
    // Set random geometry
    const rand = Math.random();
    if (rand < 0.25) {
        geometry = new THREE.SphereGeometry(0.4, 16, 16);
    } else if (rand < 0.5) {
        geometry = new THREE.CylinderGeometry(0.25, 0.25, 1, 32);
    } else if (rand < 0.75) {
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    } else {
        geometry = new THREE.ConeGeometry(0.3, 0.6, 32 ); 
    }

    // Set random color
    const temp_mat = material.clone();
    const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
    temp_mat.color = new THREE.Color(randomColor);

    const note = new THREE.Mesh(
        geometry,
        temp_mat
    );

    // Set random rotation speed
    note.rotationSpeed = {
        x: Math.random() * 0.5,
        y: Math.random() * 0.5,
        z: Math.random() * 0.5
    };

    // set random y position
    const ypos = Math.random() * 6 - 3;

    note.position.x = notePositions[i];
    note.position.y = ypos;
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

// Progress bar
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
 * Models
 */
const gltfLoader = new GLTFLoader()

let cat = null; // normal
let cat2 = null; // material changed
gltfLoader.load(
    '/models/cat.glb',
    (gltf) =>
    {
        cat = gltf.scene
        cat.scale.set(0.5, 0.5, 0.5)
        gltf.scene.position.set(-4, -3.2, 0)
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

let currentIntersect = null // Current intersected object with the hand
let currentModelIntersect = null // Current intersected object with the model
let modelIntersects = null // Current intersected object for the model
let currentProgressIntersectsObjects = null // Current intersected objects with the progress bar

let landmarkSpheres = new Array(HANDS_NUM).fill([]); // Array of spheres for each hand landmark
let handRayOrigins = []; // Array of ray origins for each hand
let isPinching = new Array(HANDS_NUM).fill(false) // Flag to indicate if the thumb and index finger or middle finger are pinching

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

    console.log(results.landmarks)

    // Create or update spheres based on the number of landmarks
    if (results.landmarks) {
        for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i]; // landmarks for each hand
            let sphereIndex = 0;
            for (let j = 0; j < landmarks.length; j++) {
                const landmark = landmarks[j]; // target landmark
                let sphere;
                if (sphereIndex < landmarkSpheres[i].length) {
                    // Update existing sphere
                    sphere = landmarkSpheres[i][sphereIndex];
                } else {
                    // Create new sphere
                    if(j === 4 || j === 8 || j === 12) { // Thumb, index finger, middle finger
                        sphere = createLandmarkSphere(0.15);
                    }
                    else {
                        sphere = createLandmarkSphere(0.1);
                    }
                    landmarkSpheres[i].push(sphere);
                }
                // Convert landmark coordinates to world coordinates
                // Mirror x-axis
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
                landmarkSpheres[i][4].material.color.set(0x2e46ff); // Change thumb color
                landmarkSpheres[i][8].material.color.set(0x2e46ff); // Change index finger color
                landmarkSpheres[i][12].material.color.set(0x2e46ff); // Change middle finger color
                isPinching[i] = true;
            } else {
                // Reset color of thumb and index finger spheres
                landmarkSpheres[i][4].material.color.set(0xffffff); // Change thumb color
                landmarkSpheres[i][8].material.color.set(0xffffff); // Change index finger color
                landmarkSpheres[i][12].material.color.set(0xffffff); // Change middle finger color
                isPinching[i] = false;
            }

        }
        // Remove any extra spheres
        // for(let i = 0; i < HANDS_NUM; i++) {
        //     while (sphereIndex < landmarkSpheres[i].length) {
        //         const sphere = landmarkSpheres[i].pop();
        //         scene.remove(sphere);
        //         handRayOrigins = [];
        //     }
        // }
    } else {
        // No landmarks detected, remove all spheres
        for(let i = 0; i < HANDS_NUM; i++) {
            while (landmarkSpheres[i].length > 0) {
                const sphere = landmarkSpheres[i].pop();
                scene.remove(sphere);
            }
        }
        handRayOrigins = [];
        for(let p of isPinching){
            p = false
        }
    }
}

const vidTexture = new THREE.VideoTexture( video );

// video plane
const videoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.5),
    new THREE.MeshBasicMaterial({ map: vidTexture })
)
// videoPlane.rotation.y = Math.PI;
videoPlane.position.x = 2
videoPlane.position.y = -2
videoPlane.position.z = 1
// scene.add(videoPlane);

let currentInstrumentIndex = 0;
// const instruments = ['default', 'piano', 'guitar-acoustic', 'violin'];
const instruments = ['default', 'default', 'default', 'default'];

function switchInstrument() {
    currentInstrumentIndex = (currentInstrumentIndex + 1) % instruments.length;
}
window.addEventListener('keypress', (key) => {
    if(key.key === 's'){
        switchBgm();
        switchTexture();
        switchInstrument(); 
    }
  });



const tick = () =>
{
    // Change cat scale based on audio input
    const values = analyser.getValue();
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;
    const scaleValue = mapRange(averageValue, -120, -90, 0.75, 0.25);

    if(cat) {
        cat.scale.set(scaleValue, scaleValue, scaleValue);
        cat2.scale.set(scaleValue, scaleValue, scaleValue);
    }

    // Animation
    // Rotate notes
    const deltaTime = clock.getDelta()
    for (const note of notes) {
        note.rotation.x += note.rotationSpeed.x * deltaTime;
        note.rotation.y += note.rotationSpeed.y * deltaTime;
        note.rotation.z += note.rotationSpeed.z * deltaTime;
    }

    // Cast rays
    const objectsToTest = notes
    if(handRayOrigins.length > 0) {
        let intersects = []
        for(let i=0; i<handRayOrigins.length; i++) {
            const rayOrigin = handRayOrigins[i];
            raycaster[i].setFromCamera(rayOrigin, camera);
            let tempIntersects = raycaster[i].intersectObjects(objectsToTest);
            for (const intersect of tempIntersects) {
                intersect.rayIndex = i;
            }
            intersects = intersects.concat(tempIntersects);

            if(cat){
                modelIntersects = raycaster[i].intersectObject(cat, true)
        
                if(modelIntersects.length)
                {
                    // change cat material
                    cat2.visible = true
                    cat.visible = false

                    // Play sound if intersect with model
                    if(currentModelIntersect === null){
                        playSE()
                    }

                    currentModelIntersect = modelIntersects[0]
                } else {
                    // reset to default
                    cat.visible = true 
                    cat2.visible = false
                    currentModelIntersect = null
                }
            }
        }
    
        // reset to default
        for(const object of objectsToTest)
        {
            object.scale.set(1, 1, 1)
        }
    
        // change scale if intersect
        for(const intersect of intersects)
        {
            intersect.object.scale.set(1.3, 1.3, 1.3)
        }
    
        if(intersects.length)
        {
            currentIntersect = intersects[0]
        } else {
            currentIntersect = null
        }

        // Move object if pinching
        if (isPinching[0] && currentIntersect) {
            // Convert screen coordinates to world coordinates
            const intersection = new THREE.Vector3();
            raycaster[0].ray.intersectPlane(basePlane, intersection); // move objects on xy plane
            currentIntersect.object.position.copy(intersection);
        }
    }

    // Move Progress bar 
    progressBar.position.x += deltaTime * 1.75
    if(progressBar.position.x > 7)
    {
        progressBar.position.x = -7
    }

    // Progress bar raycast
    const progressPosition = new THREE.Vector3(progressBar.position.x, 10, progressBar.position.z);
    const progressBarDirection = new THREE.Vector3(0, -1, 0);
    progressRaycaster.set(progressPosition, progressBarDirection);
    const progressIntersects = progressRaycaster.intersectObjects(objectsToTest);
    
    if(isStart){
        if(progressIntersects.length)
        {
            for(const intersect of progressIntersects){
                intersect.object.scale.set(1.3, 1.3, 1.3)
            }
    
            // Play sound if progress intersects with objects
            if(currentProgressIntersectsObjects === null || currentProgressIntersectsObjects.length < progressIntersects.length)
            {
                const heights = []
                for (const intersect of progressIntersects) {
                    if(currentProgressIntersectsObjects === null){
                        const ndcX = mapPositionXToNDC(intersect.object.position.x);
                        heights.push(
                            {
                            'note':intersect.object.position.y,
                            'pos': ndcX
                        })
                    } else {
                        for (let k of currentProgressIntersectsObjects){
                            if(k.uuid !== intersect.object.uuid){
                                const ndcX = mapPositionXToNDC(intersect.object.position.x);
                                heights.push(
                                    {
                                    'note':intersect.object.position.y,
                                    'pos': ndcX
                                }
                                );
                            }
                        }
                    }
                }
                if(heights.length > 0){
                    playSound(heights, instruments[currentInstrumentIndex]);
                }
            }
            const temp = progressIntersects.map(inter => inter.object)
            currentProgressIntersectsObjects = temp
        } else {
            if(currentProgressIntersectsObjects)
            {
                for(const object of objectsToTest)
                    {
                        object.scale.set(1, 1, 1)
                    }
            }
            currentProgressIntersectsObjects = null
        }
    }

    // Update hand landmarks
    const result = detectFrame()
    if(result){
        processResults(result);
    }
    
    effectComposer.render() // Render with effects
    window.requestAnimationFrame(tick) // Call tick again on the next frame
}

tick()