import * as THREE from 'three';

// Tạo mô hình Con Múa Lân 3D (Đầu lân đỏ/vàng có sừng, mắt to, thân vải uốn lượn)
export function createLionDance(primaryHex = 0xe11d48) {
  const root = new THREE.Group();
  const segments = [];

  // Đầu Lân
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 1.15), new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.4 }));
  skull.position.y = 1.25;
  head.add(skull);

  // Sừng vàng & Mũi vàng
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  horn.position.set(0, 2.0, 0.1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
  nose.position.set(0, 1.25, 0.62);
  head.add(horn, nose);

  // 2 Mắt to trắng đen + Bờm trắng
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

  // Chân người múa đầu
  [-0.25, 0.25].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    leg.position.set(lx, 0.38, 0);
    head.add(leg);
  });

  root.add(head);
  segments.push(head);

  // 4 Khúc thân vải Lân uốn lượn phía sau
  const bodyColors = [0xfacc15, primaryHex, 0xf97316, primaryHex];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.95 - i * 0.1, 0.8 - i * 0.08, 0.85),
      new THREE.MeshStandardMaterial({ color: bodyColors[i], roughness: 0.5 })
    );
    cloth.position.y = 1.0;
    seg.add(cloth);
    if (i === 3) {
      // Chân người múa đuôi
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

// Tạo Bộ Lễ Vật Tết 3D chở sau yên xe (Bánh chưng + Bao lì xì + Cành đào)
export function createTetGiftMesh() {
  const g = new THREE.Group();
  // Bánh chưng xanh buộc lạt vàng
  const banhChung = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.55), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
  const lat1 = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
  const lat2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.57), new THREE.MeshStandardMaterial({ color: 0xfef08a }));
  g.add(banhChung, lat1, lat2);

  // Bao lì xì đỏ trên mặt bánh chưng
  const lixi = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.34), new THREE.MeshStandardMaterial({ color: 0xe11d48, emissive: 0x881337, emissiveIntensity: 0.3 }));
  lixi.position.set(0.08, 0.11, 0.05);
  lixi.rotation.y = 0.35;
  g.add(lixi);

  // Nhành hoa đào hồng / mai vàng cắm kèm
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x9f1239, emissiveIntensity: 0.25 });
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.65, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
  branch.position.set(-0.15, 0.32, -0.1);
  branch.rotation.z = 0.3;
  g.add(branch);

  [[0, 0.25, 0], [-0.1, 0.12, 0.08], [0.1, 0.18, -0.06]].forEach(([bx, by, bz]) => {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), petalMat);
    fl.position.set(-0.2 + bx, 0.35 + by, -0.1 + bz);
    g.add(fl);
  });

  return { group: g, petalMat };
}

// Trang trí Đèn Lồng Đỏ dọc các tuyến phố
export function scatterTetLanterns(scene, streetsX, streetsZ) {
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
  streetsZ.forEach((sz) => {
    for (let x = -40; x <= 40; x += 20) {
      [-4.2, 4.2].forEach((offZ) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.8, 6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        pole.position.set(x, 1.9, sz + offZ);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), lanternMat);
        lantern.scale.y = 1.25;
        lantern.position.set(x, 3.5, sz + offZ);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8), capMat);
        cap.position.set(x, 3.92, sz + offZ);
        scene.add(pole, lantern, cap);
      });
    }
  });
}
