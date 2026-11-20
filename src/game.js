import * as THREE from 'three';
import { sfx } from './audio.js';
import { createBanhChungMesh, createBanhChungPot, createFireworkSystem, createLionDance, createVietnamFlag, scatterTetDecor } from './tet_props.js';
import { buildKit } from '../assets/kit.mjs';
import { stage } from '../assets/stage.mjs';
import { animate as animateHumanoid } from '../assets/clips.mjs';
import { createAsset as createBicycle } from '../assets/city-bicycle.mjs';
import { createAsset as createStudent } from '../assets/student-character.mjs';
import { createAsset as createSalaryman } from '../assets/salaryman-character.mjs';
import { createAsset as createTaxi } from '../assets/city-taxi.mjs';
import { createAsset as createVan } from '../assets/kei-van.mjs';

let totalRealSeconds = 90;
const HS_KEY = 'lan_banh_chung_hs';

const UPGRADES = [
  { id: 'kite', icon: '🪁', title: 'Cánh Diều Lướt Gió', desc: '+25% tốc độ đạp xe đi biếu bánh' },
  { id: 'leaf', icon: '🌿', title: 'Lá Dong Giữ Nhiệt', desc: 'Bánh Chưng lâu nguội hơn 50%' },
  { id: 'drum', icon: '🥁', title: 'Trống Lân Hộ Thể', desc: 'Hào Quang Lân kéo dài 12 giây húc bay Taxi!' },
];

const state = {
  phase: 'START',
  riding: false,
  timeLeft: totalRealSeconds,
  score: 0,
  highScore: Number(localStorage.getItem(HS_KEY) || 0),
  delivered: 0,
  deliveredIds: new Set(), // Đánh dấu 4 nhà đã biếu đủ
  returningHome: false,    // Đã biếu đủ 4 nhà -> Đạp xe về nhà đón Giao Thừa!
  fireworkTimer: 0,
  endingTimer: 0,
  endingMode: 'OUTSIDE',
  nextUpgradeAt: 2,
  combo: 1,
  maxCombo: 1,
  orders: [],
  warmth: 100, // Độ nóng của Bánh Chưng (nguội dần theo thời gian!)
  lionBuff: 0, // Hào Quang Lân húc bay Taxi!
  stunTimer: 0, // Choáng nhẹ khi đụng xe
  hitCooldown: 0,
  pickupCooldown: 0,
  boostTimer: 0,
  trauma: 0,
  pedalPhase: 0,
  camMode: 0,
  perks: { kite: false, leaf: false, drum: false },
};

const container = document.getElementById('canvas-container');
const labelsWrap = document.getElementById('world-labels');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const upgradeScreen = document.getElementById('upgrade-screen');
const upgradeCardsEl = document.getElementById('upgrade-cards');
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
const endingBannerEl = document.getElementById('ending-banner');
const mmCtx = document.getElementById('minimap').getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 350);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Bầu trời Đêm 30 Tết trước Giao Thừa: cửa sổ, đèn đường & đèn lồng rực sáng!
const look = stage(renderer, scene, { time: 'dusk' });
const place = await buildKit({ folder: './assets/', city: { seed: 2026, blocks: [3, 2] }, people: 'idle', night: true });
scene.add(place.group);
look.ground(place);
look.shadows(place.group);

const streetsX = place.city?.streets?.x || [0];
const streetsZ = place.city?.streets?.z || [0];
scatterTetDecor(scene, streetsX, streetsZ, place);

