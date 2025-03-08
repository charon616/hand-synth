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
const matcapTexture = textureLoader.load('/textures/matcaps/6.png')
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

// MeshNormalMaterial
// const material = new THREE.MeshNormalMaterial()
// material.flatShading = true

// MeshMatcapMaterial
const matcapMaterial = new THREE.MeshMatcapMaterial()
matcapMaterial.matcap = matcapTexture

// MeshDepthMaterial
// const material = new THREE.MeshDepthMaterial()

// MeshLambertMaterial
// const material = new THREE.MeshLambertMaterial()

// MeshPhongMaterial
// const material = new THREE.MeshPhongMaterial()
// material.shininess = 100
// material.specular = new THREE.Color(0x1188ff)

// MeshToonMaterial
// const material = new THREE.MeshToonMaterial()
// gradientTexture.minFilter = THREE.NearestFilter
// gradientTexture.magFilter = THREE.NearestFilter
// gradientTexture.generateMipmaps = false
// material.gradientMap = gradientTexture

// MeshStandardMaterial
// const material = new THREE.MeshStandardMaterial()
// material.metalness = 1
// material.roughness = 1
// material.map = doorColorTexture
// material.aoMap = doorAmbientOcclusionTexture
// material.aoMapIntensity = 1
// material.displacementMap = doorHeightTexture
// material.displacementScale = 0.2
// material.metalnessMap = doorMetalnessTexture
// material.roughnessMap = doorRoughnessTexture
// material.normalMap = doorNormalTexture
// material.normalScale.set(0.5, 0.5)
// material.transparent = true
// material.alphaMap = doorAlphaTexture

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
// material.iridescence = 1
// material.iridescenceIOR = 1
// material.iridescenceThickness = [ 100, 800 ]

// gui.add(material, 'iridescence').min(0).max(1).step(0.0001)
// gui.add(material, 'iridescenceIOR').min(1).max(2.333).step(0.0001)
// gui.add(material.iridescenceThicknessRange, '0').min(1).max(1000).step(1)
// gui.add(material.iridescenceThicknessRange, '1').min(1).max(1000).step(1)

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


/**
 * Objects
 */
const object1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    material
)
object1.position.x = - 2
object1.castShadow = true

const object2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    material.clone()
)
object2.castShadow = true

const object3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    matcapMaterial
)
object3.position.x = 2
object3.castShadow = true

const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.2, 64, 128),
    material.clone()
)
torus.position.x = 1.5
torus.castShadow = true
scene.add(torus)
scene.add(object1, object2, object3)

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
// object1.updateMatrixWorld()
// object2.updateMatrixWorld()
// object3.updateMatrixWorld()
const raycaster = new THREE.Raycaster()
// const rayOrigin = new THREE.Vector3(-3, 0, 0)
// const rayDirection = new THREE.Vector3(10, 0, 0)
// rayDirection.normalize()
// raycaster.set(rayOrigin, rayDirection)

// const intersect = raycaster.intersectObject(object2)
// console.log(intersect)

// const intersects = raycaster.intersectObjects([object1, object2, object3])
// console.log(intersects)

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
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Audio
 */

// const listener = new THREE.AudioListener()
// camera.add(listener)

// const sound = new THREE.Audio(listener)
// // load a sound and set it as the Audio object's buffer
// const audioLoader = new THREE.AudioLoader();
// audioLoader.load( '/sounds/sub-bass-line-by-alien-i-trust-125_bpm-289271.mp3', function( buffer ) {
// 	sound.setBuffer( buffer );
// 	sound.setLoop( true );
// 	sound.setVolume( 0.5 );
//     window.addEventListener('click', () =>
//     {
//         sound.play()
//     })
// });
//create a synth and connect it to the main output (your speakers)
const synth = new Tone.PolySynth(Tone.Synth).toDestination();
synth.set({
    envelope: {
        attack: 0.5,
		decay: 0.3,
		sustain: 0.7,
		release: 1.2,
    }
})
let now;

