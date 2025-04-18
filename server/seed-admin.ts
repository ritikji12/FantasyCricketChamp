import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  try {
    // Check if admin user already exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, 'admin'));
    
    if (!existingAdmin) {
      console.log('Creating admin user...');
      const hashedPassword = await hashPassword('ritik123');
      
      await db.insert(users).values({
        username: 'admin',
        password: hashedPassword,
        name: 'Admin User',
        email: 'admin@cr13k3t.com',
        isAdmin: true,
        createdAt: new Date()
      });
      
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    process.exit();
  }
}

seedAdmin();