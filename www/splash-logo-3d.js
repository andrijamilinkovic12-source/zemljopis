import * as THREE from './vendor/three.module.js';

(function () {
    const LOGO_SRC = 'assets/zemljopis-game-icon.png';

    function webglDostupan() {
        try {
            const canvas = document.createElement('canvas');
            return Boolean(
                window.WebGLRenderingContext
                && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (error) {
            return false;
        }
    }

    function initSplashLogo() {
        const mark = document.querySelector('.splash-brand-mark-3d');
        const canvas = document.getElementById('splash-logo-canvas');
        if (!mark || !canvas) return;

        if (!webglDostupan()) {
            mark.classList.add('is-fallback');
            return;
        }

        const reducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
        } catch (error) {
            mark.classList.add('is-fallback');
            return;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        if (THREE.ColorManagement) THREE.ColorManagement.enabled = true;
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
        camera.position.set(0, 0, 4.4);

        const group = new THREE.Group();
        group.rotation.set(-0.08, -0.24, 0.02);
        scene.add(group);

        scene.add(new THREE.AmbientLight(0xffffff, 1.35));

        const keyLight = new THREE.DirectionalLight(0xfff0c4, 2.2);
        keyLight.position.set(2.8, 3.4, 4.8);
        scene.add(keyLight);

        const rimLight = new THREE.PointLight(0x38ef7d, 2.1, 7);
        rimLight.position.set(-2.6, -1.8, 3.2);
        scene.add(rimLight);

        const softLight = new THREE.PointLight(0x7fd7ff, 1.15, 7);
        softLight.position.set(2.4, -2.2, 2.5);
        scene.add(softLight);

        const bronze = new THREE.MeshStandardMaterial({
            color: 0x96744c,
            metalness: 0.58,
            roughness: 0.32
        });
        const darkBronze = new THREE.MeshStandardMaterial({
            color: 0x4d3b28,
            metalness: 0.48,
            roughness: 0.42
        });
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x38ef7d,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide
        });

        const loader = new THREE.TextureLoader();
        loader.load(
            LOGO_SRC,
            texture => {
                if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

                const faceMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    metalness: 0.06,
                    roughness: 0.54
                });

                const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.18, 96, 1, false);
                coinGeometry.rotateX(Math.PI / 2);

                const coin = new THREE.Mesh(coinGeometry, [bronze, faceMaterial, faceMaterial]);
                coin.scale.set(1, 1, 1);
                group.add(coin);

                const outerRim = new THREE.Mesh(
                    new THREE.TorusGeometry(1.02, 0.055, 12, 128),
                    bronze
                );
                outerRim.position.z = 0.105;
                group.add(outerRim);

                const innerRim = new THREE.Mesh(
                    new THREE.TorusGeometry(0.76, 0.016, 8, 96),
                    darkBronze
                );
                innerRim.position.z = 0.116;
                group.add(innerRim);

                const halo = new THREE.Mesh(
                    new THREE.RingGeometry(1.08, 1.22, 128),
                    glowMaterial
                );
                halo.position.z = -0.1;
                group.add(halo);

                resize();
                renderer.render(scene, camera);
                mark.classList.add('is-ready');

                if (reducedMotion) return;
                requestAnimationFrame(animate);
            },
            undefined,
            () => mark.classList.add('is-fallback')
        );

        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let lastTime = 0;

        function resize() {
            const rect = canvas.getBoundingClientRect();
            const width = Math.max(1, Math.round(rect.width));
            const height = Math.max(1, Math.round(rect.height || rect.width));
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        function animate(time) {
            const splash = document.getElementById('splash-screen');
            if (!document.body.contains(mark)) return;
            if (splash && !splash.classList.contains('active') && mark.offsetParent === null) return;

            const seconds = time * 0.001;
            const delta = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016;
            lastTime = time;

            currentX = THREE.MathUtils.lerp(currentX, targetX, 5 * delta);
            currentY = THREE.MathUtils.lerp(currentY, targetY, 5 * delta);

            group.rotation.x = -0.08 + currentY + Math.sin(seconds * 1.2) * 0.025;
            group.rotation.y = -0.22 + currentX + Math.sin(seconds * 0.72) * 0.13;
            group.rotation.z = 0.02 + Math.sin(seconds * 0.95) * 0.025;
            group.position.y = Math.sin(seconds * 1.35) * 0.035;

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }

        mark.addEventListener('pointermove', event => {
            const rect = mark.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
            targetX = THREE.MathUtils.clamp(x * 0.18, -0.22, 0.22);
            targetY = THREE.MathUtils.clamp(-y * 0.12, -0.14, 0.14);
        });

        mark.addEventListener('pointerleave', () => {
            targetX = 0;
            targetY = 0;
        });

        window.addEventListener('resize', resize, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplashLogo, { once: true });
    } else {
        initSplashLogo();
    }
})();
