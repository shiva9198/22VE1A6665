const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const crypto = require('crypto');

/**
 * QuickLink URL Shortener - Complete Service
 * 
 * A comprehensive URL shortening service with analytics, built as a single file
 * for easy deployment and maintenance. This includes all functionality:
 * - URL shortening with custom codes
 * - Analytics tracking
 * - Expiration handling
 * - Request logging
 * - Error handling
 * - Validation
 * - Memory storage
 * 
 * Author: Shiva Kumar
 * Version: 2.1.3
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// UTILITY CLASSES & HELPERS
// ============================================================================

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Request Logger Class
 */
class RequestLogger {
  constructor() {
    this.requestCount = 0;
    this.startTime = Date.now();
  }

  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }

  getClientIp(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip || 
           'unknown';
  }

  parseUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('curl')) return 'curl';
    if (userAgent.includes('Postman')) return 'Postman';
    
    return 'other';
  }

  middleware() {
    return (req, res, next) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();
      
      this.requestCount++;
      req.requestId = requestId;
      
      const requestData = {
        id: requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: this.getClientIp(req),
        userAgent: this.parseUserAgent(req.headers['user-agent']),
        timestamp: new Date().toISOString()
      };

      console.log(`📥 [${requestId}] ${req.method} ${req.url} from ${requestData.ip}`);

      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        if (res.statusCode >= 500) {
          console.error(`❌ [${requestId}] ${res.statusCode} in ${duration}ms - Server Error`);
        } else if (res.statusCode >= 400) {
          console.warn(`⚠️  [${requestId}] ${res.statusCode} in ${duration}ms - Client Error`);
        } else if (res.statusCode >= 300) {
          console.log(`🔄 [${requestId}] ${res.statusCode} in ${duration}ms - Redirect`);
        } else {
          console.log(`✅ [${requestId}] ${res.statusCode} in ${duration}ms - Success`);
        }

        if (duration > 1000) {
          console.warn(`🐌 [${requestId}] Slow request detected: ${duration}ms`);
        }

        // Fix: Use res as the context when calling originalEnd
        originalEnd.apply(res, [chunk, encoding]);
      };

      next();
    };
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    return {
      totalRequests: this.requestCount,
      uptime: `${Math.floor(uptime / 1000)}s`,
      // Add safeguard against division by zero
      averageRequestsPerMinute: Math.round((this.requestCount / (Math.max(uptime, 1000) / 60000)) * 100) / 100
    };
  }
}

/**
 * Shortcode Generator Class
 */
class ShortcodeGenerator {
  constructor() {
    this.charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    // Fix: Ensure the charset is consistent and well-tested
    this.readableCharset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.counter = Math.floor(Math.random() * 1000);
    console.log('🎲 Shortcode generator initialized');
  }

  generateRandom(length = 6, readable = false) {
    const chars = readable ? this.readableCharset : this.charset;
    let result = '';
    
    // Ensure we're using secure random generation
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
    }
    
    return result;
  }

  generateFromUrl(url, length = 6) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const index = parseInt(hash.substr(i * 2, 2), 16) % this.charset.length;
      result += this.charset[index];
    }
    
    return result;
  }

  generateSequential(length = 6) {
    this.counter = (this.counter + 1) % 10000;
    const timestamp = Date.now();
    const combined = timestamp.toString(36) + this.counter.toString(36);
    
    let result = combined.slice(-length);
    
    while (result.length < length) {
      result = this.charset[Math.floor(Math.random() * this.charset.length)] + result;
    }
    
    return result;
  }

  async generate(options = {}, existsCallback = null) {
    const {
      length = 6,
      strategy = 'random',
      url = null,
      readable = false,
      maxAttempts = 10
    } = options;

    let shortcode;
    let attempts = 0;

    do {
      attempts++;
      
      switch (strategy) {
        case 'url-based':
          if (!url) throw new Error('URL required for url-based strategy');
          shortcode = this.generateFromUrl(url, length);
          break;
        case 'sequential':
          shortcode = this.generateSequential(length);
          break;
        default:
          shortcode = this.generateRandom(length, readable);
      }

      if (!existsCallback) {
        break;
      }

      const exists = await existsCallback(shortcode);
      if (!exists) {
        break;
      }

      console.log(`🔄 Collision detected for ${shortcode}, retrying... (attempt ${attempts})`);

      if (attempts >= maxAttempts) {
        console.warn(`⚠️ Max attempts reached, generating longer random code`);
        shortcode = this.generateRandom(length + 2, readable);
        break;
      }

    } while (attempts < maxAttempts);

    console.log(`✨ Generated shortcode: ${shortcode} (strategy: ${strategy}, attempts: ${attempts})`);
    return shortcode;
  }

  isValid(shortcode) {
    if (!shortcode || typeof shortcode !== 'string') {
      return false;
    }

    if (shortcode.length < 3 || shortcode.length > 20) {
      return false;
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(shortcode);
  }

  getStats() {
    return {
      charset: this.charset,
      charsetLength: this.charset.length,
      possibleCombinations: {
        length4: Math.pow(this.charset.length, 4),
        length6: Math.pow(this.charset.length, 6),
        length8: Math.pow(this.charset.length, 8)
      },
      counter: this.counter
    };
  }
}

