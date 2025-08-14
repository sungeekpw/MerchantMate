#!/usr/bin/env tsx
/**
 * Seed Development Database with Email Templates from Production
 * This script copies email templates from the production database to the development database
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Development database URL from environment
const DEV_DB_URL = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;

if (!DEV_DB_URL) {
  console.error('❌ DEV_DATABASE_URL or DATABASE_URL environment variable not found');
  process.exit(1);
}

const devPool = new Pool({ connectionString: DEV_DB_URL });
const devDb = drizzle({ client: devPool, schema });

// Comprehensive email template data with proper HTML formatting
const emailTemplateData = [
  {
    name: 'Welcome Email',
    description: 'Welcome message for new merchants',
    subject: 'Welcome to Core CRM',
    htmlContent: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome to Core CRM</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;"><h1>Welcome to Core CRM</h1></div><div style="padding: 30px 20px; background-color: #f9f9f9;"><h2>Welcome to our merchant processing platform!</h2><p>Thank you for joining Core CRM. We\'re excited to help you grow your business.</p></div></body></html>',
    textContent: 'Welcome to our merchant processing platform!',
    category: 'welcome',
    variables: '["businessName", "firstName", "lastName"]'
  },
  {
    name: 'Application Received',
    description: 'Confirmation that application was received',
    subject: 'Application Received',
    htmlContent: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Application Received</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;"><h1>Application Received</h1></div><div style="padding: 30px 20px; background-color: #f9f9f9;"><h2>Thank you {{firstName}} {{lastName}},</h2><p>Your application has been received and is being processed.</p><p>We will review your application and contact you within 2-3 business days.</p></div></body></html>',
    textContent: 'Your application has been received and is being processed.',
    category: 'application',
    variables: '["firstName", "lastName", "applicationId"]'
  },
  {
    name: 'Email Verification',
    description: 'Template for verifying merchant email addresses',
    subject: 'Please verify your email address',
    htmlContent: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email Verification</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;"><h1>Email Verification Required</h1></div><div style="padding: 30px 20px; background-color: #f9f9f9;"><h2>Hello {{firstName}} {{lastName}},</h2><p>Please verify your email address by clicking the button below:</p><p style="text-align: center;"><a href="{{verificationUrl}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Verify Email</a></p><p>This verification link will expire in 24 hours.</p></div></body></html>',
    textContent: 'Hello {{firstName}} {{lastName}}, Please verify your email address by visiting: {{verificationUrl}}',
    category: 'authentication',
    variables: '["firstName", "lastName", "verificationUrl"]'
  },
  {
    name: 'Password Reset',
    description: 'Template for password reset requests',
    subject: 'Reset your password',
    htmlContent: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Password Reset</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;"><h1>Password Reset Request</h1></div><div style="padding: 30px 20px; background-color: #f9f9f9;"><h2>Hello {{firstName}},</h2><p>You requested a password reset for your Core CRM account.</p><p style="text-align: center;"><a href="{{resetUrl}}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a></p><p>This reset link will expire in 1 hour.</p></div></body></html>',
    textContent: 'Hello {{firstName}}, You requested a password reset. Visit: {{resetUrl}}',
    category: 'authentication',
    variables: '["firstName", "resetUrl"]'
  },
  {
    name: 'Account Activated',
    description: 'Template for successful account activation',
    subject: 'Your merchant account is now active',
    htmlContent: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Activated</title></head><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;"><h1>Account Activated!</h1></div><div style="padding: 30px 20px; background-color: #f9f9f9;"><h2>Congratulations {{businessName}}!</h2><p>Your merchant processing account has been successfully activated.</p><ul><li>Merchant ID: {{merchantId}}</li><li>Processing Rate: {{processingRate}}%</li><li>Account Manager: {{agentName}}</li></ul><p style="text-align: center;"><a href="{{dashboardUrl}}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Access Dashboard</a></p></div></body></html>',
    textContent: 'Congratulations {{businessName}}! Your merchant account is now active.',
    category: 'approval',
    variables: '["businessName", "merchantId", "processingRate", "agentName", "dashboardUrl"]'
  }
];

async function seedEmailTemplates() {
  console.log('📧 Seeding Development Database with Email Templates...');
  console.log(`Development DB: ${DEV_DB_URL.split('@')[1].split('/')[0]}`);
  
  try {
    // Create the email_templates table if it doesn't exist
    console.log('\n🏗️  Ensuring email_templates table exists...');
    await devDb.execute(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables JSONB,
        category VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table ready');
    
    // Clear existing templates in development (optional - you can comment this out if you want to keep existing ones)
    console.log('\n🧹 Clearing existing email templates...');
    await devDb.delete(schema.emailTemplates);
    console.log('✅ Cleared existing templates');
    
    // Insert email templates
    console.log('\n📤 Inserting email templates...');
    
    for (const template of emailTemplateData) {
      try {
        await devDb.insert(schema.emailTemplates).values({
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables ? JSON.parse(template.variables) : null,
          category: template.category,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`  ✅ Inserted: ${template.name} (${template.category})`);
      } catch (error) {
        console.log(`  ❌ Failed to insert ${template.name}: ${error.message}`);
      }
    }
    
    // Verify the seeding
    console.log('\n🔍 Verifying seeded templates...');
    const devTemplates = await devDb.select().from(schema.emailTemplates);
    console.log(`✅ Development database now has ${devTemplates.length} email templates`);
    
    // Display summary by category
    const categoryCounts = devTemplates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Templates by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} templates`);
    });
    
    console.log('\n✅ Email template seeding completed successfully!');
    
  } catch (error) {
    console.error(`\n❌ Email template seeding failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await devPool.end();
  }
}

// Run the seeding
seedEmailTemplates();