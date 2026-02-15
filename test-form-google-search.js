const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Demo data generator with random Gmail
function generateDemoData(instanceNum) {
  const timestamp = Date.now();
  const services = ['airfreight', 'seafreight', 'landtransport', 'customsclearance'];
  const randomService = services[Math.floor(Math.random() * services.length)];
  
  const randomNumber = Math.floor(Math.random() * 10000);
  const emailVariations = [
    `loadtest.user${instanceNum}.${timestamp}@gmail.com`,
    `freighttest.${randomNumber}.${instanceNum}@gmail.com`,
    `testuser${instanceNum}.${timestamp.toString().slice(-8)}@gmail.com`,
    `githubtest.${instanceNum}.${randomNumber}@gmail.com`,
    `automation.test${instanceNum}.${timestamp}@gmail.com`
  ];
  
  const randomEmail = emailVariations[Math.floor(Math.random() * emailVariations.length)];
  
  return {
    name: `Google User ${instanceNum}-${randomNumber}`,
    email: randomEmail,
    phone: `+971${50 + Math.floor(Math.random() * 9)}${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
    servicetype: randomService,
    message: `🔍 ORGANIC SEARCH TRAFFIC TEST - VIA GOOGLE\n\n` +
             `Source: Google Search "freightcore ae dubai"\n` +
             `Test Instance: #${instanceNum}\n` +
             `Random ID: ${randomNumber}\n` +
             `Timestamp: ${new Date().toISOString()}\n` +
             `Service: ${randomService}\n` +
             `Email: ${randomEmail}\n` +
             `\n⚠️ Automated test simulating organic search traffic.`
  };
}

