(function(window, document) {
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const THREE_LOCAL_MODULE = './vendor/three.module.js';
    const SCRIPT_ID = 'zemljopis-three-runtime';
    const MOUNT_CLASS = 'clay-theme-three';
    const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let threePromise = null;
    let mount = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let clayGroup = null;
    let clayObjects = [];
    let animationFrame = null;
    let resizeObserver = null;
    let scenePromise = null;
    let sceneTheme = null;

    function ucitajLokalniThree() {
        return new Promise((resolve, reject) => {
            let importer;
            try {
                importer = new Function('src', 'return import(src);');
            } catch (error) {
                reject(error);
                return;
            }

            importer(THREE_LOCAL_MODULE)
                .then(THREE => {
                    window.THREE = window.THREE || THREE;
                    resolve(THREE);
                })
                .catch(reject);
        });
    }

    function ucitajThreeSaCdn() {
        const postojeci = document.getElementById(SCRIPT_ID);
        if (postojeci) {
            return new Promise((resolve, reject) => {
                postojeci.addEventListener('load', () => resolve(window.THREE), { once: true });
                postojeci.addEventListener('error', reject, { once: true });
            });
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = SCRIPT_ID;
            script.src = THREE_CDN;
            script.async = true;
            script.onload = () => {
                if (window.THREE) resolve(window.THREE);
                else reject(new Error('THREE_NOT_AVAILABLE'));
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function ucitajThree() {
        if (window.THREE && window.THREE.Scene) {
            return Promise.resolve(window.THREE);
        }

        if (!threePromise) {
            threePromise = ucitajLokalniThree().catch(() => ucitajThreeSaCdn());
        }

        return threePromise;
    }

    function meniJeVidljiv() {
        const mainMenu = document.getElementById('main-menu');
        return !!mainMenu && mainMenu.classList.contains('active');
    }

    function aktivnaThreeTema() {
        const tema = document.body.getAttribute('data-tema');
        if (tema === 'glina') return 'glina';
        if (tema === 'okean') return 'reka';
        if (tema === 'planina') return 'planina';
        return null;
    }

    function trebaDaRadi() {
        return !!aktivnaThreeTema() && meniJeVidljiv() && !document.hidden;
    }

    function osigurajMount() {
        const mainMenu = document.getElementById('main-menu');
        if (!mainMenu) return null;

        mount = mainMenu.querySelector(`.${MOUNT_CLASS}`);
        if (!mount) {
            mount = document.createElement('div');
            mount.className = MOUNT_CLASS;
            mount.setAttribute('aria-hidden', 'true');
            mainMenu.insertBefore(mount, mainMenu.firstChild);
        }

        return mount;
    }

    function podesiVelicinu() {
        if (!renderer || !camera || !mount) return;

        const rect = mount.getBoundingClientRect();
        const sirina = Math.max(1, Math.ceil(rect.width || window.innerWidth || 360));
        const visina = Math.max(1, Math.ceil(rect.height || window.innerHeight || 640));

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(sirina, visina, false);
        camera.aspect = sirina / visina;
        camera.updateProjectionMatrix();
    }

    function napraviMatMaterijal(THREE, boja, opacity, spec = {}) {
        return new THREE.MeshStandardMaterial({
            color: boja,
            roughness: typeof spec.roughness === 'number' ? spec.roughness : 0.9,
            metalness: 0,
            transparent: true,
            opacity,
            depthWrite: false,
            emissive: spec.emissive || 0x000000,
            emissiveIntensity: spec.emissiveIntensity || 0
        });
    }

    function dodajMekuFormu(THREE, spec) {
        let geometry;
        if (spec.torus) {
            geometry = new THREE.TorusGeometry(1, spec.thickness || 0.08, 24, 96);
        } else if (spec.cone) {
            geometry = new THREE.ConeGeometry(1, 2, 64, 2);
        } else if (spec.cylinder) {
            geometry = new THREE.CylinderGeometry(spec.radiusTop || 1, spec.radiusBottom || 1, 2, 32);
        } else {
            geometry = new THREE.SphereGeometry(1, 42, 32);
        }
        const opacity = typeof spec.opacity === 'number' ? spec.opacity : 0.54;
        const mesh = new THREE.Mesh(geometry, napraviMatMaterijal(THREE, spec.color, opacity, spec));

        mesh.position.set(spec.x, spec.y, spec.z);
        mesh.rotation.set(spec.rx || 0, spec.ry || 0, spec.rz || 0);
        mesh.scale.set(spec.sx, spec.sy, spec.sz);
        mesh.userData = {
            baseSx: spec.sx,
            baseSy: spec.sy,
            baseSz: spec.sz,
            baseOpacity: opacity,
            baseX: spec.x,
            baseY: spec.y,
            baseZ: spec.z,
            speed: spec.speed || 0.35,
            phase: spec.phase || 0,
            wobble: spec.wobble || 0.08,
            driftX: typeof spec.driftX === 'number' ? spec.driftX : 0.55,
            driftY: typeof spec.driftY === 'number' ? spec.driftY : 1,
            rotate: spec.rotate || 0.001,
            pulse: spec.pulse || 0,
            pulseSpeed: spec.pulseSpeed || 1,
            opacityPulse: spec.opacityPulse || 0
        };

        clayGroup.add(mesh);
        clayObjects.push(mesh);
        return mesh;
    }

    function dodajGlinaScene(THREE) {
        dodajMekuFormu(THREE, { x: -3.35, y: 1.9, z: -1.8, sx: 1.82, sy: 1.08, sz: 0.48, color: 0xff8a7a, opacity: 0.5, phase: 0.4, speed: 0.32, wobble: 0.1, rotate: 0.0011 });
        dodajMekuFormu(THREE, { x: 3.15, y: 1.35, z: -2.2, sx: 1.45, sy: 1.0, sz: 0.42, color: 0xb993ff, opacity: 0.5, phase: 1.2, speed: 0.28, wobble: 0.09, rotate: -0.001 });
        dodajMekuFormu(THREE, { x: 2.85, y: -2.05, z: -2.1, sx: 1.66, sy: 0.92, sz: 0.38, color: 0xffd166, opacity: 0.42, phase: 2.1, speed: 0.3, wobble: 0.08, rotate: 0.0014 });
        dodajMekuFormu(THREE, { x: -2.65, y: -2.35, z: -2.4, sx: 1.22, sy: 0.86, sz: 0.36, color: 0x8bdcc6, opacity: 0.36, phase: 3.0, speed: 0.34, wobble: 0.07, rotate: -0.0009 });
        dodajMekuFormu(THREE, { x: 0.15, y: 2.85, z: -2.8, sx: 0.92, sy: 0.54, sz: 0.22, color: 0xff5d8f, opacity: 0.3, phase: 2.8, speed: 0.22, wobble: 0.06, rotate: 0.0012 });
        dodajMekuFormu(THREE, { x: 0.05, y: -0.2, z: -3.15, sx: 2.95, sy: 1.72, sz: 0.18, color: 0xb993ff, opacity: 0.18, phase: 1.7, speed: 0.18, wobble: 0.035, rotate: 0.00045 });
        dodajMekuFormu(THREE, { x: -0.2, y: 0.06, z: -3.0, sx: 2.65, sy: 1.62, sz: 0.42, color: 0xffd166, opacity: 0.2, phase: 0.1, speed: 0.2, wobble: 0.04, rotate: -0.0005, torus: true, rx: 0.34, ry: 0.08, rz: -0.18 });
    }

    function dodajRekaScene(THREE) {
        const obale = [
            { x: -3.1, y: 1.72, z: -2.42, sx: 1.74, sy: 0.78, sz: 0.32, color: 0x49c997, opacity: 0.42, rz: -0.36, phase: 0.3, speed: 0.2, wobble: 0.05, rotate: 0.00035 },
            { x: 2.95, y: 1.05, z: -2.46, sx: 1.56, sy: 0.7, sz: 0.3, color: 0x7ecf93, opacity: 0.36, rz: 0.28, phase: 1.2, speed: 0.2, wobble: 0.05, rotate: -0.0003 },
            { x: -3.0, y: -0.82, z: -2.48, sx: 1.52, sy: 0.68, sz: 0.28, color: 0x3dbb9d, opacity: 0.36, rz: 0.2, phase: 2.1, speed: 0.2, wobble: 0.05, rotate: 0.00032 },
            { x: 3.08, y: -1.86, z: -2.5, sx: 1.76, sy: 0.72, sz: 0.28, color: 0x59d0a9, opacity: 0.34, rz: -0.22, phase: 2.8, speed: 0.2, wobble: 0.05, rotate: -0.00034 },
            { x: -0.35, y: 2.94, z: -2.58, sx: 1.24, sy: 0.46, sz: 0.2, color: 0xffd36a, opacity: 0.32, rz: -0.12, phase: 1.8, speed: 0.18, wobble: 0.04, rotate: 0.00026 }
        ];

        const voda = [
            { x: -1.55, y: 2.22, z: -2.02, sx: 3.24, sy: 0.82, sz: 0.34, color: 0x117cd8, opacity: 0.58, rz: -0.42, phase: 0.2, speed: 0.28, wobble: 0.11, driftX: 0.78, driftY: 0.46, rotate: 0.00042, roughness: 0.82 },
            { x: 0.9, y: 1.1, z: -1.94, sx: 3.72, sy: 0.92, sz: 0.36, color: 0x1ba7f2, opacity: 0.64, rz: 0.34, phase: 1.0, speed: 0.3, wobble: 0.12, driftX: 0.74, driftY: 0.48, rotate: -0.00046, roughness: 0.8 },
            { x: -0.88, y: -0.28, z: -1.9, sx: 3.64, sy: 0.9, sz: 0.34, color: 0x26bfff, opacity: 0.62, rz: -0.3, phase: 1.9, speed: 0.31, wobble: 0.12, driftX: 0.78, driftY: 0.48, rotate: 0.00048, roughness: 0.8 },
            { x: 1.08, y: -1.56, z: -1.95, sx: 3.34, sy: 0.82, sz: 0.32, color: 0x188de2, opacity: 0.58, rz: 0.3, phase: 2.8, speed: 0.28, wobble: 0.11, driftX: 0.76, driftY: 0.46, rotate: -0.00042, roughness: 0.82 },
            { x: -0.04, y: 0.48, z: -1.64, sx: 2.18, sy: 0.48, sz: 0.18, color: 0x94efff, opacity: 0.46, rz: 0.06, phase: 0.7, speed: 0.36, wobble: 0.1, driftX: 0.9, driftY: 0.36, rotate: 0.00055, roughness: 0.76 }
        ];

        const struje = [
            { x: -1.22, y: 1.62, z: -1.34, sx: 1.58, sy: 0.12, sz: 0.08, color: 0xe8fdff, opacity: 0.68, rz: -0.4, phase: 0.55, speed: 0.58, wobble: 0.12, driftX: 1.1, driftY: 0.34, rotate: 0.00082, pulse: 0.05, pulseSpeed: 1.6, opacityPulse: 0.08, emissive: 0x7de3ff, emissiveIntensity: 0.2 },
            { x: 0.82, y: 0.5, z: -1.3, sx: 1.76, sy: 0.13, sz: 0.08, color: 0xd8fbff, opacity: 0.62, rz: 0.32, phase: 1.4, speed: 0.56, wobble: 0.12, driftX: 1.05, driftY: 0.34, rotate: -0.0008, pulse: 0.05, pulseSpeed: 1.5, opacityPulse: 0.07, emissive: 0x7de3ff, emissiveIntensity: 0.18 },
            { x: -0.7, y: -0.78, z: -1.3, sx: 1.48, sy: 0.11, sz: 0.07, color: 0xf0feff, opacity: 0.64, rz: -0.28, phase: 2.35, speed: 0.54, wobble: 0.1, driftX: 1.0, driftY: 0.32, rotate: 0.00076, pulse: 0.05, pulseSpeed: 1.55, opacityPulse: 0.07, emissive: 0x7de3ff, emissiveIntensity: 0.18 },
            { x: 1.02, y: -1.96, z: -1.32, sx: 1.32, sy: 0.1, sz: 0.07, color: 0xd9fbff, opacity: 0.58, rz: 0.28, phase: 3.1, speed: 0.5, wobble: 0.1, driftX: 0.95, driftY: 0.3, rotate: -0.00072, pulse: 0.05, pulseSpeed: 1.45, opacityPulse: 0.06, emissive: 0x7de3ff, emissiveIntensity: 0.16 }
        ];

        const talasi = [
            { x: 2.36, y: 2.28, z: -1.58, sx: 1.36, sy: 0.48, sz: 0.12, color: 0xcdfbff, opacity: 0.32, phase: 0.4, speed: 0.22, wobble: 0.05, rotate: 0.00032, torus: true, thickness: 0.04, rx: 0.18, ry: 0.1, rz: -0.24, pulse: 0.08, pulseSpeed: 1.05, opacityPulse: 0.06, emissive: 0x7de3ff, emissiveIntensity: 0.12 },
            { x: -2.42, y: 0.04, z: -1.6, sx: 1.18, sy: 0.42, sz: 0.1, color: 0x8cecff, opacity: 0.3, phase: 1.4, speed: 0.22, wobble: 0.05, rotate: -0.00034, torus: true, thickness: 0.04, rx: 0.22, ry: -0.08, rz: 0.2, pulse: 0.08, pulseSpeed: 1.0, opacityPulse: 0.05, emissive: 0x2db7ff, emissiveIntensity: 0.1 },
            { x: 2.36, y: -0.92, z: -1.58, sx: 1.04, sy: 0.36, sz: 0.1, color: 0xdffcff, opacity: 0.28, phase: 2.1, speed: 0.2, wobble: 0.04, rotate: 0.0003, torus: true, thickness: 0.035, rx: 0.2, ry: 0.08, rz: -0.18, pulse: 0.07, pulseSpeed: 0.95, opacityPulse: 0.05, emissive: 0x7de3ff, emissiveIntensity: 0.1 }
        ];

        const sjaj = [
            { x: -0.22, y: 1.1, z: -1.05, sx: 0.11, sy: 0.11, sz: 0.11, color: 0xffffff, opacity: 0.88, phase: 0.1, speed: 0.55, wobble: 0.08, pulse: 0.2, pulseSpeed: 2.2, opacityPulse: 0.16, emissive: 0x9ef7ff, emissiveIntensity: 0.65, rotate: 0.0002 },
            { x: 1.52, y: -0.12, z: -1.05, sx: 0.09, sy: 0.09, sz: 0.09, color: 0xf7ffff, opacity: 0.82, phase: 1.2, speed: 0.52, wobble: 0.08, pulse: 0.22, pulseSpeed: 2.0, opacityPulse: 0.15, emissive: 0x9ef7ff, emissiveIntensity: 0.58, rotate: -0.0002 },
            { x: -1.46, y: -1.08, z: -1.05, sx: 0.08, sy: 0.08, sz: 0.08, color: 0xfff1aa, opacity: 0.74, phase: 2.2, speed: 0.5, wobble: 0.07, pulse: 0.2, pulseSpeed: 1.9, opacityPulse: 0.14, emissive: 0xffd36a, emissiveIntensity: 0.42, rotate: 0.0002 },
            { x: 0.38, y: -2.32, z: -1.05, sx: 0.1, sy: 0.1, sz: 0.1, color: 0xffffff, opacity: 0.8, phase: 3.0, speed: 0.48, wobble: 0.07, pulse: 0.2, pulseSpeed: 2.1, opacityPulse: 0.14, emissive: 0x9ef7ff, emissiveIntensity: 0.55, rotate: -0.0002 }
        ];

        [...obale, ...voda, ...struje, ...talasi, ...sjaj].forEach(spec => dodajMekuFormu(THREE, spec));
    }

    function dodajOblak(THREE, x, y, z, boja, opacity, scale = 1, phase = 0) {
        [
            { dx: -0.5, dy: -0.02, sx: 0.58, sy: 0.22, sz: 0.16 },
            { dx: 0, dy: 0.08, sx: 0.68, sy: 0.32, sz: 0.18 },
            { dx: 0.5, dy: -0.02, sx: 0.56, sy: 0.22, sz: 0.16 },
            { dx: -0.12, dy: -0.16, sx: 0.92, sy: 0.18, sz: 0.14 }
        ].forEach((deo, index) => dodajMekuFormu(THREE, {
            x: x + deo.dx * scale,
            y: y + deo.dy * scale,
            z,
            sx: deo.sx * scale,
            sy: deo.sy * scale,
            sz: deo.sz * scale,
            color: boja,
            opacity,
            phase: phase + index * 0.42,
            speed: 0.12,
            wobble: 0.035,
            driftX: 1.25,
            driftY: 0.35,
            rotate: 0.00012,
            roughness: 0.96
        }));
    }

    function dodajDrvo(THREE, x, y, z, scale = 1, phase = 0) {
        dodajMekuFormu(THREE, {
            x,
            y: y - 0.22 * scale,
            z: z + 0.02,
            sx: 0.08 * scale,
            sy: 0.22 * scale,
            sz: 0.08 * scale,
            color: 0x8f5f42,
            opacity: 0.58,
            cylinder: true,
            phase,
            speed: 0.12,
            wobble: 0.015,
            rotate: 0.00008,
            roughness: 0.94
        });

        [
            { dx: -0.12, dy: 0.02, s: 0.24 },
            { dx: 0.12, dy: 0.04, s: 0.24 },
            { dx: 0, dy: 0.2, s: 0.28 }
        ].forEach((deo, index) => dodajMekuFormu(THREE, {
            x: x + deo.dx * scale,
            y: y + deo.dy * scale,
            z,
            sx: deo.s * scale,
            sy: deo.s * 0.9 * scale,
            sz: deo.s * 0.62 * scale,
            color: index === 2 ? 0x8ebd95 : 0x7fac8a,
            opacity: 0.58,
            phase: phase + index * 0.5,
            speed: 0.14,
            wobble: 0.02,
            driftX: 0.45,
            driftY: 0.35,
            rotate: 0.00014,
            roughness: 0.96
        }));
    }

    function dodajPlaninaScene(THREE) {
        const pozadina = [
            { x: 0, y: -2.5, z: -3.1, sx: 4.2, sy: 0.72, sz: 0.24, color: 0x8eb39f, opacity: 0.46, phase: 1.1, speed: 0.1, wobble: 0.02, rotate: 0.00008 },
            { x: -1.25, y: -1.62, z: -2.82, sx: 2.45, sy: 0.62, sz: 0.22, color: 0xd9c6a4, opacity: 0.38, rz: 0.1, phase: 0.2, speed: 0.1, wobble: 0.02, rotate: 0.00008 },
            { x: 1.25, y: -1.5, z: -2.8, sx: 2.35, sy: 0.64, sz: 0.22, color: 0x9fc7a5, opacity: 0.4, rz: -0.12, phase: 0.8, speed: 0.1, wobble: 0.02, rotate: -0.00008 },
            { x: 0.05, y: -2.02, z: -2.48, sx: 3.5, sy: 0.42, sz: 0.16, color: 0x78a98d, opacity: 0.34, phase: 1.8, speed: 0.12, wobble: 0.02, rotate: 0.00008 }
        ];

        const planine = [
            { x: -0.35, y: 0.48, z: -2.22, sx: 1.36, sy: 1.88, sz: 0.72, color: 0x8aa8ba, opacity: 0.72, phase: 0.4, speed: 0.1, wobble: 0.025, rotate: 0.00012, cone: true },
            { x: -1.92, y: -0.28, z: -2.4, sx: 1.18, sy: 1.3, sz: 0.62, color: 0x7798ad, opacity: 0.62, phase: 1.1, speed: 0.1, wobble: 0.02, rotate: -0.0001, cone: true },
            { x: 1.35, y: -0.2, z: -2.34, sx: 1.18, sy: 1.42, sz: 0.66, color: 0xc69276, opacity: 0.66, phase: 1.8, speed: 0.1, wobble: 0.02, rotate: 0.00011, cone: true },
            { x: 2.32, y: -0.04, z: -2.55, sx: 0.95, sy: 1.18, sz: 0.54, color: 0xd0ad8d, opacity: 0.48, phase: 2.4, speed: 0.1, wobble: 0.018, rotate: -0.0001, cone: true }
        ];

        const sneg = [
            { x: -0.35, y: 1.82, z: -1.74, sx: 0.72, sy: 0.28, sz: 0.18, color: 0xfff4ec, opacity: 0.86, phase: 0.7, speed: 0.12, wobble: 0.018, rotate: 0.00008 },
            { x: -1.92, y: 0.68, z: -1.92, sx: 0.52, sy: 0.2, sz: 0.14, color: 0xfff3eb, opacity: 0.8, phase: 1.5, speed: 0.12, wobble: 0.016, rotate: -0.00008 },
            { x: 1.35, y: 0.9, z: -1.88, sx: 0.56, sy: 0.22, sz: 0.14, color: 0xfff4ec, opacity: 0.82, phase: 2.2, speed: 0.12, wobble: 0.016, rotate: 0.00008 },
            { x: 2.32, y: 0.78, z: -2.02, sx: 0.42, sy: 0.16, sz: 0.12, color: 0xfff4ec, opacity: 0.72, phase: 2.9, speed: 0.12, wobble: 0.014, rotate: -0.00008 },
            { x: -0.55, y: -0.98, z: -1.95, sx: 0.84, sy: 0.16, sz: 0.1, color: 0xfff4ec, opacity: 0.56, rz: -0.08, phase: 3.1, speed: 0.1, wobble: 0.014, rotate: 0.00006 }
        ];

        const staza = [
            { x: 0.32, y: -2.45, z: -1.64, sx: 0.9, sy: 0.13, sz: 0.08, color: 0xd0b7a6, opacity: 0.64, rz: -0.1, phase: 0.4, speed: 0.14, wobble: 0.012, rotate: 0.00012 },
            { x: 0.2, y: -2.12, z: -1.66, sx: 0.62, sy: 0.11, sz: 0.07, color: 0xd7c0ad, opacity: 0.58, rz: 0.32, phase: 1.0, speed: 0.14, wobble: 0.012, rotate: -0.00012 },
            { x: 0.44, y: -1.82, z: -1.68, sx: 0.54, sy: 0.1, sz: 0.06, color: 0xd0b7a6, opacity: 0.54, rz: -0.34, phase: 1.7, speed: 0.14, wobble: 0.012, rotate: 0.00012 },
            { x: 0.16, y: -1.58, z: -1.7, sx: 0.42, sy: 0.08, sz: 0.06, color: 0xd7c0ad, opacity: 0.48, rz: 0.24, phase: 2.3, speed: 0.14, wobble: 0.012, rotate: -0.00012 }
        ];

        [...pozadina, ...planine, ...sneg, ...staza].forEach(spec => dodajMekuFormu(THREE, spec));

        dodajOblak(THREE, -2.6, 2.28, -2.08, 0xffebe6, 0.58, 0.92, 0.2);
        dodajOblak(THREE, 0.15, 2.74, -2.26, 0xc8ddec, 0.5, 0.55, 1.2);
        dodajOblak(THREE, 2.45, 2.3, -2.05, 0xc9e0ef, 0.58, 0.9, 2.1);
        dodajOblak(THREE, 1.28, 2.9, -2.46, 0xffe8dd, 0.46, 0.5, 2.8);

        [
            [-2.95, -2.12, -1.72, 0.8, 0.2],
            [-2.42, -2.06, -1.68, 0.72, 0.9],
            [-1.88, -2.18, -1.7, 0.62, 1.5],
            [2.14, -2.1, -1.68, 0.72, 2.2],
            [2.72, -2.02, -1.66, 0.82, 2.9],
            [3.18, -2.18, -1.72, 0.64, 3.5],
            [-0.98, -2.34, -1.6, 0.42, 4.1],
            [1.02, -2.32, -1.6, 0.44, 4.8]
        ].forEach(([x, y, z, scale, phase]) => dodajDrvo(THREE, x, y, z, scale, phase));

        dodajMekuFormu(THREE, { x: 0, y: -2.86, z: -1.36, sx: 0.38, sy: 0.38, sz: 0.08, color: 0xc18d73, opacity: 0.62, phase: 1.6, speed: 0.12, wobble: 0.018, pulse: 0.025, pulseSpeed: 1.1, rotate: 0.00018, torus: true, thickness: 0.09, rx: 0, ry: 0, rz: 0, emissive: 0xffd2b3, emissiveIntensity: 0.08 });
        dodajMekuFormu(THREE, { x: 0, y: -2.86, z: -1.33, sx: 0.27, sy: 0.27, sz: 0.05, color: 0xd7a286, opacity: 0.48, phase: 2.2, speed: 0.12, wobble: 0.014, rotate: -0.00012 });
    }

    function podesiSvetloZaTemu(THREE, tema) {
        const ambijent = tema === 'reka'
            ? new THREE.HemisphereLight(0xe6feff, 0x031625, 1.95)
            : tema === 'planina'
                ? new THREE.HemisphereLight(0xfff4ec, 0x6f8ba1, 1.82)
                : new THREE.HemisphereLight(0xfff3e8, 0x160f24, 1.65);
        scene.add(ambijent);

        const glavnoSvetlo = new THREE.DirectionalLight(0xffffff, tema === 'reka' ? 2.65 : tema === 'planina' ? 2.28 : 2.45);
        glavnoSvetlo.position.set(-3.2, 4.4, 5.8);
        scene.add(glavnoSvetlo);

        const primarniSjaj = new THREE.PointLight(tema === 'reka' ? 0x7de3ff : tema === 'planina' ? 0xb5a1dd : 0xff8a7a, tema === 'reka' ? 2.05 : tema === 'planina' ? 1.05 : 1.45, 10);
        primarniSjaj.position.set(3.8, -1.8, 3.4);
        scene.add(primarniSjaj);

        const sekundarniSjaj = new THREE.PointLight(tema === 'reka' ? 0x2db7ff : tema === 'planina' ? 0xffd2b3 : 0xb993ff, tema === 'reka' ? 1.7 : tema === 'planina' ? 0.95 : 1.15, 9);
        sekundarniSjaj.position.set(-3.6, 1.4, 2.8);
        scene.add(sekundarniSjaj);
    }

    function napraviScenu(THREE) {
        const tema = aktivnaThreeTema();
        if (!tema) return false;

        mount = osigurajMount();
        if (!mount) return false;

        sceneTheme = tema;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0, tema === 'reka' ? 8.05 : tema === 'planina' ? 8.15 : 8.4);

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'low-power'
        });

        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        renderer.setClearColor(0x000000, 0);
        mount.replaceChildren(renderer.domElement);

        podesiSvetloZaTemu(THREE, tema);

        clayGroup = new THREE.Group();
        scene.add(clayGroup);

        if (tema === 'reka') {
            dodajRekaScene(THREE);
        } else if (tema === 'planina') {
            dodajPlaninaScene(THREE);
        } else {
            dodajGlinaScene(THREE);
        }

        podesiVelicinu();

        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                podesiVelicinu();
                renderujJednom();
            });
            resizeObserver.observe(mount);
        }

        renderujJednom();
        return true;
    }

    function renderujJednom() {
        if (!renderer || !scene || !camera) return;
        renderer.render(scene, camera);
    }

    function animiraj(vreme) {
        animationFrame = null;

        if (!trebaDaRadi()) {
            renderujJednom();
            return;
        }

        const t = vreme * 0.001;
        const reka = sceneTheme === 'reka';
        const planina = sceneTheme === 'planina';
        clayGroup.rotation.z = Math.sin(t * (reka ? 0.13 : planina ? 0.08 : 0.18)) * (reka ? 0.022 : planina ? 0.012 : 0.035);
        clayGroup.rotation.x = Math.sin(t * (reka ? 0.1 : planina ? 0.07 : 0.13)) * (reka ? 0.012 : planina ? 0.008 : 0.018);

        clayObjects.forEach((mesh, index) => {
            const data = mesh.userData;
            const pulse = data.pulse ? 1 + Math.sin(t * data.pulseSpeed + data.phase) * data.pulse : 1;
            mesh.position.x = data.baseX + Math.cos(t * data.speed + data.phase) * data.wobble * data.driftX;
            mesh.position.y = data.baseY + Math.sin(t * data.speed + data.phase) * data.wobble * data.driftY;
            mesh.scale.set(data.baseSx * pulse, data.baseSy * pulse, data.baseSz * pulse);
            if (mesh.material && data.opacityPulse) {
                mesh.material.opacity = Math.max(0.04, Math.min(1, data.baseOpacity + Math.sin(t * data.pulseSpeed + data.phase) * data.opacityPulse));
            }
            mesh.rotation.x += data.rotate * (index % 2 === 0 ? 1 : -1);
            mesh.rotation.y += data.rotate * 0.72;
            mesh.rotation.z += data.rotate * (reka ? 0.95 : planina ? 0.36 : 0.45);
        });

        renderer.render(scene, camera);

        if (!REDUCED_MOTION) {
            animationFrame = window.requestAnimationFrame(animiraj);
        }
    }

    function pokreni() {
        if (animationFrame || REDUCED_MOTION) {
            renderujJednom();
            return;
        }
        animationFrame = window.requestAnimationFrame(animiraj);
    }

    function zaustavi() {
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function oslobodiObjekat(objekat) {
        if (objekat.geometry) objekat.geometry.dispose();

        const materijali = Array.isArray(objekat.material)
            ? objekat.material
            : objekat.material
                ? [objekat.material]
                : [];

        materijali.forEach(materijal => materijal.dispose());
    }

    function unistiScenu() {
        zaustavi();

        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (scene) {
            scene.traverse(oslobodiObjekat);
        }

        if (renderer) {
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.remove();
            }
        }

        renderer = null;
        scene = null;
        camera = null;
        clayGroup = null;
        clayObjects = [];
        scenePromise = null;
        sceneTheme = null;
    }

    async function azuriraj() {
        const tema = aktivnaThreeTema();

        if (!tema) {
            zaustavi();
            return;
        }

        try {
            if (sceneTheme && sceneTheme !== tema) {
                unistiScenu();
            }

            if (!scenePromise) {
                scenePromise = ucitajThree().then(napraviScenu);
            }

            await scenePromise;
            podesiVelicinu();

            if (trebaDaRadi()) {
                pokreni();
            } else {
                zaustavi();
                renderujJednom();
            }
        } catch (error) {
            zaustavi();
            console.warn('Clay/river Three tema nije pokrenuta:', error);
        }
    }

    function inicijalizuj() {
        const mainMenu = document.getElementById('main-menu');
        osigurajMount();

        const bodyObserver = new MutationObserver(azuriraj);
        bodyObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-tema']
        });

        if (mainMenu) {
            const menuObserver = new MutationObserver(azuriraj);
            menuObserver.observe(mainMenu, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        document.addEventListener('visibilitychange', azuriraj);
        window.addEventListener('resize', () => {
            podesiVelicinu();
            renderujJednom();
        }, { passive: true });

        azuriraj();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicijalizuj, { once: true });
    } else {
        inicijalizuj();
    }
})(window, document);
