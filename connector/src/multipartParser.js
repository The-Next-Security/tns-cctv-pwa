// Parser streaming de multipart/x-mixed-replace (Dahua HTTP API V3.26).
// Diseñado para feeds por chunks parciales: el stream HTTP puede cortar un
// part (headers o JPEG binario) en cualquier byte. Emite:
//   'part'      → { headers: {k:v}, body: Buffer }
//   'heartbeat' → cuando el body es el keep-alive ("Heartbeat" / "heartbeat")
const { EventEmitter } = require('events');

const HEADER_SEPARATOR = Buffer.from('\r\n\r\n');

class MultipartStreamParser extends EventEmitter {
  constructor(boundary) {
    super();
    if (!boundary) throw new Error('boundary requerido');
    this.delimiter = Buffer.from(`--${boundary}`);
    this.buffer = Buffer.alloc(0);
    // Estados: 'seek-boundary' → 'after-boundary' → 'headers' → 'body'
    this.state = 'seek-boundary';
    this.currentHeaders = null;
    this.expectedLength = null;
  }

  feed(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let progressed = true;
    while (progressed) {
      progressed = false;
      if (this.state === 'seek-boundary') progressed = this.consumeBoundary();
      else if (this.state === 'after-boundary') progressed = this.consumeAfterBoundary();
      else if (this.state === 'headers') progressed = this.consumeHeaders();
      else if (this.state === 'body') progressed = this.consumeBody();
    }
  }

  consumeBoundary() {
    const idx = this.buffer.indexOf(this.delimiter);
    if (idx === -1) {
      // Conservar solo la cola que podría ser un delimitador parcial.
      const keep = Math.min(this.buffer.length, this.delimiter.length - 1);
      this.buffer = this.buffer.subarray(this.buffer.length - keep);
      return false;
    }
    this.buffer = this.buffer.subarray(idx + this.delimiter.length);
    this.state = 'after-boundary';
    return true;
  }

  // Tras el delimitador viene CRLF (nuevo part) o "--" (cierre del stream).
  consumeAfterBoundary() {
    if (this.buffer.length < 2) return false;
    if (this.buffer[0] === 0x2d && this.buffer[1] === 0x2d) {
      this.emit('end');
      this.buffer = Buffer.alloc(0);
      this.state = 'seek-boundary';
      return false;
    }
    if (this.buffer[0] === 0x0d && this.buffer[1] === 0x0a) {
      this.buffer = this.buffer.subarray(2);
    } else if (this.buffer[0] === 0x0a) {
      this.buffer = this.buffer.subarray(1);
    }
    this.state = 'headers';
    return true;
  }

  consumeHeaders() {
    const idx = this.buffer.indexOf(HEADER_SEPARATOR);
    if (idx === -1) return false;
    const rawHeaders = this.buffer.subarray(0, idx).toString('utf8');
    this.buffer = this.buffer.subarray(idx + HEADER_SEPARATOR.length);
    this.currentHeaders = {};
    for (const line of rawHeaders.split(/\r?\n/)) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      this.currentHeaders[line.slice(0, sep).trim().toLowerCase()] = line.slice(sep + 1).trim();
    }
    const length = Number.parseInt(this.currentHeaders['content-length'] ?? '', 10);
    this.expectedLength = Number.isFinite(length) ? length : null;
    this.state = 'body';
    return true;
  }

  consumeBody() {
    let body;
    if (this.expectedLength !== null) {
      if (this.buffer.length < this.expectedLength) return false;
      body = this.buffer.subarray(0, this.expectedLength);
      this.buffer = this.buffer.subarray(this.expectedLength);
    } else {
      // Sin Content-Length (firmware viejo): el part termina en el próximo delimitador.
      const idx = this.buffer.indexOf(this.delimiter);
      if (idx === -1) return false;
      body = this.buffer.subarray(0, idx);
    }
    this.emitPart(this.currentHeaders, Buffer.from(body));
    this.currentHeaders = null;
    this.expectedLength = null;
    this.state = 'seek-boundary';
    return true;
  }

  emitPart(headers, body) {
    const text = body.toString('utf8').trim();
    if (/^heartbeat$/i.test(text)) {
      this.emit('heartbeat');
      return;
    }
    this.emit('part', { headers, body });
  }
}

// Extrae el boundary del header Content-Type de la respuesta HTTP.
function parseBoundary(contentType = '') {
  const match = /boundary="?([^";]+)"?/i.exec(contentType);
  return match ? match[1] : null;
}

module.exports = { MultipartStreamParser, parseBoundary };
