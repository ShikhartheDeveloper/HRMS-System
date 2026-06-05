// Debug script to check leave and manager data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';

async function debug() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('\n=== ALL EMPLOYEES ===');
  const employees = await db.collection('employees').find({ isDeleted: { $ne: true } }).toArray();
  employees.forEach(e => {
    console.log(`  ${e.employeeId} | ${e.firstName} ${e.lastName} | role=${e.role} | managerId=${e.managerId} | userId=${e.userId} | _id=${e._id}`);
  });

  console.log('\n=== ALL USERS ===');
  const users = await db.collection('users').find({ isDeleted: { $ne: true } }).toArray();
  users.forEach(u => {
    console.log(`  ${u.email} | role=${u.role} | tenantId=${u.tenantId} | _id=${u._id}`);
  });

  console.log('\n=== ALL LEAVES ===');
  const leaves = await db.collection('leaves').find({}).toArray();
  if (leaves.length === 0) {
    console.log('  No leave records found.');
  }
  leaves.forEach(l => {
    console.log(`  leaveId=${l._id} | employeeId=${l.employeeId} | type=${l.leaveType} | status=${l.status} | ${l.startDate} - ${l.endDate} | isDeleted=${l.isDeleted}`);
  });

  console.log('\n=== PENDING LEAVES ===');
  const pendingLeaves = await db.collection('leaves').find({ status: 'Pending', isDeleted: { $ne: true } }).toArray();
  if (pendingLeaves.length === 0) {
    console.log('  No pending leaves found.');
  }
  pendingLeaves.forEach(l => {
    const emp = employees.find(e => e._id.toString() === l.employeeId.toString());
    console.log(`  leaveId=${l._id} | employee=${emp ? emp.firstName + ' ' + emp.lastName : 'UNKNOWN'} (managerId=${emp?.managerId}) | type=${l.leaveType} | status=${l.status}`);
  });

  console.log('\n=== NOTIFICATIONS ===');
  const notifs = await db.collection('notifications').find({}).toArray();
  if (notifs.length === 0) {
    console.log('  No notifications found.');
  }
  notifs.forEach(n => {
    console.log(`  userId=${n.userId} | type=${n.type} | title=${n.title} | read=${n.read}`);
  });

  await mongoose.disconnect();
}

debug().catch(err => { console.error(err); process.exit(1); });
