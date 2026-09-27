'use strict';

const Detector = require('../src/vendor/fontdetect');
const ClientJS = require('../src/client.base').ClientJS;

describe('Batched font detection', () => {
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