const lots = place.city?.lots || [];
// Chọn 1 căn nhà thật làm Nhà Lan & Bếp Mẹ: đặt hẳn trên VỈA HÈ (lot.door), tránh xa lòng đường Taxi!
const homeLot = lots.find((l) => Math.hypot(l.door[0], l.door[1]) < 28) || lots[0] || { door: [0, -5], facing: 0 };
const MOM_POS = { x: homeLot.door[0], z: homeLot.door[1] };
const sideDir = Math.abs(Math.sin(homeLot.facing || 0)) > 0.5 ? [0, 1] : [1, 0];
const HOME_POS = { x: MOM_POS.x + sideDir[0] * 2.2, z: MOM_POS.z + sideDir[1] * 2.2 };
// Đặt Xe Đạp ở vỉa hè phía bên kia đường (cách Bếp Mẹ 10-16m) để Lan đi bộ qua lấy rồi quay lại!
const bikeLot = lots.find((l) => {
  const d = Math.hypot(l.door[0] - MOM_POS.x, l.door[1] - MOM_POS.z);
  return d > 10 && d < 20;
});
const BIKE_START = bikeLot
  ? { x: bikeLot.door[0], z: bikeLot.door[1] }
  : { x: MOM_POS.x + 11, z: MOM_POS.z + 9 };

// Nồi Bánh Chưng & Nhân vật Mẹ đứng thẳng nghiêm chỉnh hướng mặt ra đường (không chạy Idle nghiêng)
const fireworks = createFireworkSystem(scene);
scene.add(createBanhChungPot(MOM_POS.x + sideDir[0] * 1.1, MOM_POS.z + sideDir[1] * 1.1));
const momNpc = createStudent({ bag: 'none' });
momNpc.scale.setScalar(1.06);
momNpc.position.set(MOM_POS.x - sideDir[0] * 1.1, 0, MOM_POS.z - sideDir[1] * 1.1);
momNpc.rotation.set(0, homeLot.facing ?? 0, 0);
const momFlag = createVietnamFlag();
momFlag.position.set(MOM_POS.x - sideDir[0] * 1.8, 0, MOM_POS.z - sideDir[1] * 1.8);
momFlag.rotation.y = homeLot.facing ?? 0;
scene.add(momNpc, momFlag);

const RELATIVES = [
  { name: 'Bà Ngoại', msg: 'Bánh còn nóng hổi! Ngoại mừng tuổi Lan nha!', color: 0x16a34a, hex: '#22c55e', isMale: false },
  { name: 'Bác Hai', msg: 'Cháu ngoan quá, chúc mẹ ở nhà khỏe mạnh!', color: 0xfacc15, hex: '#facc15', isMale: true },
  { name: 'Cô Ba', msg: 'Vừa kịp mâm cỗ Tất Niên luôn, cảm ơn Lan!', color: 0xf43f5e, hex: '#f43f5e', isMale: false },
  { name: 'Cậu Tư', msg: 'Bánh ngon quá, cậu lì xì nóng tay đây!', color: 0x38bdf8, hex: '#38bdf8', isMale: true },
];

const chosenLots = [];
for (const lot of lots) {
  if (Math.hypot(lot.door[0] - MOM_POS.x, lot.door[1] - MOM_POS.z) < 16) continue;
  if (chosenLots.every((c) => Math.hypot(lot.door[0] - c.door[0], lot.door[1] - c.door[1]) > 22)) {
    chosenLots.push(lot);
    if (chosenLots.length === 4) break;
  }
}

const TEACHERS = RELATIVES.map((t, i) => {
  const lot = chosenLots[i] || { door: [(i % 2 === 0 ? -24 : 24), (i < 2 ? -18 : 18)] };
  return { id: i, ...t, dropX: lot.door[0], dropZ: lot.door[1] };
});

const shopRing = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.25, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
shopRing.rotation.x = -Math.PI / 2;
shopRing.position.set(MOM_POS.x, 0.08, MOM_POS.z);
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
  npc.lookAt(MOM_POS.x, 0, MOM_POS.z);

  const flag = createVietnamFlag();
  flag.position.set(t.dropX + 1.4, 0, t.dropZ + 0.8);
  scene.add(beacon, pad, npc, flag);
  animateHumanoid(npc).then((a) => { if (a) { a.locomotion(0); npcAnims.push(a); } }).catch(() => {});
  return { beacon, pad };
});

// 2 Đoàn Múa Lân dọc phố
const lions = [
  { lion: createLionDance(0xe11d48), z: streetsZ[0] || -15, x: -20, dir: 1, speed: 6.5, cd: 0 },
  { lion: createLionDance(0xd97706), z: streetsZ[1] || 15, x: 20, dir: -1, speed: 6.5, cd: 0 },
];
lions.forEach((l) => { l.lion.root.position.set(l.x, 0, l.z); scene.add(l.lion.root); });

