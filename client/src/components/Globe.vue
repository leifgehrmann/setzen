<script lang="ts">
import * as THREE from 'three';
import {ArcballControls} from "three/examples/jsm/controls/ArcballControls";

const colors = [
  '#6d001a',
  '#be0039',
  '#ff4500',
  '#ffa800',
  '#ffd635',
  '#fff8b8',
  '#00a368',
  '#00cc78',
  '#7eed56',
  '#00756f',
  '#009eaa',
  '#00ccc0',
  '#2450a4',
  '#3690ea',
  '#51e9f4',
  '#493ac1',
  '#6a5cff',
  '#94b3ff',
  '#811e9f',
  '#b44ac0',
  '#e4abff',
  '#de107f',
  '#ff3881',
  '#ff99aa',
  '#6d482f',
  '#9c6926',
  '#ffb470',
  '#000000',
  '#515252',
  '#898d90',
  '#d4d7d9',
  '#ffffff'
]

var seed = 1;
function myRandom() {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default {
  mounted() {

    let renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera;

    let controls: ArcballControls|null = null

    let cameraZoom = 390;
    let sphereSize = 200;
    let minCameraDistance = sphereSize/2 + 5
    let maxCameraDistance = cameraZoom * 1.5
    if (window.innerWidth < window.innerHeight) {
      cameraZoom *= window.innerHeight/window.innerWidth
      maxCameraDistance = cameraZoom * 1.5
    }
    let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();

    let sphere: THREE.Mesh;

    let vertexColors: Int32Array;

    init();

    function init() {

      camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
      camera.position.x = cameraVector.x * cameraZoom
      camera.position.y = cameraVector.y * cameraZoom
      camera.position.z = cameraVector.z * cameraZoom

      var raycaster = new THREE.Raycaster();

      const rotateBtn = document.getElementById('rotate');
      rotateBtn?.addEventListener('mouse', () => {
        console.log('hey!')
        camera.rotation.z += Math.PI / 12;
      });

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      const vertexShader = `
  attribute int vertexColor;
  varying vec4 vColor;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(
      float((vertexColor>>16)&255)/255.0,
      float((vertexColor>>8)&255)/255.0,
      float(vertexColor&255)/255.0,
      1
    );
  }
  `

      const fragmentShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }
  `

      const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false
      });


      const radius = sphereSize/2;

      const geometry = new THREE.IcosahedronGeometry(radius, 224);

      console.log(geometry.attributes.position.count/3)
      vertexColors = new Int32Array(geometry.attributes.position.count);

      for (let i = 0; i < vertexColors.length; i+=3) {

        let color = parseInt('0x' + colors[Math.floor(myRandom() * colors.length)].substring(1))

        vertexColors[i] = color
        vertexColors[i+1] = color
        vertexColors[i+2] = color
      }

      geometry.setAttribute('vertexColor', new THREE.BufferAttribute(vertexColors, 1));

      sphere = new THREE.Mesh(geometry, shaderMaterial);
      scene.add(sphere);

      function triangleClick(event: MouseEvent) {
        console.log("Click.");
        const mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
        const mouseY = - ( event.clientY / window.innerHeight ) * 2 + 1;
        const mouse = new THREE.Vector2( mouseX, mouseY);

        raycaster.setFromCamera( mouse, camera );
        var intersects = raycaster.intersectObjects( [sphere], true );

        // if there is one (or more) intersections
        console.log(intersects)
        if ( intersects.length > 0 ) {
          const face = intersects[ 0 ].face as THREE.Face;

          let color = parseInt('0x' + colors[Math.floor(myRandom() * colors.length /6)].substring(1))

          vertexColors[face.a] = color
          vertexColors[face.b] = color
          vertexColors[face.c] = color
          sphere.geometry.attributes.vertexColor.needsUpdate = true;
          renderer.render(scene, camera);
        }
      }

      renderer = new THREE.WebGLRenderer();
      // @ts-ignore
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      const container = document.getElementById('container');
      container?.appendChild(renderer.domElement);

      //
      createControls(camera)
      window.addEventListener('resize', onWindowResize);

      container?.addEventListener( 'click', triangleClick, false );

      renderer.render(scene, camera);
    }

    function createControls( camera: THREE.Camera ) {

      controls = new ArcballControls( camera, renderer.domElement );

      controls.enablePan = false
      controls.minDistance = minCameraDistance
      controls.maxDistance = maxCameraDistance

      controls.addEventListener( 'change', function () { renderer.render( scene, camera ); } );

    }

    function onWindowResize() {
      // @ts-ignore
      camera.aspect = window.innerWidth / window.innerHeight;
      // @ts-ignore
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    }
  }
}
</script>

<template>
  <div id="container"></div>
</template>
