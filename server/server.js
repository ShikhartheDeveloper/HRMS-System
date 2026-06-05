import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import app from './src/app.js';

// Connect Database and Start Server
connectDB().then(() => {
  const server = app.listen(env.port, () => {
    console.log(`Server running in ${env.env} mode on port ${env.port}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
});