// Lan + Xe Đạp + Cặp Bánh Chưng + Vòng Hào Quang Lân
const playerRoot = new THREE.Group();
const tiltGroup = new THREE.Group();
playerRoot.add(tiltGroup);
const student = createStudent();
student.scale.setScalar(0.92);
tiltGroup.add(student);
const studentAnim = await animateHumanoid(student).catch(() => null);
const bones = {
  spine: student.getObjectByName('Spine1'),
  lArm: student.getObjectByName('LeftArm'), rArm: student.getObjectByName('RightArm'),
  lFore: student.getObjectByName('LeftForeArm'), rFore: student.getObjectByName('RightForeArm'),
  lUpLeg: student.getObjectByName('LeftUpLeg'), rUpLeg: student.getObjectByName('RightUpLeg'),
  lLeg: student.getObjectByName('LeftLeg'), rLeg: student.getObjectByName('RightLeg'),
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
const bikeHeadlight = new THREE.PointLight(0xfef08a, 4.5, 14);
bikeHeadlight.position.set(0, 1.1, 0.8);
bicycle.add(bikeHeadlight);
const banhChungProp = createBanhChungMesh();
banhChungProp.position.set(0, 0.85, -0.58);
banhChungProp.visible = false;
bicycle.add(banhChungProp);
bicycle.position.set(BIKE_START.x, 0, BIKE_START.z);
scene.add(bicycle);

// Vòng & Quả cầu sáng opacity 0.28 bao quanh cơ thể Lan & xe đạp khi bật Trống Lân Hộ Thể!
const lionAura = new THREE.Group();
const auraRing = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 2.2, 24),
  new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
);
auraRing.rotation.x = -Math.PI / 2;
auraRing.position.y = 0.12;
const auraSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.85, 20, 16),
  new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.28, depthWrite: false })
);
auraSphere.position.y = 1.05;
lionAura.add(auraRing, auraSphere);
lionAura.visible = false;
playerRoot.add(lionAura);

const arrowGroup = new THREE.Group();
const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
arrowCone.rotation.x = Math.PI / 2;
arrowCone.position.set(0, 2.4, 0.35);
arrowGroup.add(arrowCone);
playerRoot.add(arrowGroup);
playerRoot.position.set(HOME_POS.x, 0, HOME_POS.z);
scene.add(playerRoot);

// Giao thông Taxi & Kei Van (có thể bị húc bay lên trời!)
const traffic = [];
const citySize = place.city?.size || [120, 90];
const halfX = citySize[0] / 2 - 2;
const halfZ = citySize[1] / 2 - 2;
streetsZ.forEach((sz, idx) => {
  const carMesh = idx % 2 === 0 ? createTaxi() : createVan();
  scene.add(carMesh);
  traffic.push({ mesh: carMesh, axis: 'x', fixed: sz + (idx % 2 === 0 ? 1.8 : -1.8), pos: (idx % 2 === 0 ? -halfX + 6 : halfX - 6), dir: idx % 2 === 0 ? 1 : -1, speed: 10, min: -halfX, max: halfX, fly: 0 });
});
streetsX.slice(0, 2).forEach((sx, idx) => {
  const carMesh = idx % 2 === 0 ? createVan() : createTaxi();
  scene.add(carMesh);
  traffic.push({ mesh: carMesh, axis: 'z', fixed: sx + 1.8, pos: -halfZ + 8 + idx * 14, dir: 1, speed: 9, min: -halfZ, max: halfZ, fly: 0 });
});

const bikeLabel = createLabelEl('🚲 XE ĐẠP CỦA LAN');
const labelNodes = [
  { el: createLabelEl('🍲 BẾP MẸ (LẤY BÁNH CHƯNG)'), x: MOM_POS.x, y: 3.3, z: MOM_POS.z, id: -1 },
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

function spawnEmojis(worldX, worldZ, icons = ['🥟', '🧧', '💖', '🎆', '✨']) {
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
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 1900);
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
  showToast('🚲 Đã lên xe! Ghé Bếp Mẹ lấy cặp Bánh Chưng nóng nhé!');
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
  banhChungProp.visible = state.orders.length > 0;
}

