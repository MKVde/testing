const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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
    message: `🤖 Automated Load Test\n\n` +
             `Instance: ${instanceNum}\n` +
             `Timestamp: ${new Date().toISOString()}\n` +
             `Service: ${randomService}\n` +
             `Browser: Chromium with GUI on Xvfb\n` +
             `\nThis is a test submission from GitHub Actions.`
  };
}

async function runTest() {
  const instanceNum = process.env.INSTANCE_NUM || '1';
  const targetUrl = process.env.TARGET_URL || 'https://freightcore.ae';
  
  // Create screenshots directory for this instance
  const screenshotsDir = path.join(__dirname, 'test-results', `instance-${instanceNum}`);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Instance ${instanceNum}: Starting Load Test`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Target: ${targetUrl}`);
  console.log(`💾 Screenshots: ${screenshotsDir}`);
  console.log(`🖥️  Display: ${process.env.DISPLAY || 'default'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Launch browser with GUI (runs on Xvfb virtual display)
  const browser = await chromium.launch({
    headless: false,  // GUI mode (on virtual display)
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US'
    });

    const page = await context.newPage();
    
    // Enable console logging from browser
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🌐 Browser [${instanceNum}] ${type.toUpperCase()}:`, msg.text());
      }
    });
    
    // Log page errors
    page.on('pageerror', error => {
      console.error(`❌ Page Error [${instanceNum}]:`, error.message);
    });

    // ============================================
    // STEP 1: Navigate to Website
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Navigating to ${targetUrl}...`);
    const startTime = Date.now();
    
    await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Instance ${instanceNum}: Page loaded in ${(loadTime / 1000).toFixed(2)}s`);
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(screenshotsDir, `01-homepage.png`),
      fullPage: true 
    });
    console.log(`📸 Instance ${instanceNum}: Screenshot 1/4 - Homepage captured`);

    // ============================================
    // STEP 2: Scroll to Contact Form
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Scrolling to contact section...`);
    await page.evaluate(() => {
      const contactSection = document.querySelector('#contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, `02-contact-section.png`),
      fullPage: true 
    });
    console.log(`📸 Instance ${instanceNum}: Screenshot 2/4 - Contact section visible`);

    // ============================================
    // STEP 3: Wait for Form Elements
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Waiting for form elements...`);
    await page.waitForSelector('input[name="name"]', { 
      state: 'visible', 
      timeout: 15000 
    });
    console.log(`✅ Instance ${instanceNum}: Form elements loaded`);
    await page.waitForTimeout(1000);

    // ============================================
    // STEP 4: Generate and Fill Demo Data
    // ============================================
    const demoData = generateDemoData(instanceNum);
    console.log(`\n📋 Instance ${instanceNum}: Generated Demo Data:`);
    console.log(`   Name: ${demoData.name}`);
    console.log(`   Email: ${demoData.email}`);
    console.log(`   Phone: ${demoData.phone}`);
    console.log(`   Service: ${demoData.service_type}`);
    console.log(`   Message: ${demoData.message.substring(0, 50)}...\n`);

    console.log(`⏳ Instance ${instanceNum}: Filling form fields...`);
    
    // Fill name
    await page.click('input[name="name"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="name"]', demoData.name);
    console.log(`   ✓ Name field filled`);
    await page.waitForTimeout(400);

    // Fill email
    await page.click('input[name="email"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="email"]', demoData.email);
    console.log(`   ✓ Email field filled`);
    await page.waitForTimeout(400);

    // Fill phone (using phoneraw field from your HTML)
    await page.click('input[name="phoneraw"]');
    await page.waitForTimeout(300);
    await page.fill('input[name="phoneraw"]', demoData.phone);
    console.log(`   ✓ Phone field filled`);
    await page.waitForTimeout(400);

    // Select service type
    await page.click('select[name="servicetype"]');
    await page.waitForTimeout(300);
    await page.selectOption('select[name="servicetype"]', demoData.service_type);
    console.log(`   ✓ Service type selected: ${demoData.service_type}`);
    await page.waitForTimeout(400);

    // Fill message
    await page.click('textarea[name="message"]');
    await page.waitForTimeout(300);
    await page.fill('textarea[name="message"]', demoData.message);
    console.log(`   ✓ Message field filled`);
    await page.waitForTimeout(500);

    // Take screenshot of filled form
    await page.screenshot({ 
      path: path.join(screenshotsDir, `03-form-filled.png`),
      fullPage: true 
    });
    console.log(`📸 Instance ${instanceNum}: Screenshot 3/4 - Form filled`);

    // ============================================
    // STEP 5: Submit Form
    // ============================================
    console.log(`\n⏳ Instance ${instanceNum}: Submitting form...`);
    
    try {
      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('process_contact.php'),
          { timeout: 30000 }
        ),
        page.click('form#contact-form button[type="submit"]')
      ]);

      const status = response.status();
      console.log(`✅ Instance ${instanceNum}: Form submitted! HTTP Status: ${status}`);
      
      // Try to get response body
      try {
        const responseBody = await response.text();
        console.log(`📄 Instance ${instanceNum}: Server Response:`);
        console.log(responseBody.substring(0, 200));
      } catch (e) {
        console.log(`⚠️  Instance ${instanceNum}: Could not read response body`);
      }

    } catch (submitError) {
      console.error(`❌ Instance ${instanceNum}: Form submission error:`, submitError.message);
    }

    // ============================================
    // STEP 6: Wait and Check Result
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Waiting for result...`);
    await page.waitForTimeout(3000);
    
    // Check if success message appeared
    const successVisible = await page.isVisible('#contact-success-msg').catch(() => false);
    console.log(`${successVisible ? '✅' : '⚠️'}  Instance ${instanceNum}: Success message visible: ${successVisible}`);

    // Take final screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, `04-after-submit.png`),
      fullPage: true 
    });
    console.log(`📸 Instance ${instanceNum}: Screenshot 4/4 - After submission`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Instance ${instanceNum}: TEST COMPLETED SUCCESSFULLY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Summary:`);
    console.log(`   - Page Load Time: ${(loadTime / 1000).toFixed(2)}s`);
    console.log(`   - Form Submission: ${successVisible ? 'Success' : 'Unknown'}`);
    console.log(`   - Screenshots: 4 saved to ${screenshotsDir}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ Instance ${instanceNum}: ERROR OCCURRED`);
    console.error(`${'='.repeat(60)}`);
    console.error(`Error Type: ${error.name}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Stack Trace:\n${error.stack}`);
    console.error(`${'='.repeat(60)}\n`);
    
    try {
      const page = await browser.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ 
          path: path.join(screenshotsDir, `ERROR.png`),
          fullPage: true 
        });
        console.log(`📸 Instance ${instanceNum}: Error screenshot saved`);
      }
    } catch (screenshotError) {
      console.error(`⚠️  Instance ${instanceNum}: Could not capture error screenshot`);
    }
    
    process.exit(1);
  } finally {
    await browser.close();
    console.log(`🔒 Instance ${instanceNum}: Browser closed\n`);
  }
}

// Run the test
runTest().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
