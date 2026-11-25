(() => {
    'use strict';

    const cycle = 300;
    const tau = Math.PI * 2;
    const clouds = [
        [146, 96, 221, 102, 24], [758, 103, 231, 117, 30],
        [459, 157, 137, 62, 21], [851, 206, 100, 49, 17]
    ];
    // Start, takeoff X, waterline, horizontal travel and height of each leap.
    const jumps = [
        [16,330,1000,178,102], [71,658,838,-142,83], [119,405,1285,205,122],
        [174,519,952,-162,92], [231,350,1192,193,108], [282,605,818,-147,83]
    ];
    const canvas = document.createElement('canvas');
    canvas.width = 588;
    canvas.height = 1045;
    canvas.className = 'theme-live-png';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = true;
    const ctx = canvas.getContext('2d', {alpha: false});
    const images = {};
    let loading, target, generation = 0, request = 0, previous = null, seconds = 0;

    function load() {
        if (!loading) {
            loading = Promise.all(['river','current','sun','reflection','clouds','lilies','fish','splash'].map(name =>
                new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = async () => {
                        try {
                            if (image.decode) await image.decode();
                            images[name] = image;
                            resolve();
                        } catch (error) { reject(error); }
                    };
                    image.onerror = reject;
                    const version = name === 'current' || name === 'lilies' ? '?v=2' : '';
                    image.src = 'assets/reka-clay/' + name + '.png' + version;
                })
            )).then(() => true).catch(() => { loading = null; return false; });
        }
        return loading;
    }

    function tile(image, frame, w, h, x, y, width, height) {
        ctx.drawImage(image, (frame%8)*w, Math.floor(frame/8)*h, w,h, x,y,width,height);
    }

    function splash(age, x, y, width) {
        if (age < 0 || age >= 1.65) return;
        const scale = width/160;
        tile(images.splash, Math.floor(age/1.65*32), 160,84, x-width/2,y-55.5*scale,width,84*scale);
    }

    function drawJump(elapsed, x, y, travel, height) {
        const duration = 1.8;
        const u = elapsed/duration;
        const size = height*1.18;
        // The center crosses the water at u=.12 and .88. Clip the model as it passes through.
        const edge = .12;
        const parabola = 1-4*(u-.5)**2;
        const waterLevel = 4*edge*(1-edge);
        splash(elapsed-.10, x+travel*edge, y, size*.78);
        if (u >= 0 && u < 1) {
            const cx = x+travel*u;
            const cy = y-height*(parabola-waterLevel)/(1-waterLevel);
            ctx.save();
            ctx.beginPath();
            ctx.rect(cx-size, y-height-size, 2*size, height+size);
            ctx.clip();
            ctx.translate(cx,cy);
            ctx.scale(Math.sign(travel),1);
            ctx.rotate(Math.atan2((8*u-4)*height/(1-waterLevel),Math.abs(travel))*.78);
            const frame = Math.floor(elapsed*22)%32;
            tile(images.fish,frame,120,76,-size/2,-size*38/120,size,size*76/120);
            ctx.restore();
        }
        splash(elapsed-duration*(1-edge)+.08, x+travel*(1-edge), y, size*1.12);
    }

    function render() {
        const time = seconds % cycle;
        ctx.setTransform(canvas.width/941,0,0,canvas.height/1672,0,0);
        ctx.drawImage(images.river,0,0,941,1672);
        ctx.drawImage(images.sun,0,0,204,188,532,178,204,188);
        const sunlight = (1-Math.cos(time*tau/150))/2;
        ctx.globalAlpha = sunlight;
        ctx.drawImage(images.sun,204,0,204,188,532,178,204,188);
        ctx.drawImage(images.reflection,0,393,941,1279);
        ctx.globalAlpha = 1;
        clouds.forEach(([x,y,w,h,drift],i) => {
            const phase = time*tau*(3+i%2)/cycle+i*.9;
            ctx.drawImage(images.clouds,i*248,0,248,132,
                x-w/2+drift*Math.sin(phase),y-h/2+2*Math.sin(2*phase),w,h);
        });
        const flow = (time*32/10)%32;
        // Linear temporal filtering keeps shoreline glints smooth between baked frames.
        ctx.globalAlpha = 1-(flow%1);
        tile(images.current,Math.floor(flow),236,326,0,393,941,1279);
        ctx.globalAlpha = flow%1;
        tile(images.current,(Math.floor(flow)+1)%32,236,326,0,393,941,1279);
        ctx.globalAlpha = 1;
        for (const [start,x,y,travel,height] of jumps) {
            const age = time-start;
            if (age >= 0 && age < 3.4) drawJump(age,x,y,travel,height);
        }
        window.RekaLilyTracks.forEach(([x,y,w,heights],i) => {
            const group = Math.floor(i/3);
            const drift = time*tau*(11+group)/cycle+group*1.9+i%3*.22;
            const frame = Math.floor(flow);
            const wave = (heights[frame]+(heights[(frame+1)%32]-heights[frame])*(flow-frame))/100;
            const cx = x+(2.2+group*.5)*Math.sin(drift);
            const cy = y+1.15*Math.cos(drift)-.50*wave;
            // Rock about the waterline. The projected contact ellipse stays horizontal.
            const scaleY = (1+.021*wave)*w/144;
            ctx.drawImage(images.lilies,i%3*144,group*96,144,96,
                cx-w/2,cy-53*scaleY,w,96*scaleY);
        });
    }

    function tick(now) {
        if (previous === null || now-previous >= 1000/30-1) {
            if (previous !== null) seconds = (seconds+(now-previous)/1000)%cycle;
            previous = now;
            render();
        }
        request = requestAnimationFrame(tick);
    }

    function hide() {
        generation++;
        target = null;
        cancelAnimationFrame(request);
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
            if (!ready || generation !== current) return;
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

    window.RekaLiveCanvas = {show, hide, seek};
})();
