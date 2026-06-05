import { sendEmail } from './src/utils/sendEmail.js';

console.log('Attempting to send email...');
sendEmail({
  to: 'shikharcoder76@gmail.com',
  subject: 'Test email run',
  text: 'Hello from test-mail-run.js',
})
.then(res => {
  console.log('Result:', res);
  process.exit(0);
})
.catch(err => {
  console.error('Error occurred:', err);
  process.exit(1);
});
