(function(window, document) {
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    const SVG_SRC = 'assets/dnevni-izazov-v2.svg';
    const SCRIPT_ID = 'zemljopis-three-runtime';

    function ucitajThree() {
        if (window.THREE) {
            return Promise.resolve(window.THREE);
        }

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

    function podesiRendererVelicinu(renderer, mount, camera) {
        const rect = mount.getBoundingClientRect();
        const velicina = Math.max(48, Math.ceil(Math.min(rect.width || 60, rect.height || 60)));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(velicina, velicina, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    }

    function teksturaIzSvg(THREE) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                SVG_SRC,
                texture => {
                    if ('colorSpace' in texture && THREE.SRGBColorSpace) {
                        texture.colorSpace = THREE.SRGBColorSpace;
                    }
                    texture.anisotropy = 4;
                    texture.needsUpdate = true;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }

    async function napraviDaily3D(button, THREE) {
        if (!button || button.dataset.threeDailyReady === '1') return;

        const fallbackIkona = button.querySelector('.daily-challenge-icon');
        const mount = document.createElement('span');
        mount.className = 'daily-challenge-three';
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

        renderer.domElement.className = 'daily-challenge-three-canvas';
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

        const rim = new THREE.Mesh(
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

        const innerRim = new THREE.Mesh(
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

        let texture;
        try {
            texture = await teksturaIzSvg(THREE);
        } catch (error) {
            renderer.dispose();
            mount.remove();
            if (fallbackIkona) fallbackIkona.style.opacity = '';
            return;
        }

        const face = new THREE.Mesh(
            new THREE.CircleGeometry(0.82, 112),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            })
        );
        face.position.z = 0.19;
        group.add(face);

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

        const sparkle = new THREE.Mesh(
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

        podesiRendererVelicinu(renderer, mount, camera);

        const resizeObserver = 'ResizeObserver' in window
            ? new ResizeObserver(() => podesiRendererVelicinu(renderer, mount, camera))
            : null;
        if (resizeObserver) resizeObserver.observe(button);
        else window.addEventListener('resize', () => podesiRendererVelicinu(renderer, mount, camera));

        button.dataset.threeDailyReady = '1';
        button.classList.add('three-daily-ready');

        let pressed = false;
        let hovered = false;
        const smanjenoKretanje = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        button.addEventListener('pointerenter', () => { hovered = true; });
        button.addEventListener('pointerleave', () => { hovered = false; pressed = false; });
        button.addEventListener('pointerdown', () => { pressed = true; });
        button.addEventListener('pointerup', () => { pressed = false; });
        button.addEventListener('pointercancel', () => { pressed = false; });

        const clock = new THREE.Clock();

        function renderuj() {
            const vreme = clock.getElapsedTime();
            const hoverTilt = hovered ? 0.1 : 0;
            const pressScale = pressed ? 0.9 : 1;
            const idle = smanjenoKretanje ? 0 : Math.sin(vreme * 1.75);

            group.rotation.x = -0.18 + (idle * 0.055);
            group.rotation.y = 0.26 + hoverTilt + (smanjenoKretanje ? 0 : Math.sin(vreme * 1.2) * 0.13);
            group.rotation.z = smanjenoKretanje ? 0 : Math.sin(vreme * 0.9) * 0.035;
            group.position.y = smanjenoKretanje ? 0 : Math.sin(vreme * 1.45) * 0.035;
            group.scale.setScalar(pressScale);
            rim.rotation.z += smanjenoKretanje ? 0 : 0.006;
            innerRim.rotation.z -= smanjenoKretanje ? 0 : 0.004;
            sparkle.rotation.z = vreme * 1.7;
            sparkle.material.opacity = smanjenoKretanje ? 0.86 : 0.65 + ((Math.sin(vreme * 3.4) + 1) * 0.17);

            renderer.render(scene, camera);

            if (!document.hidden) {
                window.requestAnimationFrame(renderuj);
            }
        }

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                clock.getDelta();
                window.requestAnimationFrame(renderuj);
            }
        });

        renderer.render(scene, camera);
        if (!smanjenoKretanje) window.requestAnimationFrame(renderuj);
    }

    function init() {
        const button = document.querySelector('.daily-challenge-btn');
        if (!button) return;

        ucitajThree()
            .then(THREE => napraviDaily3D(button, THREE))
            .catch(() => {
                button.classList.remove('three-daily-ready');
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);
