(() => {
    'use strict';

    const WIDTH = 941;
    const HEIGHT = 1672;
    const LOOP_MS = 12000;
    const ASSET_ROOT = 'assets/theme-live-v3/drzava-sprites/';
    const SPRITE_VERSION = 2;
    const planeNames = Array.from({ length: 16 }, (_, index) => `plane-turn-${String(index).padStart(2, '0')}`);
    const names = [
        'plane-atlas', 'pin-coral', 'pin-gold', 'pin-africa', 'pin-rose',
        'cloud-left', 'cloud-middle', 'cloud-right', 'compass-needle',
        'route-stamp', 'pin-shadow', 'pin-impact'
    ];
    const routes = [
        { points: [153, 580, 278, 415, 582, 422, 740, 545], start: 0, arrival: 18, impact: 24 },
        { points: [740, 545, 819, 682, 834, 876, 770, 1010], start: 24, arrival: 42, impact: 48 },
        { points: [770, 1010, 617, 818, 382, 850, 218, 1000], start: 48, arrival: 66, impact: 72 },
        { points: [218, 1000, 88, 853, 83, 678, 153, 580], start: 72, arrival: 90, impact: 96 }
    ];
    const pins = [
        { name: 'pin-coral', x: 153, ground: 580, start: 90, land: 96 },
        { name: 'pin-gold', x: 740, ground: 545, start: 18, land: 24 },
        { name: 'pin-africa', x: 770, ground: 1010, start: 42, land: 48 },
        { name: 'pin-rose', x: 218, ground: 1000, start: 66, land: 72 }
    ];

    const canvas = document.createElement('canvas');
    canvas.className = 'theme-live-png';
    canvas.width = 588;
    canvas.height = 1045;
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
        window.DrzavaLiveCanvas = { show: () => false, hide: () => {} };
        return;
    }

    context.imageSmoothingEnabled = true;
    const images = new Map();
    let loading = null;
    let activeScreen = null;
    let requestId = 0;
    let generation = 0;
    let lastTime = 0;
    let elapsed = 0;

    function loadImage(name) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => {
                const decode = typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve();
                decode.then(() => { images.set(name, image); resolve(); });
            };
            image.onerror = () => reject(new Error(`Failed to load ${name}.png`));
            image.src = `${ASSET_ROOT}${name}.png?v=${SPRITE_VERSION}`;
        });
    }

    function ensureLoaded() {
        if (loading) return loading;
        let next = 0;
        const worker = async () => {
            while (next < names.length) await loadImage(names[next++]);
        };
        loading = Promise.all(Array.from({ length: 4 }, worker)).then(() => true).catch(() => false);
        return loading;
    }

    function sprite(name, x, y, width, height, degrees = 0) {
        const isPlane = name.startsWith('plane-turn-');
        const image = images.get(isPlane ? 'plane-atlas' : name);
        if (!image) return;
        context.save();
        context.translate(x, y);
        if (degrees) context.rotate(degrees * Math.PI / 180);
        if (isPlane) {
            const index = Number(name.slice(-2));
            context.drawImage(image, (index % 4) * 276, Math.floor(index / 4) * 184,
                276, 184, -width / 2, -height / 2, width, height);
        } else {
            context.drawImage(image, -width / 2, -height / 2, width, height);
        }
        context.restore();
    }

    function bezier(points, t) {
        const u = 1 - t;
        return [
            u*u*u*points[0] + 3*u*u*t*points[2] + 3*u*t*t*points[4] + t*t*t*points[6],
            u*u*u*points[1] + 3*u*u*t*points[3] + 3*u*t*t*points[5] + t*t*t*points[7]
        ];
    }

    function drawRoute(points, fraction, alpha) {
        if (fraction <= 0 || alpha <= 0) return;
        const stamp = images.get('route-stamp');
        context.globalAlpha = alpha;
        const count = Math.floor(160 * fraction);
        for (let index = 0; index <= count; index++) {
            const [x, y] = bezier(points, index / 160);
            context.drawImage(stamp, x - 10, y - 10, 20, 20);
        }
        const [x, y] = bezier(points, fraction);
        context.drawImage(stamp, x - 10, y - 10, 20, 20);
        context.globalAlpha = 1;
    }

    function drawPin(pin, phase) {
        let time = phase;
        if (pin.land === 96 && phase < 6) time += 96;
        let lift = 0;
        if (time >= pin.start && time <= pin.land) {
            lift = 58 * Math.sin(Math.PI * (time - pin.start) / (pin.land - pin.start));
        }
        context.globalAlpha = (66 - lift * 0.42) / 66;
        sprite('pin-shadow', pin.x + lift * 0.08, pin.ground, 50 - lift * 0.16, 14);
        context.globalAlpha = 1;
        sprite(pin.name, pin.x, pin.ground - 37 - lift, 94, 94);
        if (time >= pin.land && time <= pin.land + 3) {
            const radius = 13 + 9 * (time - pin.land);
            context.globalAlpha = (115 - 28 * (time - pin.land)) / 115;
            sprite('pin-impact', pin.x, pin.ground, 2 * radius, radius * 0.48);
            context.globalAlpha = 1;
        }
    }

    function drawPlaneView(index, heading, x, y, alpha = 1) {
        let offset = heading - index * 22.5;
        if (offset > 180) offset -= 360;
        if (offset < -180) offset += 360;
        context.globalAlpha = alpha;
        sprite(planeNames[index], x, y, 138, 96, 0.28 * offset);
        context.globalAlpha = 1;
    }

    function render() {
        const phase = elapsed * 96 / LOOP_MS;
        const theta = 2 * Math.PI * phase / 96;
        context.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
        context.clearRect(0, 0, WIDTH, HEIGHT);

        sprite('cloud-left', 137 + 21 * Math.sin(theta), 125, 285, 184);
        sprite('cloud-right', 763 + 18 * Math.sin(theta + 1.2), 93, 238, 170);
        sprite('cloud-middle', 741 + 14 * Math.sin(theta + 2.8), 227, 158, 124);

        for (const route of routes) {
            if (phase >= route.start && phase <= route.arrival) {
                drawRoute(route.points, (phase - route.start) / (route.arrival - route.start), 1);
            } else if (phase > route.arrival && phase < route.impact) {
                drawRoute(route.points, 1, (route.impact - phase) / (route.impact - route.arrival));
            }
        }
        for (const pin of pins) drawPin(pin, phase);

        const planeX = 470 + 328 * Math.cos(theta);
        const planeY = 514 + 205 * Math.sin(theta);
        const velocityX = -328 * Math.sin(theta);
        const velocityY = 205 * Math.cos(theta);
        const heading = (Math.atan2(-velocityX, velocityY) * 180 / Math.PI + 360) % 360;
        const viewPosition = heading / 22.5;
        const firstView = Math.floor(viewPosition);
        const fraction = viewPosition - firstView;
        const blend = fraction * fraction * (3 - 2 * fraction);
        drawPlaneView(firstView, heading, planeX, planeY);
        if (blend > 0) drawPlaneView((firstView + 1) % 16, heading, planeX, planeY, blend);

        const needleAngle = 6 * Math.sin(theta) + 3 * Math.sin(2 * theta);
        sprite('compass-needle', 742, 1445, 180, 132, needleAngle);
    }

    function tick(now) {
        if (!activeScreen) return;
        if (lastTime) elapsed = (elapsed + Math.min(now - lastTime, 50)) % LOOP_MS;
        lastTime = now;
        render();
        requestId = requestAnimationFrame(tick);
    }

    function hide() {
        generation++;
        activeScreen = null;
        if (requestId) cancelAnimationFrame(requestId);
        requestId = 0;
        lastTime = 0;
        canvas.hidden = true;
        canvas.remove();
    }

    function show(screen) {
        if (activeScreen === screen) return true;
        if (activeScreen) hide();
        activeScreen = screen;
        const currentGeneration = ++generation;
        screen.appendChild(canvas);
        ensureLoaded().then((loaded) => {
            if (generation !== currentGeneration || activeScreen !== screen) return;
            if (!loaded) {
                hide();
                window.dispatchEvent(new Event('drzava-live-failed'));
                return;
            }
            canvas.hidden = false;
            lastTime = 0;
            requestId = requestAnimationFrame(tick);
        });
        return true;
    }

    window.DrzavaLiveCanvas = { show, hide, prefetch: ensureLoaded };
})();
