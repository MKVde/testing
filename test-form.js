const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Demo data generator
function generateDemoData(instanceNum) {
  const timestamp = Date.now();
  const services = ['airfreight', 'seafreight', 'landtransport', 'customsclearance'];
  const randomService = services[Math.floor(Math.random() * services.length)];
  
  return {
    name: `Load Test User ${instanceNum}`,
    email: `test@freightcore.ae`,
    phone: `+971501234${String(instanceNum).padStart(3, '0')}`,
    servicetype: randomService,
    message: `🤖 AUTOMATED LOAD TEST - GITHUB ACTIONS\n\n` +
             `Test Instance: #${instanceNum}\n` +
             `Timestamp: ${new Date().toISOString()}\n` +
             `Service Requested: ${randomService}\n` +
             `Browser: Chromium (GUI Mode)\n` +
             `Platform: GitHub Actions Ubuntu Runner\n` +
             `\n⚠️ This is an automated test submission from your load testing workflow.\n` +
             `No action required - this tests your contact form performance.`
  };
}

async function runTest() {
  const instanceNum = process.env.INSTANCE_NUM || '1';
  const targetUrl = process.env.TARGET_URL || 'https://freightcore.ae';
  
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

  const browser = await chromium.launch({
    headless: false,
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
    
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🌐 Browser [${instanceNum}] ${type.toUpperCase()}:`, msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error(`❌ Page Error [${instanceNum}]:`, error.message);
    });

    // Navigate
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
    console.log(`📸 Screenshot 1/4 - Homepage`);

    // Scroll to contact
    console.log(`⏳ Instance ${instanceNum}: Scrolling to contact form...`);
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
    console.log(`📸 Screenshot 2/4 - Contact section`);

    // Wait for form - use name field as marker
    console.log(`⏳ Instance ${instanceNum}: Waiting for form...`);
    await page.waitForSelector('input[name="name"]', { 
      state: 'visible', 
      timeout: 15000 
    });
    
    // Wait for intl-tel-input library to load
    console.log(`⏳ Instance ${instanceNum}: Waiting for phone library...`);
    await page.waitForFunction(() => {
      return window.intlTelInput !== undefined;
    }, { timeout: 10000 });
    
    await page.waitForTimeout(2000); // Extra wait for library initialization
    console.log(`✅ Instance ${instanceNum}: Form ready`);

    // Generate demo data
    const demoData = generateDemoData(instanceNum);
    console.log(`\n📋 Instance ${instanceNum}: Demo Data:`);
    console.log(`   Name: ${demoData.name}`);
    console.log(`   Email: ${demoData.email}`);
    console.log(`   Phone: ${demoData.phone}`);
    console.log(`   Service: ${demoData.servicetype}\n`);

    console.log(`⏳ Instance ${instanceNum}: Filling form...`);
    
    // Fill name
    await page.fill('input[name="name"]', demoData.name);
    console.log(`   ✓ Name filled`);
    await page.waitForTimeout(500);

    // Fill email
    await page.fill('input[name="email"]', demoData.email);
    console.log(`   ✓ Email filled`);
    await page.waitForTimeout(500);

    // Fill phone - use ID selector and wait for visibility
    console.log(`   ⏳ Filling phone field...`);
    await page.waitForSelector('#phone', { state: 'visible', timeout: 10000 });
    await page.fill('#phone', demoData.phone);
    console.log(`   ✓ Phone filled`);
    await page.waitForTimeout(500);

    // Select service
    await page.selectOption('select[name="servicetype"]', demoData.servicetype);
    console.log(`   ✓ Service selected: ${demoData.servicetype}`);
    await page.waitForTimeout(500);

    // Fill message
    await page.fill('textarea[name="message"]', demoData.message);
    console.log(`   ✓ Message filled`);
    await page.waitForTimeout(500);

    await page.screenshot({ 
      path: path.join(screenshotsDir, `03-form-filled.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 3/4 - Form filled`);

    // Submit
    console.log(`\n⏳ Instance ${instanceNum}: Submitting...`);
    
    try {
      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('process_contact.php'),
          { timeout: 30000 }
        ),
        page.click('form#contact-form button[type="submit"]')
      ]);

      const status = response.status();
      console.log(`✅ Instance ${instanceNum}: Submitted! Status: ${status}`);
      
      try {
        const responseBody = await response.text();
        console.log(`📄 Server Response:`);
        console.log(responseBody.substring(0, 300));
        
        try {
          const jsonResponse = JSON.parse(responseBody);
          console.log(`📊 Parsed:`, JSON.stringify(jsonResponse, null, 2));
          
          if (jsonResponse.success) {
            console.log(`✅ Success: ${jsonResponse.message}`);
            console.log(`📧 Email should be sent to: ${demoData.email}`);
          } else {
            console.log(`⚠️  Error: ${jsonResponse.message}`);
          }
        } catch (e) {}
      } catch (e) {
        console.log(`⚠️  Could not read response`);
      }

    } catch (submitError) {
      console.error(`❌ Instance ${instanceNum}: Submit error:`, submitError.message);
    }

    await page.waitForTimeout(3000);
    
    const successVisible = await page.isVisible('#contact-success-msg').catch(() => false);
    console.log(`${successVisible ? '✅' : '⚠️'}  Success message: ${successVisible}`);

    await page.screenshot({ 
      path: path.join(screenshotsDir, `04-after-submit.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 4/4 - After submit`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Instance ${instanceNum}: COMPLETED`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Summary:`);
    console.log(`   - Load Time: ${(loadTime / 1000).toFixed(2)}s`);
    console.log(`   - Form Submitted: ${successVisible ? 'Yes' : 'Check logs'}`);
    console.log(`   - Email Target: ${demoData.email}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ Instance ${instanceNum}: ERROR`);
    console.error(`${'='.repeat(60)}`);
    console.error(`Error: ${error.message}`);
    console.error(`Stack:\n${error.stack}`);
    console.error(`${'='.repeat(60)}\n`);
    
    try {
      const page = await browser.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ 
          path: path.join(screenshotsDir, `ERROR.png`),
          fullPage: true 
        });
      }
    } catch (e) {}
    
    process.exit(1);
  } finally {
    await browser.close();
    console.log(`🔒 Instance ${instanceNum}: Browser closed\n`);
  }
}

runTest().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
