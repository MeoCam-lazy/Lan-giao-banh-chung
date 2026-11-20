import * as THREE from 'three';
import { sfx } from './audio.js';
import { createLionDance, createTetGiftMesh, scatterTetLanterns } from './tet_props.js';
import { buildKit } from '../assets/kit.mjs';
import { stage } from '../assets/stage.mjs';
import { animate as animateHumanoid } from '../assets/clips.mjs';
import { createAsset as createBicycle } from '../assets/city-bicycle.mjs';
import { createAsset as createStudent } from '../assets/student-character.mjs';
import { createAsset as createSalaryman } from '../assets/salaryman-character.mjs';
import { createAsset as createTaxi } from '../assets/city-taxi.mjs';
import { createAsset as createVan } from '../assets/kei-van.mjs';

const TOTAL_REAL_SECONDS = 90;
const HS_KEY = 'dan_gian_remix_tet_hs';

const state = {
  phase: 'START',
  riding: false,
  timeLeft: TOTAL_REAL_SECONDS,
  score: 0,
  highScore: Number(localStorage.getItem(HS_KEY) || 0),
  delivered: 0,
  combo: 1,
  maxCombo: 1,
  orders: [],
  freshness: 100,
  buffTimer: 0, // Phúc Lộc từ Múa Lân (x2 điểm)
  hitCooldown: 0,
  pickupCooldown: 0,
  boostTimer: 0,
  trauma: 0,
  pedalPhase: 0,
  camMode: 0,
};

const container = document.getElementById('canvas-container');
const labelsWrap = document.getElementById('world-labels');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const clockEl = document.getElementById('clock-display');
const realSubEl = document.getElementById('real-time-sub');
const orderEl = document.getElementById('order-display');
const bagCountEl = document.getElementById('bag-count');
const freshBar = document.getElementById('fresh-bar');
const scoreEl = document.getElementById('score-display');
const highScoreEl = document.getElementById('high-score');
const comboEl = document.getElementById('combo-display');
const toastEl = document.getElementById('toast');
const mmCtx = document.getElementById('minimap').getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 350);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Ánh sáng Đêm Giao Thừa ấm áp (đèn cửa sổ tự sáng!)
const look = stage(renderer, scene, { time: 'dusk' });
const place = await buildKit({ folder: './assets/', city: { seed: 2026, blocks: [3, 2] }, people: 'idle', night: true });
scene.add(place.group);
look.ground(place);
look.shadows(place.group);

const streetsX = place.city?.streets?.x || [0];
const streetsZ = place.city?.streets?.z || [0];
scatterTetLanterns(scene, streetsX, streetsZ);

const lots = place.city?.lots || [];
const homeSpot = place.openSpot({ near: new THREE.Vector3(0, 0, 0) });
const HOME_POS = { x: homeSpot.x, z: homeSpot.z };
const BIKE_START = place.openSpot({ near: new THREE.Vector3(homeSpot.x + 5, 0, homeSpot.z + 2.5) });
const SHOP_POS = place.openSpot({ near: new THREE.Vector3(homeSpot.x - 9, 0, homeSpot.z - 7) });

const HOSTS = [
  { name: 'Bà Ngoại (Bánh Chưng)', isMale: false, color: 0x16a34a, hex: '#22c55e' },
  { name: 'Ông Đồ (Câu Đối)', isMale: true, color: 0xfacc15, hex: '#facc15' },
  { name: 'Cô Giáo Lan (Cành Đào)', isMale: false, color: 0xf43f5e, hex: '#f43f5e' },
  { name: 'Thầy Minh (Đèn Lồng)', isMale: true, color: 0x38bdf8, hex: '#38bdf8' },
];

const chosenLots = [];
for (const lot of lots) {
  if (Math.hypot(lot.door[0] - SHOP_POS.x, lot.door[1] - SHOP_POS.z) < 16) continue;
  if (chosenLots.every((c) => Math.hypot(lot.door[0] - c.door[0], lot.door[1] - c.door[1]) > 22)) {
    chosenLots.push(lot);
    if (chosenLots.length === 4) break;
  }
}

