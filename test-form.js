const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Demo data generator
function generateDemoData(instanceNum) {
  const timestamp = Date.now();
  const services = ['airfreight', 'seafreight', 'landtransport', 'customsclearance'];
  const randomService = services[Math.floor(Math.random() * services.length)];
  
  return {
    name: `Test User ${instanceNum}`,
    email: `test${instanceNum}.${timestamp}@example.com`,
    phone: `+971501234${String(instanceNum).padStart(3, '0')}`,
    service_type: randomService,
    message: `This is an automated load test from GitHub Actions.\nInstance: ${instanceNum}\nTimestamp: ${new Date().toISOString()}\nService: ${randomService}`
  };
}

async function runTest() {
  const instanceNum = process.env.INSTANCE_NUM || '1';
  const targetUrl = process.env.TARGET_URL || 'https://freightcore.ae';
  
  console.log(`\n========================================`);
  console.log(`Instance ${instanceNum}: Starting test`);
  console.log(`Target: ${targetUrl}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log(`Browser Log [${instanceNum}]:`, msg.text()));
    
    // Step 1: Navigate to website
    console.log(`Instance ${instanceNum}: Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, `${instanceNum}-01-homepage.png`), fullPage: true });
    console.log(`Instance ${instanceNum}: ✓ Page loaded successfully`);

    // Step 2: Scroll to contact form
    console.log(`Instance ${instanceNum}: Scrolling to contact form...`);
    await page.evaluate(() => {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
    });
    await page.waitForTimeout(1500);

    // Step 3: Wait for form to be visible
    console.log(`Instance ${instanceNum}: Waiting for form elements...`);
    await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Generate demo data
    const demoData = generateDemoData(instanceNum);
    console.log(`Instance ${instanceNum}: Generated demo data:`, JSON.stringify(demoData, null, 2));

    // Step 4: Fill form fields
    console.log(`Instance ${instanceNum}: Filling form fields...`);
    
    // Name field
    await page.fill('input[name="name"]', demoData.name);
    console.log(`Instance ${instanceNum}: ✓ Name field filled`);
    await page.waitForTimeout(300);

    // Email field
    await page.fill('input[name="email"]', demoData.email);
    console.log(`Instance ${instanceNum}: ✓ Email field filled`);
    await page.waitForTimeout(300);

    // Phone field (visible input)
    await page.fill('input[name="phoneraw"]', demoData.phone);
    console.log(`Instance ${instanceNum}: ✓ Phone field filled`);
    await page.waitForTimeout(300);

    // Service type dropdown
    await page.selectOption('select[name="servicetype"]', demoData.service_type);
    console.log(`Instance ${instanceNum}: ✓ Service type selected: ${demoData.service_type}`);
    await page.waitForTimeout(300);

    // Message textarea
    await page.fill('textarea[name="message"]', demoData.message);
    console.log(`Instance ${instanceNum}: ✓ Message field filled`);
    await page.waitForTimeout(500);

    // Take screenshot before submission
    await page.screenshot({ path: path.join(screenshotsDir, `${instanceNum}-02-form-filled.png`), fullPage: true });
    console.log(`Instance ${instanceNum}: ✓ Screenshot captured (form filled)`);

    // Step 5: Submit form
    console.log(`Instance ${instanceNum}: Submitting form...`);
    
    // Wait for response
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('process_contact.php') && response.status() === 200,
        { timeout: 30000 }
      ),
      page.click('form#contact-form button[type="submit"]')
    ]);

    console.log(`Instance ${instanceNum}: ✓ Form submitted, status: ${response.status()}`);
    
    // Wait for success message or response
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successVisible = await page.isVisible('#contact-success-msg');
    console.log(`Instance ${instanceNum}: Success message visible: ${successVisible}`);

    // Take final screenshot
    await page.screenshot({ path: path.join(screenshotsDir, `${instanceNum}-03-after-submit.png`), fullPage: true });
    console.log(`Instance ${instanceNum}: ✓ Final screenshot captured`);

    console.log(`\n========================================`);
    console.log(`Instance ${instanceNum}: ✅ TEST COMPLETED SUCCESSFULLY`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error(`\n========================================`);
    console.error(`Instance ${instanceNum}: ❌ ERROR OCCURRED`);
    console.error(`Error: ${error.message}`);
    console.error(`========================================\n`);
    
    try {
      const page = await browser.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: path.join(screenshotsDir, `${instanceNum}-ERROR.png`), fullPage: true });
        console.log(`Instance ${instanceNum}: Error screenshot saved`);
      }
    } catch (screenshotError) {
      console.error(`Instance ${instanceNum}: Could not capture error screenshot`);
    }
    
    process.exit(1);
  } finally {
    await browser.close();
    console.log(`Instance ${instanceNum}: Browser closed`);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
