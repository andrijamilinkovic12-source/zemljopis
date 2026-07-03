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

    async function teksturaIzSvg(THREE) {
        const odgovor = await fetch(SVG_SRC, { cache: 'force-cache' });
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
            if ('colorSpace' in texture && THREE.SRGBColorSpace) {
                texture.colorSpace = THREE.SRGBColorSpace;
            }
            texture.anisotropy = 4;
            texture.needsUpdate = true;
            return texture;
        } finally {
            URL.revokeObjectURL(url);
        }
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

        let pressed = false;
        let hovered = false;
        const smanjenoKretanje = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const clock = new THREE.Clock();
        let animacijaId = null;

        function renderuj() {
            const vreme = clock.getElapsedTime();
            const hoverTilt = hovered ? 0.1 : 0;
            const pressScale = pressed ? 0.9 : 1;
            const idleY = smanjenoKretanje ? 0 : Math.sin(vreme * 1.65);
            const idleSide = smanjenoKretanje ? 0 : Math.sin(vreme * 1.05);
            const pulse = smanjenoKretanje ? 1 : 1 + (Math.sin(vreme * 1.35) * 0.018);

            group.rotation.x = -0.16 + (idleY * 0.045);
            group.rotation.y = 0.24 + hoverTilt + (idleSide * 0.08);
            group.rotation.z = (pressed ? -0.04 : 0) + (idleSide * 0.025);
            group.position.y = idleY * 0.075;
            group.scale.setScalar(pressScale * pulse);
            rim.rotation.z += smanjenoKretanje ? 0 : 0.0035;
            innerRim.rotation.z -= smanjenoKretanje ? 0 : 0.0025;
            sparkle.rotation.z = hovered ? 0.28 : vreme * 1.1;
            sparkle.material.opacity = hovered ? 0.95 : 0.72 + ((Math.sin(vreme * 2.6) + 1) * 0.11);

            renderer.render(scene, camera);

            if (!document.hidden && !smanjenoKretanje) {
                animacijaId = window.requestAnimationFrame(renderuj);
            } else {
                animacijaId = null;
            }
        }

        function pokreniAnimaciju() {
            if (animacijaId !== null || smanjenoKretanje) return;
            clock.getDelta();
            animacijaId = window.requestAnimationFrame(renderuj);
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

        const osveziInterakciju = () => {
            if (smanjenoKretanje) window.requestAnimationFrame(renderuj);
            else pokreniAnimaciju();
        };

        button.addEventListener('pointerenter', () => { hovered = true; osveziInterakciju(); });
        button.addEventListener('pointerleave', () => { hovered = false; pressed = false; osveziInterakciju(); });
        button.addEventListener('pointerdown', () => { pressed = true; osveziInterakciju(); });
        button.addEventListener('pointerup', () => { pressed = false; osveziInterakciju(); });
        button.addEventListener('pointercancel', () => { pressed = false; osveziInterakciju(); });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) pokreniAnimaciju();
        });

        button.dataset.threeDailyReady = '1';
        button.classList.add('three-daily-ready');
        renderuj();
        pokreniAnimaciju();
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
