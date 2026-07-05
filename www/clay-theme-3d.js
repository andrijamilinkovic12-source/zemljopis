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

    function napraviMatMaterijal(THREE, boja, opacity) {
        return new THREE.MeshStandardMaterial({
            color: boja,
            roughness: 0.94,
            metalness: 0,
            transparent: true,
            opacity,
            depthWrite: false
        });
    }

    function dodajMekuFormu(THREE, spec) {
        const geometry = spec.torus
            ? new THREE.TorusGeometry(1, spec.thickness || 0.08, 24, 96)
            : new THREE.SphereGeometry(1, 42, 32);
        const mesh = new THREE.Mesh(geometry, napraviMatMaterijal(THREE, spec.color, spec.opacity || 0.54));

        mesh.position.set(spec.x, spec.y, spec.z);
        mesh.rotation.set(spec.rx || 0, spec.ry || 0, spec.rz || 0);
        mesh.scale.set(spec.sx, spec.sy, spec.sz);
        mesh.userData = {
            baseX: spec.x,
            baseY: spec.y,
            baseZ: spec.z,
            speed: spec.speed || 0.35,
            phase: spec.phase || 0,
            wobble: spec.wobble || 0.08,
            driftX: typeof spec.driftX === 'number' ? spec.driftX : 0.55,
            driftY: typeof spec.driftY === 'number' ? spec.driftY : 1,
            rotate: spec.rotate || 0.001
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
        dodajMekuFormu(THREE, { x: -1.95, y: 2.05, z: -2.35, sx: 2.85, sy: 0.46, sz: 0.22, color: 0x1d9cff, opacity: 0.34, rz: -0.42, phase: 0.2, speed: 0.34, wobble: 0.12, driftX: 0.8, driftY: 0.55, rotate: 0.0006 });
        dodajMekuFormu(THREE, { x: 1.15, y: 0.86, z: -2.25, sx: 3.25, sy: 0.54, sz: 0.24, color: 0x7de3ff, opacity: 0.38, rz: 0.32, phase: 1.1, speed: 0.31, wobble: 0.12, driftX: 0.75, driftY: 0.55, rotate: -0.00055 });
        dodajMekuFormu(THREE, { x: -0.7, y: -0.82, z: -2.2, sx: 3.1, sy: 0.5, sz: 0.24, color: 0x2db7ff, opacity: 0.36, rz: -0.3, phase: 2.2, speed: 0.3, wobble: 0.12, driftX: 0.8, driftY: 0.6, rotate: 0.00065 });
        dodajMekuFormu(THREE, { x: 1.55, y: -2.28, z: -2.25, sx: 2.8, sy: 0.42, sz: 0.2, color: 0x8cecff, opacity: 0.3, rz: 0.24, phase: 3.0, speed: 0.28, wobble: 0.1, driftX: 0.75, driftY: 0.5, rotate: -0.00045 });

        dodajMekuFormu(THREE, { x: -2.95, y: 0.64, z: -2.7, sx: 1.2, sy: 0.58, sz: 0.22, color: 0x4bcfa6, opacity: 0.24, rz: -0.22, phase: 1.4, speed: 0.24, wobble: 0.06, rotate: 0.00045 });
        dodajMekuFormu(THREE, { x: 3.05, y: -0.48, z: -2.75, sx: 1.4, sy: 0.64, sz: 0.22, color: 0x6fd7bd, opacity: 0.22, rz: 0.28, phase: 2.4, speed: 0.23, wobble: 0.06, rotate: -0.00035 });
        dodajMekuFormu(THREE, { x: -3.22, y: -2.55, z: -2.72, sx: 1.0, sy: 0.42, sz: 0.18, color: 0xffd36a, opacity: 0.2, rz: 0.18, phase: 0.7, speed: 0.2, wobble: 0.05, rotate: 0.00035 });

        dodajMekuFormu(THREE, { x: -0.95, y: 1.32, z: -1.85, sx: 0.92, sy: 0.09, sz: 0.07, color: 0xd7fbff, opacity: 0.34, rz: -0.4, phase: 0.6, speed: 0.46, wobble: 0.11, driftX: 1.1, driftY: 0.42, rotate: 0.0008 });
        dodajMekuFormu(THREE, { x: 0.75, y: -0.04, z: -1.8, sx: 1.15, sy: 0.11, sz: 0.07, color: 0xe8fdff, opacity: 0.32, rz: 0.32, phase: 1.7, speed: 0.44, wobble: 0.11, driftX: 1.05, driftY: 0.42, rotate: -0.00075 });
        dodajMekuFormu(THREE, { x: -0.38, y: -1.52, z: -1.82, sx: 0.86, sy: 0.09, sz: 0.06, color: 0xc8f7ff, opacity: 0.3, rz: -0.28, phase: 2.7, speed: 0.42, wobble: 0.1, driftX: 1, driftY: 0.4, rotate: 0.0007 });

        dodajMekuFormu(THREE, { x: 2.62, y: 2.58, z: -3.05, sx: 1.4, sy: 0.72, sz: 0.12, color: 0x7de3ff, opacity: 0.12, phase: 2.1, speed: 0.18, wobble: 0.04, rotate: 0.0003, torus: true, thickness: 0.045, rx: 0.2, ry: 0.12, rz: -0.22 });
        dodajMekuFormu(THREE, { x: -2.48, y: -0.82, z: -3.02, sx: 1.2, sy: 0.6, sz: 0.1, color: 0x2db7ff, opacity: 0.12, phase: 1.1, speed: 0.18, wobble: 0.04, rotate: -0.00035, torus: true, thickness: 0.045, rx: 0.24, ry: -0.08, rz: 0.2 });
    }

    function podesiSvetloZaTemu(THREE, tema) {
        const ambijent = tema === 'reka'
            ? new THREE.HemisphereLight(0xd8fbff, 0x031625, 1.78)
            : new THREE.HemisphereLight(0xfff3e8, 0x160f24, 1.65);
        scene.add(ambijent);

        const glavnoSvetlo = new THREE.DirectionalLight(0xffffff, tema === 'reka' ? 2.3 : 2.45);
        glavnoSvetlo.position.set(-3.2, 4.4, 5.8);
        scene.add(glavnoSvetlo);

        const primarniSjaj = new THREE.PointLight(tema === 'reka' ? 0x7de3ff : 0xff8a7a, tema === 'reka' ? 1.55 : 1.45, 10);
        primarniSjaj.position.set(3.8, -1.8, 3.4);
        scene.add(primarniSjaj);

        const sekundarniSjaj = new THREE.PointLight(tema === 'reka' ? 0x2db7ff : 0xb993ff, tema === 'reka' ? 1.3 : 1.15, 9);
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
        camera.position.set(0, 0, tema === 'reka' ? 8.8 : 8.4);

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
        clayGroup.rotation.z = Math.sin(t * (reka ? 0.13 : 0.18)) * (reka ? 0.022 : 0.035);
        clayGroup.rotation.x = Math.sin(t * (reka ? 0.1 : 0.13)) * (reka ? 0.012 : 0.018);

        clayObjects.forEach((mesh, index) => {
            const data = mesh.userData;
            mesh.position.x = data.baseX + Math.cos(t * data.speed + data.phase) * data.wobble * data.driftX;
            mesh.position.y = data.baseY + Math.sin(t * data.speed + data.phase) * data.wobble * data.driftY;
            mesh.rotation.x += data.rotate * (index % 2 === 0 ? 1 : -1);
            mesh.rotation.y += data.rotate * 0.72;
            mesh.rotation.z += data.rotate * (reka ? 0.72 : 0.45);
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
