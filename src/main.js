import * as THREE from 'three';
import { OrbitControls } from './lib/OrbitControls';
import { GLTFLoader } from './lib/GLTFLoader';
import { PointerLockControls } from './lib/PointerLockControls';
import * as utils from './utils';
import $ from 'jquery';

const {
  createPerspectiveCamera,
  resizeRendererToDisplaySize,
  updateCameraAspect,
  normalizedXYCoordinate,
  createBox,
  createSphere,
  mapRangeToAnotherRange,
  createRadialTexture,
} = utils;

const VERTEX_SHADER = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

$(() => {

  // INITS
  let currentIntersectedObject;
  let selectedSensor;
  let sceneControlCurrent = 'scene-select-sensor';
  let structure;
  let pointerLockControl;
  let controls;
  let hoveredSensor;

  const gltfLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();
  const floorTexture = textureLoader.load('./img/floor-texture.png');
  const sensorMappings = {};
  const sensorRadiusMappings = {};
  const $sensorList = $('#sensor-list');
  const canvas = document.getElementById('c');
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas });
  const camera = createPerspectiveCamera({
    near: 0.1,
    far: 1000,
  });
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  // const controls = new OrbitControls(camera, renderer.domElement);
  // const floor = createBox(15, 0.2, 30);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const $sceneSensorLabel = $('#scene-sensor-label');
  const $sceneSensorLabelHover = $('#scene-sensor-label-hover');
  const $sceneControlsButtons = $('#scene-controls-buttons');
  const $toggleBtns = $('#toggle-btns');
  const sensorData = [];
  const keyboard = {};
  const $wasd = $('#wasd');
  const $mainContainer = $('#main-container');
  const $offsetClose = $('#offset-close');

  controls = new OrbitControls(camera, renderer.domElement);
  // controls = new PointerLockControls(camera, document.body);

  $sceneSensorLabel.hide();

  // floor.name = 'floor';
  // floor.rotation.set(0, 0, 0);
  // floor.material.map = floorTexture;

  scene.add(directionalLight);
  scene.add(ambientLight);
  // scene.add(floor);

  // const radialTexturedPlane = createRadialTexturedPlane();
  // scene.add(radialTexturedPlane);

  directionalLight.position.set(-1, 2, 4);
  camera.position.set(0, -20, 40);

  gltfLoader.load('./models/therma-floor-model2.glb', (gltf) => {
    gltf.scene.name = 'structure';
    gltf.scene.position.set(0, -24, 0);
    gltf.scene.scale.set(60, 60, 60);
    structure = gltf.scene;

    // const material = new THREE.MeshPhongMaterial({
    //   color: 0xff0000,
    // });
    // gltf.scene.material = material;

    scene.add(gltf.scene);
  });

  // FUNCTION
  function updateLabel(_camera, _canvas, _selected) {
    if (!_selected) {
      return;
    }

    const { clientWidth, clientHeight } = _canvas;
    const vector = new THREE.Vector3();

    _selected.updateWorldMatrix();
    _selected.getWorldPosition(vector);

    vector.project(_camera);

    const x = (vector.x *  .5 + .5) * clientWidth;
    const y = (vector.y * -.5 + .5) * clientHeight;

    $sceneSensorLabel.show();
    $sceneSensorLabel.text(_selected.name);
    $sceneSensorLabel.css({
      transform: `translate(-50%, -50%) translate(${x}px,${y - 16}px)`,
    });
  }

  function displayHoveredLabel(_camera, _canvas, _hovered) {
    if (!_hovered) {
      return;
    }

    const { clientWidth, clientHeight } = _canvas;
    const vector = new THREE.Vector3();

    _hovered.updateWorldMatrix();
    _hovered.getWorldPosition(vector);

    vector.project(_camera);

    const x = (vector.x *  .5 + .5) * clientWidth;
    const y = (vector.y * -.5 + .5) * clientHeight;

    $sceneSensorLabelHover.show();
    $sceneSensorLabelHover.text(_hovered.name);
    $sceneSensorLabelHover.css({
      transform: `translate(-50%, -50%) translate(${x}px,${y - 16}px)`,
    });
  }

  function updateTemperature(_sensorData) {
    for(let i = 0, len = _sensorData.length; i < len; i++) {
      const _sensorDataItem = _sensorData[i];
      const { temperature, obj3d } = _sensorDataItem;
      const newTemperature = Math.abs((temperature + (Math.random() * 4 - 2)) % 360);

      if (Math.random() * 100 < 10) {
        obj3d.material.color.setStyle(`hsl(${temperature}, 100%, 50%)`);
        _sensorDataItem.temperature = newTemperature;
      }
    }
  }

  // EVENTS
  function onMouseMove(event) {
    const { target } = event;
    const normalizedXY = normalizedXYCoordinate(
      event.clientX,
      event.clientY,
      target.clientWidth,
      target.clientHeight
    );
    mouse.x = normalizedXY.x;
    mouse.y = normalizedXY.y;
  }

  renderer.domElement.addEventListener('mousemove', onMouseMove, false);

  // ADD NEW SENSOR
  renderer.domElement.addEventListener('click', (event) => {
    if (sceneControlCurrent !== 'scene-add-sensor') {
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length
        && sceneControlCurrent === 'scene-select-sensor'
        && intersects[0].object.userData.type === 'sensor') {
          if (selectedSensor && intersects[0].object.name !== selectedSensor.name) {
            sensorRadiusMappings[selectedSensor.name].visible = false;
          }

          selectedSensor = intersects[0].object;

          $('.sensor-item').removeClass('selected');
          $(`#${selectedSensor.name}`).addClass('selected');
      }

      return;
    }

    // const intersects = raycaster.intersectObjects(scene.children);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length) {

      if (selectedSensor) {
        sensorRadiusMappings[selectedSensor.name].visible = false;
      }

      const count = Object.keys(sensorMappings).length;
      const mappingId = `sensor_${count + 1}`;
      // const box = createBox(1, 1, 1);
      const box = createSphere();
      const point = intersects[0].point;
      // const temperature = Math.random() * 100;
      const temperature = mapRangeToAnotherRange(Math.random() * 50, 0, 100, 210, 360)

      box.name = mappingId;
      box.userData.type = 'sensor';
      // box.position.set(point.x, point.y, point.z + 0.5);
      box.position.set(point.x, point.y, 1);
      // box.scale.set(1, 1, 0.5);
      box.scale.set(0.2, 0.2, 0.2);
      // box.material.color.setHex(0xff0000);
      box.material.color.setStyle(`hsl(${temperature}, 100%, 50%)`);
      scene.add(box);

      sensorMappings[mappingId] = box;
      selectedSensor = box;

      $('.sensor-item').removeClass('selected');
      $sensorList.prepend(`
        <div
          id="${mappingId}"
          class="sensor-item selected">
          <div class="sensor-item-head">
            <div class="sensor-name">${mappingId}</div>
            <button class="btn-delete-sensor-item">DEL</button>
          </div>
          <div class="sensor-item-body">
            <div class="temperature-box" style="background: hsl(${temperature}, 100%, 50%);"></div>
            <div class="sensor-item-position">
              <div class="sensor-item-coord">LAT:
                <span id="sensor-coord-lat-value">${box.position.x}</span>
              </div>
              <div class="sensor-item-coord">LNG:
                <span id="sensor-coord-lng-value">${box.position.y}</span>
              </div>
            </div>
            <div class="sensor-item-temperature">TEMPERATURE:
              <span id="sensor-temperature-value">${temperature.toFixed(2)}</span>
            </div>
          </div>
          <div class="sensor-item-footer">
            <button class="btn-sensor-detail">VEIW DETAILS</button>
          </div>
        </div>
      `);

      sensorData.push({
        obj3d: sensorMappings[mappingId],
        temperature,
      });

      const geometry = new THREE.CircleGeometry(4, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 'hsl(117, 100%, 50%)',
        side: THREE.DoubleSide,
        opacity: 0.2,
        transparent: true,
        depthTest: false,
      });
      const circle = new THREE.Mesh(geometry, material);

      circle.position.set(point.x, point.y, 1);

      scene.add(circle);

      sensorRadiusMappings[mappingId] = circle;

      const radialTexture = createRadialTexture(temperature);
      const canvasTexture = new THREE.CanvasTexture(radialTexture);
      const geo = new THREE.BufferGeometry();

      geo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([
          point.x, point.y, 1
        ], 3),
      );

      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        map: canvasTexture,
        blending: THREE.AdditiveBlending,
        size: 14,
        transparent: true,
        depthTest: false,
      });
      const points = new THREE.Points(geo, mat);

      scene.add(points);
    }
  }, false);

  $toggleBtns.on('click', (e) => {
    const $target = $(e.target);

    if (!$target.hasClass('btn-toggle')) {
      return;
    }

    if ($target.hasClass('selected')) {
      $target.removeClass('selected');
    } else {
      $target.addClass('selected');
    }

    const targetId = $target.attr('id');
    const visibility = $target.hasClass('selected');

    switch(targetId) {
      case 'btn-toggle-sensor':
        sensorData.forEach((sensorItem) => {
          sensorItem.obj3d.visible = visibility;
        });
        break;
      case 'btn-toggle-structure':
        // floor.visible = visibility;
        if (structure) {
          structure.visible = visibility;
        }
        break;
    }
  });

  $sceneControlsButtons.on('click', (e) => {
    const $target = $(e.target);
    const dataValue = $target.data('control-value');

    if (dataValue === sceneControlCurrent) {
      return;
    }

    if (!$target.hasClass('scene-control-btn')) {
      return;
    }

    $('.scene-control-btn').removeClass('selected');

    sceneControlCurrent = dataValue;

    $target.addClass('selected');

    if (sceneControlCurrent === 'fpv') {
      $wasd.show();
      controls = new PointerLockControls(camera, renderer.domElement);

      camera.position.set(0, 0, 0);

      controls.addEventListener('unlock', () => {
        controls = new OrbitControls(camera, renderer.domElement);

        sceneControlCurrent = 'scene-select-sensor';
        $('.scene-control-btn').removeClass('selected');
        $('#select-sensor-mode').addClass('selected');

        $wasd.hide();
      });
      controls.lock();
    }
  });

  $offsetClose.on('click', () => {
    $mainContainer.removeClass('offsetted');
  });

  $sensorList.on('click', (e) => {
    const $target = $(e.target);

    if ($target.hasClass('btn-sensor-detail')) {
      $mainContainer.addClass('offsetted');
    }

    if ($target.hasClass('sensor-item')) {
      sensorRadiusMappings[selectedSensor.name].visible = false;

      selectedSensor = sensorMappings[$target.attr('id')];
      sensorRadiusMappings[selectedSensor.name].visible = true;

      $('.sensor-item').removeClass('selected');
      $target.addClass('selected');
    }
  });

  window.addEventListener('keydown', (evt) => {
    keyboard[evt.key] = true;
  });

  window.addEventListener('keyup', (evt) => {
    keyboard[evt.key] = false;
  });

  function processKeyboardInput() {
    if (!(controls instanceof PointerLockControls)) {
      return;
    }

    if (keyboard['w']) {
      controls.moveForward(0.2);
    }

    if (keyboard['s']) {
      controls.moveForward(-0.2);
    }

    if (keyboard['a']) {
      controls.moveRight(-0.2);
    }

    if (keyboard['d']) {
      controls.moveRight(0.2);
    }
  }

  function createRadialTexturedPlane(hue = 210, w = 2, h = 2) {
    const radialTexture = createRadialTexture(hue);
    const canvasTexture = new THREE.CanvasTexture(radialTexture);
    const geometry = new THREE.PlaneGeometry(w, h, 8);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: canvasTexture,
      blending: THREE.AdditiveBlending,
      // polygonOffset: true,
      // polygonOffsetFactor: -0.1,
      // // alphaTest: 0.5,
    });
    const plane = new THREE.Mesh(geometry, material);

    return plane;
  }


  function temporary() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    const mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);
  }

  // temporary();

  // RENDER LOOP
  requestAnimationFrame(function loop(time) {
    requestAnimationFrame(loop);

    const isResize = resizeRendererToDisplaySize(renderer);

    if (isResize) {
      updateCameraAspect(camera, renderer.domElement);
    }

    processKeyboardInput();

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length && intersects[0].object.userData.type === 'sensor' && intersects[0].object !== selectedSensor) {
      hoveredSensor = intersects[0].object;
      sensorRadiusMappings[hoveredSensor.name].visible = true;
    } else if (hoveredSensor !== selectedSensor && hoveredSensor) {
      sensorRadiusMappings[hoveredSensor.name].visible = false;
      hoveredSensor = null;
      $sceneSensorLabelHover.hide();
    }

    displayHoveredLabel(camera, renderer.domElement, hoveredSensor);

    // if (intersects.length && intersects[0].object.name === 'structure') {
    //   currentIntersectedObject = intersects[0].object;
    //   currentIntersectedObject
    //     .userData
    //     .materialOriginalColor = currentIntersectedObject
    //                           .material
    //                           .color.getHex();
    //   currentIntersectedObject.material.color.setHex(0x909090);
    // } else if (currentIntersectedObject) {
    //   currentIntersectedObject
    //     .material
    //     .color
    //     .setHex(0x808080);
    //   currentIntersectedObject = null;
    // }

    // updateTemperature(sensorData);
    updateLabel(camera, renderer.domElement, selectedSensor);

    if (controls instanceof OrbitControls) {
      controls.update();
    }

    renderer.render(scene, camera);
  });
});