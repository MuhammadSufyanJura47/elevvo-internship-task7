(() => {
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0.2, 4.2);

  const planeGeo = new THREE.PlaneGeometry(12, 8, 1, 1);
  const planeMat = new THREE.MeshBasicMaterial({ color: 0x0b1020 });
  const sky = new THREE.Mesh(planeGeo, planeMat);
  sky.position.z = -2;
  scene.add(sky);

  const ptsGeo = new THREE.BufferGeometry();
  const COUNT = 1400;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    speeds[i] = 0.6 + Math.random() * 1.4;
  }
  ptsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const ptsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.6 });
  const points = new THREE.Points(ptsGeo, ptsMat);
  scene.add(points);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdd88 })
  );
  sun.position.set(1.4, 1.0, -0.2);
  scene.add(sun);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  flash.position.z = 0.5;
  scene.add(flash);

  const state = { mode: "clear", t: 0, _last: 0 };

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  function setMode(mode) {
    state.mode = mode;

    if (mode === "clear") {
      sky.material.color.setHex(0x0b1020);
      ptsMat.color.setHex(0xffffff);
      ptsMat.size = 0.02;
      ptsMat.opacity = 0.35;
      sun.visible = true;
    } else if (mode === "clouds") {
      sky.material.color.setHex(0x0a0f1a);
      ptsMat.color.setHex(0xdde6ff);
      ptsMat.size = 0.03;
      ptsMat.opacity = 0.25;
      sun.visible = false;
    } else if (mode === "rain") {
      sky.material.color.setHex(0x070b14);
      ptsMat.color.setHex(0x9cc7ff);
      ptsMat.size = 0.035;
      ptsMat.opacity = 0.55;
      sun.visible = false;
    } else if (mode === "thunder") {
      sky.material.color.setHex(0x040610);
      ptsMat.color.setHex(0x9cc7ff);
      ptsMat.size = 0.04;
      ptsMat.opacity = 0.6;
      sun.visible = false;
    } else if (mode === "snow") {
      sky.material.color.setHex(0x0a1020);
      ptsMat.color.setHex(0xffffff);
      ptsMat.size = 0.05;
      ptsMat.opacity = 0.55;
      sun.visible = false;
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.032, (now - (state._last || now)) / 1000);
    state._last = now;
    state.t += dt;

    camera.position.x = Math.sin(state.t * 0.12) * 0.08;
    camera.position.y = 0.2 + Math.cos(state.t * 0.14) * 0.06;
    camera.lookAt(0, 0, 0);

    const pos = ptsGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      let x = pos[ix + 0], y = pos[ix + 1], z = pos[ix + 2];
      const s = speeds[i];

      if (state.mode === "rain" || state.mode === "thunder") {
        y -= dt * (2.2 + s * 1.8);
        x += dt * 0.2;
        if (y < -3.2) { y = 3.2; x = (Math.random() - 0.5) * 10; z = (Math.random() - 0.5) * 4; }
      } else if (state.mode === "snow") {
        y -= dt * (0.35 + s * 0.25);
        x += Math.sin(state.t * 0.4 + i) * dt * 0.08;
        if (y < -3.2) { y = 3.2; x = (Math.random() - 0.5) * 10; z = (Math.random() - 0.5) * 4; }
      } else {
        y -= dt * (0.12 + s * 0.06);
        x += Math.cos(state.t * 0.25 + i) * dt * 0.02;
        if (y < -3.2) y = 3.2;
      }

      pos[ix + 0] = x; pos[ix + 1] = y; pos[ix + 2] = z;
    }
    ptsGeo.attributes.position.needsUpdate = true;

    sun.scale.setScalar(1 + Math.sin(state.t * 0.9) * 0.03);

    if (state.mode === "thunder") {
      const p = (Math.sin(state.t * 3.6) + Math.sin(state.t * 7.8)) * 0.5;
      const spike = Math.max(0, p - 0.65) * 2.2;
      flash.material.opacity = spike;
    } else {
      flash.material.opacity *= 0.9;
    }

    renderer.render(scene, camera);
  }

  window.WeatherBG = { setMode };
  setMode("clear");
  requestAnimationFrame(animate);
})();