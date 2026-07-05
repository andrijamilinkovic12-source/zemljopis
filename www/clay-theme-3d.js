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
        if (tema === 'okean') return 'reka-efekti';
        if (tema === 'drzava') return 'drzava-efekti';
        if (tema === 'planina') return 'planina-oblaci';
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
            depthWrite: spec.depthWrite === true,
            flatShading: !!spec.flatShading,
            emissive: spec.emissive || 0x000000,
            emissiveIntensity: spec.emissiveIntensity || 0
        });
    }

    function tackaNaPutanji(path, progress) {
        if (!Array.isArray(path) || path.length < 2) {
            return { x: 0, y: 0, angle: 0 };
        }

        const p = ((progress % 1) + 1) % 1;
        const segment = p * (path.length - 1);
        const index = Math.min(path.length - 2, Math.floor(segment));
        const local = segment - index;
        const a = path[index];
        const b = path[index + 1];
        const x = a.x + (b.x - a.x) * local;
        const y = a.y + (b.y - a.y) * local;

        return {
            x,
            y,
            angle: Math.atan2(b.y - a.y, b.x - a.x)
        };
    }

    function smoothStep(edge0, edge1, value) {
        const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
        return x * x * (3 - 2 * x);
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
        if (typeof spec.renderOrder === 'number') {
            mesh.renderOrder = spec.renderOrder;
        }
        mesh.userData = {
            baseSx: spec.sx,
            baseSy: spec.sy,
            baseSz: spec.sz,
            baseOpacity: opacity,
            baseX: spec.x,
            baseY: spec.y,
            baseZ: spec.z,
            baseRx: spec.rx || 0,
            baseRy: spec.ry || 0,
            baseRz: spec.rz || 0,
            speed: spec.speed || 0.35,
            phase: spec.phase || 0,
            wobble: spec.wobble || 0.08,
            driftX: typeof spec.driftX === 'number' ? spec.driftX : 0.55,
            driftY: typeof spec.driftY === 'number' ? spec.driftY : 1,
            rotate: typeof spec.rotate === 'number' ? spec.rotate : 0.001,
            pulse: spec.pulse || 0,
            pulseSpeed: spec.pulseSpeed || 1,
            opacityPulse: spec.opacityPulse || 0,
            flowPath: spec.flowPath || null,
            flowSpeed: spec.flowSpeed || 0,
            flowPhase: spec.flowPhase || 0,
            flowFade: !!spec.flowFade,
            flagWave: spec.flagWave || 0,
            flagIndex: spec.flagIndex || 0,
            spinType: spec.spinType || null,
            spinSpeed: spec.spinSpeed || 0,
            spinPhase: spec.spinPhase || 0
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

    function dodajRekaEfektiScene(THREE) {
        dodajRekaOblaci(THREE);

        const rekaPutanja = [
            { x: 0.08, y: 1.18 },
            { x: -0.34, y: 0.62 },
            { x: 0.36, y: 0.05 },
            { x: 0.08, y: -0.58 },
            { x: -0.34, y: -1.18 },
            { x: 0.18, y: -1.82 },
            { x: -0.12, y: -2.55 }
        ];

        [
            { sx: 0.58, sy: 0.04, z: -1.5, phase: 0.02, speed: 0.085, opacity: 0.32, color: 0xf2ffff },
            { sx: 0.82, sy: 0.05, z: -1.54, phase: 0.18, speed: 0.078, opacity: 0.24, color: 0xd7fbff },
            { sx: 0.5, sy: 0.035, z: -1.48, phase: 0.35, speed: 0.092, opacity: 0.3, color: 0xffffff },
            { sx: 0.74, sy: 0.045, z: -1.56, phase: 0.52, speed: 0.082, opacity: 0.22, color: 0xcff7ff },
            { sx: 0.42, sy: 0.032, z: -1.44, phase: 0.7, speed: 0.096, opacity: 0.28, color: 0xffffff },
            { sx: 0.66, sy: 0.04, z: -1.52, phase: 0.86, speed: 0.074, opacity: 0.2, color: 0xe9feff }
        ].forEach(spec => dodajMekuFormu(THREE, {
            x: rekaPutanja[0].x,
            y: rekaPutanja[0].y,
            z: spec.z,
            sx: spec.sx,
            sy: spec.sy,
            sz: 0.045,
            color: spec.color,
            opacity: spec.opacity,
            phase: spec.phase * 6.28,
            speed: 0.34,
            wobble: 0.025,
            driftX: 0.42,
            driftY: 0.18,
            rotate: 0.00005,
            roughness: 0.78,
            pulse: 0.06,
            pulseSpeed: 0.9,
            opacityPulse: 0.05,
            emissive: 0x9ef7ff,
            emissiveIntensity: 0.2,
            flowPath: rekaPutanja,
            flowSpeed: spec.speed,
            flowPhase: spec.phase,
            flowFade: true,
            renderOrder: 8
        }));

        [
            { sx: 1.1, sy: 0.22, phase: 0.12, rz: -0.08 },
            { sx: 1.28, sy: 0.24, phase: 0.46, rz: 0.06 },
            { sx: 1.0, sy: 0.18, phase: 0.78, rz: -0.05 }
        ].forEach(spec => dodajMekuFormu(THREE, {
            x: rekaPutanja[0].x,
            y: rekaPutanja[0].y,
            z: -1.64,
            sx: spec.sx,
            sy: spec.sy,
            sz: 0.052,
            color: 0xdffcff,
            opacity: 0.12,
            phase: spec.phase * 6.28,
            speed: 0.18,
            wobble: 0.018,
            driftX: 0.22,
            driftY: 0.1,
            rotate: 0.00004,
            torus: true,
            thickness: 0.028,
            rx: 0.18,
            ry: 0.06,
            rz: spec.rz,
            pulse: 0.04,
            pulseSpeed: 0.7,
            opacityPulse: 0.025,
            emissive: 0x7de3ff,
            emissiveIntensity: 0.08,
            flowPath: rekaPutanja,
            flowSpeed: 0.052,
            flowPhase: spec.phase,
            flowFade: true,
            renderOrder: 7
        }));

        [
            { s: 0.055, phase: 0.05 },
            { s: 0.045, phase: 0.22 },
            { s: 0.052, phase: 0.4 },
            { s: 0.04, phase: 0.58 },
            { s: 0.05, phase: 0.76 },
            { s: 0.038, phase: 0.9 }
        ].forEach(spec => dodajMekuFormu(THREE, {
            x: rekaPutanja[0].x,
            y: rekaPutanja[0].y,
            z: -1.16,
            sx: spec.s,
            sy: spec.s,
            sz: spec.s,
            color: 0xffffff,
            opacity: 0.56,
            phase: spec.phase * 6.28,
            speed: 0.38,
            wobble: 0.04,
            driftX: 0.55,
            driftY: 0.22,
            pulse: 0.24,
            pulseSpeed: 1.55,
            opacityPulse: 0.14,
            emissive: 0x9ef7ff,
            emissiveIntensity: 0.48,
            rotate: 0.00006,
            flowPath: rekaPutanja,
            flowSpeed: 0.09,
            flowPhase: spec.phase,
            flowFade: true,
            renderOrder: 9
        }));
    }

    function dodajOblak(THREE, x, y, z, boja, opacity, scale = 1, phase = 0, opts = {}) {
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
            speed: opts.speed || 0.07,
            wobble: opts.wobble || 0.12,
            driftX: typeof opts.driftX === 'number' ? opts.driftX : 1.35,
            driftY: typeof opts.driftY === 'number' ? opts.driftY : 0.28,
            rotate: opts.rotate || 0.00006,
            roughness: 0.96,
            pulse: opts.pulse || 0.022,
            pulseSpeed: opts.pulseSpeed || 0.46,
            opacityPulse: opts.opacityPulse || 0.04,
            emissive: opts.emissive || 0x000000,
            emissiveIntensity: opts.emissiveIntensity || 0,
            renderOrder: opts.renderOrder
        }));
    }

    function dodajZiviOblak(THREE, spec) {
        const grupa = new THREE.Group();
        const scale = spec.scale || 1;
        const opacity = typeof spec.opacity === 'number' ? spec.opacity : 0.82;
        const delovi = spec.parts || [
            { dx: -0.54, dy: -0.03, sx: 0.6, sy: 0.23, sz: 0.16, morphX: 0.018, morphY: 0.012 },
            { dx: -0.12, dy: 0.08, sx: 0.7, sy: 0.33, sz: 0.19, morphX: 0.015, morphY: 0.016 },
            { dx: 0.36, dy: 0.04, sx: 0.62, sy: 0.27, sz: 0.17, morphX: 0.016, morphY: 0.012 },
            { dx: 0.68, dy: -0.05, sx: 0.42, sy: 0.18, sz: 0.13, morphX: 0.012, morphY: 0.009 },
            { dx: -0.2, dy: -0.17, sx: 0.98, sy: 0.18, sz: 0.14, morphX: 0.02, morphY: 0.008 }
        ];

        delovi.forEach((deo, index) => {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(1, 42, 32),
                napraviMatMaterijal(THREE, spec.color, opacity * (deo.opacity || 1), {
                    roughness: 0.97,
                    metalness: 0.02,
                    emissive: spec.emissive || 0x000000,
                    emissiveIntensity: spec.emissiveIntensity || 0
                })
            );
            const px = deo.dx * scale;
            const py = deo.dy * scale;
            const sx = deo.sx * scale;
            const sy = deo.sy * scale;
            const sz = deo.sz * scale;
            mesh.position.set(px, py, 0);
            mesh.scale.set(sx, sy, sz);
            mesh.userData = {
                baseX: px,
                baseY: py,
                baseZ: 0,
                baseSx: sx,
                baseSy: sy,
                baseSz: sz,
                baseOpacity: opacity * (deo.opacity || 1),
                morphX: (deo.morphX || 0.012) * scale,
                morphY: (deo.morphY || 0.01) * scale,
                morphScale: deo.morphScale || 0.018,
                phase: (spec.phase || 0) + index * 0.74
            };
            if (typeof spec.renderOrder === 'number') {
                mesh.renderOrder = spec.renderOrder;
            }
            grupa.add(mesh);
        });

        grupa.position.set(spec.x, spec.y, spec.z);
        grupa.rotation.set(spec.rx || 0, spec.ry || 0, spec.rz || 0);
        grupa.userData = {
            cloudGroup: true,
            baseSx: 1,
            baseSy: 1,
            baseSz: 1,
            baseOpacity: opacity,
            baseX: spec.x,
            baseY: spec.y,
            baseZ: spec.z,
            baseRx: spec.rx || 0,
            baseRy: spec.ry || 0,
            baseRz: spec.rz || 0,
            speed: spec.speed || 0.18,
            phase: spec.phase || 0,
            wobble: spec.wobble || 0.08,
            driftX: typeof spec.driftX === 'number' ? spec.driftX : 0.22,
            driftY: typeof spec.driftY === 'number' ? spec.driftY : 0.3,
            rotate: 0,
            pulse: spec.pulse || 0.018,
            pulseSpeed: spec.pulseSpeed || 0.34,
            opacityPulse: spec.opacityPulse || 0.03,
            flowPath: null,
            flowSpeed: 0,
            flowPhase: 0,
            flowFade: false,
            flagWave: 0,
            flagIndex: 0,
            spinType: null,
            spinSpeed: 0,
            spinPhase: 0,
            cloudSpeed: spec.cloudSpeed || 0.016,
            cloudWrapMin: typeof spec.wrapMin === 'number' ? spec.wrapMin : -3.85,
            cloudWrapMax: typeof spec.wrapMax === 'number' ? spec.wrapMax : 3.85,
            cloudWidth: (spec.cloudWidth || 1.35) * scale,
            cloudTilt: spec.cloudTilt || 0.018,
            cloudMorph: spec.cloudMorph || 1
        };

        clayGroup.add(grupa);
        clayObjects.push(grupa);
        return grupa;
    }

    function dodajPlaninaOblaciScene(THREE) {
        [
            { x: -1.2, y: 1.78, z: -1.72, scale: 0.76, opacity: 0.9, phase: 0.2, color: 0xfff3ee, cloudSpeed: 0.014, wobble: 0.1 },
            { x: 0.0, y: 2.18, z: -1.88, scale: 0.48, opacity: 0.72, phase: 1.45, color: 0xf7ecff, cloudSpeed: 0.018, wobble: 0.08 },
            { x: 0.58, y: 2.03, z: -1.92, scale: 0.4, opacity: 0.66, phase: 2.3, color: 0xfff0e8, cloudSpeed: 0.016, wobble: 0.07 },
            { x: 1.08, y: 1.76, z: -1.74, scale: 0.72, opacity: 0.86, phase: 3.1, color: 0xfff4ef, cloudSpeed: 0.012, wobble: 0.09 },
            { x: 1.48, y: 1.24, z: -2.0, scale: 0.38, opacity: 0.56, phase: 4.2, color: 0xf7eef8, cloudSpeed: 0.019, wobble: 0.07 }
        ].forEach(oblak => dodajZiviOblak(THREE, {
            ...oblak,
            speed: 0.13,
            driftX: 0.26,
            driftY: 0.22,
            opacityPulse: 0.028,
            pulse: 0.014,
            pulseSpeed: 0.32,
            cloudTilt: 0.016,
            cloudMorph: 1,
            renderOrder: 12
        }));
    }

    function dodajRekaOblaci(THREE) {
        [
            { x: -1.2, y: 2.12, z: -1.9, scale: 0.58, opacity: 0.84, phase: 0.4, color: 0xfff4df },
            { x: 0.72, y: 2.12, z: -1.86, scale: 0.74, opacity: 0.88, phase: 1.5, color: 0xfff3e8 },
            { x: 0.1, y: 1.66, z: -2.02, scale: 0.34, opacity: 0.62, phase: 2.6, color: 0xfff5ea },
            { x: -1.18, y: 1.36, z: -2.02, scale: 0.42, opacity: 0.6, phase: 3.4, color: 0xeef4ff },
            { x: 1.42, y: 1.46, z: -2.05, scale: 0.44, opacity: 0.58, phase: 4.3, color: 0xeef3ff }
        ].forEach(oblak => dodajOblak(
            THREE,
            oblak.x,
            oblak.y,
            oblak.z,
            oblak.color,
            oblak.opacity,
            oblak.scale,
            oblak.phase,
            {
                speed: 0.108,
                wobble: 0.13,
                driftX: 1.45,
                driftY: 0.18,
                opacityPulse: 0.035,
                pulse: 0.018,
                pulseSpeed: 0.42
            }
        ));
    }

    function dodajDrzavaEfektiScene(THREE) {
        const napraviOverlayMesh = (spec) => {
            let geometry;
            if (spec.torus) {
                geometry = new THREE.TorusGeometry(1, spec.thickness || 0.08, 24, 96);
            } else if (spec.cone) {
                geometry = new THREE.ConeGeometry(1, 2, 48, 1);
            } else if (spec.cylinder) {
                geometry = new THREE.CylinderGeometry(spec.radiusTop || 1, spec.radiusBottom || 1, 2, 32);
            } else {
                geometry = new THREE.SphereGeometry(1, 42, 32);
            }
            const mesh = new THREE.Mesh(geometry, napraviMatMaterijal(THREE, spec.color, spec.opacity, spec));
            mesh.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
            mesh.rotation.set(spec.rx || 0, spec.ry || 0, spec.rz || 0);
            mesh.scale.set(spec.sx, spec.sy, spec.sz);
            if (typeof spec.renderOrder === 'number') mesh.renderOrder = spec.renderOrder;
            return mesh;
        };

        const dodajAnimiranuGrupu = (spec) => {
            const grupa = new THREE.Group();
            grupa.position.set(spec.x, spec.y, spec.z);
            grupa.rotation.set(spec.rx || 0, spec.ry || 0, spec.rz || 0);
            grupa.scale.set(spec.sx, spec.sy, spec.sz);
            grupa.userData = {
                baseSx: spec.sx,
                baseSy: spec.sy,
                baseSz: spec.sz,
                baseOpacity: 1,
                baseX: spec.x,
                baseY: spec.y,
                baseZ: spec.z,
                baseRx: spec.rx || 0,
                baseRy: spec.ry || 0,
                baseRz: spec.rz || 0,
                speed: spec.speed || 0,
                phase: spec.phase || 0,
                wobble: spec.wobble || 0,
                driftX: typeof spec.driftX === 'number' ? spec.driftX : 0,
                driftY: typeof spec.driftY === 'number' ? spec.driftY : 0,
                rotate: 0,
                pulse: spec.pulse || 0,
                pulseSpeed: spec.pulseSpeed || 1,
                opacityPulse: 0,
                flowPath: null,
                flowSpeed: 0,
                flowPhase: 0,
                flowFade: false,
                flagWave: 0,
                flagIndex: 0,
                spinType: spec.spinType || null,
                spinSpeed: spec.spinSpeed || 0,
                spinPhase: spec.spinPhase || 0
            };
            clayGroup.add(grupa);
            clayObjects.push(grupa);
            return grupa;
        };

        const dodajZastavicu = (x, y, z, scale, boja, phase) => {
            dodajMekuFormu(THREE, {
                x,
                y: y - 0.11 * scale,
                z,
                sx: 0.025 * scale,
                sy: 0.26 * scale,
                sz: 0.025 * scale,
                color: 0xf3d3a1,
                opacity: 0.88,
                cylinder: true,
                phase,
                speed: 0.08,
                wobble: 0.004,
                driftX: 0.2,
                driftY: 0.12,
                rotate: 0,
                roughness: 0.94,
                renderOrder: 11
            });

            [
                { dx: 0.1, dy: 0.07, sx: 0.15, sy: 0.062, idx: 0 },
                { dx: 0.24, dy: 0.052, sx: 0.14, sy: 0.058, idx: 1 },
                { dx: 0.36, dy: 0.026, sx: 0.1, sy: 0.05, idx: 2 }
            ].forEach(deo => dodajMekuFormu(THREE, {
                x: x + deo.dx * scale,
                y: y + deo.dy * scale,
                z: z + 0.02,
                sx: deo.sx * scale,
                sy: deo.sy * scale,
                sz: 0.025 * scale,
                color: boja,
                opacity: 0.92,
                phase: phase + deo.idx * 0.38,
                speed: 0.08,
                wobble: 0.01,
                driftX: 0.16,
                driftY: 0.12,
                pulse: 0.018,
                pulseSpeed: 1.1,
                opacityPulse: 0.045,
                flagWave: 1,
                flagIndex: deo.idx,
                rotate: 0,
                roughness: 0.94,
                renderOrder: 12
            }));
        };

        [
            { x: -1.42, y: 2.08, z: -1.92, scale: 0.82, opacity: 0.94, phase: 0.2, color: 0xfff1e6 },
            { x: 1.22, y: 2.06, z: -1.86, scale: 0.84, opacity: 0.92, phase: 1.4, color: 0xfff1e8 },
            { x: -1.64, y: 1.28, z: -2.02, scale: 0.48, opacity: 0.72, phase: 2.4, color: 0xf2f6ff },
            { x: 1.6, y: 1.28, z: -2.02, scale: 0.52, opacity: 0.72, phase: 3.2, color: 0xfff4ec },
            { x: 0.18, y: 2.24, z: -2.08, scale: 0.36, opacity: 0.62, phase: 4.2, color: 0xfff4e8 }
        ].forEach(oblak => dodajOblak(
            THREE,
            oblak.x,
            oblak.y,
            oblak.z,
            oblak.color,
            oblak.opacity,
            oblak.scale,
            oblak.phase,
            {
                speed: 0.092,
                wobble: 0.12,
                driftX: 1.32,
                driftY: 0.18,
                opacityPulse: 0.03,
                pulse: 0.016,
                pulseSpeed: 0.42
            }
        ));

        [
            { x: -1.2, y: 0.58, scale: 0.9, color: 0xb993ff, phase: 0.2 },
            { x: 0.48, y: 0.88, scale: 0.84, color: 0xffb46f, phase: 0.9 },
            { x: 1.13, y: 0.5, scale: 0.86, color: 0xff7fa0, phase: 1.7 },
            { x: 0.42, y: -0.18, scale: 0.8, color: 0x7fcaa5, phase: 2.5 },
            { x: -0.48, y: -0.6, scale: 0.76, color: 0x7ed7ff, phase: 3.2 },
            { x: -1.0, y: -1.02, scale: 0.74, color: 0xff8a7a, phase: 4.0 }
        ].forEach(flag => dodajZastavicu(flag.x, flag.y, -1.14, flag.scale, flag.color, flag.phase));

        const putanjaAtlasa = [
            { x: -1.28, y: 0.54 },
            { x: -0.64, y: 0.1 },
            { x: -0.02, y: 0.42 },
            { x: 0.62, y: 0.2 },
            { x: 1.08, y: -0.28 },
            { x: 0.42, y: -0.72 },
            { x: -0.38, y: -0.56 },
            { x: -1.0, y: -0.96 }
        ];

        [
            { s: 0.05, phase: 0.04, color: 0xfff4c1 },
            { s: 0.045, phase: 0.2, color: 0xffffff },
            { s: 0.052, phase: 0.38, color: 0xe8fbff },
            { s: 0.042, phase: 0.56, color: 0xfff1ce },
            { s: 0.048, phase: 0.74, color: 0xffffff }
        ].forEach(spec => dodajMekuFormu(THREE, {
            x: putanjaAtlasa[0].x,
            y: putanjaAtlasa[0].y,
            z: -1.18,
            sx: spec.s,
            sy: spec.s,
            sz: spec.s,
            color: spec.color,
            opacity: 0.56,
            phase: spec.phase * 6.28,
            speed: 0.34,
            wobble: 0.045,
            driftX: 0.55,
            driftY: 0.24,
            pulse: 0.22,
            pulseSpeed: 1.35,
            opacityPulse: 0.12,
            emissive: 0xffe7a6,
            emissiveIntensity: 0.38,
            rotate: 0.00006,
            flowPath: putanjaAtlasa,
            flowSpeed: 0.055,
            flowPhase: spec.phase,
            flowFade: true,
            renderOrder: 9
        }));

        const kompas = dodajAnimiranuGrupu({
            x: -1.54,
            y: -2.52,
            z: -1.02,
            sx: 0.9,
            sy: 0.9,
            sz: 0.9,
            spinType: 'compass',
            spinSpeed: 0.9,
            spinPhase: 0.3,
            wobble: 0.006,
            speed: 0.08,
            driftX: 0.16,
            driftY: 0.12,
            pulse: 0.01,
            pulseSpeed: 0.6
        });
        kompas.add(napraviOverlayMesh({ torus: true, thickness: 0.1, sx: 0.52, sy: 0.52, sz: 0.08, color: 0xd7a25d, opacity: 0.9, roughness: 0.88 }));
        kompas.add(napraviOverlayMesh({ sx: 0.42, sy: 0.42, sz: 0.06, color: 0xffe9c8, opacity: 0.82, roughness: 0.96 }));
        [
            { rz: 0, color: 0xf06f79, y: 0.12 },
            { rz: Math.PI, color: 0x7fb6d9, y: -0.12 },
            { rz: -Math.PI / 2, color: 0xf3c27a, x: 0.12 },
            { rz: Math.PI / 2, color: 0x9ecf8b, x: -0.12 }
        ].forEach(krak => kompas.add(napraviOverlayMesh({
            cone: true,
            x: krak.x || 0,
            y: krak.y || 0,
            z: 0.08,
            sx: 0.08,
            sy: 0.2,
            sz: 0.035,
            rz: krak.rz,
            color: krak.color,
            opacity: 0.9,
            roughness: 0.9
        })));
        kompas.add(napraviOverlayMesh({ sx: 0.1, sy: 0.1, sz: 0.045, color: 0xe0a842, opacity: 0.92, roughness: 0.86, z: 0.12 }));

        const globus = dodajAnimiranuGrupu({
            x: 1.5,
            y: -2.5,
            z: -1.0,
            sx: 0.86,
            sy: 0.86,
            sz: 0.86,
            spinType: 'globe',
            spinSpeed: 0.23,
            spinPhase: 0.8,
            wobble: 0.006,
            speed: 0.08,
            driftX: 0.14,
            driftY: 0.1,
            pulse: 0.008,
            pulseSpeed: 0.5
        });
        globus.add(napraviOverlayMesh({ sx: 0.43, sy: 0.43, sz: 0.24, color: 0x77c9e6, opacity: 0.86, roughness: 0.92, emissive: 0x4bbce0, emissiveIntensity: 0.04 }));
        globus.add(napraviOverlayMesh({ torus: true, thickness: 0.045, sx: 0.47, sy: 0.47, sz: 0.05, color: 0xd9a45e, opacity: 0.88, roughness: 0.86, rz: 0.18 }));
        globus.add(napraviOverlayMesh({ torus: true, thickness: 0.026, sx: 0.43, sy: 0.43, sz: 0.04, color: 0xffdf9c, opacity: 0.54, roughness: 0.88, ry: Math.PI / 2 }));
        [
            { x: -0.13, y: 0.12, z: 0.2, sx: 0.14, sy: 0.07, rz: -0.35, color: 0x8fc77d },
            { x: 0.08, y: -0.02, z: 0.22, sx: 0.12, sy: 0.09, rz: 0.25, color: 0xf1c16f },
            { x: 0.16, y: 0.13, z: 0.16, sx: 0.1, sy: 0.06, rz: 0.1, color: 0xa5d58d },
            { x: -0.06, y: -0.17, z: 0.2, sx: 0.08, sy: 0.1, rz: -0.15, color: 0x9fc97b }
        ].forEach(kontinent => globus.add(napraviOverlayMesh({
            x: kontinent.x,
            y: kontinent.y,
            z: kontinent.z,
            sx: kontinent.sx,
            sy: kontinent.sy,
            sz: 0.026,
            rz: kontinent.rz,
            color: kontinent.color,
            opacity: 0.88,
            roughness: 0.96
        })));
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
            roughness: 0.94,
            renderOrder: 20
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
            roughness: 0.96,
            renderOrder: 21 + index
        }));
    }

    function dodajSneznuKapu(THREE, spec) {
        const phase = spec.phase || 0;
        const renderOrder = spec.renderOrder || 8;
        const boja = spec.color || 0xfff4ec;
        const senka = spec.shadow || 0xe8ddd8;

        dodajMekuFormu(THREE, {
            x: spec.x,
            y: spec.y + spec.sy * 0.05,
            z: spec.z + 0.06,
            sx: spec.sx * 0.72,
            sy: spec.sy * 0.62,
            sz: spec.sz * 0.7,
            color: boja,
            opacity: 0.86,
            cone: true,
            phase,
            speed: 0.1,
            wobble: 0.012,
            rotate: 0.00006,
            roughness: 0.98,
            renderOrder
        });

        [
            { dx: -0.36, dy: -0.28, sx: 0.42, sy: 0.2, sz: 0.14, c: boja, o: 0.9 },
            { dx: 0, dy: -0.32, sx: 0.62, sy: 0.22, sz: 0.15, c: boja, o: 0.92 },
            { dx: 0.36, dy: -0.28, sx: 0.42, sy: 0.2, sz: 0.14, c: boja, o: 0.88 },
            { dx: -0.13, dy: -0.48, sx: 0.24, sy: 0.18, sz: 0.12, c: boja, o: 0.82 },
            { dx: 0.2, dy: -0.5, sx: 0.26, sy: 0.16, sz: 0.11, c: senka, o: 0.52 }
        ].forEach((deo, index) => dodajMekuFormu(THREE, {
            x: spec.x + deo.dx * spec.sx,
            y: spec.y + deo.dy * spec.sy,
            z: spec.z + 0.12,
            sx: deo.sx * spec.sx,
            sy: deo.sy * spec.sy,
            sz: deo.sz * spec.sz,
            color: deo.c,
            opacity: deo.o,
            phase: phase + index * 0.34,
            speed: 0.11,
            wobble: 0.016,
            driftX: 0.5,
            driftY: 0.32,
            rotate: index % 2 ? -0.00006 : 0.00006,
            roughness: 0.98,
            renderOrder: renderOrder + 1
        }));
    }

    function dodajPlaninskiVrh(THREE, spec) {
        const phase = spec.phase || 0;
        const renderOrder = spec.renderOrder || 4;
        const shadow = spec.shadow || 0x6e8798;
        const highlight = spec.highlight || 0xb8c8d2;

        dodajMekuFormu(THREE, {
            x: spec.x,
            y: spec.y,
            z: spec.z,
            sx: spec.sx,
            sy: spec.sy,
            sz: spec.sz,
            color: spec.color,
            opacity: spec.opacity || 0.88,
            cone: true,
            phase,
            speed: 0.09,
            wobble: 0.015,
            rotate: spec.rotate || 0.00008,
            roughness: 0.96,
            renderOrder,
            flatShading: false
        });

        dodajMekuFormu(THREE, {
            x: spec.x,
            y: spec.y - spec.sy * 0.95,
            z: spec.z + 0.04,
            sx: spec.sx * 0.92,
            sy: spec.sy * 0.16,
            sz: spec.sz * 0.58,
            color: spec.base || spec.color,
            opacity: (spec.opacity || 0.88) * 0.72,
            phase: phase + 0.2,
            speed: 0.09,
            wobble: 0.014,
            rotate: spec.rotate || 0.00008,
            roughness: 0.96,
            renderOrder: renderOrder + 1
        });

        [
            { dx: -0.22, rz: 0.26, color: highlight, opacity: 0.22, width: 0.09 },
            { dx: 0.24, rz: -0.28, color: shadow, opacity: 0.2, width: 0.1 },
            { dx: -0.02, rz: 0.04, color: highlight, opacity: 0.12, width: 0.06 }
        ].forEach((traka, index) => dodajMekuFormu(THREE, {
            x: spec.x + traka.dx * spec.sx,
            y: spec.y - spec.sy * 0.23,
            z: spec.z + 0.16,
            sx: traka.width * spec.sx,
            sy: spec.sy * 0.62,
            sz: spec.sz * 0.045,
            color: traka.color,
            opacity: traka.opacity,
            rz: traka.rz,
            phase: phase + index * 0.31,
            speed: 0.1,
            wobble: 0.012,
            driftX: 0.35,
            driftY: 0.25,
            rotate: index % 2 ? -0.00004 : 0.00004,
            roughness: 0.98,
            renderOrder: renderOrder + 2
        }));

        dodajSneznuKapu(THREE, {
            x: spec.x + (spec.snowDx || 0),
            y: spec.y + spec.sy * 0.62,
            z: spec.z + 0.2,
            sx: spec.snowSx || spec.sx * 0.5,
            sy: spec.snowSy || spec.sy * 0.32,
            sz: spec.snowSz || spec.sz * 0.42,
            phase: phase + 0.5,
            renderOrder: renderOrder + 4
        });
    }

    function dodajZbun(THREE, x, y, z, scale = 1, phase = 0, color = 0x9aaa76) {
        [
            { dx: -0.24, dy: 0, s: 0.22 },
            { dx: 0, dy: 0.05, s: 0.26 },
            { dx: 0.24, dy: 0, s: 0.2 },
            { dx: -0.02, dy: -0.12, s: 0.18 }
        ].forEach((deo, index) => dodajMekuFormu(THREE, {
            x: x + deo.dx * scale,
            y: y + deo.dy * scale,
            z,
            sx: deo.s * scale,
            sy: deo.s * 0.9 * scale,
            sz: deo.s * 0.6 * scale,
            color,
            opacity: 0.58,
            phase: phase + index * 0.38,
            speed: 0.12,
            wobble: 0.018,
            driftX: 0.4,
            driftY: 0.25,
            rotate: 0.00008,
            roughness: 0.96,
            renderOrder: 12 + index
        }));
    }

    function dodajPlaninaScene(THREE) {
        const nebo = [
            { x: -2.4, y: 2.9, z: -3.4, sx: 1.6, sy: 0.54, sz: 0.12, color: 0xbdaee5, opacity: 0.16, phase: 0.4, speed: 0.08, wobble: 0.025, renderOrder: 0 },
            { x: 2.35, y: 2.55, z: -3.35, sx: 1.8, sy: 0.56, sz: 0.12, color: 0xffd8c6, opacity: 0.14, phase: 1.5, speed: 0.08, wobble: 0.025, renderOrder: 0 }
        ];

        const brda = [
            { x: 0, y: -2.62, z: -3.0, sx: 4.55, sy: 0.7, sz: 0.24, color: 0x82aa90, opacity: 0.62, phase: 1.1, speed: 0.09, wobble: 0.018, renderOrder: 1 },
            { x: -1.52, y: -1.7, z: -2.7, sx: 2.75, sy: 0.66, sz: 0.2, color: 0xd8c29f, opacity: 0.48, rz: 0.1, phase: 0.2, speed: 0.09, wobble: 0.016, renderOrder: 2 },
            { x: 1.32, y: -1.62, z: -2.66, sx: 2.72, sy: 0.68, sz: 0.2, color: 0xa3c6a2, opacity: 0.52, rz: -0.12, phase: 0.8, speed: 0.09, wobble: 0.016, renderOrder: 2 },
            { x: 2.28, y: -1.84, z: -2.42, sx: 1.44, sy: 0.42, sz: 0.15, color: 0xe0ccab, opacity: 0.42, rz: 0.06, phase: 1.6, speed: 0.09, wobble: 0.014, renderOrder: 3 },
            { x: -0.08, y: -2.12, z: -2.28, sx: 3.92, sy: 0.5, sz: 0.16, color: 0x78a98d, opacity: 0.42, phase: 1.8, speed: 0.1, wobble: 0.016, renderOrder: 4 }
        ];

        [...nebo, ...brda].forEach(spec => dodajMekuFormu(THREE, spec));

        dodajOblak(THREE, -2.7, 2.34, -2.06, 0xffebe6, 0.68, 1.06, 0.2);
        dodajOblak(THREE, 0.08, 2.86, -2.32, 0xc9ddec, 0.54, 0.58, 1.2);
        dodajOblak(THREE, 2.42, 2.32, -2.04, 0xc9e0ef, 0.68, 1.0, 2.1);
        dodajOblak(THREE, 1.36, 2.94, -2.48, 0xffe7dc, 0.48, 0.54, 2.8);

        dodajPlaninskiVrh(THREE, {
            x: -0.32,
            y: 0.36,
            z: -2.12,
            sx: 1.34,
            sy: 1.98,
            sz: 0.78,
            color: 0x86a8bc,
            base: 0x7897ad,
            shadow: 0x647f91,
            highlight: 0xb7cad3,
            opacity: 0.92,
            snowSx: 0.88,
            snowSy: 0.58,
            snowSz: 0.36,
            phase: 0.4,
            renderOrder: 5
        });

        dodajPlaninskiVrh(THREE, {
            x: -1.82,
            y: -0.36,
            z: -2.22,
            sx: 1.18,
            sy: 1.34,
            sz: 0.62,
            color: 0x7899ae,
            base: 0x6f8da3,
            shadow: 0x5d788d,
            highlight: 0xb2c6cf,
            opacity: 0.82,
            snowSx: 0.62,
            snowSy: 0.38,
            snowSz: 0.28,
            phase: 1.1,
            renderOrder: 4
        });

        dodajPlaninskiVrh(THREE, {
            x: 1.2,
            y: -0.32,
            z: -2.04,
            sx: 1.16,
            sy: 1.42,
            sz: 0.66,
            color: 0xc99376,
            base: 0xba8068,
            shadow: 0x9f6d5f,
            highlight: 0xe3b293,
            opacity: 0.88,
            snowSx: 0.68,
            snowSy: 0.4,
            snowSz: 0.28,
            phase: 1.8,
            renderOrder: 6
        });

        dodajPlaninskiVrh(THREE, {
            x: 2.22,
            y: -0.14,
            z: -2.26,
            sx: 0.92,
            sy: 1.15,
            sz: 0.54,
            color: 0xd1b091,
            base: 0xc4a080,
            shadow: 0xa9826b,
            highlight: 0xe8ccb0,
            opacity: 0.72,
            snowSx: 0.5,
            snowSy: 0.3,
            snowSz: 0.22,
            phase: 2.4,
            renderOrder: 5
        });

        const prednjiPlan = [
            { x: -1.12, y: -1.38, z: -1.66, sx: 1.42, sy: 0.28, sz: 0.12, color: 0xfff2e7, opacity: 0.62, rz: -0.04, phase: 3.1, speed: 0.08, wobble: 0.012, renderOrder: 10 },
            { x: 1.5, y: -1.28, z: -1.62, sx: 1.28, sy: 0.24, sz: 0.12, color: 0xfff2e7, opacity: 0.58, rz: 0.04, phase: 3.5, speed: 0.08, wobble: 0.012, renderOrder: 10 },
            { x: 0, y: -2.76, z: -1.42, sx: 4.08, sy: 0.42, sz: 0.14, color: 0x72a486, opacity: 0.72, phase: 2.2, speed: 0.09, wobble: 0.014, renderOrder: 11 },
            { x: -1.74, y: -2.43, z: -1.38, sx: 1.02, sy: 0.28, sz: 0.1, color: 0x8fb694, opacity: 0.52, phase: 0.6, speed: 0.1, wobble: 0.012, renderOrder: 12 },
            { x: 1.84, y: -2.42, z: -1.38, sx: 1.08, sy: 0.3, sz: 0.1, color: 0x88b090, opacity: 0.52, phase: 1.5, speed: 0.1, wobble: 0.012, renderOrder: 12 }
        ];

        const staza = [
            { x: 0.1, y: -2.58, z: -1.18, sx: 1.0, sy: 0.12, sz: 0.07, color: 0xd9c0af, opacity: 0.78, rz: 0.04, phase: 0.4, speed: 0.12, wobble: 0.01, renderOrder: 18 },
            { x: 0.2, y: -2.26, z: -1.2, sx: 0.7, sy: 0.105, sz: 0.06, color: 0xe0c8b6, opacity: 0.68, rz: -0.34, phase: 1.0, speed: 0.12, wobble: 0.01, renderOrder: 18 },
            { x: 0.04, y: -2.0, z: -1.22, sx: 0.54, sy: 0.09, sz: 0.055, color: 0xd7bfad, opacity: 0.6, rz: 0.36, phase: 1.7, speed: 0.12, wobble: 0.01, renderOrder: 18 },
            { x: 0.32, y: -1.76, z: -1.24, sx: 0.42, sy: 0.08, sz: 0.05, color: 0xe0c8b6, opacity: 0.54, rz: -0.34, phase: 2.3, speed: 0.12, wobble: 0.01, renderOrder: 18 }
        ];

        [...prednjiPlan, ...staza].forEach(spec => dodajMekuFormu(THREE, spec));

        [
            [-3.05, -2.18, -1.08, 0.88, 0.2],
            [-2.55, -2.1, -1.04, 0.82, 0.9],
            [-2.05, -2.22, -1.06, 0.72, 1.5],
            [2.08, -2.16, -1.04, 0.78, 2.2],
            [2.62, -2.08, -1.02, 0.92, 2.9],
            [3.12, -2.22, -1.06, 0.72, 3.5],
            [-0.94, -2.36, -1.0, 0.48, 4.1],
            [1.02, -2.34, -1.0, 0.5, 4.8]
        ].forEach(([x, y, z, scale, phase]) => dodajDrvo(THREE, x, y, z, scale, phase));

        [
            [-1.22, -2.42, -0.92, 0.72, 0.8, 0xa9b789],
            [-0.58, -2.32, -0.92, 0.46, 1.6, 0xa3aa78],
            [1.38, -2.36, -0.92, 0.6, 2.4, 0xa8b886],
            [1.88, -2.46, -0.92, 0.46, 3.0, 0x9ead7b]
        ].forEach(([x, y, z, scale, phase, color]) => dodajZbun(THREE, x, y, z, scale, phase, color));

        dodajMekuFormu(THREE, { x: -0.42, y: -2.62, z: -0.84, sx: 0.28, sy: 0.1, sz: 0.06, color: 0xa9a483, opacity: 0.55, rz: -0.08, phase: 3.2, speed: 0.1, wobble: 0.01, renderOrder: 21, rotate: 0.00008 });

        dodajMekuFormu(THREE, { x: 0, y: -2.9, z: -0.74, sx: 0.4, sy: 0.4, sz: 0.08, color: 0xc18d73, opacity: 0.72, phase: 1.6, speed: 0.12, wobble: 0.014, pulse: 0.018, pulseSpeed: 1.1, rotate: 0.00012, torus: true, thickness: 0.09, rx: 0, ry: 0, rz: 0, emissive: 0xffd2b3, emissiveIntensity: 0.08, renderOrder: 24 });
        dodajMekuFormu(THREE, { x: 0, y: -2.9, z: -0.71, sx: 0.29, sy: 0.29, sz: 0.05, color: 0xd7a286, opacity: 0.54, phase: 2.2, speed: 0.12, wobble: 0.01, rotate: -0.0001, renderOrder: 25 });
        dodajMekuFormu(THREE, { x: -0.08, y: -2.88, z: -0.66, sx: 0.08, sy: 0.1, sz: 0.025, color: 0xffe4c9, opacity: 0.68, cone: true, phase: 2.4, speed: 0.1, wobble: 0.006, renderOrder: 26, rotate: 0.00006 });
        dodajMekuFormu(THREE, { x: 0.04, y: -2.88, z: -0.66, sx: 0.1, sy: 0.13, sz: 0.025, color: 0xffe4c9, opacity: 0.7, cone: true, phase: 2.8, speed: 0.1, wobble: 0.006, renderOrder: 26, rotate: -0.00006 });
        dodajMekuFormu(THREE, { x: 0.16, y: -2.89, z: -0.66, sx: 0.07, sy: 0.09, sz: 0.025, color: 0xffe4c9, opacity: 0.62, cone: true, phase: 3.2, speed: 0.1, wobble: 0.006, renderOrder: 26, rotate: 0.00006 });
    }

    function podesiSvetloZaTemu(THREE, tema) {
        const rekaTema = tema === 'reka' || tema === 'reka-efekti';
        const drzavaTema = tema === 'drzava-efekti';
        const planinaTema = tema === 'planina' || tema === 'planina-oblaci';
        const ambijent = rekaTema
            ? new THREE.HemisphereLight(0xe6feff, 0x031625, 1.95)
            : drzavaTema
                ? new THREE.HemisphereLight(0xf2fbff, 0x7ea77a, 1.88)
            : planinaTema
                ? new THREE.HemisphereLight(0xfff4ec, 0x6f8ba1, 1.82)
                : new THREE.HemisphereLight(0xfff3e8, 0x160f24, 1.65);
        scene.add(ambijent);

        const glavnoSvetlo = new THREE.DirectionalLight(0xffffff, rekaTema ? 2.35 : drzavaTema ? 2.18 : planinaTema ? 2.15 : 2.45);
        glavnoSvetlo.position.set(-3.2, 4.4, 5.8);
        scene.add(glavnoSvetlo);

        const primarniSjaj = new THREE.PointLight(rekaTema ? 0x7de3ff : drzavaTema ? 0xffdea6 : planinaTema ? 0xffefe3 : 0xff8a7a, rekaTema ? 1.35 : drzavaTema ? 0.9 : planinaTema ? 0.85 : 1.45, 10);
        primarniSjaj.position.set(3.8, -1.8, 3.4);
        scene.add(primarniSjaj);

        const sekundarniSjaj = new THREE.PointLight(rekaTema ? 0x2db7ff : drzavaTema ? 0x7ed7ff : planinaTema ? 0xd8c7ff : 0xb993ff, rekaTema ? 1.05 : drzavaTema ? 0.85 : planinaTema ? 0.78 : 1.15, 9);
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
        camera.position.set(0, 0, tema === 'reka' ? 8.05 : tema === 'reka-efekti' ? 7.95 : tema === 'drzava-efekti' ? 7.9 : tema === 'planina' ? 8.15 : tema === 'planina-oblaci' ? 7.85 : 8.4);

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
        } else if (tema === 'reka-efekti') {
            dodajRekaEfektiScene(THREE);
        } else if (tema === 'drzava-efekti') {
            dodajDrzavaEfektiScene(THREE);
        } else if (tema === 'planina') {
            dodajPlaninaScene(THREE);
        } else if (tema === 'planina-oblaci') {
            dodajPlaninaOblaciScene(THREE);
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
        const rekaEfekti = sceneTheme === 'reka-efekti';
        const drzavaEfekti = sceneTheme === 'drzava-efekti';
        const reka = sceneTheme === 'reka' || rekaEfekti;
        const planina = sceneTheme === 'planina';
        const planinaOblaci = sceneTheme === 'planina-oblaci';
        clayGroup.rotation.z = planinaOblaci || rekaEfekti || drzavaEfekti ? 0 : Math.sin(t * (reka ? 0.13 : planina ? 0.08 : 0.18)) * (reka ? 0.022 : planina ? 0.012 : 0.035);
        clayGroup.rotation.x = planinaOblaci || rekaEfekti || drzavaEfekti ? 0 : Math.sin(t * (reka ? 0.1 : planina ? 0.07 : 0.13)) * (reka ? 0.012 : planina ? 0.008 : 0.018);

        clayObjects.forEach((mesh, index) => {
            const data = mesh.userData;

            if (data.cloudGroup) {
                const wrapSpan = (data.cloudWrapMax - data.cloudWrapMin) + data.cloudWidth * 2;
                let nextX = data.baseX + t * data.cloudSpeed + Math.sin(t * data.speed + data.phase) * data.wobble * data.driftX;
                while (nextX > data.cloudWrapMax + data.cloudWidth) {
                    nextX -= wrapSpan;
                }
                while (nextX < data.cloudWrapMin - data.cloudWidth) {
                    nextX += wrapSpan;
                }
                const floatY = Math.sin(t * data.speed * 0.72 + data.phase) * data.wobble * data.driftY;
                const pulse = data.pulse ? 1 + Math.sin(t * data.pulseSpeed + data.phase) * data.pulse : 1;
                mesh.position.x = nextX;
                mesh.position.y = data.baseY + floatY;
                mesh.position.z = data.baseZ;
                mesh.rotation.x = data.baseRx + Math.sin(t * 0.09 + data.phase) * 0.008;
                mesh.rotation.y = data.baseRy + Math.sin(t * 0.07 + data.phase) * 0.006;
                mesh.rotation.z = data.baseRz + Math.sin(t * 0.08 + data.phase) * data.cloudTilt;
                mesh.scale.set(pulse, pulse * (1 + Math.sin(t * 0.11 + data.phase) * 0.008), pulse);

                mesh.children.forEach((deo, deoIndex) => {
                    const partData = deo.userData;
                    const morph = Math.sin(t * 0.23 + partData.phase) * data.cloudMorph;
                    const morphB = Math.cos(t * 0.19 + partData.phase) * data.cloudMorph;
                    deo.position.x = partData.baseX + morph * partData.morphX;
                    deo.position.y = partData.baseY + morphB * partData.morphY;
                    deo.position.z = partData.baseZ;
                    deo.scale.set(
                        partData.baseSx * (1 + morph * partData.morphScale),
                        partData.baseSy * (1 + morphB * partData.morphScale),
                        partData.baseSz * (1 + Math.sin(t * 0.17 + partData.phase + deoIndex) * partData.morphScale * 0.5)
                    );
                    if (deo.material) {
                        const nextOpacity = partData.baseOpacity + Math.sin(t * data.pulseSpeed + partData.phase) * data.opacityPulse;
                        deo.material.opacity = Math.max(0.08, Math.min(1, nextOpacity));
                    }
                });
                return;
            }

            const pulse = data.pulse ? 1 + Math.sin(t * data.pulseSpeed + data.phase) * data.pulse : 1;
            let flowProgress = null;

            if (data.flowPath) {
                flowProgress = (t * data.flowSpeed + data.flowPhase) % 1;
                const tacka = tackaNaPutanji(data.flowPath, flowProgress);
                mesh.position.x = tacka.x + Math.cos(t * data.speed + data.phase) * data.wobble * data.driftX;
                mesh.position.y = tacka.y + Math.sin(t * data.speed + data.phase) * data.wobble * data.driftY;
                mesh.rotation.x = data.baseRx;
                mesh.rotation.y = data.baseRy;
                mesh.rotation.z = tacka.angle + data.baseRz + Math.sin(t * 0.7 + data.phase) * 0.025;
            } else {
                mesh.position.x = data.baseX + Math.cos(t * data.speed + data.phase) * data.wobble * data.driftX;
                mesh.position.y = data.baseY + Math.sin(t * data.speed + data.phase) * data.wobble * data.driftY;
            }

            let wave = 0;
            if (data.flagWave) {
                wave = Math.sin(t * 2.35 + data.phase + data.flagIndex * 0.58);
                mesh.position.x += Math.sin(t * 1.8 + data.phase) * 0.01 * (data.flagIndex + 1);
                mesh.position.y += wave * 0.022 * data.flagWave;
                mesh.rotation.z = data.baseRz + wave * 0.12 * data.flagWave;
                mesh.rotation.x = data.baseRx + Math.sin(t * 1.9 + data.phase) * 0.035 * data.flagWave;
            }

            mesh.scale.set(
                data.baseSx * pulse,
                data.baseSy * pulse * (data.flagWave ? 1 + wave * 0.035 : 1),
                data.baseSz * pulse
            );

            if (data.spinType === 'compass') {
                const spinTime = t * 0.16 + data.spinPhase;
                const cycle = spinTime % 1;
                const turns = Math.floor(spinTime);
                const spinWindow = smoothStep(0.08, 0.32, cycle) - smoothStep(0.58, 0.82, cycle);
                mesh.rotation.x = data.baseRx;
                mesh.rotation.y = data.baseRy;
                mesh.rotation.z = data.baseRz + (turns + spinWindow) * Math.PI * 2;
            } else if (data.spinType === 'globe') {
                mesh.rotation.x = data.baseRx + Math.sin(t * 0.16 + data.spinPhase) * 0.035;
                mesh.rotation.y = data.baseRy + t * data.spinSpeed + data.spinPhase;
                mesh.rotation.z = data.baseRz + Math.sin(t * 0.12 + data.spinPhase) * 0.025;
            }

            if (mesh.material && (data.opacityPulse || data.flowFade)) {
                let nextOpacity = data.baseOpacity + Math.sin(t * data.pulseSpeed + data.phase) * data.opacityPulse;
                if (data.flowFade && flowProgress !== null) {
                    nextOpacity *= Math.pow(Math.max(0, Math.sin(flowProgress * Math.PI)), 0.72);
                }
                mesh.material.opacity = Math.max(0.02, Math.min(1, nextOpacity));
            }
            if (!data.flowPath && !data.flagWave && !data.spinType) {
                mesh.rotation.x += data.rotate * (index % 2 === 0 ? 1 : -1);
                mesh.rotation.y += data.rotate * 0.72;
                mesh.rotation.z += data.rotate * (reka ? 0.95 : planina || planinaOblaci || drzavaEfekti ? 0.36 : 0.45);
            }
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
