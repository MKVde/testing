const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure directories exist
const screenshotsDir = path.join(__dirname, 'screenshots');
const recordingsDir = path.join(__dirname, 'recordings');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Demo data generator
function generateDemoData(instanceNum, browserType) {
  const timestamp = Date.now();
  const services = ['airfreight', 'seafreight', 'landtransport', 'customsclearance'];
  const randomService = services[Math.floor(Math.random() * services.length)];
  
  return {
    name: `Test User ${instanceNum} (${browserType})`,
    email: `test.${browserType}.${instanceNum}.${timestamp}@gmail.com`,
    phone: `+971${Math.floor(Math.random() * 900000000 + 100000000)}`,
    service_type: randomService,
    message: `Automated GUI test from ${browserType.toUpperCase()} browser\nInstance: ${instanceNum}\nTimestamp: ${new Date().toISOString()}\nService: ${randomService}`
  };
}

async function getBrowserExecutable(browserType) {
  if (browserType === 'brave') {
    // Check common Brave installation paths
    const paths = [
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
      '/snap/bin/brave'
    ];
    
    for (const path of paths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    throw new Error('Brave browser not found');
  }
  return null; // Use Playwright's bundled Chromium
}

async function runTest() {
  const instanceNum = process.env.INSTANCE_NUM || '1';
  const browserType = process.env.BROWSER_TYPE || 'chromium';
  const targetUrl = process.env.TARGET_URL || 'https://freightcore.ae';
  const headless = process.env.HEADLESS === 'true';
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Instance ${instanceNum}: Starting GUI test`);
  console.log(`🌐 Browser: ${browserType.toUpperCase()}`);
  console.log(`🎯 Target: ${targetUrl}`);
  console.log(`${'='.repeat(60)}\n`);

  let browser;
  let playwright;
  
  try {
    // Import the correct browser
    if (browserType === 'firefox') {
      const { firefox } = require('playwright');
      playwright = firefox;
      console.log(`📦 Using Firefox browser`);
    } else {
      const { chromium } = require('playwright');
      playwright = chromium;
      console.log(`📦 Using Chromium-based browser`);
    }

    const launchOptions = {
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080'
      ]
    };

    // Configure browser-specific options
    if (browserType === 'chrome' || browserType === 'brave') {
      const executablePath = await getBrowserExecutable(browserType);
      launchOptions.executablePath = executablePath;
      console.log(`✅ Using ${browserType} at: ${executablePath}`);
    }

    browser = await playwright.launch(launchOptions);
    console.log(`✅ ${browserType.toUpperCase()} browser launched in GUI mode`);

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      recordVideo: {
        dir: recordingsDir,
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`📋 Browser Console [${type}]: ${text}`);
    });
    
    // Step 1: Navigate to website
    console.log(`\n🌐 Step 1: Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000); // Let page fully render
    await page.screenshot({ 
      path: path.join(screenshotsDir, `${browserType}-${instanceNum}-01-homepage.png`), 
      fullPage: true 
    });
    console.log(`✅ Page loaded successfully`);

    // Step 2: Scroll to contact form with smooth animation
    console.log(`\n📜 Step 2: Scrolling to contact form...`);
    await page.evaluate(() => {
      const contactSection = document.querySelector('#contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(2000);

    // Step 3: Wait for form to be visible
    console.log(`\n⏳ Step 3: Waiting for form elements...`);
    await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 10000 });
    console.log(`✅ Form is visible`);

    // Generate demo data
    const demoData = generateDemoData(instanceNum, browserType);
    console.log(`\n📝 Generated test data:`);
    console.log(JSON.stringify(demoData, null, 2));

    // Step 4: Fill form fields with realistic delays
    console.log(`\n✍️  Step 4: Filling form fields...`);
    
    // Name field with typing animation
    await page.click('input[name="name"]');
    await page.waitForTimeout(500);
    await page.type('input[name="name"]', demoData.name, { delay: 80 });
    console.log(`✅ Name field filled`);
    await page.waitForTimeout(400);

    // Email field
    await page.click('input[name="email"]');
    await page.waitForTimeout(500);
    await page.type('input[name="email"]', demoData.email, { delay: 60 });
    console.log(`✅ Email field filled`);
    await page.waitForTimeout(400);

    // Phone field
    await page.click('input[name="phoneraw"]');
    await page.waitForTimeout(500);
    await page.type('input[name="phoneraw"]', demoData.phone, { delay: 70 });
    console.log(`✅ Phone field filled`);
    await page.waitForTimeout(400);

    // Service type dropdown with hover
    await page.hover('select[name="servicetype"]');
    await page.waitForTimeout(300);
    await page.selectOption('select[name="servicetype"]', demoData.service_type);
    console.log(`✅ Service type selected: ${demoData.service_type}`);
    await page.waitForTimeout(500);

    // Message textarea
    await page.click('textarea[name="message"]');
    await page.waitForTimeout(500);
    await page.type('textarea[name="message"]', demoData.message, { delay: 50 });
    console.log(`✅ Message field filled`);
    await page.waitForTimeout(1000);

    // Take screenshot of filled form
    await page.screenshot({ 
      path: path.join(screenshotsDir, `${browserType}-${instanceNum}-02-form-filled.png`), 
      fullPage: true 
    });
    console.log(`📸 Screenshot captured: form filled`);

    // Step 5: Hover over submit button then click
    console.log(`\n🖱️  Step 5: Submitting form...`);
    const submitButton = 'form#contact-form button[type="submit"]';
    await page.hover(submitButton);
    await page.waitForTimeout(800);
    
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('process_contact.php'),
        { timeout: 30000 }
      ).catch(() => null),
      page.click(submitButton)
    ]);

    if (response) {
      console.log(`✅ Form submitted, HTTP status: ${response.status()}`);
      const responseBody = await response.text().catch(() => 'Unable to read response');
      console.log(`📥 Response: ${responseBody}`);
    } else {
      console.log(`⚠️  No response captured (might be AJAX)`);
    }
    
    // Wait for success message
    await page.waitForTimeout(4000);
    
    const successVisible = await page.isVisible('#contact-success-msg').catch(() => false);
    console.log(`${successVisible ? '✅' : '❌'} Success message visible: ${successVisible}`);

    // Take final screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, `${browserType}-${instanceNum}-03-after-submit.png`), 
      fullPage: true 
    });
    console.log(`📸 Final screenshot captured`);

    // Keep browser open for a moment to ensure recording captures everything
    await page.waitForTimeout(3000);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Instance ${instanceNum} (${browserType.toUpperCase()}): TEST COMPLETED SUCCESSFULLY`);
    console.log(`${'='.repeat(60)}\n`);

    await context.close();
    await browser.close();

  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ Instance ${instanceNum} (${browserType.toUpperCase()}): ERROR OCCURRED`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error(`${'='.repeat(60)}\n`);
    
    try {
      if (browser) {
        const contexts = browser.contexts();
        if (contexts.length > 0) {
          const pages = contexts[0].pages();
          if (pages.length > 0) {
            await pages[0].screenshot({ 
              path: path.join(screenshotsDir, `${browserType}-${instanceNum}-ERROR.png`), 
              fullPage: true 
            });
            console.log(`📸 Error screenshot saved`);
          }
        }
      }
    } catch (screenshotError) {
      console.error(`Could not capture error screenshot: ${screenshotError.message}`);
    }
    
    if (browser) {
      await browser.close();
    }
    
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
