// Parser multipart/x-mixed-replace del conector (HANDOFF §2 Paso 3).
// Fixtures sintéticos construidos según la spec Dahua V3.26 (§4.4.3 y §4.9.17).
// ⚠️ Tras el spike con hardware real, reemplazar por golden files grabados.
const { MultipartStreamParser, parseBoundary } = require('../connector/src/multipartParser');
const { parseEventText } = require('../connector/src/dahuaEvents');

const BOUNDARY = 'myboundary';

function textPart(text) {
  return Buffer.from(
    `--${BOUNDARY}\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}\r\n`
  );
}

function jpegPart(payload) {
  // JPEG mínimo: SOI ... EOI, con bytes "binarios" que podrían confundirse con texto.
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    payload,
    Buffer.from([0xff, 0xd9]),
  ]);
  return Buffer.concat([
    Buffer.from(`--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`),
    jpeg,
    Buffer.from('\r\n'),
  ]);
}

const SNAP_EVENT_TEXT = [
  'Events[0].Channel=0',
  'Events[0].EventBaseInfo.Code=TrafficJunction',
  'Events[0].EventBaseInfo.Action=Pulse',
  'Events[0].EventBaseInfo.Index=0',
  'Events[0].PTS=42949485818.0',
  'Events[0].TrafficCar.PlateNumber=ZZZ12345',
].join('\r\n');

function buildSnapManagerStream() {
  return Buffer.concat([
    textPart(SNAP_EVENT_TEXT),
    jpegPart(Buffer.from('--myboundary falso dentro del JPEG')), // binario hostil
    textPart('Heartbeat'),
  ]);
}

function collectParts(parser) {
  const out = { parts: [], heartbeats: 0 };
  parser.on('part', part => out.parts.push(part));
  parser.on('heartbeat', () => { out.heartbeats += 1; });
  return out;
}

describe('MultipartStreamParser', () => {
  test('extrae el boundary del content-type', () => {
    expect(parseBoundary('multipart/x-mixed-replace; boundary=myboundary')).toBe('myboundary');
    expect(parseBoundary('multipart/x-mixed-replace; boundary="abc123"')).toBe('abc123');
    expect(parseBoundary('text/html')).toBeNull();
  });

  test('separa evento, snapshot JPEG y heartbeat en un stream completo', () => {
    const parser = new MultipartStreamParser(BOUNDARY);
    const seen = collectParts(parser);

    parser.feed(buildSnapManagerStream());

    expect(seen.parts).toHaveLength(2);
    expect(seen.parts[0].headers['content-type']).toBe('text/plain');
    expect(seen.parts[0].body.toString()).toContain('TrafficCar.PlateNumber=ZZZ12345');
    expect(seen.parts[1].headers['content-type']).toBe('image/jpeg');
    expect(seen.parts[1].body[0]).toBe(0xff);
    expect(seen.parts[1].body[1]).toBe(0xd8);
    expect(seen.heartbeats).toBe(1);
  });

  test('el JPEG sobrevive intacto aunque contenga el boundary como bytes', () => {
    const parser = new MultipartStreamParser(BOUNDARY);
    const seen = collectParts(parser);

    parser.feed(buildSnapManagerStream());

    const jpeg = seen.parts[1].body;
    expect(jpeg.toString('latin1')).toContain('--myboundary falso dentro del JPEG');
    expect(jpeg[jpeg.length - 2]).toBe(0xff);
    expect(jpeg[jpeg.length - 1]).toBe(0xd9);
  });

  test.each([1, 3, 7, 16])('procesa el stream en chunks parciales de %i bytes', chunkSize => {
    const parser = new MultipartStreamParser(BOUNDARY);
    const seen = collectParts(parser);
    const stream = buildSnapManagerStream();

    for (let offset = 0; offset < stream.length; offset += chunkSize) {
      parser.feed(stream.subarray(offset, offset + chunkSize));
    }

    expect(seen.parts).toHaveLength(2);
    expect(seen.heartbeats).toBe(1);
    expect(seen.parts[1].body[0]).toBe(0xff);
  });

  test('procesa formato eventManager attach (Code=...;action=...)', () => {
    const parser = new MultipartStreamParser(BOUNDARY);
    const seen = collectParts(parser);

    parser.feed(textPart('Code=VideoMotion;action=Start;index=0'));

    expect(seen.parts).toHaveLength(1);
    expect(seen.parts[0].body.toString()).toBe('Code=VideoMotion;action=Start;index=0');
  });
});

describe('parseEventText (normalización Dahua)', () => {
  test('parsea formato snapManager y normaliza canal 0-based → 1-based', () => {
    const events = parseEventText(SNAP_EVENT_TEXT);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        code: 'TrafficJunction',
        action: 'Pulse',
        channel: 1, // respuesta trae 0; el conector trabaja 1-based (spec §3.5.1)
        pts: '42949485818.0',
        plate: 'ZZZ12345',
      })
    );
  });

  test('parsea múltiples eventos agrupados por índice', () => {
    const text = [
      'Events[0].Channel=0',
      'Events[0].EventBaseInfo.Code=VideoMotion',
      'Events[1].Channel=3',
      'Events[1].EventBaseInfo.Code=VideoBlind',
    ].join('\r\n');

    const events = parseEventText(text);

    expect(events).toHaveLength(2);
    expect(events[0].channel).toBe(1);
    expect(events[1].channel).toBe(4);
    expect(events[1].code).toBe('VideoBlind');
  });

  test('parsea formato eventManager con data JSON', () => {
    const events = parseEventText('Code=FaceDetection;action=Start;index=2;data={"Faces":[{"Age":40}]}');

    expect(events).toHaveLength(1);
    expect(events[0].code).toBe('FaceDetection');
    expect(events[0].channel).toBe(3);
    expect(events[0].raw.data.Faces[0].Age).toBe(40);
  });

  test('texto vacío o ilegible devuelve lista vacía', () => {
    expect(parseEventText('')).toEqual([]);
    expect(parseEventText('garbage sin formato')).toEqual([]);
  });
});