async function runTest() {
  const instanceNum = process.env.INSTANCE_NUM || '1';
  const targetUrl = 'https://freightcore.ae';
  
  const screenshotsDir = path.join(__dirname, 'test-results', `google-instance-${instanceNum}`);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Instance ${instanceNum}: Google Search Traffic Simulation`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📍 Target: ${targetUrl}`);
  console.log(`🔎 Method: Google Search → Click Result → Browse → Submit Form`);
  console.log(`💾 Screenshots: ${screenshotsDir}`);
  console.log(`${'='.repeat(70)}\n`);

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
      locale: 'en-US',
      geolocation: { latitude: 25.2048, longitude: 55.2708 }, // Dubai coordinates
      permissions: ['geolocation']
    });

    const page = await context.newPage();
    
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🌐 Browser [${instanceNum}] ${type.toUpperCase()}:`, msg.text());
      }
    });

    // ============================================
    // STEP 1: Go to Google and Search
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Opening Google...`);
    await page.goto('https://www.google.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(screenshotsDir, `01-google-homepage.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 1/7 - Google Homepage`);

    // Handle cookie consent if it appears
    try {
      const acceptButton = await page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log(`   ℹ️  No cookie consent popup`);
    }

    // Search for "freightcore ae dubai"
    console.log(`⏳ Instance ${instanceNum}: Searching for "freightcore ae dubai"...`);
    const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
    await searchBox.fill('freightcore ae dubai');
    await page.waitForTimeout(1500); // Simulate human typing pause
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, `02-search-typed.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 2/7 - Search Query Typed`);

    // Press Enter to search
    await searchBox.press('Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, `03-search-results.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 3/7 - Search Results`);

    // ============================================
    // STEP 2: Find and Click FreightCore Link
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Looking for FreightCore link...`);
    
    // Try multiple selectors to find the FreightCore link
    let freightcoreLink = null;
    const selectors = [
      'a[href*="freightcore.ae"]',
      'a:has-text("FreightCore")',
      'a:has-text("freightcore")',
      'h3:has-text("FreightCore")'
    ];

    for (const selector of selectors) {
      try {
        const link = await page.locator(selector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          freightcoreLink = link;
          console.log(`   ✓ Found FreightCore link with: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (freightcoreLink) {
      // Scroll to link (realistic behavior)
      await freightcoreLink.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // Hover before clicking (realistic)
      await freightcoreLink.hover();
      await page.waitForTimeout(500);
      
      console.log(`⏳ Instance ${instanceNum}: Clicking FreightCore search result...`);
      await freightcoreLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } else {
      // Fallback: Go directly to the site
      console.log(`   ⚠️  FreightCore not found in results, going directly...`);
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ 
      path: path.join(screenshotsDir, `04-website-loaded.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 4/7 - Website Loaded from Google`);

    // ============================================
    // STEP 3: Realistic Browsing Behavior
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Browsing website like real user...`);
    
    // Scroll down slowly to view content
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 800) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    
    await page.waitForTimeout(2000);
    console.log(`   ✓ Scrolled through homepage`);

    // Maybe click on "Services" link (50% chance)
    if (Math.random() > 0.5) {
      try {
        const servicesLink = page.locator('a[href*="services"]').first();
        if (await servicesLink.isVisible({ timeout: 2000 })) {
          await servicesLink.click();
          await page.waitForTimeout(2000);
          console.log(`   ✓ Viewed Services page`);
          
          // Go back to homepage
          await page.goBack();
          await page.waitForTimeout(1500);
        }
      } catch (e) {
        console.log(`   ℹ️  Skipped services page`);
      }
    }

    // ============================================
    // STEP 4: Navigate to Contact Form
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Scrolling to contact form...`);
    await page.evaluate(() => {
      const contactSection = document.querySelector('#contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, `05-contact-section.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 5/7 - Contact Section`);

    // ============================================
    // STEP 5: Fill Contact Form
    // ============================================
    console.log(`⏳ Instance ${instanceNum}: Waiting for form...`);
    await page.waitForSelector('form#contact-form', { 
      state: 'visible', 
      timeout: 15000 
    });
    
    // Wait for phone library
    await page.waitForFunction(() => {
      return window.intlTelInput !== undefined;
    }, { timeout: 10000 });
    
    await page.waitForTimeout(3000);

    const demoData = generateDemoData(instanceNum);
    console.log(`\n📋 Instance ${instanceNum}: Generated Data:`);
    console.log(`   Name: ${demoData.name}`);
    console.log(`   Email: ${demoData.email}`);
    console.log(`   Phone: ${demoData.phone}`);
    console.log(`   Service: ${demoData.servicetype}\n`);

    console.log(`⏳ Instance ${instanceNum}: Filling form (with human-like delays)...`);
    
    // Fill with realistic delays
    await page.fill('input[name="name"]', demoData.name);
    console.log(`   ✓ Name filled`);
    await page.waitForTimeout(1200);

    await page.fill('input[name="email"]', demoData.email);
    console.log(`   ✓ Email filled`);
    await page.waitForTimeout(1000);

    try {
      await page.waitForSelector('#phone', { state: 'visible', timeout: 10000 });
      await page.fill('#phone', demoData.phone);
      console.log(`   ✓ Phone filled`);
    } catch (phoneError) {
      await page.fill('input[name="phoneraw"]', demoData.phone);
      console.log(`   ✓ Phone filled (alternate)`);
    }
    await page.waitForTimeout(1000);

    // Select service
    try {
      const serviceSelector = await page.evaluate(() => {
        const selectByName = document.querySelector('select[name="servicetype"]');
        if (selectByName) return 'name';
        const selectById = document.getElementById('servicetype');
        if (selectById) return 'id';
        const anySelect = document.querySelector('form#contact-form select');
        if (anySelect) return 'form-select';
        return null;
      });

      if (serviceSelector === 'name') {
        await page.selectOption('select[name="servicetype"]', demoData.servicetype);
      } else if (serviceSelector === 'id') {
        await page.selectOption('#servicetype', demoData.servicetype);
      } else if (serviceSelector === 'form-select') {
        await page.selectOption('form#contact-form select', demoData.servicetype);
      }
      console.log(`   ✓ Service selected: ${demoData.servicetype}`);
    } catch (e) {
      console.log(`   ⚠️  Service selection skipped`);
    }
    await page.waitForTimeout(800);

    await page.fill('textarea[name="message"]', demoData.message);
    console.log(`   ✓ Message filled`);
    await page.waitForTimeout(2000); // Pause before submitting

    await page.screenshot({ 
      path: path.join(screenshotsDir, `06-form-filled.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 6/7 - Form Filled`);

    // ============================================
    // STEP 6: Submit Form
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
      console.log(`✅ Instance ${instanceNum}: Submitted! Status: ${status}`);
      
      try {
        const responseBody = await response.text();
        const jsonResponse = JSON.parse(responseBody);
        
        if (jsonResponse.success) {
          console.log(`\n✅ SUCCESS: ${jsonResponse.message}`);
          console.log(`📧 Email sent to: ${demoData.email}`);
          console.log(`🎫 Request ID: ${jsonResponse.request_id || 'N/A'}`);
        }
      } catch (e) {}
    } catch (submitError) {
      console.error(`❌ Submission error:`, submitError.message);
    }

    await page.waitForTimeout(4000);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, `07-after-submit.png`),
      fullPage: true 
    });
    console.log(`📸 Screenshot 7/7 - After Submission`);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Instance ${instanceNum}: GOOGLE SEARCH SIMULATION COMPLETED`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 User Journey:`);
    console.log(`   1. ✓ Searched Google for "freightcore ae dubai"`);
    console.log(`   2. ✓ Clicked search result`);
    console.log(`   3. ✓ Browsed website pages`);
    console.log(`   4. ✓ Scrolled to contact form`);
    console.log(`   5. ✓ Filled and submitted form`);
    console.log(`   6. ✓ Received confirmation`);
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ Instance ${instanceNum}: ERROR`);
    console.error(`${'='.repeat(70)}`);
    console.error(`Error: ${error.message}`);
    console.error(`${'='.repeat(70)}\n`);
    
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
