import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls';
import { GLTFLoader } from './lib/GLTFLoader';
import { PointerLockControls } from './lib/PointerLockControls';
import * as utils from './utils';
import $ from 'jquery';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


function createBox() {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );
}

function createLine() {
  //create a blue LineBasicMaterial
  const material = new THREE.LineBasicMaterial( { color: 0xFFFFFF } );
  const points = [];
  points.push( new THREE.Vector3( - 10, 0, 0 ) );
  points.push( new THREE.Vector3( 0, 10, 0 ) );
  points.push( new THREE.Vector3( 10, 0, 10 ) );

  console.log('Line Points: ', points);
  const geometry = new THREE.BufferGeometry().setFromPoints( points );
  const line = new THREE.Line( geometry, material );
  scene.add( line );
}

createLine();


camera.position.set( 0, 0, 50 );
camera.lookAt( 0, 0, 0 );

function animate() {
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
animate();

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();