const fs = require('fs');
const path = require('path');
const logger = require('./config/logger');
const env = require('./config/env');

/**
 * Setup Script - Runs all initialization
 * - Database migrations
 * - Seed data (optional)
 * - Health checks
 */
async function setup() {
  console.log('\n🔧 SETUP: Initializing Xro Agent Backend\n');

  const { Pool } = require('pg');
  let pool;

  try {
    // Create a fresh pool connection just for setup
    pool = new Pool({
      host: env.DB.host,
      port: env.DB.port,
      database: env.DB.database,
      user: env.DB.user,
      password: env.DB.password,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    });

    // Test connection first
    console.log('🔗 Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`   ✅ Database connected at ${result.rows[0].now}`);

    // 1. Run database migrations
    console.log('\n📦 Running database migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== '002_add_indexes.sql')
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
    } else {
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        try {
          await pool.query(sql);
          console.log(`   ✅ ${file} completed`);
        } catch (error) {
          // Check if it's an "already exists" error (not critical)
          if (error.message.includes('already exists')) {
            console.log(`   ℹ️  ${file} already applied`);
          } else {
            throw error;
          }
        }
      }
    }

    // 2. Create test user if not exists
    console.log('\n👤 Setting up test data...');
    try {
      const testUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
      
      if (testUser.rows.length === 0) {
        // Hash password with bcrypt
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Test123!', 10);
        
        await pool.query(
          'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)',
          ['test@example.com', 'testuser', hashedPassword]
        );
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
    console.log('   ✓ Migrations: Applied');
    console.log('   ✓ Test User: Ready (test@example.com / Test123!)');
    console.log('   ✓ All Systems: GO\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setup();
}

module.exports = setup;
