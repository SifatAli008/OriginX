/**
 * Notification Service
 * Handles in-app, email, and SMS notifications
 */

import type { Notification, Alert } from "@/lib/types/notifications";

/**
 * Send a notification via multiple channels
 */
export async function sendNotification(
  notification: Omit<Notification, "notificationId" | "read" | "createdAt">
): Promise<void> {
  try {
    // Store notification in Firestore for in-app display
    if (notification.channel.includes("in_app")) {
      await storeInAppNotification(notification);
    }

    // Send email notification
    if (notification.channel.includes("email")) {
      await sendEmailNotification(notification);
    }

    // Send SMS notification
    if (notification.channel.includes("sms")) {
      await sendSMSNotification(notification);
    }

    // TODO: Push notifications (when push service is configured)
    if (notification.channel.includes("push")) {
      console.log("Push notifications not yet implemented");
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Store in-app notification in Firestore
 */
async function storeInAppNotification(
  notification: Omit<Notification, "notificationId" | "read" | "createdAt">
): Promise<void> {
  try {
    const { collection, addDoc, getFirestore } = await import("firebase/firestore");
    const { initializeApp, getApps } = await import("firebase/app");
    const { firebaseConfig } = await import("@/lib/firebase/config");

    let app;
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }

    const db = getFirestore(app);
    const notificationsRef = collection(db, "notifications");

    await addDoc(notificationsRef, {
      ...notification,
      read: false,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to store in-app notification:", error);
    throw error;
  }
}

/**
 * Send email notification
 * TODO: Integrate with email service (SendGrid, AWS SES, etc.)
 */
async function sendEmailNotification(
  notification: Omit<Notification, "notificationId" | "read" | "createdAt">
): Promise<void> {
  // In development, log the email
  if (process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] To: ${notification.userId || "broadcast"}`);
    console.log(`[EMAIL] Subject: ${notification.title}`);
    console.log(`[EMAIL] Body: ${notification.message}`);
    return;
  }

  // Production: Integrate with email service
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: userEmail,
    from: 'noreply@originx.com',
    subject: notification.title,
    text: notification.message,
    html: generateEmailHTML(notification),
  };
  
  await sgMail.send(msg);
  */

  // For now, log in production too
  console.log(`[EMAIL NOTIFICATION] ${notification.title}: ${notification.message}`);
}

/**
 * Send SMS notification
 * TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
 */
async function sendSMSNotification(
  notification: Omit<Notification, "notificationId" | "read" | "createdAt">
): Promise<void> {
  // In development, log the SMS
  if (process.env.NODE_ENV === "development") {
    console.log(`[SMS] To: ${notification.userId || "broadcast"}`);
    console.log(`[SMS] Message: ${notification.message}`);
    return;
  }

  // Production: Integrate with SMS service
  // Example with Twilio:
  /*
  const twilio = require('twilio');
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  await client.messages.create({
    body: notification.message,
    to: phoneNumber,
    from: process.env.TWILIO_PHONE_NUMBER,
  });
  */

  // For now, log in production too
  console.log(`[SMS NOTIFICATION] ${notification.message}`);
}

/**
 * Create and send an alert
 */
export async function createAlert(alert: Omit<Alert, "alertId" | "status" | "createdAt">): Promise<string> {
  try {
    const { collection, addDoc, getFirestore } = await import("firebase/firestore");
    const { initializeApp, getApps } = await import("firebase/app");
    const { firebaseConfig } = await import("@/lib/firebase/config");

    let app;
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }

    const db = getFirestore(app);
    const alertsRef = collection(db, "alerts");

    const alertDoc = await addDoc(alertsRef, {
      ...alert,
      status: "active",
      createdAt: Date.now(),
    });

    // Send notification if user is specified
    if (alert.userId) {
      await sendNotification({
        userId: alert.userId,
        orgId: alert.orgId,
        type: "alert",
        channel: ["in_app", "email"],
        title: alert.subject,
        message: alert.message,
        severity: alert.severity,
      });
    }

    return alertDoc.id;
  } catch (error) {
    console.error("Failed to create alert:", error);
    throw error;
  }
}

