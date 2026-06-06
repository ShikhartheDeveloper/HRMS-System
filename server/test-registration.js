// E2E Verification for Org Registration with OTP & Custom Email Features

const BASE_URL = 'http://localhost:5000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS] ${msg}${colors.reset}`),
  error: (msg, err) => console.error(`${colors.red}[ERROR] ${msg}${colors.reset}`, err || ''),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

async function runTests() {
  try {
    log.header('Starting Org Registration OTP & Email E2E Tests');

    // 1. Health check
    log.info('Checking server health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.ok && healthJson.success) {
      log.success('Server is healthy and responsive!');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }

    // Generate random unique subdomain
    const randId = Math.floor(Math.random() * 100000);
    const testSubdomain = `testsub-${randId}`;
    const adminEmail = `admin-${randId}@testorg.com`;

    // 2. Send Registration OTP
    log.info(`Sending registration OTP for subdomain "${testSubdomain}"...`);
    const sendOtpRes = await fetch(`${BASE_URL}/api/auth/register-send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: `Test Company ${randId}`,
        subdomain: testSubdomain,
        adminFirstName: 'Test',
        adminLastName: 'Admin',
        adminEmail: adminEmail,
        adminPassword: 'Password123'
      })
    });
    const sendOtpJson = await sendOtpRes.json();
    if (!sendOtpRes.ok || !sendOtpJson.success) {
      throw new Error(`Send OTP failed: ${JSON.stringify(sendOtpJson)}`);
    }
    const otpCode = sendOtpJson.otpCode;
    if (!otpCode) {
      throw new Error('OTP code not returned in development mode response');
    }
    log.success(`OTP sent successfully! Dev OTP code: ${otpCode}`);

    // 3. Verify OTP and Complete Registration
    log.info('Verifying OTP and completing registration...');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/register-verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        otpCode: otpCode
      })
    });
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || !verifyJson.success) {
      throw new Error(`OTP verification failed: ${JSON.stringify(verifyJson)}`);
    }
    const token = verifyJson.data.token;
    const employeeId = verifyJson.data.user.employee?._id;
    log.success(`Registration verified! Auto-logged in. Employee ID: ${employeeId}`);

    if (!token) {
      throw new Error('Auth token not returned after OTP verification');
    }
    if (!employeeId) {
      throw new Error('Employee record was not created during registration');
    }

    // 4. Tenant Lookup
    log.info(`Verifying tenant lookup for subdomain "${testSubdomain}"...`);
    const lookupRes = await fetch(`${BASE_URL}/api/auth/tenant-lookup?subdomain=${testSubdomain}`);
    const lookupJson = await lookupRes.json();
    if (!lookupRes.ok || !lookupJson.success) {
      throw new Error(`Tenant lookup failed: ${JSON.stringify(lookupJson)}`);
    }
    log.success(`Tenant lookup validated. Name: ${lookupJson.data.name}`);

    // 5. Send Test Email
    log.info(`Sending test email to employee (${employeeId})...`);
    const emailRes = await fetch(`${BASE_URL}/api/employees/${employeeId}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subject: 'E2E Verification Notice',
        message: 'This is a test message to verify the email tool works with OTP registration.'
      })
    });
    const emailJson = await emailRes.json();
    if (!emailRes.ok || !emailJson.success) {
      throw new Error(`Email sending failed: ${JSON.stringify(emailJson)}`);
    }
    log.success('Email dispatch succeeded!');

    // 6. Test duplicate subdomain rejection
    log.info('Testing duplicate subdomain rejection...');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register-send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: 'Duplicate',
        subdomain: testSubdomain,
        adminFirstName: 'Dup',
        adminLastName: 'User',
        adminEmail: `dup-${randId}@test.com`,
        adminPassword: 'Password123'
      })
    });
    const dupJson = await dupRes.json();
    if (dupRes.status === 400 && dupJson.error?.code === 'SUBDOMAIN_EXISTS') {
      log.success('Duplicate subdomain correctly rejected!');
    } else {
      throw new Error(`Duplicate check failed: ${JSON.stringify(dupJson)}`);
    }

    log.header('ALL E2E VERIFICATION CHECKS PASSED');
    process.exit(0);
  } catch (error) {
    log.error('Test failure:', error.message || error);
    process.exit(1);
  }
}

runTests();