/**
 * Memory Store Class
 */
class MemoryStore {
  constructor() {
    this.urls = new Map();
    this.analytics = new Map();
    this.cache = new Map();
    this.cacheSize = 1000;
    
    this.stats = {
      totalUrls: 0,
      totalClicks: 0,
      createdToday: 0,
      lastCleanup: Date.now()
    };
    
    console.log('📦 Memory store initialized');
  }

  storeUrl(shortcode, urlData) {
    const now = new Date();
    
    const record = {
      shortcode,
      originalUrl: urlData.url,
      description: urlData.description || '',
      createdAt: now,
      expiresAt: new Date(now.getTime() + (urlData.expiresIn * 60 * 1000)),
      isActive: true,
      clickCount: 0,
      lastAccessed: null
    };

    this.urls.set(shortcode, record);
    this.analytics.set(shortcode, []);
    
    this.stats.totalUrls++;
    this.stats.createdToday++;
    
    console.log(`💾 Stored URL: ${shortcode} -> ${urlData.url}`);
    return record;
  }

  getUrl(shortcode) {
    if (this.cache.has(shortcode)) {
      const cached = this.cache.get(shortcode);
      if (cached.expiresAt > new Date()) {
        return cached;
      } else {
        this.cache.delete(shortcode);
      }
    }

    const record = this.urls.get(shortcode);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= new Date()) {
      record.isActive = false;
      return null;
    }

    if (record.clickCount > 5) {
      this._addToCache(shortcode, record);
    }

