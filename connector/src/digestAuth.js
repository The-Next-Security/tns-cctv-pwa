// HTTP Digest auth (RFC 7616 / RFC 2617) para los NVR Dahua:
// flujo 401 → parsear challenge → calcular response → reintentar con Authorization.
// Los NVR del parque usan algorithm=MD5 con qop=auth (V3.26 §2.1).
const crypto = require('crypto');

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

// Parsea el header WWW-Authenticate: Digest realm="...", nonce="...", qop="auth", ...
function parseChallenge(wwwAuthenticate) {
  if (!wwwAuthenticate || !/^Digest /i.test(wwwAuthenticate)) return null;
  const params = {};
  const body = wwwAuthenticate.replace(/^Digest /i, '');
  const re = /(\w+)=(?:"([^"]*)"|([^",\s]+))/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    params[match[1]] = match[2] ?? match[3];
  }
  return params;
}

function buildAuthorizationHeader({ username, password, method, uri, challenge, nc = 1, cnonce }) {
  const realm = challenge.realm ?? '';
  const nonce = challenge.nonce ?? '';
  const qop = challenge.qop ? challenge.qop.split(',')[0].trim() : null;
  const algorithm = (challenge.algorithm ?? 'MD5').toUpperCase();
  const clientNonce = cnonce ?? crypto.randomBytes(8).toString('hex');
  const ncHex = String(nc).padStart(8, '0');

  let ha1 = md5(`${username}:${realm}:${password}`);
  if (algorithm === 'MD5-SESS') {
    ha1 = md5(`${ha1}:${nonce}:${clientNonce}`);
  }
  const ha2 = md5(`${method}:${uri}`);

  const response = qop
    ? md5(`${ha1}:${nonce}:${ncHex}:${clientNonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  const parts = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
    `algorithm=${algorithm}`,
  ];
  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);
  if (qop) parts.push(`qop=${qop}`, `nc=${ncHex}`, `cnonce="${clientNonce}"`);

  return `Digest ${parts.join(', ')}`;
}

module.exports = { parseChallenge, buildAuthorizationHeader };
