(function(window, document) {
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const THREE_LOCAL_MODULE = './vendor/three.module.js';
    const SCRIPT_ID = 'zemljopis-three-runtime';
    const THREE_ICON_CONFIGS = [
        {
            selector: '.daily-challenge-btn',
            datasetKey: 'threeDailyReady',
            iconSelector: '.daily-challenge-icon',
            mountClass: 'daily-challenge-three',
            canvasClass: 'daily-challenge-three-canvas',
            readyClass: 'three-daily-ready',
            textureSrc: 'assets/daily-challenge-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/dnevni-izazov-v2.svg',
            planeSize: 2.4,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.treasury-btn',
            datasetKey: 'threeTreasuryReady',
            iconSelector: '.treasury-icon',
            mountClass: 'daily-challenge-three treasury-three',
            canvasClass: 'daily-challenge-three-canvas treasury-three-canvas',
            readyClass: 'three-treasury-ready',
            textureSrc: 'assets/riznica-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/menu-riznica.svg',
            planeSize: 2.4,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.leaderboard-btn',
            datasetKey: 'threeLeaderboardReady',
            iconSelector: '.leaderboard-icon',
            mountClass: 'daily-challenge-three leaderboard-three',
            canvasClass: 'daily-challenge-three-canvas leaderboard-three-canvas',
            readyClass: 'three-leaderboard-ready',
            textureSrc: 'assets/top-lista-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/menu-top-lista.svg',
            planeSize: 2.4,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.friend-room-btn',
            datasetKey: 'threeFriendRoomReady',
            iconSelector: '.friend-room-icon',
            mountClass: 'daily-challenge-three friend-room-three',
            canvasClass: 'daily-challenge-three-canvas friend-room-three-canvas',
            readyClass: 'three-friend-room-ready',
            textureSrc: 'assets/soba-prijatelja-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/menu-soba-prijatelja.svg',
            planeSize: 2.4,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.settings-btn',
            datasetKey: 'threeSettingsReady',
            iconSelector: '.settings-icon',
            mountClass: 'daily-challenge-three settings-three',
            canvasClass: 'daily-challenge-three-canvas settings-three-canvas',
            readyClass: 'three-settings-ready',
            textureSrc: 'assets/podesavanja-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/menu-podesavanja.svg',
            planeSize: 2.4,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.solo-btn',
            datasetKey: 'threeSoloReady',
            iconSelector: '.solo-mode-icon',
            mountClass: 'daily-challenge-three solo-three',
            canvasClass: 'daily-challenge-three-canvas solo-three-canvas',
            readyClass: 'three-solo-ready',
            textureSrc: 'assets/mode-solo-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/mode-solo.svg',
            planeSize: 2.44,
            showFrame: false,
            showSparkle: false
        },
        {
            selector: '.tournament-btn',
            datasetKey: 'threeTournamentReady',
            iconSelector: '.tournament-mode-icon',
            mountClass: 'daily-challenge-three tournament-three',
            canvasClass: 'daily-challenge-three-canvas tournament-three-canvas',
            readyClass: 'three-tournament-ready',
            textureSrc: 'assets/mode-turnir-clay-3d.png',
            fallbackPngSrc: null,
            fallbackSvgSrc: 'assets/mode-turnir.svg',
            planeSize: 2.44,
            showFrame: false,
            showSparkle: false
        }
    ];
    let threePromise = null;

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
                    window.THREE = THREE;
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
        if (window.THREE) {
            return Promise.resolve(window.THREE);
        }

        if (!threePromise) {
            threePromise = ucitajLokalniThree().catch(() => ucitajThreeSaCdn());
        }

        return threePromise;
    }

    function podesiRendererVelicinu(renderer, mount, camera) {
        const rect = mount.getBoundingClientRect();
        const velicina = Math.max(48, Math.ceil(Math.min(rect.width || 60, rect.height || 60)));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(velicina, velicina, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    }

    function podesiTeksturu(texture, THREE) {
        if ('colorSpace' in texture && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        return texture;
    }

    function teksturaIzPng(THREE, src) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                src,
                texture => resolve(podesiTeksturu(texture, THREE)),
                undefined,
                reject
            );
        });
    }

    async function teksturaIzSvgFallback(THREE, src) {
        const odgovor = await fetch(src, { cache: 'force-cache' });
        if (!odgovor.ok) {
            throw new Error('SVG_TEXTURE_FETCH_FAILED');
        }

        let svgTekst = await odgovor.text();
        if (!/\swidth=/.test(svgTekst)) {
            svgTekst = svgTekst.replace('<svg ', '<svg width="96" height="96" ');
        }

        const blob = new Blob([svgTekst], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        try {
            const slika = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            });

            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('CANVAS_2D_NOT_AVAILABLE');
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(slika, 0, 0, canvas.width, canvas.height);

            const texture = new THREE.CanvasTexture(canvas);
            return podesiTeksturu(texture, THREE);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function teksturaIkone(THREE, config) {
        try {
            return await teksturaIzPng(THREE, config.textureSrc);
        } catch (error) {
            if (config.fallbackPngSrc) {
                try {
                    return await teksturaIzPng(THREE, config.fallbackPngSrc);
                } catch (fallbackError) {
                    return teksturaIzSvgFallback(THREE, config.fallbackSvgSrc);
                }
            }
            return teksturaIzSvgFallback(THREE, config.fallbackSvgSrc);
        }
    }

    async function napraviThreeIcon(button, THREE, config) {
        if (!button || button.dataset[config.datasetKey] === '1') return;

        const fallbackIkona = button.querySelector(config.iconSelector);
        const mount = document.createElement('span');
        mount.className = config.mountClass;
        mount.setAttribute('aria-hidden', 'true');
        button.appendChild(mount);

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
        } catch (error) {
            mount.remove();
            return;
        }

        renderer.domElement.className = config.canvasClass;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
        camera.position.set(0, 0, 4.6);

        scene.add(new THREE.AmbientLight(0xd9ffe8, 1.65));

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
        keyLight.position.set(-2.4, 3.4, 4.2);
        scene.add(keyLight);

        const cyanLight = new THREE.PointLight(0x38bdf8, 2.1, 8);
        cyanLight.position.set(2.6, -1.6, 2.6);
        scene.add(cyanLight);

        const goldLight = new THREE.PointLight(0xf5af19, 1.85, 8);
        goldLight.position.set(-2.8, 1.4, 2.2);
        scene.add(goldLight);

        const group = new THREE.Group();
        scene.add(group);

        let rim = null;
        let innerRim = null;

        if (config.showFrame !== false) {
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(1, 1, 0.24, 96, 1, false),
                new THREE.MeshStandardMaterial({
                    color: 0x08252a,
                    metalness: 0.45,
                    roughness: 0.34,
                    emissive: 0x062018,
                    emissiveIntensity: 0.28
                })
            );
            base.rotation.x = Math.PI / 2;
            group.add(base);

            const backGlow = new THREE.Mesh(
                new THREE.CircleGeometry(1.08, 96),
                new THREE.MeshBasicMaterial({
                    color: 0x38ef7d,
                    transparent: true,
                    opacity: 0.14,
                    depthWrite: false
                })
            );
            backGlow.position.z = -0.02;
            backGlow.scale.set(1.08, 1.08, 1);
            group.add(backGlow);

            rim = new THREE.Mesh(
                new THREE.TorusGeometry(1.03, 0.055, 18, 112),
                new THREE.MeshStandardMaterial({
                    color: 0xf5af19,
                    metalness: 0.75,
                    roughness: 0.22,
                    emissive: 0x5a3200,
                    emissiveIntensity: 0.42
                })
            );
            rim.position.z = 0.15;
            group.add(rim);

            innerRim = new THREE.Mesh(
                new THREE.TorusGeometry(0.84, 0.026, 14, 96),
                new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    metalness: 0.48,
                    roughness: 0.28,
                    emissive: 0x07374a,
                    emissiveIntensity: 0.45
                })
            );
            innerRim.position.z = 0.17;
            group.add(innerRim);
        }

        let texture;
        try {
            texture = await teksturaIkone(THREE, config);
        } catch (error) {
            renderer.dispose();
            mount.remove();
            if (fallbackIkona) fallbackIkona.style.opacity = '';
            return;
        }

        const face = new THREE.Mesh(
            new THREE.PlaneGeometry(config.planeSize, config.planeSize),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthWrite: false
            })
        );
        face.position.z = 0.24;
        group.add(face);

        let sparkle = null;

        if (config.showSparkle !== false) {
            const sparkleShape = new THREE.Shape();
            sparkleShape.moveTo(0, 0.16);
            sparkleShape.lineTo(0.045, 0.045);
            sparkleShape.lineTo(0.16, 0);
            sparkleShape.lineTo(0.045, -0.045);
            sparkleShape.lineTo(0, -0.16);
            sparkleShape.lineTo(-0.045, -0.045);
            sparkleShape.lineTo(-0.16, 0);
            sparkleShape.lineTo(-0.045, 0.045);
            sparkleShape.closePath();

            sparkle = new THREE.Mesh(
                new THREE.ShapeGeometry(sparkleShape),
                new THREE.MeshBasicMaterial({
                    color: 0xfff7bf,
                    transparent: true,
                    opacity: 0.95,
                    depthWrite: false
                })
            );
            sparkle.position.set(0.62, 0.55, 0.25);
            sparkle.scale.set(0.78, 0.78, 0.78);
            group.add(sparkle);
        }

        let pressed = false;
        let hovered = false;
        let renderFrameId = null;

        function renderuj() {
            const pressScale = pressed ? 0.94 : 1;
            const imaFrame = config.showFrame !== false;

            group.rotation.x = imaFrame ? -0.14 : 0;
            group.rotation.y = imaFrame ? 0.18 : 0;
            group.rotation.z = pressed ? -0.025 : 0;
            group.position.y = 0;
            group.scale.setScalar(pressScale);
            if (rim) rim.rotation.z = 0;
            if (innerRim) innerRim.rotation.z = 0;
            if (sparkle) {
                sparkle.rotation.z = hovered ? 0.28 : 0.1;
                sparkle.material.opacity = hovered ? 0.92 : 0.78;
            }

            renderer.render(scene, camera);
        }

        function zakaziRender() {
            if (renderFrameId !== null) return;
            renderFrameId = window.requestAnimationFrame(() => {
                renderFrameId = null;
                renderuj();
            });
        }

        podesiRendererVelicinu(renderer, mount, camera);

        const resizeObserver = 'ResizeObserver' in window
            ? new ResizeObserver(() => {
                podesiRendererVelicinu(renderer, mount, camera);
                renderuj();
            })
            : null;
        if (resizeObserver) resizeObserver.observe(button);
        else window.addEventListener('resize', () => {
            podesiRendererVelicinu(renderer, mount, camera);
            renderuj();
        });

        button.addEventListener('pointerenter', () => { hovered = true; zakaziRender(); });
        button.addEventListener('pointerleave', () => { hovered = false; pressed = false; zakaziRender(); });
        button.addEventListener('pointerdown', () => { pressed = true; zakaziRender(); });
        button.addEventListener('pointerup', () => { pressed = false; zakaziRender(); });
        button.addEventListener('pointercancel', () => { pressed = false; zakaziRender(); });

        button.dataset[config.datasetKey] = '1';
        button.classList.add(config.readyClass);
        renderuj();
    }

    function init() {
        ucitajThree()
            .then(THREE => Promise.all(THREE_ICON_CONFIGS.map(config => {
                    const button = document.querySelector(config.selector);
                    return button ? napraviThreeIcon(button, THREE, config) : Promise.resolve();
                })))
            .catch(() => {
                THREE_ICON_CONFIGS.forEach(config => {
                    const button = document.querySelector(config.selector);
                    if (button) button.classList.remove(config.readyClass);
                });
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);