const TEACHERS = HOSTS.map((t, i) => {
  const lot = chosenLots[i] || { door: [(i % 2 === 0 ? -24 : 24), (i < 2 ? -18 : 18)] };
  return { id: i, ...t, dropX: lot.door[0], dropZ: lot.door[1] };
});

const shopRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.2, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
shopRing.rotation.x = -Math.PI / 2;
shopRing.position.set(SHOP_POS.x, 0.08, SHOP_POS.z);
const bikeRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 24), new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
bikeRing.rotation.x = -Math.PI / 2;
bikeRing.position.set(BIKE_START.x, 0.08, BIKE_START.z);
scene.add(shopRing, bikeRing);

const npcAnims = [];
const houseMarkers = TEACHERS.map((t) => {
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  beacon.position.set(t.dropX, 7, t.dropZ);
  beacon.visible = false;
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.2, 24), new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(t.dropX, 0.08, t.dropZ);
  pad.visible = false;

  const npc = t.isMale ? createSalaryman() : createStudent({ bag: 'none' });
  if (!t.isMale) npc.scale.setScalar(1.06);
  npc.position.set(t.dropX, 0, t.dropZ);
  npc.lookAt(SHOP_POS.x, 0, SHOP_POS.z);
  scene.add(beacon, pad, npc);
  animateHumanoid(npc).then((a) => { if (a) { a.locomotion(0); npcAnims.push(a); } }).catch(() => {});
  return { beacon, pad };
});

// 2 Đoàn Múa Lân (Lân Đỏ & Lân Vàng) nhảy múa dọc phố
const lions = [
  { lion: createLionDance(0xe11d48), z: streetsZ[0] || -15, x: -20, dir: 1, speed: 6.5, cd: 0 },
  { lion: createLionDance(0xd97706), z: streetsZ[1] || 15, x: 20, dir: -1, speed: 6.5, cd: 0 },
];
lions.forEach((l) => { l.lion.root.position.set(l.x, 0, l.z); scene.add(l.lion.root); });

// Nhân vật Nữ Sinh + Xe đạp + Lễ vật Tết sau yên
const playerRoot = new THREE.Group();
const tiltGroup = new THREE.Group();
playerRoot.add(tiltGroup);
const student = createStudent();
student.scale.setScalar(0.92);
tiltGroup.add(student);
const studentAnim = await animateHumanoid(student).catch(() => null);
const bones = {
  spine: student.getObjectByName('Spine1'),
  lArm: student.getObjectByName('LeftArm'),
  rArm: student.getObjectByName('RightArm'),
  lFore: student.getObjectByName('LeftForeArm'),
  rFore: student.getObjectByName('RightForeArm'),
  lUpLeg: student.getObjectByName('LeftUpLeg'),
  rUpLeg: student.getObjectByName('RightUpLeg'),
  lLeg: student.getObjectByName('LeftLeg'),
  rLeg: student.getObjectByName('RightLeg'),
};

function applyRidingPose(phase) {
  if (bones.spine) bones.spine.rotation.set(0.28, 0, 0);
  if (bones.lArm) { bones.lArm.rotation.order = 'YXZ'; bones.lArm.rotation.set(0, -0.78, -0.95); }
  if (bones.rArm) { bones.rArm.rotation.order = 'YXZ'; bones.rArm.rotation.set(0, 0.78, 0.95); }
  if (bones.lFore) bones.lFore.rotation.set(0, -0.3, 0);
  if (bones.rFore) bones.rFore.rotation.set(0, 0.3, 0);
  const s1 = Math.sin(phase); const s2 = Math.sin(phase + Math.PI);
  if (bones.lUpLeg) bones.lUpLeg.rotation.set(-1.1 + s1 * 0.35, 0, 0);
  if (bones.rUpLeg) bones.rUpLeg.rotation.set(-1.1 + s2 * 0.35, 0, 0);
  if (bones.lLeg) bones.lLeg.rotation.set(1.15 - s1 * 0.25, 0, 0);
  if (bones.rLeg) bones.rLeg.rotation.set(1.15 - s2 * 0.25, 0, 0);
}

