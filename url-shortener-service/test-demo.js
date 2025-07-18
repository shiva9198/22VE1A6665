#!/usr/bin/env node

/**
 * QuickLink URL Shortener - Demo Test Script
 * 
 * This script demonstrates all the features of the URL shortener service.
 * Run this after starting the server to see it in action.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Helper function for colored console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${colors.bold}${colors.blue}Step ${step}: ${description}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  log(`${colors.bold}${colors.blue}🚀 QuickLink URL Shortener Demo${colors.reset}\n`);
  
  try {
    // Step 1: Health Check
    logStep(1, 'Health Check');
    const health = await axios.get(`${BASE_URL}/health`);
    logSuccess(`Service is healthy: ${health.data.service} (${health.data.uptime})`);
    
    // Step 2: Create URLs with different configurations
    logStep(2, 'Creating Short URLs');
    
    // Basic URL
    const url1 = await axios.post(`${BASE_URL}/api/urls`, {
      url: 'https://www.github.com',
      description: 'GitHub Homepage'
    });
    logSuccess(`Created: ${url1.data.data.shortUrl} -> ${url1.data.data.originalUrl}`);
    
    // Custom shortcode
    const url2 = await axios.post(`${BASE_URL}/api/urls`, {
      url: 'https://www.stackoverflow.com',
      shortcode: 'stackoverflow',
      expiresIn: 60,
      description: 'Stack Overflow - Developer Q&A'
    });
    logSuccess(`Created custom: ${url2.data.data.shortUrl} -> ${url2.data.data.originalUrl}`);
    
    // Another URL for testing
    const url3 = await axios.post(`${BASE_URL}/api/urls`, {
      url: 'https://www.npmjs.com',
      description: 'NPM Package Registry'
    });
    logSuccess(`Created: ${url3.data.data.shortUrl} -> ${url3.data.data.originalUrl}`);
    
    // Step 3: Test redirects and generate analytics
    logStep(3, 'Testing Redirects & Generating Analytics');
    
    const shortcodes = [
      url1.data.data.shortcode,
      url2.data.data.shortcode,
      url3.data.data.shortcode
    ];
    
    // Simulate multiple clicks
    for (let i = 0; i < 3; i++) {
      for (const shortcode of shortcodes) {
        try {
          await axios.get(`${BASE_URL}/${shortcode}`, {
            maxRedirects: 0,
            validateStatus: (status) => status === 302
          });
          logSuccess(`Click recorded for ${shortcode}`);
        } catch (error) {
          if (error.response && error.response.status === 302) {
            logSuccess(`Click recorded for ${shortcode} (redirected)`);
          } else {
            logError(`Failed to access ${shortcode}: ${error.message}`);
          }
        }
        await sleep(100); // Small delay between requests
      }
    }
    
    // Step 4: Get analytics for each URL
    logStep(4, 'Retrieving Analytics');
    
    for (const shortcode of shortcodes) {
      const analytics = await axios.get(`${BASE_URL}/api/urls/${shortcode}`);
      const data = analytics.data.data;
      
      log(`\n📊 Analytics for ${shortcode}:`, 'yellow');
      log(`   Original URL: ${data.originalUrl}`);
      log(`   Description: ${data.description}`);
      log(`   Total Clicks: ${data.analytics.totalClicks}`);
      log(`   Created: ${new Date(data.createdAt).toLocaleString()}`);
      log(`   Expires: ${new Date(data.expiresAt).toLocaleString()}`);
      log(`   Top Referers: ${JSON.stringify(data.analytics.topReferers)}`);
    }
    
    // Step 5: List all URLs
    logStep(5, 'Listing All URLs');
    
    const allUrls = await axios.get(`${BASE_URL}/api/urls?limit=10`);
    log(`\n📋 All URLs (${allUrls.data.data.pagination.total} total):`, 'yellow');
    
    allUrls.data.data.urls.forEach((url, index) => {
      log(`   ${index + 1}. ${url.shortUrl} -> ${url.originalUrl}`);
      log(`      Clicks: ${url.clickCount}, Created: ${new Date(url.createdAt).toLocaleString()}`);
    });
    
    // Step 6: Service Statistics
    logStep(6, 'Service Statistics');
    
    const stats = await axios.get(`${BASE_URL}/api/stats`);
    const statsData = stats.data.data;
    
    log(`\n📈 Service Statistics:`, 'yellow');
    log(`   Service: ${statsData.service.name} v${statsData.service.version}`);
    log(`   Uptime: ${statsData.service.uptime}`);
    log(`   Total URLs: ${statsData.urls.total}`);
    log(`   Active URLs: ${statsData.urls.active}`);
    log(`   Total Clicks: ${statsData.urls.totalClicks}`);
    log(`   Memory Usage: ${JSON.stringify(statsData.performance.memoryUsage)}`);
    log(`   Possible Combinations: ${statsData.generator.possibleCombinations.toLocaleString()}`);
    
    // Step 7: Test error handling
    logStep(7, 'Testing Error Handling');
    
    // Try to access non-existent URL
    try {
      await axios.get(`${BASE_URL}/nonexistent`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logSuccess('404 error handling works correctly');
      }
    }
    
    // Try to create URL with invalid data
    try {
      await axios.post(`${BASE_URL}/api/urls`, {
        url: 'invalid-url'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        logSuccess('Input validation works correctly');
      }
    }
    
    // Try to create URL with duplicate shortcode
    try {
      await axios.post(`${BASE_URL}/api/urls`, {
        url: 'https://www.example.com',
        shortcode: 'stackoverflow' // This should already exist
      });
    } catch (error) {
      if (error.response && error.response.status === 409) {
        logSuccess('Duplicate shortcode detection works correctly');
      }
    }
    
    // Final summary
    log(`\n${colors.bold}${colors.green}🎉 Demo completed successfully!${colors.reset}`);
    log(`\n${colors.yellow}Try these URLs in your browser:${colors.reset}`);
    shortcodes.forEach(shortcode => {
      log(`   ${BASE_URL}/${shortcode}`);
    });
    
    log(`\n${colors.yellow}API Endpoints:${colors.reset}`);
    log(`   Health: ${BASE_URL}/health`);
    log(`   Create URL: POST ${BASE_URL}/api/urls`);
    log(`   Get Analytics: GET ${BASE_URL}/api/urls/{shortcode}`);
    log(`   List URLs: GET ${BASE_URL}/api/urls`);
    log(`   Statistics: GET ${BASE_URL}/api/stats`);
    
  } catch (error) {
    logError(`Demo failed: ${error.message}`);
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