function openUpgradeMenu() {
  state.phase = 'UPGRADE';
  upgradeCardsEl.innerHTML = '';
  UPGRADES.forEach((u) => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    btn.innerHTML = `<span class="u-icon">${u.icon}</span><div class="u-title">${u.title}</div><div class="u-desc">${u.desc}</div>`;
    btn.onclick = () => {
      state.perks[u.id] = true;
      state.phase = 'PLAYING';
      upgradeScreen.classList.add('hidden');
      if (u.id === 'drum') {
        state.lionBuff = 12;
        sfx.playLionDrum();
        spawnEmojis(playerRoot.position.x, playerRoot.position.z, ['🦁', '🥁', '🔥', '🚕']);
        showToast('🥁 TRỐNG LÂN KÍCH HOẠT! 12s HÚC BAY TAXI NGAY!');
      } else if (u.id === 'leaf') {
        state.warmth = 100;
        showToast('🌿 LÁ DONG GIỮ NHIỆT! Bánh nóng 100% & lâu nguội!');
      } else {
        state.boostTimer = 1.2;
        sfx.playBell();
        showToast('🪁 CÁNH DIỀU LƯỚT GIÓ! +25% Tốc độ đạp xe!');
      }
    };
    upgradeCardsEl.appendChild(btn);
  });
  upgradeScreen.classList.remove('hidden');
}

function showGameOverModal() {
  state.phase = 'GAMEOVER';
  endingBannerEl.classList.add('hidden');
  gameoverScreen.classList.remove('hidden');
  const badgeEl = document.getElementById('go-badge');
  const titleEl = document.getElementById('go-title');
  if (state.endingMode === 'HAPPY') {
    badgeEl.textContent = '🎆 00:00 — HAPPY ENDING CÙNG GIA ĐÌNH!';
    titleEl.textContent = 'KỊP VỀ NHÀ ĐÓN GIAO THỪA VỚI MẸ! ❤️';
  } else {
    badgeEl.textContent = '🎇 00:00 RỒI — HẾT GIỜ GIAO THỪA!';
    titleEl.textContent = 'LAN XEM PHÁO HOA MỘT MÌNH NGOÀI ĐƯỜNG!';
  }
  document.getElementById('final-score').textContent = state.score;
  document.getElementById('final-best').textContent = state.highScore;
  document.getElementById('final-delivered').textContent = `${state.deliveredIds.size}/4`;
  document.getElementById('final-combo').textContent = `x${state.maxCombo}`;
}

function endGame(mode = 'OUTSIDE') {
  // Chuyển sang pha ENDING (4.5s ngước camera lên trời ngắm Pháo Hoa 3D trước khi hiện bảng tổng kết)
  state.phase = 'ENDING';
  state.endingMode = mode;
  state.endingTimer = 4.6;
  state.fireworkTimer = 10.0;
  sfx.stopBGM();
  if (state.score > state.highScore) { state.highScore = state.score; localStorage.setItem(HS_KEY, String(state.highScore)); }
  hud.classList.add('hidden');

  if (mode === 'HAPPY') {
    // Đặt Lan đứng cạnh Mẹ trước sân nhà cùng ngước xem pháo hoa
    playerRoot.position.set(MOM_POS.x + 1.2, 0, MOM_POS.z + 1.2);
    playerRoot.rotation.y = Math.PI;
    momNpc.lookAt(MOM_POS.x, 10, MOM_POS.z - 20);
    endingBannerEl.textContent = '🎆 00:00 — LAN ĐÓN GIAO THỪA & XEM PHÁO HOA CÙNG MẸ! ❤️';
  } else {
    endingBannerEl.textContent = '🎇 00:00 RỒI — LAN XEM PHÁO HOA MỘT MÌNH NGOÀI ĐƯỜNG...';
  }
  endingBannerEl.classList.remove('hidden');

  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      fireworks.launch(playerRoot.position.x, playerRoot.position.z - 14);
      sfx.playFirework();
    }, i * 550);
  }
  updateUI();
}

