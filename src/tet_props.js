import * as THREE from 'three';

// Con Múa Lân 3D (Đầu lân đỏ/vàng có sừng, mắt to, thân vải uốn lượn)
export function createLionDance(primaryHex = 0xe11d48) {
  const root = new THREE.Group();
  const segments = [];

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 1.15), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.4 }));
  skull.position.y = 1.25;
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  horn.position.set(0, 2.0, 0.1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
  nose.position.set(0, 1.25, 0.62);
  head.add(skull, horn, nose);

  [-0.32, 0.32].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eye.position.set(ex, 1.48, 0.55);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    pupil.position.set(ex, 1.48, 0.68);
    head.add(eye, pupil);
  });

  const beard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.35), new THREE.MeshStandardMaterial({ color: 0xfffbeb }));
  beard.position.set(0, 0.72, 0.52);
  head.add(beard);

  [-0.25, 0.25].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    leg.position.set(lx, 0.38, 0);
    head.add(leg);
  });

  root.add(head);
  segments.push(head);

  const bodyColors = [0xfacc15, primaryHex, 0xf97316, primaryHex];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.95 - i * 0.1, 0.8 - i * 0.08, 0.85), new THREE.MeshStandardMaterial({ color: bodyColors[i] }));
    cloth.position.y = 1.0;
    seg.add(cloth);
    if (i === 3) {
      [-0.22, 0.22].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
        leg.position.set(lx, 0.35, 0);
        seg.add(leg);
      });
    }
    seg.position.z = -(i + 1) * 0.85;
    root.add(seg);
    segments.push(seg);
  }

  return {
    root,
    animateDance(t) {
      segments.forEach((seg, idx) => {
        seg.position.y = Math.abs(Math.sin(t * 7 - idx * 0.6)) * 0.32;
        seg.position.x = Math.sin(t * 5 - idx * 0.8) * 0.22;
        if (idx === 0) seg.rotation.z = Math.sin(t * 6) * 0.14;
      });
    },
  };
}

// Cặp Bánh Chưng xanh buộc lạt đỏ + Bao Lì Xì chở sau yên xe
export function createBanhChungMesh() {
  const g = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const cake = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.54), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    cake.position.y = i * 0.17;
    const lat1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.17, 0.055), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
    lat1.position.y = i * 0.17;
    const lat2 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.56), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
    lat2.position.y = i * 0.17;
    g.add(cake, lat1, lat2);
  }
  const lixi = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.34), new THREE.MeshStandardMaterial({ color: 0xe11d48, emissive: 0x881337, emissiveIntensity: 0.35 }));
  lixi.position.set(0, 0.28, 0);
  lixi.rotation.y = 0.4;
  g.add(lixi);
  return g;
}

// Nồi Bánh Chưng của Mẹ tại điểm lấy bánh
export function createBanhChungPot(x, z) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 0.9, 14), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 }));
  pot.position.y = 0.45;
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 10), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  fire.position.y = 0.15;
  const cakeTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
  cakeTop.position.y = 0.95;
  g.add(pot, fire, cakeTop);
  g.position.set(x, 0, z);
  return g;
}

// Trang trí Cây Nêu Ngày Tết, Hoa Mai Vàng & Đèn Lồng Đỏ dọc phố
export function scatterTetDecor(scene, streetsX, streetsZ) {
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x65a30d });

  streetsZ.forEach((sz) => {
    for (let x = -40; x <= 40; x += 20) {
      [-4.3, 4.3].forEach((offZ, side) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        pole.position.set(x, 1.9, sz + offZ);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), lanternMat);
        lantern.scale.y = 1.25;
        lantern.position.set(x, 3.5, sz + offZ);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8), capMat);
        cap.position.set(x, 3.92, sz + offZ);
        scene.add(pole, lantern, cap);

        // Cây Nêu Ngày Tết ở mỗi ngã tư
        if (x === 0 && side === 0) {
          const neu = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 6.8, 6), bambooMat);
          neu.position.set(x + 3.2, 3.4, sz + offZ);
          const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xe11d48 }));
          flag.position.set(x + 3.7, 6.3, sz + offZ);
          const mai = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.3 }));
          mai.position.set(x + 3.2, 1.1, sz + offZ + 0.8);
          scene.add(neu, flag, mai);
        }
      });
    }
  });
}
