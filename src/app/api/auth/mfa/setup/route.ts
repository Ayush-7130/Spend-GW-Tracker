/**
 * MFA Setup API Route
 * Generates QR code and backup codes for 2FA setup
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { generateMFASecret } from "@/lib/mfa";
import { ObjectId } from "mongodb";

// Prevent caching of sensitive MFA data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST: Generate MFA secret and QR code
const handleMFASetup = createApiRoute({
  methods: ["POST"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const db = await dbManager.getDatabase();

      // Get user from database
      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(user.id),
      });

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Check if MFA is already enabled
      if (userDoc.mfaEnabled) {
        return NextResponse.json(
          {
            success: false,
            error:
              "MFA is already enabled. Please disable it first to reconfigure.",
          },
          { status: 400 }
        );
      }

      // Generate MFA secret and backup codes
      const mfaSetup = await generateMFASecret(userDoc.email, "Spend Tracker");

      // Store the secret and HASHED backup codes (not enabled yet, needs verification)
      await db.collection("users").updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            mfaSecret: mfaSetup.secret,
            mfaBackupCodes: mfaSetup.backupCodes, // Hashed codes for verification
            updatedAt: new Date(),
          },
        }
      );

      // CRITICAL FIX: Return the PLAINTEXT backup codes for user to save
      // These are shown ONCE and must match the hashed codes stored in database
      // After this response, plaintext codes are discarded and never shown again
      return NextResponse.json({
        success: true,
        message:
          "MFA setup initiated. Scan the QR code with your authenticator app and save your backup codes in a secure location.",
        data: {
          qrCode: mfaSetup.qrCode,
          secret: mfaSetup.secret, // Show secret for manual entry
          backupCodes: mfaSetup.plaintextBackupCodes, // PLAINTEXT codes for user to save
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to generate MFA setup" },
        { status: 500 }
      );
    }
  },
});

// GET: Check MFA status
const handleGetMFAStatus = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const db = await dbManager.getDatabase();

      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(user.id),
      });

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          mfaEnabled: userDoc.mfaEnabled || false,
          hasSecret: !!userDoc.mfaSecret,
          backupCodesCount: userDoc.mfaBackupCodes?.length || 0,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to get MFA status" },
        { status: 500 }
      );
    }
  },
});

export async function POST(request: NextRequest) {
  return handleMFASetup(request);
}

export async function GET(request: NextRequest) {
  return handleGetMFAStatus(request);
}