const bicycle = createBicycle({ colorway: 'post-red' });
const tetGift = createTetGiftMesh();
tetGift.group.position.set(0, 0.85, -0.58);
tetGift.group.visible = false;
bicycle.add(tetGift.group);
bicycle.position.set(BIKE_START.x, 0, BIKE_START.z);
scene.add(bicycle);

const arrowGroup = new THREE.Group();
const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
arrowCone.rotation.x = Math.PI / 2;
arrowCone.position.set(0, 2.4, 0.35);
arrowGroup.add(arrowCone);
playerRoot.add(arrowGroup);
playerRoot.position.set(HOME_POS.x, 0, HOME_POS.z);
scene.add(playerRoot);

// Giao thông Taxi & Kei Van
const traffic = [];
const citySize = place.city?.size || [120, 90];
const halfX = citySize[0] / 2 - 2;
const halfZ = citySize[1] / 2 - 2;
streetsZ.forEach((sz, idx) => {
  const carMesh = idx % 2 === 0 ? createTaxi() : createVan();
  scene.add(carMesh);
  traffic.push({ mesh: carMesh, axis: 'x', fixed: sz + (idx % 2 === 0 ? 1.8 : -1.8), pos: (idx % 2 === 0 ? -halfX + 6 : halfX - 6), dir: idx % 2 === 0 ? 1 : -1, speed: 10, min: -halfX, max: halfX });
});
streetsX.slice(0, 2).forEach((sx, idx) => {
  const carMesh = idx % 2 === 0 ? createVan() : createTaxi();
  scene.add(carMesh);
  traffic.push({ mesh: carMesh, axis: 'z', fixed: sx + 1.8, pos: -halfZ + 8 + idx * 14, dir: 1, speed: 9, min: -halfZ, max: halfZ });
});

const bikeLabel = createLabelEl('🚲 XE ĐẠP TẾT');
const labelNodes = [
  { el: createLabelEl('🏮 SẢNH LỄ VẬT TẾT'), x: SHOP_POS.x, y: 3.2, z: SHOP_POS.z, id: -1 },
  { el: bikeLabel, x: BIKE_START.x, y: 2.2, z: BIKE_START.z, id: -2 },
  ...TEACHERS.map((t) => ({ el: createLabelEl(t.name), x: t.dropX, y: 4.5, z: t.dropZ, id: t.id })),
];
function createLabelEl(text) {
  const div = document.createElement('div');
  div.className = 'world-label';
  div.textContent = text;
  labelsWrap.appendChild(div);
  return div;
}

function spawnEmojis(worldX, worldZ, icons = ['🧧', '🎆', '💖', '🌸', '✨']) {
  const p = new THREE.Vector3(worldX, 2.2, worldZ).project(camera);
  const cx = (p.x * 0.5 + 0.5) * window.innerWidth;
  const cy = (-p.y * 0.5 + 0.5) * window.innerHeight;
  icons.forEach((icon, i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'floating-heart';
      el.textContent = icon;
      el.style.left = `${cx + (Math.random() - 0.5) * 100}px`;
      el.style.top = `${cy + (Math.random() - 0.5) * 30}px`;
      labelsWrap.appendChild(el);
      setTimeout(() => el.remove(), 1450);
    }, i * 100);
  });
}

const keys = {};
let toastTimer = null;
function showToast(msg, warn = false) {
  toastEl.textContent = msg;
  toastEl.className = warn ? 'toast warn' : 'toast';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 1800);
}

function mountBike() {
  state.riding = true;
  bikeRing.visible = false;
  bikeLabel.style.display = 'none';
  if (studentAnim?.mixer) studentAnim.mixer.stopAllAction();
  scene.remove(bicycle);
  bicycle.position.set(0, 0, 0);
  bicycle.rotation.set(0, 0, 0);
  tiltGroup.add(bicycle);
  student.position.set(0, 0.36, -0.14);
  applyRidingPose(0);
  sfx.playBell();
  showToast('🚲 Đã lên xe! Ghé Sảnh Lễ Vật nhận Bánh Chưng & Đào!');
}

