'use strict';

// Groq 429 responses sometimes carry a standard HTTP `Retry-After` header
// (seconds, RFC 7231) in addition to -- or instead of -- a textual
// "Please try again in Xs" hint in the error body. The header is the more
// authoritative signal when present (it reflects Groq's own rate-limit
// window, not a guess), so it takes priority over the text-message parse.

function parseRetryAfterHeader(headerValue) {
  if (!headerValue) return null;
  const seconds = parseFloat(headerValue);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

function parseRetryAfterText(errMsg) {
  if (!errMsg) return null;
  const match = String(errMsg).match(/try again in\s+([\d.]+)\s*s/i);
  if (!match) return null;
  const seconds = parseFloat(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

// retryAfterHeader: the raw `Retry-After` header value (string) from the
//   429 response, or null/undefined if absent.
// errMsg: the response body text, used as a fallback when there's no header.
// fallbackMs: used when neither signal is present.
// maxMs: cap applied to a delay derived from the text-message fallback.
// headerMaxMs: cap applied to a delay derived from the header (looser, since
//   the header is an authoritative provider-stated wait, not a guess).
function retryDelayMs({ retryAfterHeader, errMsg, fallbackMs = 3000, maxMs = 20000, headerMaxMs = 60000 } = {}) {
  const headerSeconds = parseRetryAfterHeader(retryAfterHeader);
  if (headerSeconds !== null) {
    return Math.min(Math.ceil(headerSeconds * 1000) + 250, headerMaxMs);
  }

  const textSeconds = parseRetryAfterText(errMsg);
  if (textSeconds !== null) {
    return Math.min(Math.ceil(textSeconds * 1000) + 500, maxMs);
  }

  return fallbackMs;
}

module.exports = { parseRetryAfterHeader, parseRetryAfterText, retryDelayMs };
