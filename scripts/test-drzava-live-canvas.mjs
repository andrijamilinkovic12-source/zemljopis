import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const calls = [];
const frameQueue = new Map();
let nextFrame = 0;
let imageCount = 0;
const context = {
    save() {}, restore() {}, translate() {}, rotate() {}, setTransform() {}, clearRect() {},
    drawImage(...args) { calls.push(args); },
    globalAlpha: 1
};
const canvas = {
    hidden: true,
    parentElement: null,
    setAttribute() {},
    getContext() { return context; },
    remove() { this.parentElement = null; }
};
const screen = {
    appendChild(element) { element.parentElement = this; }
};
class MockImage {
    constructor() { imageCount++; }
    set src(value) { this.url = value; queueMicrotask(() => this.onload()); }
    decode() { return Promise.resolve(); }
}
const window = {};
runInNewContext(readFileSync(new URL('../www/drzava-live-canvas.js', import.meta.url), 'utf8'), {
    window,
    document: { createElement: () => canvas },
    Image: MockImage,
    Event: class {},
    queueMicrotask,
    requestAnimationFrame(callback) { const id = ++nextFrame; frameQueue.set(id, callback); return id; },
    cancelAnimationFrame(id) { frameQueue.delete(id); },
    Math, Promise
});

assert.equal(await window.DrzavaLiveCanvas.prefetch(), true);
assert.equal(imageCount, 12, 'one atlas and eleven smaller PNGs should load');
assert.equal(window.DrzavaLiveCanvas.show(screen), true);
await Promise.resolve();
assert.equal(canvas.hidden, false);
assert.equal(frameQueue.size, 1);

for (const time of [100, 116, 132, 148]) {
    const [id, callback] = frameQueue.entries().next().value;
    frameQueue.delete(id);
    callback(time);
}
for (let time = 198; time <= 12198; time += 50) {
    const [id, callback] = frameQueue.entries().next().value;
    frameQueue.delete(id);
    callback(time);
}
assert(calls.some(args => args.length === 9 && args[0].url.includes('plane-atlas.png')),
    'a plane view must be drawn from the PNG atlas');
const usedViews = new Set(calls.filter(args => args.length === 9 && args[0].url.includes('plane-atlas.png'))
    .map(args => Math.floor(args[2] / 184) * 4 + Math.floor(args[1] / 276)));
assert.equal(usedViews.size, 16, 'the complete loop must use all sixteen airplane views');
assert(calls.some(args => args[0].url.includes('route-stamp.png')),
    'the connecting route must use its PNG stamp');

window.DrzavaLiveCanvas.hide();
assert.equal(frameQueue.size, 0, 'animation must stop off screen');
assert.equal(canvas.hidden, true);
assert.equal(canvas.parentElement, null);
console.log('Drzava live PNG canvas: load, render, and pause passed');