function dismountBike() {
  state.riding = false;
  bikeRing.visible = true;
  tiltGroup.remove(bicycle);
  bicycle.position.set(BIKE_START.x, 0, BIKE_START.z);
  bicycle.rotation.set(0, 0, 0);
  scene.add(bicycle);
  student.position.set(0, 0, 0);
  if (bones.spine) bones.spine.rotation.set(0, 0, 0);
}

function syncMarkers() {
  houseMarkers.forEach((m, id) => {
    const active = state.orders.some((o) => o.id === id);
    m.beacon.visible = active;
    m.pad.visible = active;
  });
  labelNodes.forEach((ln) => { if (ln.id >= 0) ln.el.classList.toggle('active', state.orders.some((o) => o.id === ln.id)); });
  tetGift.group.visible = state.orders.length > 0;
  if (state.orders.length > 0) tetGift.petalMat.color.setHex(state.orders[0].color);
}

function startOrReset(climax = false) {
  sfx.unlock();
  dismountBike();
  state.phase = 'PLAYING';
  state.timeLeft = climax ? 22 : TOTAL_REAL_SECONDS;
  state.score = 0;
  state.delivered = 0;
  state.combo = 1;
  state.maxCombo = 1;
  state.orders = [];
  state.freshness = 100;
  state.buffTimer = 0;
  state.hitCooldown = 0;
  state.pickupCooldown = 0;
  state.boostTimer = 0;
  state.trauma = 0;

  playerRoot.position.set(HOME_POS.x, 0, HOME_POS.z);
  if (climax) mountBike();
  syncMarkers();
  startScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  sfx.startBGM(() => state.timeLeft < 25 || state.buffTimer > 0);
  showToast(climax ? '⚡ 23:58 SẮP GIAO THỪA RỒI!' : '🏃 Đi bộ lại chiếc Xe Đạp Đỏ để lên xe!');
  updateUI();
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.phase === 'START') startOrReset(false);
    else if (state.phase === 'PLAYING' && state.riding) {
      // Kiểm tra tương tác gần Đoàn Múa Lân (< 7m) -> Nhận Lộc x2 + Trống Lân + Pháo hoa!
      const nearLion = lions.find((l) => l.cd <= 0 && Math.hypot(playerRoot.position.x - l.x, playerRoot.position.z - l.z) < 7.5);
      if (nearLion) {
        nearLion.cd = 10;
        state.buffTimer = 8;
        state.freshness = 100;
        state.score += 200;
        sfx.playLionDrum();
        spawnEmojis(nearLion.x, nearLion.z, ['🦁', '🧧', '🎆', '✨', '💰']);
        showToast('🦁 MÚA LÂN BAN LỘC! +200đ & x2 Điểm 8s!');
      } else if (state.boostTimer <= 0) {
        state.boostTimer = 0.5;
        sfx.playBell();
      }
    }
  }
  if (e.code === 'KeyR' && state.phase !== 'START') startOrReset(false);
  if (e.code === 'KeyM') showToast(sfx.toggleMute() ? '🔇 Tắt âm' : '🔊 Bật âm');
  if (e.code === 'KeyC') { state.camMode = (state.camMode + 1) % 2; showToast(state.camMode === 0 ? '📷 Góc sau lưng' : '📷 Góc trên cao'); }
  if (e.code === 'F2') startOrReset(true);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
document.getElementById('btn-start').onclick = () => startOrReset(false);
document.getElementById('btn-restart').onclick = () => startOrReset(false);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

