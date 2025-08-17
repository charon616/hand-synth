# HandSynth on a Rainy Day

A web-based instrument inspired by rainy days, using the MediaPipe hand detection system and Three.js.

## Installation

Run this followed commands:

```bash
npm install
npm run dev
```

## Usage

After launching the app and pressing the start button, please allow camera and sound access if prompted. Raise your hand in front of the camera and use your thumb and index finger to pinch objects. The height of each object determines its pitch, and the sound will play when the silver bar intersects with the objects. The size of the cat changes according to the background music.

You can change the background music and sound type by tapping the 3D record object in the bottom right corner of the screen.

## Tool

This project utilized the following technologies:
- [three.js](https://threejs.org/)
- [Tone.js](https://tonejs.github.io/)
- [MediaPipe Hand landmarks detection](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)

## Reference

The base project setup and materials for the three.js code are referenced from Bruno Simon's Three.js Journey.
- [three.js journey](https://threejs-journey.com/)

Sound generation code is partly from @mattdesl works
- [tone.js demos](https://tone-demos.glitch.me/)

EnvironmentMap
- Studio HDR by Sergej Majboroda
[studio_small_09_4k.hdr](https://polyhaven.com/a/studio_small_09)

Matcap texture
- Matcap Mega Bundle by [Cosmo Labs](https://cosmolabs.lemonsqueezy.com/)
- Free 12 Glass Material Pack by [canersevince](https://app.spline.design/community/file/9ca633b3-2554-431a-a786-6779be138cad) 

3D Model
- Dingus the cat by alwayshasbean [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/4dXgbKLHD9)
- gramophone vinyl free 3D model by aghabay (https://www.cgtrader.com/free-3d-models/various/various-models/gramophone-vinyl)

Photos from [Unsplash](https://unsplash.com/)


- https://unsplash.com/photos/a-wet-window-with-a-traffic-light-on-it-JgDUVGAXsso
- https://unsplash.com/photos/a-window-with-rain-drops-on-it-SG4fPCsywj4
- https://unsplash.com/photos/raindrops-TdPQp3fjzOw
- https://unsplash.com/photos/a-window-that-has-a-tree-outside-of-it-jy-uS8iJhX4

Sounds from [Freesound.org](https://freesound.org/)
- https://freesound.org/people/suicdxsaturday/sounds/698632/

and from [Pixabay](https://pixabay.com/)

## Date
2025-03-12

## Last Updated
2025-08-13

## Author
Karin Kiho