// const player = new Tone.Player({
//     url: "/sounds/sub-bass-line-by-alien-i-trust-125_bpm-289271.mp3",
//     loop: true,
//     autostart: true
// }).toDestination();
// // const distortion = new Tone.Distortion(0.4).toDestination();
// const filter = new Tone.Filter(400, "lowpass").toDestination();
// // player.connect(distortion);
// player.connect(filter);

const openHiHatPart = new Tone.Part(((time) => {
    openHiHat.triggerAttack(time);
}), [{ "8n": 2 }, { "8n": 6 }])

const closedHiHat = new Tone.NoiseSynth({
    volume: -10,
    envelope: {
        attack: 0.01,
        decay: 0.15
    },
}).toDestination();

const closedHatPart = new Tone.Part(((time) => {
    closedHiHat.triggerAttack(time);
}), [0, { "16n": 1 }, { "8n": 1 }, { "8n": 3 }, { "8n": 4 }, { "8n": 5 }, { "8n": 7 }, { "8n": 8 }])

document.getElementById('start-button').addEventListener('click', async () => {
    await Tone.start();
    document.getElementById('start-screen').style.display = 'none';
});

//play a middle 'C' for the duration of an 8th note
window.addEventListener('click', async() => {
    // player.start();
    now = Tone.now();
    synth.triggerAttackRelease(80, "8n", now);
    synth.triggerAttackRelease(40, "8n", now + 0.5);
    synth.triggerAttackRelease("A4", "8n", now + 1);
    synth.triggerAttackRelease("C5", "8n", now + 1.5);
    synth.triggerAttackRelease("E5", "8n", now + 2);

    openHiHatPart.start(now);
    closedHatPart.start(now);
})

// const analyzer = new THREE.AudioAnalyser(sound, 32)

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

/**
 * Mouse
 */
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (event) =>
{
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1
})

window.addEventListener('click', () =>
{
    if(!currentIntersect) return

    switch(currentIntersect.object)
    {
        case object1:
            console.log('click on object 1')
            break
        case object2:
            console.log('click on object 2')
            break
        case object3:
            console.log('click on object 3')
            break
    }
})

/**
 * Animate
 */
const clock = new THREE.Clock()
let currentTime = Date.now()
let previousTime = Date.now()

let currentIntersect = null

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Animate objects
    object1.position.y = Math.sin(elapsedTime * 0.3) * 1.5
    object3.position.y = Math.sin(elapsedTime * 1.4) * 1.5

    object2.position.set(0, 0, 0); // Reset position before scaling
    // object2.scale.x = (analyzer.getAverageFrequency() / 255) * 5
    // object2.scale.y = (analyzer.getAverageFrequency() / 255) * 5
    // object2.scale.z = (analyzer.getAverageFrequency() / 255) * 5
    // object2.position.y = analyzer.getAverageFrequency() / 255 * 10

    // Cast a ray
    raycaster.setFromCamera(mouse, camera)

    progressBar.position.x = elapsedTime

    // const rayOrigin = new THREE.Vector3(-3, 0, 0)
    // const rayDirection = new THREE.Vector3(1, 0, 0)
    // rayDirection.normalize()
    // raycaster.set(rayOrigin, rayDirection)

    const objectsToTest = [object1, object3, torus]
    const intersects = raycaster.intersectObjects(objectsToTest)

    // reset to default
    for(const object of objectsToTest)
    {
        object.scale.set(1, 1, 1)
        object.material.color.set('#2e46ff')
    }

    // change if intersect
    for(const intersect of intersects)
    {
        intersect.object.scale.set(1.3, 1.3, 1.3)
        intersect.object.material.color.set('#ff0000')
    }

    if(intersects.length)
    {
        if(currentIntersect === null)
        {
            console.log('mouse enter')
        }
        currentIntersect = intersects[0]
    } else {
        if(currentIntersect)
        {
            console.log('mouse leave')
        }
        currentIntersect = null
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