function updateUI() {
  const ratio = 1 - Math.max(0, state.timeLeft) / TOTAL_REAL_SECONDS;
  const totalSec = Math.floor(ratio * 600);
  const mins = 50 + Math.floor(totalSec / 60);
  clockEl.textContent = mins >= 60 ? '00:00' : `23:${String(mins).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
  realSubEl.textContent = state.buffTimer > 0 ? `🦁 LỘC LÂN x2 (${state.buffTimer.toFixed(1)}s)` : `Còn ${Math.ceil(state.timeLeft)}s thực tế`;
  bagCountEl.textContent = `${state.orders.length}/1`;
  orderEl.textContent = !state.riding ? 'Bước 1: Đi bộ tới Xe Đạp Đỏ!' : (state.orders.length > 0 ? `Giao tới: ${state.orders[0].name}` : 'Ghé Sảnh Lễ Vật nhận Bánh Chưng & Đào!');
  freshBar.style.width = `${Math.max(0, state.freshness)}%`;
  scoreEl.textContent = state.score;
  highScoreEl.textContent = state.highScore;
  comboEl.textContent = `x${state.combo} • Đã chúc: ${state.delivered}`;
}

function drawMinimap() {
  const w = 184; const h = 140;
  const size = place.city?.size || [120, 90];
  const toX = (x) => ((x + size[0] / 2) / size[0]) * w;
  const toZ = (z) => ((z + size[1] / 2) / size[1]) * h;
  mmCtx.fillStyle = '#0f172a';
  mmCtx.fillRect(0, 0, w, h);

  mmCtx.strokeStyle = '#334155';
  mmCtx.lineWidth = 6;
  streetsX.forEach((sx) => { mmCtx.beginPath(); mmCtx.moveTo(toX(sx), 0); mmCtx.lineTo(toX(sx), h); mmCtx.stroke(); });
  streetsZ.forEach((sz) => { mmCtx.beginPath(); mmCtx.moveTo(0, toZ(sz)); mmCtx.lineTo(w, toZ(sz)); mmCtx.stroke(); });

  mmCtx.fillStyle = '#facc15';
  mmCtx.beginPath(); mmCtx.arc(toX(SHOP_POS.x), toZ(SHOP_POS.z), 4.5, 0, Math.PI * 2); mmCtx.fill();

  const px = toX(playerRoot.position.x);
  const pz = toZ(playerRoot.position.z);
  const target = !state.riding ? { dropX: BIKE_START.x, dropZ: BIKE_START.z } : (state.orders.length > 0 ? state.orders[0] : { dropX: SHOP_POS.x, dropZ: SHOP_POS.z });
  mmCtx.strokeStyle = '#38bdf8'; mmCtx.lineWidth = 2; mmCtx.setLineDash([4, 3]);
  mmCtx.beginPath(); mmCtx.moveTo(px, pz); mmCtx.lineTo(toX(target.dropX), toZ(target.dropZ)); mmCtx.stroke();
  mmCtx.setLineDash([]);

  TEACHERS.forEach((t) => {
    const active = state.orders.some((o) => o.id === t.id);
    mmCtx.fillStyle = active ? t.hex : '#64748b';
    mmCtx.beginPath(); mmCtx.arc(toX(t.dropX), toZ(t.dropZ), active ? 4.8 : 2.8, 0, Math.PI * 2); mmCtx.fill();
  });

  // Chấm đỏ Đoàn Múa Lân trên Minimap
  lions.forEach((l) => {
    mmCtx.fillStyle = '#ef4444';
    mmCtx.fillRect(toX(l.x) - 3.5, toZ(l.z) - 3.5, 7, 7);
  });

  mmCtx.fillStyle = '#fde047';
  mmCtx.beginPath(); mmCtx.arc(px, pz, 4, 0, Math.PI * 2); mmCtx.fill();
}

let lastTime = performance.now();
let forwardSpeed = 0;
let smoothCamYaw = Math.PI;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  place.tick(dt);
  npcAnims.forEach((a) => a.update(dt));
  look.update();

  // Di chuyển & Nhảy Múa Lân
  lions.forEach((l) => {
    l.cd = Math.max(0, l.cd - dt);
    l.x += l.speed * l.dir * dt;
    if (l.x > halfX - 4 || l.x < -halfX + 4) l.dir *= -1;
    l.lion.root.position.set(l.x, 0, l.z);
    l.lion.root.rotation.y = l.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    l.lion.animateDance(now * 0.001);
  });

  traffic.forEach((c) => {
    c.pos += c.speed * c.dir * dt;
    if (c.pos > c.max) c.pos = c.min;
    if (c.pos < c.min) c.pos = c.max;
    if (c.axis === 'x') { c.mesh.position.set(c.pos, 0, c.fixed); c.mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { c.mesh.position.set(c.fixed, 0, c.pos); c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI; }
  });

  if (state.phase === 'PLAYING') {
    state.timeLeft -= dt;
    state.buffTimer = Math.max(0, state.buffTimer - dt);
    if (state.timeLeft <= 0) {
      state.timeLeft = 0; state.phase = 'GAMEOVER'; sfx.stopBGM();
      if (state.score > state.highScore) { state.highScore = state.score; localStorage.setItem(HS_KEY, String(state.highScore)); }
      hud.classList.add('hidden'); gameoverScreen.classList.remove('hidden');
      document.getElementById('final-score').textContent = state.score;
      document.getElementById('final-best').textContent = state.highScore;
      document.getElementById('final-delivered').textContent = state.delivered;
      document.getElementById('final-combo').textContent = `x${state.maxCombo}`;
      updateUI();
    }

    let throttle = 0; let steer = 0;
    if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
    if (keys['KeyS'] || keys['ArrowDown']) throttle -= 0.5;
    if (keys['KeyA'] || keys['ArrowLeft']) steer += 1;
    if (keys['KeyD'] || keys['ArrowRight']) steer -= 1;

    state.boostTimer = Math.max(0, state.boostTimer - dt);
    const buffMult = state.buffTimer > 0 ? 1.2 : 1.0;
    const maxSpd = (state.riding ? (state.boostTimer > 0 ? 20 : 13.5) : 5.5) * buffMult;
    forwardSpeed = THREE.MathUtils.lerp(forwardSpeed, throttle * maxSpd, 7 * dt);

    playerRoot.rotation.y += steer * (state.riding ? 1.45 : 1.9) * dt;
    tiltGroup.rotation.z = state.riding ? THREE.MathUtils.lerp(tiltGroup.rotation.z, -steer * 0.22, 10 * dt) : 0;

    const vx = Math.sin(playerRoot.rotation.y) * forwardSpeed;
    const vz = Math.cos(playerRoot.rotation.y) * forwardSpeed;
    const nextX = THREE.MathUtils.clamp(playerRoot.position.x + vx * dt, -citySize[0] / 2 + 2, citySize[0] / 2 - 2);
    const nextZ = THREE.MathUtils.clamp(playerRoot.position.z + vz * dt, -citySize[1] / 2 + 2, citySize[1] / 2 - 2);
    if (!place.blocked(nextX, playerRoot.position.z, 0.7)) playerRoot.position.x = nextX;
    if (!place.blocked(playerRoot.position.x, nextZ, 0.7)) playerRoot.position.z = nextZ;

    const spd = Math.abs(forwardSpeed);
    if (!state.riding) {
      if (studentAnim) { studentAnim.locomotion(spd); studentAnim.update(dt); }
      if (Math.hypot(playerRoot.position.x - BIKE_START.x, playerRoot.position.z - BIKE_START.z) < 2.2) mountBike();
    } else {
      state.pedalPhase += spd * dt * 1.1;
      applyRidingPose(state.pedalPhase);
    }

    if (state.riding) {
      state.pickupCooldown = Math.max(0, state.pickupCooldown - dt);
      if (Math.hypot(playerRoot.position.x - SHOP_POS.x, playerRoot.position.z - SHOP_POS.z) < 3.8 && state.orders.length < 1 && state.pickupCooldown <= 0) {
        const picked = TEACHERS[Math.floor(Math.random() * TEACHERS.length)];
        state.orders.push(picked);
        state.freshness = 100;
        state.pickupCooldown = 0.7;
        syncMarkers(); sfx.playPickup();
        showToast(`🎁 Nhận Lễ Vật Tết giao tới: ${picked.name}`);
      }

      for (let i = state.orders.length - 1; i >= 0; i--) {
        const t = state.orders[i];
        if (Math.hypot(playerRoot.position.x - t.dropX, playerRoot.position.z - t.dropZ) < 3.8) {
          const mult = state.buffTimer > 0 ? 2 : 1;
          const gained = Math.round(state.freshness * 2.0 * state.combo * mult);
          state.score += gained; state.delivered += 1; state.combo += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.timeLeft = Math.min(TOTAL_REAL_SECONDS, state.timeLeft + 4);
          state.orders.splice(i, 1);
          syncMarkers(); sfx.playDeliver(state.combo);
          spawnEmojis(t.dropX, t.dropZ);
          showToast(t.isMale ? `🧧 ${t.name}: "Chúc mừng năm mới!" +${gained}đ` : `🌸 ${t.name}: "Cảm ơn em, năm mới vui vẻ!" +${gained}đ`);
          break;
        }
      }

      state.hitCooldown = Math.max(0, state.hitCooldown - dt);
      for (const c of traffic) {
        const dx = playerRoot.position.x - c.mesh.position.x;
        const dz = playerRoot.position.z - c.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.35 && dist > 0.001) {
          playerRoot.position.x += (dx / dist) * (2.35 - dist);
          playerRoot.position.z += (dz / dist) * (2.35 - dist);
          forwardSpeed = -5.5;
          if (state.hitCooldown <= 0) {
            state.hitCooldown = 0.9; state.trauma = 0.85; sfx.playHit();
            if (state.orders.length > 0) {
              state.freshness = Math.max(20, state.freshness - 25); state.combo = 1;
              showToast('💥 Đụng xe! Giảm 25% độ nguyên vẹn!', true);
            }
          }
          break;
        }
      }
    }

    const target = !state.riding ? { dropX: BIKE_START.x, dropZ: BIKE_START.z } : (state.orders.length > 0 ? state.orders[0] : { dropX: SHOP_POS.x, dropZ: SHOP_POS.z });
    arrowGroup.rotation.y = Math.atan2(target.dropX - playerRoot.position.x, target.dropZ - playerRoot.position.z) - playerRoot.rotation.y;
    drawMinimap(); updateUI();
  }

  shopRing.scale.setScalar(1 + Math.sin(now * 0.005) * 0.05);
  bikeRing.scale.setScalar(1 + Math.sin(now * 0.007) * 0.08);
  state.trauma = Math.max(0, state.trauma - 2.2 * dt);
  const shake = state.trauma * state.trauma * 1.1;

  let yawDiff = playerRoot.rotation.y - smoothCamYaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  smoothCamYaw += yawDiff * Math.min(1, 2.8 * dt);

  const fx = Math.sin(smoothCamYaw); const fz = Math.cos(smoothCamYaw);
  const camOffset = state.camMode === 0 ? new THREE.Vector3(-fx * 10.5, 5.8, -fz * 10.5) : new THREE.Vector3(0, 26, 12);
  camera.position.lerp(new THREE.Vector3(playerRoot.position.x + camOffset.x + (Math.random() - 0.5) * shake, camOffset.y, playerRoot.position.z + camOffset.z + (Math.random() - 0.5) * shake), 4.5 * dt);
  camera.lookAt(playerRoot.position.x + (state.camMode === 0 ? fx * 5.5 : 0), 1.2, playerRoot.position.z + (state.camMode === 0 ? fz * 5.5 : 0));

  const proj = new THREE.Vector3();
  labelNodes.forEach((ln) => {
    if (ln.id === -2 && state.riding) { ln.el.style.display = 'none'; return; }
    proj.set(ln.x, ln.y, ln.z).project(camera);
    if (proj.z > 1) { ln.el.style.display = 'none'; return; }
    ln.el.style.display = 'block';
    ln.el.style.left = `${(proj.x * 0.5 + 0.5) * window.innerWidth}px`;
    ln.el.style.top = `${(-proj.y * 0.5 + 0.5) * window.innerHeight}px`;
  });

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
