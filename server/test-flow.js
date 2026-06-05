// Using native fetch API

const BASE_URL = 'http://localhost:5000';

// Colors for console logging
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
  warn: (msg) => console.log(`${colors.yellow}[WARN] ${msg}${colors.reset}`),
  error: (msg, err) => console.error(`${colors.red}[ERROR] ${msg}${colors.reset}`, err || ''),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`)
};

// Helper to calculate next Monday and Tuesday
function getNextWeekdays() {
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  const nextTuesday = new Date(nextMonday);
  nextTuesday.setDate(nextMonday.getDate() + 1);

  return {
    mondayStr: nextMonday.toISOString().split('T')[0],
    tuesdayStr: nextTuesday.toISOString().split('T')[0]
  };
}

async function runTests() {
  try {
    log.header('Starting HRMS E2E Verification Tests');

    // 1. Health check
    log.info('Checking server health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.ok && healthJson.success) {
      log.success('Server is healthy and responsive!');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }

    // 2. Tenant lookup
    log.info('Looking up tenant subdomain "default"...');
    const tenantRes = await fetch(`${BASE_URL}/api/auth/tenant-lookup?subdomain=default`);
    const tenantJson = await tenantRes.json();
    if (!tenantRes.ok || !tenantJson.success) {
      throw new Error(`Tenant lookup failed: ${JSON.stringify(tenantJson)}`);
    }
    const tenantId = tenantJson.data.id;
    log.success(`Tenant found! Name: ${tenantJson.data.name}, ID: ${tenantId}`);

    // 3. Admin login
    log.info('Logging in as HR Admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@default.com',
        password: 'Password123',
        tenantId
      })
    });
    const adminLoginJson = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminLoginJson.success) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginJson)}`);
    }
    const adminToken = adminLoginJson.data.token;
    log.success('Logged in as HR Admin successfully!');

    // 4. Manager login
    log.info('Logging in as Jane Manager...');
    const managerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@default.com',
        password: 'Password123',
        tenantId
      })
    });
    const managerLoginJson = await managerLoginRes.json();
    if (!managerLoginRes.ok || !managerLoginJson.success) {
      throw new Error(`Manager login failed: ${JSON.stringify(managerLoginJson)}`);
    }
    const managerToken = managerLoginJson.data.token;
    log.success('Logged in as Manager successfully!');

    // 5. Get employees list to find Manager's employee ID
    log.info("Fetching employees list to locate Jane Manager's profile ID...");
    const empListRes = await fetch(`${BASE_URL}/api/employees`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const empListJson = await empListRes.json();
    if (!empListRes.ok || !empListJson.success) {
      throw new Error(`Fetching employee directory failed: ${JSON.stringify(empListJson)}`);
    }
    
    const managerEmp = empListJson.data.find(e => e.email === 'manager@default.com');
    if (!managerEmp) {
      throw new Error('Could not find Manager employee profile in directory');
    }
    const managerProfileId = managerEmp._id;
    log.success(`Located Manager profile ID: ${managerProfileId}`);

    // 6. Admin creates a new Employee reporting to Manager
    log.info('Creating a new employee profile...');
    const testEmail = `test.employee.${Date.now()}@default.com`;
    const createEmpRes = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123',
        role: 'EMPLOYEE',
        firstName: 'Alex',
        lastName: 'Tester',
        phone: '9876543210',
        department: 'Engineering',
        designation: 'QA Analyst',
        managerId: managerProfileId,
        salary: 65000,
        status: 'Active'
      })
    });
    const createEmpJson = await createEmpRes.json();
    if (!createEmpRes.ok || !createEmpJson.success) {
      throw new Error(`Employee creation failed: ${JSON.stringify(createEmpJson)}`);
    }
    const newEmployeeProfile = createEmpJson.data;
    log.success(`Created employee Alex Tester! ID: ${newEmployeeProfile.employeeId}, MongoDB ID: ${newEmployeeProfile._id}`);

    // 7. Login as the newly created employee
    log.info(`Logging in as the new employee: ${testEmail}...`);
    const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123',
        tenantId
      })
    });
    const empLoginJson = await empLoginRes.json();
    if (!empLoginRes.ok || !empLoginJson.success) {
      throw new Error(`Employee login failed: ${JSON.stringify(empLoginJson)}`);
    }
    const empToken = empLoginJson.data.token;
    log.success('Employee logged in successfully!');

    // 8. Employee logs attendance punch-in
    log.info('Logging attendance punch-in for employee...');
    const punchInRes = await fetch(`${BASE_URL}/api/attendance/punch-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`
      },
      body: JSON.stringify({
        gps: { latitude: 12.9716, longitude: 77.5946 }
      })
    });
    const punchInJson = await punchInRes.json();
    if (!punchInRes.ok || !punchInJson.success) {
      throw new Error(`Punch-in failed: ${JSON.stringify(punchInJson)}`);
    }
    log.success(`Punch-in successful! Timestamp: ${punchInJson.data.punchIn}, Status: ${punchInJson.data.status}`);

    // 9. Employee logs attendance punch-out
    log.info('Logging attendance punch-out for employee...');
    const punchOutRes = await fetch(`${BASE_URL}/api/attendance/punch-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`
      },
      body: JSON.stringify({
        gps: { latitude: 12.9716, longitude: 77.5946 }
      })
    });
    const punchOutJson = await punchOutRes.json();
    if (!punchOutRes.ok || !punchOutJson.success) {
      throw new Error(`Punch-out failed: ${JSON.stringify(punchOutJson)}`);
    }
    log.success(`Punch-out successful! Timestamp: ${punchOutJson.data.punchOut}, Overtime: ${punchOutJson.data.overtimeHours || 0} hrs`);

    // 10. Employee applies for leave
    const { mondayStr, tuesdayStr } = getNextWeekdays();
    log.info(`Applying for leave from Monday (${mondayStr}) to Tuesday (${tuesdayStr})...`);
    const applyLeaveRes = await fetch(`${BASE_URL}/api/leave/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`
      },
      body: JSON.stringify({
        leaveType: 'Casual',
        startDate: mondayStr,
        endDate: tuesdayStr,
        reason: 'Family event'
      })
    });
    const applyLeaveJson = await applyLeaveRes.json();
    if (!applyLeaveRes.ok || !applyLeaveJson.success) {
      throw new Error(`Leave application failed: ${JSON.stringify(applyLeaveJson)}`);
    }
    const leaveId = applyLeaveJson.data._id;
    log.success(`Leave applied successfully! Days requested: ${applyLeaveJson.data.totalDays}, Leave ID: ${leaveId}`);

    // 11. Manager approves leave request
    log.info(`Manager reviewing and approving leave request ID ${leaveId}...`);
    const approveLeaveRes = await fetch(`${BASE_URL}/api/leave/${leaveId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        status: 'Approved',
        comments: 'Enjoy your time off!'
      })
    });
    const approveLeaveJson = await approveLeaveRes.json();
    if (!approveLeaveRes.ok || !approveLeaveJson.success) {
      throw new Error(`Leave approval failed: ${JSON.stringify(approveLeaveJson)}`);
    }
    log.success(`Leave approved! Current Status: ${approveLeaveJson.data.status}`);

    // 12. Admin exports report
    log.info('Admin triggering headcount report CSV export...');
    const exportRes = await fetch(`${BASE_URL}/api/reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'headcount'
      })
    });
    const exportJson = await exportRes.json();
    if (exportRes.status !== 202 || !exportJson.success) {
      throw new Error(`Triggering export failed: ${JSON.stringify(exportJson)}`);
    }
    const jobId = exportJson.data.jobId;
    log.success(`Export job initiated in background! Job ID: ${jobId}`);

    // 13. Poll export status
    log.info('Polling export job status...');
    let attempts = 0;
    while (attempts < 10) {
      const pollRes = await fetch(`${BASE_URL}/api/reports/export-status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const pollJson = await pollRes.json();
      if (!pollRes.ok || !pollJson.success) {
        throw new Error(`Polling status failed: ${JSON.stringify(pollJson)}`);
      }
      
      const jobStatus = pollJson.data.status;
      log.info(`Attempt ${attempts + 1}: Job Status is "${jobStatus}"`);
      
      if (jobStatus === 'Completed') {
        log.success(`Export completed successfully! File available at: ${pollJson.data.resultUrl}`);
        break;
      }
      if (jobStatus === 'Failed') {
        throw new Error(`Export job failed: ${pollJson.data.error}`);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log.header('All End-to-End Verification Tests Passed Successfully!');
  } catch (error) {
    log.error('Test run encountered an error:', error.message);
    process.exit(1);
  }
}

runTests();
