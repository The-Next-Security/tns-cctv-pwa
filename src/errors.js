function errorEnvelope(code, message, requestId, details = []) {
  return {
    error: {
      code,
      message,
      details,
      request_id: requestId,
    },
  };
}

module.exports = { errorEnvelope };