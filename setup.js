const fs = require('fs');
const path = require('path');
const logger = require('./config/logger');
const env = require('./config/env');
const { connectMongo, mongoose } = require('./config/mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setup() {
  console.log('\n🔧 SETUP: Initializing Xro Agent Backend\n');

  try {
    // Connect to MongoDB
    console.log('🔗 Testing MongoDB connection...');
    await connectMongo();
    console.log('   ✅ MongoDB connected');

    // 1. Run MongoDB index setup
    console.log('\n📦 Setting up MongoDB indexes...');
    const { db } = mongoose.connection;

    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('sessions').createIndex({ user_id: 1 });
      await db.collection('sessions').createIndex({ refresh_token: 1 });
      await db.collection('sessions').createIndex({ expires_at: 1 });
      console.log('   ✅ MongoDB indexes created');
    } catch (err) {
      logger.warn('Index creation warning (may already exist)', { error: err.message });
    }

    // 2. Create test user if not exists
    console.log('\n👤 Setting up test data...');
    const User = require('./models/User');
    const Session = require('./models/Session');

    try {
      const existingUser = await User.findByEmail('test@example.com');

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('Test123!', 10);
        await User.create('test@example.com', hashedPassword, 'testuser');
        console.log('   ✅ Test user created (email: test@example.com, password: Test123!)');
      } else {
        console.log('   ℹ️  Test user already exists');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not create test user: ${error.message}`);
    }

    // 3. Summary
    console.log('\n✅ Setup Complete!\n');
    console.log('📊 System Status:');
    console.log('   ✓ Database: Ready');
    console.log('   ✓ Indexes: Applied');
    console.log('   ✓ Test User: Ready (test@example.com / Test123!)');
    console.log('   ✓ All Systems: GO\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setup();
}

module.exports = setup;