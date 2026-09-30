/* global Promise */
'use strict';

const Detector = require('../src/vendor/fontdetect');
const ClientJS = require('../src/client.base').ClientJS;
const variants = [ClientJS, require('../src/client').ClientJS, require('../src/client.flash').ClientJS, require('../src/client.java').ClientJS];

describe('Batched font detection', () => {
  it('exposes preparation on every build and rejects non-finite or empty batches', () => {
    for (const Variant of variants) {
      expect(Variant.prepareFonts).toBe(ClientJS.prepareFonts);
      for (const batchSize of [0, -1, Infinity, 1.5]) {
        expect(() => Variant.prepareFonts({ batchSize })).toThrowError(RangeError);
      }
      const children = document.body.childNodes.length;
      Variant.prepareFonts()();
      expect(document.body.childNodes.length).toBe(children);
    }
  });

  it('preparation preserves a synchronous snapshot after loaded fonts settle', async () => {
    await document.fonts.ready;
    const client = new ClientJS();
    const fonts = client.getFonts(), fingerprint = client.getFingerprint();
    const children = document.body.childNodes.length;
    const cancel = ClientJS.prepareFonts();
    await new Promise(resolve => setTimeout(resolve, 400));
    cancel();
    expect(client.getFonts()).toBe(fonts);
    expect(client.getFingerprint()).toBe(fingerprint);
    expect(document.body.childNodes.length).toBe(children);
  });
  it('matches single-font probes and removes every measurement span', () => {
    const detector = new Detector();
    const children = document.body.childNodes.length;
    const fonts = ['Arial', 'Times New Roman', 'monospace', 'Missing-Font-ClientJS-392840'];
    expect(detector.detectMany(fonts)).toEqual(fonts.map(font => detector.detect(font)));
    expect(document.body.childNodes.length).toBe(children);
  });

  it('preserves the font list and fingerprint compared with sequential probing', () => {
    return document.fonts.ready.then(() => {
      const client = new ClientJS();
      const engine = client.getEngine();
      const engineSpy = spyOn(client, 'getEngine').and.returnValue('Gecko');
      const fonts = client.getFonts();
      const fingerprint = client.getFingerprint();
      engineSpy.and.returnValue(engine);
      expect(client.getFonts()).toEqual(fonts);
      expect(client.getFingerprint()).toEqual(fingerprint);
    });
  });
});
