(() => {
    'use strict';

    const root = 'assets/planina-clay/';
    const cycle = 300;
    const peaks = [
        { name: 'left', x: 0, y: 253, w: 160, h: 140, melt: 10, frost: 180 },
        { name: 'middle', x: 551, y: 462, w: 140, h: 90, melt: 63, frost: 220 },
        { name: 'right', x: 789, y: 327, w: 152, h: 142, melt: 120, frost: 260 }
    ];
    const clouds = [[124,145,283,148,36,0],[834,178,265,140,33,1.2],[678,291,128,68,20,2.4]];
    const canvas = document.createElement('canvas');
    canvas.width = 588;
    canvas.height = 1045;
    canvas.className = 'theme-live-png';
    canvas.setAttribute('aria-hidden','true');
    canvas.hidden = true;
    const ctx = canvas.getContext('2d', {alpha:false});
    const images = {};
    let loading, target, generation = 0, request = 0, previous = null, seconds = 0;

    function load() {
        if (!loading) {
            loading = Promise.all(['valley','clouds',...peaks.map(p => p.name)].map(name =>
                new Promise((resolve,reject) => {
                    const image = new Image();
                    image.onload = async () => {
                        try {
                            if (image.decode) await image.decode();
                            images[name] = image;
                            resolve();
                        } catch (error) { reject(error); }
                    };
                    image.onerror = reject;
                    image.src = root + name + '.png';
                })
            )).then(() => true).catch(() => { loading = null; return false; });
        }
        return loading;
    }

    function smooth(value) {
        const t = Math.max(0, Math.min(1,value));
        return t*t*(3-2*t);
    }

    function drawStage(p, index) {
        ctx.drawImage(images[p.name], index%8*p.w, Math.floor(index/8)*p.h, p.w,p.h,
            p.x,p.y,p.w,p.h);
    }

    function render() {
        const phase = seconds % cycle;
        ctx.setTransform(canvas.width/941,0,0,canvas.height/1672,0,0);
        ctx.drawImage(images.valley,0,0,941,1672);
        for (const p of peaks) {
            const level = 39*smooth((phase-p.melt)/38)*(1-smooth((phase-p.frost)/36));
            const frame = Math.floor(level);
            drawStage(p,frame);
            if (level > frame) {
                // Each tile includes the exposed rock, so the ice stays solid during interpolation.
                ctx.globalAlpha = level-frame;
                drawStage(p,frame+1);
                ctx.globalAlpha = 1;
            }
        }
        clouds.forEach(([cx,cy,w,h,amplitude,offset],i) => {
            const wind = seconds*2*Math.PI/(64+10*i)+offset;
            ctx.drawImage(images.clouds,i*320,0,320,168,cx-w/2+amplitude*Math.sin(wind),
                cy-h/2+3*Math.sin(2*wind),w,h);
        });
    }

    function tick(now) {
        if (previous === null || now-previous >= 1000/30-1) {
            if (previous !== null) seconds += (now-previous)/1000;
            previous = now;
            render();
        }
        request = requestAnimationFrame(tick);
    }

    function hide() {
        generation++;
        target = null;
        cancelAnimationFrame(request);
        request = 0;
        previous = null;
        canvas.hidden = true;
        canvas.remove();
    }

    function show(screen, animate = true) {
        if (!ctx || target === screen) return;
        hide();
        target = screen;
        const current = generation;
        screen.appendChild(canvas);
        load().then(ready => {
            if (generation !== current || !ready) return;
            render();
            canvas.hidden = false;
            if (animate) request = requestAnimationFrame(tick);
        });
    }

    function seek(time) {
        seconds = time;
        previous = null;
        if (target && !canvas.hidden) render();
    }

    window.PlaninaLiveCanvas = {show,hide,seek};
})();
