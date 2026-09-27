'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('font-list formatting and sequential fallback are preserved across engines', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/client.base.js'), 'utf8');
  const start = source.indexOf('getFonts: function()');
  const end = source.indexOf('\n  },', start) + 4;
  function run(engine, present) {
    const calls = { single: 0, batch: 0 };
    const fontDetective = {
      detect(font) { calls.single++; return present.includes(font); },
      detectMany(fonts) { calls.batch++; return fonts.map(font => present.includes(font)); },
    };
    const client = vm.runInNewContext('({' + source.slice(start, end) + '})', { fontDetective });
    client.getEngine = () => engine;
    return { fonts: client.getFonts(), calls };
  }
  for (const present of [['Arial', 'Ubuntu', 'Wingdings'], ['Arial'], []]) {
    const reference = run('Gecko', present);
    for (const engine of ['Blink', 'Gecko', 'WebKit', undefined]) {
      const candidate = run(engine, present);
      assert.equal(candidate.fonts, reference.fonts);
      assert.equal(candidate.calls.batch, engine === 'Blink' ? 1 : 0);
      assert.equal(candidate.calls.single, engine === 'Blink' ? 0 : reference.calls.single);
    }
  }
  assert.equal(run('Blink', ['Arial', 'Ubuntu', 'Wingdings']).fonts, 'Arial, Ubuntu, Wingdings');
  assert.equal(run('Blink', ['Arial']).fonts, 'Arial, ');
});

test('batched font probes retain upstream metrics, order and cleanup with fewer layouts', () => {
  const vendor = path.join(__dirname, '../src/vendor');
  const detectorSource = fs.readFileSync(path.join(vendor, 'fontdetect.js'), 'utf8');
  function environment() {
    let dirty = false, layouts = 0;
    const children = [];
    function span() {
      return {
        style: {}, innerHTML: '',
        cloneNode() { const node = span(); Object.assign(node.style, this.style); node.innerHTML = this.innerHTML; return node; },
        get offsetWidth() {
          if (dirty) { layouts++; dirty = false; }
          const [font, fallback] = this.style.fontFamily.split(',');
          return font === 'KnownWidth' ? 121 : ({ monospace: 100, 'sans-serif': 110, serif: 120 }[fallback || font]);
        },
        get offsetHeight() { return this.style.fontFamily.startsWith('KnownHeight,') ? 81 : 80; },
      };
    }
    const body = {
      appendChild(node) { dirty = true; if (node.nodes) children.push(...node.nodes); else children.push(node); },
      removeChild(node) { const index = children.indexOf(node); assert.ok(index >= 0); children.splice(index, 1); dirty = true; },
    };
    const document = {
      getElementsByTagName: () => [body], createElement: span,
      createDocumentFragment: () => ({ nodes: [], appendChild(node) { this.nodes.push(node); } }),
    };
    const sandbox = { document, module: { exports: {} } }; vm.createContext(sandbox);
    vm.runInContext(detectorSource, sandbox);
    return { detector: new sandbox.module.exports(), children, layouts: () => layouts };
  }
  const fonts = ['Absent', 'KnownWidth', 'KnownHeight', 'AbsentAgain'];
  const reference = environment(), candidate = environment();
  const expected = fonts.map(font => reference.detector.detect(font));
  assert.deepEqual(Array.from(candidate.detector.detectMany(fonts)), expected);
  assert.deepEqual(expected, [false, true, true, false]);
  assert.equal(reference.children.length, 0); assert.equal(candidate.children.length, 0);
  assert.equal(reference.layouts(), 3 + fonts.length * 3);
  assert.equal(candidate.layouts(), 4);
});
