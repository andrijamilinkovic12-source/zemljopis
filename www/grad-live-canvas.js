(() => {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.className = 'theme-live-png';
    canvas.width = 588;
    canvas.height = 1045;
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d', { alpha: false });
    const skyLayer = document.createElement('canvas');
    skyLayer.width = canvas.width;
    skyLayer.height = Math.ceil(580*canvas.width/941);
    const skyCtx = skyLayer.getContext('2d');
    const images = {};
    let loading, screen, request = 0, previous = null, elapsed = 0;
    const dusk = 240, fullNight = 260, moonset = 275, dawn = 285, cycle = 300;

    function load() {
        if (!loading) {
            loading = Promise.all(['square', 'clouds', 'water', 'flag', 'lights', 'night-sky', 'moon',
                'star', 'paving-moonlight', 'river-moonlight'].map(name =>
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = async () => {
                        try {
                            if (img.decode) await img.decode();
                            images[name] = img;
                            resolve();
                        } catch (error) { reject(error); }
                    };
                    img.onerror = reject;
                    const version = name === 'night-sky' ? '?v=4' : (name === 'moon' ? '?v=3' : '');
                    img.src = 'assets/grad-clay/' + name + '.png' + version;
                })
            )).then(() => true, () => false);
        }
        return loading;
    }

    const clouds = [
        [167, 125, 263, 130, 28, 0], [770, 175, 245, 122, 24, 1.4],
        [247, 331, 137, 68, 17, 2.3], [638, 277, 113, 56, 14, 3.5]
    ];

    function sequence(name, frame, w, h, x, y, width, height, target = ctx) {
        target.drawImage(images[name], (frame % 8)*w, Math.floor(frame/8)*h, w, h,
            x, y, width, height);
    }

    function smooth(t) {
        t = Math.max(0, Math.min(t, 1));
        return t*t*(3-2*t);
    }

    function drawClouds(target, seconds) {
        clouds.forEach(([x,y,w,h,drift,phase], i) => {
            const wind = seconds*2*Math.PI/48 + phase;
            target.drawImage(images.clouds, (i%2)*256, Math.floor(i/2)*128, 256, 128,
                x-w/2 + drift*Math.sin(wind), y-h/2 + 3*Math.sin(wind*2), w, h);
        });
    }

    const stars = [[81,83,1],[237,56,1.5],[365,171,1],[427,82,2],[559,39,1],
        [639,157,1.5],[804,62,1],[852,244,1],[501,285,1],[328,391,1],
        [187,247,1],[622,376,1.5],[743,303,1]];

    function drawNightSky(seconds, night, flagFrame, setting) {
        skyCtx.setTransform(skyLayer.width/941,0,0,skyLayer.height/580,0,0);
        skyCtx.clearRect(0,0,941,580);
        skyCtx.drawImage(images['night-sky'],0,0);
        const phase = seconds % cycle;
        const t = Math.min(1, Math.max(0, (phase-dusk)/(fullNight-dusk)));
        const rise = 1-(1-t)*(1-t);
        const drift = smooth((phase-fullNight)/(moonset-fullNight));
        const x = 455+53*t+14*drift+212*setting;
        const y = 603-477*rise-5*drift+484*setting;
        skyCtx.globalCompositeOperation = 'source-atop';
        stars.forEach(([sx,sy,r],i) => {
            skyCtx.globalAlpha = .67+.21*Math.sin(seconds*(1.5+.09*(i%4))+i*2.4)+.11*Math.sin(seconds*2.7+i);
            skyCtx.drawImage(images.star, sx-3*r, sy-3*r, 6*r, 6*r);
        });
        skyCtx.globalAlpha = 1;
        if (setting < 1) skyCtx.drawImage(images.moon, x-110, y-110, 220, 220);
        // Reveal the already shaded clouds and flag in front of the sky.
        skyCtx.globalCompositeOperation = 'destination-out';
        drawClouds(skyCtx, seconds);
        sequence('flag', flagFrame, 56,34,727,383,56,34,skyCtx);
        skyCtx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = smooth(Math.min(1,night*1.35));
        ctx.drawImage(skyLayer,0,0,941,580);
    }

    function render(seconds) {
        ctx.setTransform(canvas.width/941, 0, 0, canvas.height/1672, 0, 0);
        ctx.drawImage(images.square, 0, 0, 941, 1672);
        drawClouds(ctx, seconds);
        sequence('water', Math.floor(seconds*20)%32, 256,118, 48,1244,424,196);
        const flagFrame = Math.floor(seconds*16)%32;
        sequence('flag', flagFrame, 56,34, 727,383,56,34);

        // Only the lighting clock wraps. Water, wind and flag stay continuous at dawn.
        const phase = seconds % cycle;
        const night = smooth((phase-dusk)/(fullNight-dusk)) * (1-smooth((phase-dawn)/(cycle-dawn)));
        if (night > 0) {
            ctx.globalAlpha = night * 188/255;
            ctx.fillStyle = '#0c133f';
            ctx.fillRect(0,0,941,1672);
            const setting = smooth((phase-moonset)/(dawn-moonset));
            drawNightSky(seconds, night, flagFrame, setting);
            const moonlight = smooth((night-.28)/.72)*(1-setting);
            if (moonlight > 0) {
                ctx.globalAlpha = moonlight;
                ctx.drawImage(images['paving-moonlight'], 0,872,941,800);
                sequence('river-moonlight', Math.floor(seconds*12)%32, 192,64,368,752,336,112);
            }
            ctx.globalAlpha = smooth((night-.18)/.82);
            ctx.drawImage(images.lights, 0,380,941,620);
            ctx.globalAlpha = 1;
        }
    }

    function tick(now) {
        if (previous === null) previous = now;
        elapsed += now-previous;
        previous = now;
        render(elapsed / 1000);
        request = requestAnimationFrame(tick);
    }

    function hide() {
        screen = null;
        cancelAnimationFrame(request);
        request = 0;
        previous = null;
        canvas.hidden = true;
        canvas.remove();
    }

    function show(target) {
        if (!ctx || !skyCtx || screen === target) return;
        hide();
        screen = target;
        target.appendChild(canvas);
        load().then(ready => {
            if (!ready || screen !== target || request) return;
            render(elapsed/1000);
            canvas.hidden = false;
            request = requestAnimationFrame(tick);
        });
    }

    function seek(seconds) {
        elapsed = seconds * 1000;
        previous = null;
        if (screen && !canvas.hidden) render(seconds);
    }

    window.GradLiveCanvas = { show, hide, seek };
})();