function startOrReset(climax = false) {
  sfx.unlock();
  dismountBike();
  state.phase = 'PLAYING';
  state.timeLeft = climax ? 22 : totalRealSeconds;
  state.score = 0;
  state.delivered = 0;
  state.deliveredIds = new Set();
  state.returningHome = false;
  state.fireworkTimer = 0;
  state.nextUpgradeAt = 2;
  state.combo = 1;
  state.maxCombo = 1;
  state.orders = [];
  state.warmth = 100;
  state.lionBuff = 0;
  state.stunTimer = 0;
  state.hitCooldown = 0;
  state.pickupCooldown = 0;
  state.boostTimer = 0;
  state.trauma = 0;
  state.perks = { kite: false, leaf: false, drum: false };
  traffic.forEach((c) => { c.fly = 0; c.mesh.position.y = 0; c.mesh.rotation.x = 0; });

  playerRoot.position.set(HOME_POS.x, 0, HOME_POS.z);
  // Quay mặt Lan và Camera hướng thẳng ra phía Xe Đạp / đường phố cho thoáng tầm nhìn!
  const startAngle = Math.atan2(BIKE_START.x - HOME_POS.x, BIKE_START.z - HOME_POS.z);
  playerRoot.rotation.y = startAngle;
  smoothCamYaw = startAngle;
  camera.position.set(
    HOME_POS.x - Math.sin(startAngle) * 10.5,
    6.8,
    HOME_POS.z - Math.cos(startAngle) * 10.5
  );
  if (climax) mountBike();
  syncMarkers();
  startScreen.classList.add('hidden');
  upgradeScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  endingBannerEl.classList.add('hidden');
  hud.classList.remove('hidden');
  sfx.startBGM(() => state.timeLeft < 25 || state.lionBuff > 0);
  showToast(climax ? '⚡ 23:58 RỒI! SẮP ĐẾN GIAO THỪA!' : '🏃 Mẹ hối rồi! Từ nhà ra lấy Xe Đạp Đỏ mau!');
  updateUI();
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.phase === 'START') startOrReset(false);
    else if (state.phase === 'PLAYING' && state.riding) {
      const nearLion = lions.find((l) => l.cd <= 0 && Math.hypot(playerRoot.position.x - l.x, playerRoot.position.z - l.z) < 8.0);
      if (nearLion) {
        nearLion.cd = 10;
        state.lionBuff = state.perks.drum ? 12 : 8;
        state.warmth = 100;
        state.score += 200;
        sfx.playLionDrum();
        spawnEmojis(nearLion.x, nearLion.z, ['🦁', '🧧', '🎆', '🔥', '💰']);
        showToast('🦁 HÀO QUANG LÂN! HÚC BAY TAXI & HÂM NÓNG BÁNH!');
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
document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    totalRealSeconds = Number(btn.dataset.sec || 90);
  };
});
document.getElementById('btn-start').onclick = () => startOrReset(false);
document.getElementById('btn-restart').onclick = () => startOrReset(false);
document.getElementById('btn-home').onclick = () => {
  sfx.stopBGM();
  dismountBike();
  state.phase = 'START';
  state.fireworkTimer = 0;
  gameoverScreen.classList.add('hidden');
  hud.classList.add('hidden');
  endingBannerEl.classList.add('hidden');
  startScreen.classList.remove('hidden');
};
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

