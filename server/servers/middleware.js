const rateLimit = require('express-rate-limit');

// Rate limiter — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'Rate limit exceeded. Slow down.' });
  }
});

// Strict limiter for AI endpoints — 20 per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'AI rate limit exceeded.' });
  }
});

// Origin guard — only allow requests from your domains
const originGuard = (req, res, next) => {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const allowed = [
    'https://tsm-shell.fly.dev',
    'https://tsmatter.com',
    'https://clients.tsmatter.com',
    'https://az-ins.tsmatter.com',
    'https://pc-command.tsmatter.com',
    'https://insurance-command.tsmatter.com',
    'https://construction-pro.tsmatter.com',
    'https://financial.tsmatter.com',
    'https://ameris-construction.tsmatter.com',
    'https://dme.tsmatter.com',
    'https://appointments.tsmatter.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  // Allow if no origin (server-to-server), origin matches, or same-origin (no origin header = same site)
  const isAllowed =
    !origin ||
    allowed.some(a => origin.startsWith(a)) ||
    allowed.some(a => referer.startsWith(a)) ||
    origin.endsWith('.tsmatter.com') ||
    origin.endsWith('.fly.dev');

  if (!isAllowed) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
};

// Block common scraper/bot user agents
const botGuard = (req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const blocked = ['python-requests', 'scrapy', 'wget/', 'go-http'];
  // Allow curl from localhost (your own tests)
  const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  if (!isLocal && blocked.some(b => ua.includes(b))) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
};

// Optional TSM API key for server-to-server calls
const apiKeyGuard = (req, res, next) => {
  const key = req.headers['x-tsm-key'];
  if (key && key === process.env.TSM_API_KEY) return next();
  // Fall through to origin check if no key
  originGuard(req, res, next);
};

module.exports = { limiter, aiLimiter, originGuard, botGuard, apiKeyGuard };
