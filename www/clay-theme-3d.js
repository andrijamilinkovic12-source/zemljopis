(function(window, document) {
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const THREE_LOCAL_MODULE = './vendor/three.module.js';
    const SCRIPT_ID = 'zemljopis-three-runtime';
    const MOUNT_CLASS = 'clay-theme-three';
    const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let threePromise = null;
    let THREERef = null;
    let mount = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let clayGroup = null;
    let clayObjects = [];
    let animationFrame = null;
    let resizeObserver = null;
    let scenePromise = null;

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

    function glinaJeAktivna() {
        return document.body.getAttribute('data-tema') === 'glina';
    }

    function trebaDaRadi() {
        return glinaJeAktivna() && meniJeVidljiv() && !document.hidden;
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
            opacity: opacity,
            depthWrite: false
        });
    }

    function dodajMekuFormu(THREE, spec) {
        const geometry = spec.torus
            ? new THREE.TorusGeometry(1, 0.08, 24, 96)
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
            rotate: spec.rotate || 0.001
        };

        clayGroup.add(mesh);
        clayObjects.push(mesh);
        return mesh;
    }

    function napraviScenu(THREE) {
        THREERef = THREE;
        mount = osigurajMount();
        if (!mount) return false;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0, 8.4);

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'low-power'
        });

        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        const ambijent = new THREE.HemisphereLight(0xfff3e8, 0x160f24, 1.65);
        scene.add(ambijent);

        const glavnoSvetlo = new THREE.DirectionalLight(0xffffff, 2.45);
        glavnoSvetlo.position.set(-3.2, 4.4, 5.8);
        scene.add(glavnoSvetlo);

        const topliSjaj = new THREE.PointLight(0xff8a7a, 1.45, 10);
        topliSjaj.position.set(3.8, -1.8, 3.4);
        scene.add(topliSjaj);

        const ljubicanstiSjaj = new THREE.PointLight(0xb993ff, 1.15, 9);
        ljubicanstiSjaj.position.set(-3.6, 1.4, 2.8);
        scene.add(ljubicanstiSjaj);

        clayGroup = new THREE.Group();
        scene.add(clayGroup);

        dodajMekuFormu(THREE, { x: -3.35, y: 1.9, z: -1.8, sx: 1.82, sy: 1.08, sz: 0.48, color: 0xff8a7a, opacity: 0.5, phase: 0.4, speed: 0.32, wobble: 0.1, rotate: 0.0011 });
        dodajMekuFormu(THREE, { x: 3.15, y: 1.35, z: -2.2, sx: 1.45, sy: 1.0, sz: 0.42, color: 0xb993ff, opacity: 0.5, phase: 1.2, speed: 0.28, wobble: 0.09, rotate: -0.001 });
        dodajMekuFormu(THREE, { x: 2.85, y: -2.05, z: -2.1, sx: 1.66, sy: 0.92, sz: 0.38, color: 0xffd166, opacity: 0.42, phase: 2.1, speed: 0.3, wobble: 0.08, rotate: 0.0014 });
        dodajMekuFormu(THREE, { x: -2.65, y: -2.35, z: -2.4, sx: 1.22, sy: 0.86, sz: 0.36, color: 0x8bdcc6, opacity: 0.36, phase: 3.0, speed: 0.34, wobble: 0.07, rotate: -0.0009 });
        dodajMekuFormu(THREE, { x: 0.15, y: 2.85, z: -2.8, sx: 0.92, sy: 0.54, sz: 0.22, color: 0xff5d8f, opacity: 0.3, phase: 2.8, speed: 0.22, wobble: 0.06, rotate: 0.0012 });
        dodajMekuFormu(THREE, { x: 0.05, y: -0.2, z: -3.15, sx: 2.95, sy: 1.72, sz: 0.18, color: 0xb993ff, opacity: 0.18, phase: 1.7, speed: 0.18, wobble: 0.035, rotate: 0.00045 });
        dodajMekuFormu(THREE, { x: -0.2, y: 0.06, z: -3.0, sx: 2.65, sy: 1.62, sz: 0.42, color: 0xffd166, opacity: 0.2, phase: 0.1, speed: 0.2, wobble: 0.04, rotate: -0.0005, torus: true, rx: 0.34, ry: 0.08, rz: -0.18 });

        podesiVelicinu();

        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                podesiVelicinu();
                renderujJednom();
            });
            resizeObserver.observe(mount);
        } else {
            window.addEventListener('resize', podesiVelicinu);
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
        clayGroup.rotation.z = Math.sin(t * 0.18) * 0.035;
        clayGroup.rotation.x = Math.sin(t * 0.13) * 0.018;

        clayObjects.forEach((mesh, index) => {
            const data = mesh.userData;
            mesh.position.x = data.baseX + Math.cos(t * data.speed + data.phase) * data.wobble * 0.55;
            mesh.position.y = data.baseY + Math.sin(t * data.speed + data.phase) * data.wobble;
            mesh.rotation.x += data.rotate * (index % 2 === 0 ? 1 : -1);
            mesh.rotation.y += data.rotate * 0.72;
            mesh.rotation.z += data.rotate * 0.45;
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

    async function azuriraj() {
        if (!glinaJeAktivna()) {
            zaustavi();
            return;
        }

        try {
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
            console.warn('Clay Three tema nije pokrenuta:', error);
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