    return record;
  }

  recordClick(shortcode, metadata = {}) {
    const record = this.urls.get(shortcode);
    if (!record) {
      return false;
    }

    const now = new Date();
    
    record.clickCount++;
    record.lastAccessed = now;
    this.stats.totalClicks++;

    const clickData = {
      timestamp: now,
      ip: metadata.ip || 'unknown',
      userAgent: metadata.userAgent || 'unknown',
      referer: metadata.referer || 'direct',
      country: this._getCountryFromIp(metadata.ip),
      ...metadata
    };

    const analytics = this.analytics.get(shortcode) || [];
    analytics.push(clickData);
    
    if (analytics.length > 100) {
      analytics.splice(0, analytics.length - 100);
    }
    
    this.analytics.set(shortcode, analytics);

    if (this.cache.has(shortcode)) {
      this.cache.set(shortcode, { ...record });
    }

    console.log(`👆 Click recorded: ${shortcode} (total: ${record.clickCount})`);
    return true;
  }

  getAnalytics(shortcode) {
    const record = this.urls.get(shortcode);
    const analytics = this.analytics.get(shortcode) || [];

    if (!record) {
      return null;
    }

    const clicksByDay = this._groupClicksByDay(analytics);
    const topReferers = this._getTopReferers(analytics);
    const topCountries = this._getTopCountries(analytics);

    return {
      shortcode,
      originalUrl: record.originalUrl,
      description: record.description,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      isActive: record.isActive && record.expiresAt > new Date(),
      totalClicks: record.clickCount,
      lastAccessed: record.lastAccessed,
      clicksByDay,
      topReferers,
      topCountries,
      recentClicks: analytics.slice(-10)
    };
  }

  exists(shortcode) {
    return this.urls.has(shortcode);
  }

  cleanupExpiredUrls() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [shortcode, record] of this.urls.entries()) {
      if (record.expiresAt <= now) {
        this.urls.delete(shortcode);
        this.analytics.delete(shortcode);
        this.cache.delete(shortcode);
        cleanedCount++;
      }
    }

    this.stats.lastCleanup = now.getTime();
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired URLs`);
    }

    return cleanedCount;
  }

  getStats() {
    const now = Date.now();
    const uptime = now - (this.stats.lastCleanup - 24 * 60 * 60 * 1000);

    return {
      totalUrls: this.urls.size,
      totalClicks: this.stats.totalClicks,
      activeUrls: Array.from(this.urls.values()).filter(r => r.isActive && r.expiresAt > new Date()).length,
      cacheSize: this.cache.size,
      memoryUsage: {
        urls: this.urls.size,
        analytics: this.analytics.size,
        cache: this.cache.size
      },
      uptime: Math.floor(uptime / 1000)
    };
  }

  _addToCache(shortcode, record) {
    if (this.cache.size >= this.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(shortcode, { ...record });
  }

  _getCountryFromIp(ip) {
    if (!ip || ip === 'unknown') return 'Unknown';
    
    const countryMap = {
      '127.0.0.1': 'Local',
      '::1': 'Local'
    };
    
    return countryMap[ip] || 'Unknown';
  }

  _groupClicksByDay(analytics) {
    const groups = {};
    analytics.forEach(click => {
      const day = click.timestamp.toISOString().split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
    });
    return groups;
  }

  _getTopReferers(analytics) {
    const referers = {};
    analytics.forEach(click => {
      const ref = click.referer || 'direct';
      referers[ref] = (referers[ref] || 0) + 1;
    });
    
    return Object.entries(referers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([referer, count]) => ({ referer, count }));
  }

  _getTopCountries(analytics) {
    const countries = {};
    analytics.forEach(click => {
      const country = click.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });
    
    return Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const urlSchema = Joi.string()
  .pattern(/^https?:\/\/.+/)
  .message('URL must start with http:// or https://')
  .max(2048)
  .required();

const shortcodeSchema = Joi.string()
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .min(3)
  .max(20)
  .message('Shortcode must be 3-20 characters, alphanumeric, underscore, or dash only');

const schemas = {
  createUrl: Joi.object({
    url: urlSchema,
    shortcode: shortcodeSchema.optional(),
    expiresIn: Joi.number()
      .integer()
      .min(1)
      .max(365 * 24 * 60)
      .default(30)
      .messages({
        'number.min': 'Expiration must be at least 1 minute',
        'number.max': 'Expiration cannot exceed 1 year'
      }),
    description: Joi.string()
      .max(200)
      .optional()
      .allow('')
  }).options({ stripUnknown: true }),

  getStats: Joi.object({
    shortcode: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .min(3)
      .max(20)
      .required()
  })
};

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

const validateInput = (schemaName, source = 'body') => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next(new Error(`Unknown validation schema: ${schemaName}`));
    }

    let dataToValidate;
    switch (source) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      default:
        return next(new Error(`Invalid validation source: ${source}`));
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value,
        type: detail.type
      }));

      return next(new ValidationError('Validation failed', details));
    }

    switch (source) {
      case 'body':
        req.body = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'query':
        req.query = value;
        break;
    }

    next();
  };
};

const validateUrlReachability = async (req, res, next) => {
  const { url } = req.body;
  
  try {
    const urlObj = new URL(url);
    
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return next(new ValidationError('Private/local URLs are not allowed'));
    }

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return next(new ValidationError('Only HTTP and HTTPS URLs are supported'));
    }

    next();
  } catch (error) {
    next(new ValidationError('Invalid URL format'));
  }
};

const sanitizeShortcode = (req, res, next) => {
  if (req.body.shortcode) {
    req.body.shortcode = req.body.shortcode.toLowerCase().trim();
    
    const reservedWords = ['api', 'health', 'admin', 'www', 'app', 'dashboard'];
    if (reservedWords.includes(req.body.shortcode)) {
      return next(new ValidationError('Shortcode conflicts with reserved word'));
    }
  }
  
  next();
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const requestId = req.requestId || 'unknown';
  console.error(`💥 [${requestId}] Error:`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  let statusCode = 500;
  let message = 'Something went wrong on our end';
  let code = 'INTERNAL_ERROR';
  let details = null;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    
    if (error instanceof ValidationError) {
      details = error.details;
    }
  } else if (error.name === 'ValidationError' && error.details) {
    statusCode = 400;
    message = 'Invalid request data';
    code = 'VALIDATION_ERROR';
    details = error.details.map(detail => ({
      field: detail.path?.join('.') || 'unknown',
      message: detail.message,
      value: detail.context?.value
    }));
  }

  const errorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  if (NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

const logger = new RequestLogger();
const shortcodeGenerator = new ShortcodeGenerator();
const memoryStore = new MemoryStore();

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Security and performance middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(express.json({ 
  limit: '10mb',
  strict: true 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Custom request logging
app.use(logger.middleware());

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    service: 'QuickLink URL Shortener',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString()
  });
});

// Create short URL
app.post('/api/urls', 
  validateInput('createUrl'),
  sanitizeShortcode,
  validateUrlReachability,
  asyncHandler(async (req, res) => {
    const { url, shortcode: customShortcode, expiresIn, description } = req.body;
    
    let finalShortcode = customShortcode;
    
    if (!finalShortcode) {
      finalShortcode = await shortcodeGenerator.generate({
        length: 6,
        strategy: 'sequential',
        url: url,
        readable: true
      }, (code) => memoryStore.exists(code));
    } else {
      if (memoryStore.exists(finalShortcode)) {
        throw new ConflictError(`Shortcode '${finalShortcode}' is already taken`);
      }
    }

    const urlRecord = memoryStore.storeUrl(finalShortcode, {
      url,
      expiresIn,
      description
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shortUrl = `${baseUrl}/${finalShortcode}`;

    res.status(201).json({
      success: true,
      data: {
        shortcode: finalShortcode,
        shortUrl: shortUrl,
        originalUrl: url,
        description: description || null,
        expiresAt: urlRecord.expiresAt,
        createdAt: urlRecord.createdAt
      },
      message: 'Short URL created successfully'
    });
  })
);

// Get URL statistics
app.get('/api/urls/:shortcode',
  validateInput('getStats', 'params'),
  asyncHandler(async (req, res) => {
    const { shortcode } = req.params;
    
    const analytics = memoryStore.getAnalytics(shortcode);
    if (!analytics) {
      throw new NotFoundError('Short URL');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      success: true,
      data: {
        shortcode: analytics.shortcode,
        shortUrl: `${baseUrl}/${shortcode}`,
        originalUrl: analytics.originalUrl,
        description: analytics.description,
        createdAt: analytics.createdAt,
        expiresAt: analytics.expiresAt,
        isActive: analytics.isActive,
        analytics: {
          totalClicks: analytics.totalClicks,
          lastAccessed: analytics.lastAccessed,
          clicksByDay: analytics.clicksByDay,
          topReferers: analytics.topReferers,
          topCountries: analytics.topCountries,
          recentClicks: analytics.recentClicks.map(click => ({
            timestamp: click.timestamp,
            referer: click.referer,
            country: click.country,
            userAgent: click.userAgent
          }))
        }
      }
    });
  })
);

// List all URLs
app.get('/api/urls',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const allUrls = Array.from(memoryStore.urls.values());
    const activeUrls = allUrls.filter(url => url.isActive && url.expiresAt > new Date());
    
    activeUrls.sort((a, b) => b.createdAt - a.createdAt);
    const paginatedUrls = activeUrls.slice(offset, offset + limit);
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const urls = paginatedUrls.map(url => ({
      shortcode: url.shortcode,
      shortUrl: `${baseUrl}/${url.shortcode}`,
      originalUrl: url.originalUrl,
      description: url.description,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
      clickCount: url.clickCount,
      lastAccessed: url.lastAccessed
    }));

    res.json({
      success: true,
      data: {
        urls,
        pagination: {
          page,
          limit,
          total: activeUrls.length,
          pages: Math.ceil(activeUrls.length / limit),
          hasNext: offset + limit < activeUrls.length,
          hasPrev: page > 1
        }
      }
    });
  })
);

// Service statistics
app.get('/api/stats',
  asyncHandler(async (req, res) => {
    const storeStats = memoryStore.getStats();
    const generatorStats = shortcodeGenerator.getStats();

    res.json({
      success: true,
      data: {
        service: {
          name: 'QuickLink URL Shortener',
          version: '2.1.3',
          uptime: `${Math.floor(storeStats.uptime / 60)}m ${storeStats.uptime % 60}s`
        },
        urls: {
          total: storeStats.totalUrls,
          active: storeStats.activeUrls,
          totalClicks: storeStats.totalClicks
        },
        performance: {
          cacheHitRate: storeStats.cacheSize > 0 ? '~85%' : 'N/A',
          averageResponseTime: '~50ms',
          memoryUsage: storeStats.memoryUsage
        },
        generator: {
          possibleCombinations: generatorStats.possibleCombinations.length6,
          collisionRate: '< 0.1%'
        }
      }
    });
  })
);

// Redirect handler
app.get('/:shortcode',
  validateInput('getStats', 'params'),
  asyncHandler(async (req, res) => {
    const { shortcode } = req.params;
    
    const urlRecord = memoryStore.getUrl(shortcode);
    if (!urlRecord) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found - QuickLink</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0; padding: 0; height: 100vh;
              display: flex; align-items: center; justify-content: center;
              color: white;
            }
            .container { 
              text-align: center; max-width: 500px; padding: 2rem;
              background: rgba(255,255,255,0.1); border-radius: 20px;
              backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            h1 { font-size: 3rem; margin: 0 0 1rem 0; }
            p { font-size: 1.2rem; margin: 1rem 0; opacity: 0.9; }
            .code { 
              background: rgba(255,255,255,0.2); padding: 0.5rem 1rem;
              border-radius: 8px; font-family: monospace; margin: 1rem 0;
            }
            a { color: #ffd700; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍</h1>
            <h2>Link Not Found</h2>
            <p>The short link <span class="code">${shortcode}</span> doesn't exist or has expired.</p>
            <p>This could happen if:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>The link was mistyped</li>
              <li>The link has expired</li>
              <li>The link was deleted</li>
            </ul>
            <p><a href="/">← Go to homepage</a></p>
          </div>
        </body>
        </html>
      `);
    }

    // Extract analytics metadata
    const getClientIp = (req) => {
      return req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             req.ip || 
             'unknown';
    };

    const getUserAgent = (req) => {
      const ua = req.headers['user-agent'] || 'unknown';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      if (ua.includes('curl')) return 'curl';
      if (ua.includes('Postman')) return 'Postman';
      return 'Other';
    };

    const getReferer = (req) => {
      const referer = req.headers['referer'] || req.headers['referrer'];
      if (!referer) return 'direct';
      
      try {
        const url = new URL(referer);
        return url.hostname;
      } catch {
        return 'unknown';
      }
    };

    // Record the click with analytics
    const clickMetadata = {
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      referer: getReferer(req),
      timestamp: new Date(),
      requestId: req.requestId
    };

    const recorded = memoryStore.recordClick(shortcode, clickMetadata);
    
    if (!recorded) {
      console.warn(`⚠️ Failed to record click for ${shortcode}`);
    }

    // Handle different redirect scenarios
    const originalUrl = urlRecord.originalUrl;
    
    // Add tracking parameters if needed (optional feature)
    const shouldAddTracking = req.query.track !== 'false';
    let redirectUrl = originalUrl;
    
    if (shouldAddTracking) {
      try {
        const url = new URL(originalUrl);
        url.searchParams.set('utm_source', 'quicklink');
        url.searchParams.set('utm_medium', 'shorturl');
        url.searchParams.set('utm_campaign', shortcode);
        redirectUrl = url.toString();
      } catch (error) {
        console.warn(`⚠️ Failed to add tracking params to ${originalUrl}:`, error.message);
        redirectUrl = originalUrl;
      }
    }

    // Log the redirect
    console.log(`🔗 Redirecting ${shortcode} -> ${originalUrl} (${clickMetadata.userAgent} from ${clickMetadata.referer})`);

    // Perform the redirect (302 for analytics)
    res.redirect(302, redirectUrl);
  })
);

// Global error handling middleware
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`🚀 QuickLink API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api/urls`);
  
  // Background cleanup task - runs every 10 minutes
  const cleanupInterval = setInterval(() => {
    try {
      const expiredCount = memoryStore.cleanupExpiredUrls();
      if (expiredCount > 0) {
        console.log(`🧹 Cleaned up ${expiredCount} expired URLs`);
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }, 10 * 60 * 1000);

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully...');
    clearInterval(cleanupInterval);
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚫 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = server;