function updateUI() {
  const ratio = 1 - Math.max(0, state.timeLeft) / totalRealSeconds;
  const totalSec = Math.floor(ratio * 600);
  const mins = 50 + Math.floor(totalSec / 60);
  clockEl.textContent = mins >= 60 ? '00:00:00' : `23:${String(mins).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
  realSubEl.textContent = state.lionBuff > 0 ? `🦁 HÚC TAXI (${state.lionBuff.toFixed(1)}s)` : `Còn ${Math.ceil(state.timeLeft)}s thực tế`;
  bagCountEl.textContent = `${state.orders.length}/1`;
  if (!state.riding) orderEl.textContent = 'Bước 1: Đi bộ tới Xe Đạp Đỏ!';
  else if (state.returningHome) orderEl.textContent = '🏠 ĐÃ BIẾU ĐỦ 4 NHÀ! MAU VỀ NHÀ ĐÓN GIAO THỪA!';
  else orderEl.textContent = state.orders.length > 0 ? `Biếu Bánh Chưng: ${state.orders[0].name}` : `Ghé Bếp Mẹ lấy bánh (${state.deliveredIds.size}/4 nhà)`;
  freshBar.style.width = `${Math.max(0, state.warmth)}%`;
  scoreEl.textContent = state.score;
  highScoreEl.textContent = state.highScore;
  comboEl.textContent = `x${state.combo} • Đã biếu: ${state.deliveredIds.size}/4 nhà`;
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
  mmCtx.beginPath(); mmCtx.arc(toX(MOM_POS.x), toZ(MOM_POS.z), 4.5, 0, Math.PI * 2); mmCtx.fill();

  const px = toX(playerRoot.position.x);
  const pz = toZ(playerRoot.position.z);
  const target = !state.riding ? { dropX: BIKE_START.x, dropZ: BIKE_START.z } : (state.orders.length > 0 ? state.orders[0] : { dropX: MOM_POS.x, dropZ: MOM_POS.z });
  mmCtx.strokeStyle = '#38bdf8'; mmCtx.lineWidth = 2; mmCtx.setLineDash([4, 3]);
  mmCtx.beginPath(); mmCtx.moveTo(px, pz); mmCtx.lineTo(toX(target.dropX), toZ(target.dropZ)); mmCtx.stroke();
  mmCtx.setLineDash([]);

  TEACHERS.forEach((t) => {
    const active = state.orders.some((o) => o.id === t.id);
    mmCtx.fillStyle = active ? t.hex : '#64748b';
    mmCtx.beginPath(); mmCtx.arc(toX(t.dropX), toZ(t.dropZ), active ? 4.8 : 2.8, 0, Math.PI * 2); mmCtx.fill();
  });

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

  if (state.phase !== 'UPGRADE') {
    place.tick(dt);
    npcAnims.forEach((a) => a.update(dt));
    look.update();

    lions.forEach((l) => {
      l.cd = Math.max(0, l.cd - dt);
      l.x += l.speed * l.dir * dt;
      if (l.x > halfX - 4 || l.x < -halfX + 4) l.dir *= -1;
      l.lion.root.position.set(l.x, 0, l.z);
      l.lion.root.rotation.y = l.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      l.lion.animateDance(now * 0.001);
    });

    traffic.forEach((c) => {
      if (c.fly > 0) {
        c.fly -= dt;
        c.mesh.position.y = Math.sin((1 - c.fly) * Math.PI) * 14;
        c.mesh.rotation.x += 10 * dt;
        if (c.fly <= 0) { c.mesh.position.y = 0; c.mesh.rotation.x = 0; }
        return;
      }
      c.pos += c.speed * c.dir * dt;
      if (c.pos > c.max) c.pos = c.min;
      if (c.pos < c.min) c.pos = c.max;
      if (c.axis === 'x') { c.mesh.position.set(c.pos, 0, c.fixed); c.mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { c.mesh.position.set(c.fixed, 0, c.pos); c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI; }
    });
  }

  fireworks.update(dt);
  if (state.fireworkTimer > 0) {
    state.fireworkTimer -= dt;
    if (Math.random() < 0.05) { fireworks.launch(playerRoot.position.x, playerRoot.position.z - 14); sfx.playFirework(); }
  }

  if (state.phase === 'ENDING') {
    state.endingTimer -= dt;
    if (state.endingTimer <= 0) showGameOverModal();
  }

  if (state.phase === 'PLAYING') {
    state.timeLeft -= dt;
    state.lionBuff = Math.max(0, state.lionBuff - dt);
    state.stunTimer = Math.max(0, state.stunTimer - dt);
    state.hitCooldown = Math.max(0, state.hitCooldown - dt);
    lionAura.visible = state.lionBuff > 0;
    if (lionAura.visible) {
      lionAura.rotation.y += 3.5 * dt;
      auraSphere.scale.setScalar(1 + Math.sin(now * 0.01) * 0.06);
    }

    if (state.orders.length > 0) {
      const coolRate = state.perks.leaf ? 1.5 : 3.2;
      state.warmth = Math.max(25, state.warmth - coolRate * dt);
    }

    if (state.timeLeft <= 0) { state.timeLeft = 0; endGame('OUTSIDE'); }

    let throttle = 0; let steer = 0;
    if (state.stunTimer <= 0) {
      if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
      if (keys['KeyS'] || keys['ArrowDown']) throttle -= 0.5;
      if (keys['KeyA'] || keys['ArrowLeft']) steer += 1;
      if (keys['KeyD'] || keys['ArrowRight']) steer -= 1;
    }

    state.boostTimer = Math.max(0, state.boostTimer - dt);
    const kiteMult = state.perks.kite ? 1.25 : 1.0;
    const buffMult = state.lionBuff > 0 ? 1.25 : 1.0;
    const maxSpd = (state.riding ? (state.boostTimer > 0 ? 20 : 13.5) : 5.5) * kiteMult * buffMult;
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
      const distMom = Math.hypot(playerRoot.position.x - MOM_POS.x, playerRoot.position.z - MOM_POS.z);

      // Nếu đã biếu đủ 4 nhà và đạp về tới nhà trước 00:00 -> HAPPY ENDING!
      if (state.returningHome && distMom < 4.2) {
        state.score += Math.round(state.timeLeft * 20);
        endGame('HAPPY');
      } else if (!state.returningHome && distMom < 3.8 && state.orders.length < 1 && state.pickupCooldown <= 0) {
        const remaining = TEACHERS.filter((t) => !state.deliveredIds.has(t.id));
        const picked = remaining[Math.floor(Math.random() * remaining.length)];
        if (picked) {
          state.orders.push(picked);
          state.warmth = 100;
          state.pickupCooldown = 0.7;
          syncMarkers(); sfx.playPickup();
          showToast(`🥟 Mẹ dặn: Mang bánh nóng sang biếu ${picked.name} mau!`);
        }
      }

      for (let i = state.orders.length - 1; i >= 0; i--) {
        const t = state.orders[i];
        if (Math.hypot(playerRoot.position.x - t.dropX, playerRoot.position.z - t.dropZ) < 3.8) {
          const mult = state.lionBuff > 0 ? 2 : 1;
          const gained = Math.round(state.warmth * 2.2 * state.combo * mult);
          state.score += gained; state.delivered += 1; state.deliveredIds.add(t.id); state.combo += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.timeLeft = Math.min(totalRealSeconds, state.timeLeft + 4);
          state.orders.splice(i, 1);
          syncMarkers(); sfx.playDeliver(state.combo);
          spawnEmojis(t.dropX, t.dropZ);

          if (state.deliveredIds.size >= TEACHERS.length) {
            state.returningHome = true;
            showToast(`🎉 Đã biếu đủ 4 nhà! Mau về Nhà Mẹ đón Giao Thừa trước 00:00!`);
          } else {
            showToast(`🧧 ${t.name}: "${t.msg}" (+${gained}đ)`);
            if (state.delivered >= state.nextUpgradeAt) { state.nextUpgradeAt += 2; openUpgradeMenu(); }
          }
          break;
        }
      }

      // Đụng Taxi: Có Hào Quang Lân -> Húc bay Taxi (+150đ)! Không có -> Bị xích ra & choáng 0.8s (không R.I.P)
      for (const c of traffic) {
        if (c.fly > 0) continue;
        const dx = playerRoot.position.x - c.mesh.position.x;
        const dz = playerRoot.position.z - c.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.35 && dist > 0.001) {
          if (state.lionBuff > 0) {
            c.fly = 1.0;
            state.score += 150;
            state.trauma = 0.5;
            sfx.playLionDrum();
            spawnEmojis(c.mesh.position.x, c.mesh.position.z, ['💥', '🚕', '🦁', '✨']);
            showToast('🦁 HÚC BAY TAXI! +150đ Lộc Lân!');
          } else {
            playerRoot.position.x += (dx / dist) * (2.35 - dist);
            playerRoot.position.z += (dz / dist) * (2.35 - dist);
            forwardSpeed = -5.5;
            if (state.hitCooldown <= 0) {
              state.hitCooldown = 1.1;
              state.stunTimer = 0.75;
              state.trauma = 0.85;
              sfx.playHit();
              if (state.orders.length > 0) {
                state.warmth = Math.max(25, state.warmth - 25);
                state.combo = 1;
                showToast('💫 Choáng váng! Nguội mất 25% bánh!', true);
              } else {
                showToast('💫 Suýt tông xe! Cẩn thận đường Tết đông!', true);
              }
            }
          }
          break;
        }
      }
    }

    const target = !state.riding ? { dropX: BIKE_START.x, dropZ: BIKE_START.z } : (state.orders.length > 0 ? state.orders[0] : { dropX: MOM_POS.x, dropZ: MOM_POS.z });
    arrowGroup.rotation.y = Math.atan2(target.dropX - playerRoot.position.x, target.dropZ - playerRoot.position.z) - playerRoot.rotation.y;
    drawMinimap(); updateUI();
  }

  shopRing.scale.setScalar(1 + Math.sin(now * 0.005) * 0.05);
  bikeRing.scale.setScalar(1 + Math.sin(now * 0.007) * 0.08);
  state.trauma = Math.max(0, state.trauma - 2.2 * dt);
  const shake = state.trauma * state.trauma * 1.1;

  // Camera Cinematic quay vòng chậm khi ở Start; ngước lên trời xem Pháo Hoa khi Ending; bám sau lưng khi chơi
  if (state.phase === 'START') {
    const orbit = now * 0.00025;
    camera.position.set(MOM_POS.x + Math.sin(orbit) * 20, 10.5, MOM_POS.z + Math.cos(orbit) * 20);
    camera.lookAt(MOM_POS.x, 1.5, MOM_POS.z);
  } else if (state.phase === 'ENDING' || state.phase === 'GAMEOVER') {
    // Đưa camera lên cao thoáng đãng, không bị nhà che, nhìn trọn Lan/Mẹ + Pháo hoa rực trời
    const camPos = new THREE.Vector3(playerRoot.position.x + 12, 22, playerRoot.position.z + 24);
    camera.position.lerp(camPos, 2.8 * dt);
    camera.lookAt(playerRoot.position.x, 12, playerRoot.position.z - 6);
  } else {
    let yawDiff = playerRoot.rotation.y - smoothCamYaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    smoothCamYaw += yawDiff * Math.min(1, 2.8 * dt);

    const fx = Math.sin(smoothCamYaw); const fz = Math.cos(smoothCamYaw);
    const camOffset = state.camMode === 0 ? new THREE.Vector3(-fx * 10.5, 5.8, -fz * 10.5) : new THREE.Vector3(0, 26, 12);
    camera.position.lerp(new THREE.Vector3(playerRoot.position.x + camOffset.x + (Math.random() - 0.5) * shake, camOffset.y, playerRoot.position.z + camOffset.z + (Math.random() - 0.5) * shake), 4.5 * dt);
    camera.lookAt(playerRoot.position.x + (state.camMode === 0 ? fx * 5.5 : 0), 1.2, playerRoot.position.z + (state.camMode === 0 ? fz * 5.5 : 0));
  }

  const proj = new THREE.Vector3();
  labelNodes.forEach((ln) => {
    if (state.phase === 'START' || state.phase === 'ENDING' || state.phase === 'GAMEOVER' || (ln.id === -2 && state.riding)) { ln.el.style.display = 'none'; return; }
    proj.set(ln.x, ln.y, ln.z).project(camera);
    if (proj.z > 1) { ln.el.style.display = 'none'; return; }
    const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;
    ln.el.style.display = 'block';
    ln.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
  });

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
