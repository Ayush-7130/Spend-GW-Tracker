/**
 * Web Vitals Analytics API Endpoint
 *
 * Collects Web Vitals metrics from the client for analysis.
 *
 * SECURITY:
 * - Rate limited to prevent abuse/DoS
 * - Payload size restricted
 * - Origin validation for production
 */

import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { RateLimiter } from "@/lib/utils/security";

// Rate limiter: 10 metrics per minute per IP to prevent abuse
const vitalsRateLimiter = new RateLimiter(10, 60 * 1000);

interface WebVitalMetric {
  metric: string;
  value: number;
  rating: string;
  page: string;
  timestamp: number;
}

// Maximum payload size (in bytes) - roughly 2KB
const MAX_PAYLOAD_SIZE = 2048;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!vitalsRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "60", // 1 minute
          },
        }
      );
    }

    // Origin validation in production
    if (process.env.NODE_ENV === "production") {
      const origin = request.headers.get("origin");
      const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL?.split(",") || [];

      if (
        origin &&
        allowedOrigins.length > 0 &&
        !allowedOrigins.includes(origin)
      ) {
        return NextResponse.json(
          { success: false, error: "Unauthorized origin" },
          { status: 403 }
        );
      }
    }

    // Check content length to prevent large payloads
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 }
      );
    }

    const body: WebVitalMetric = await request.json();

    // Validate the metric data
    if (!body.metric || typeof body.value !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid metric data" },
        { status: 400 }
      );
    }

    // Additional validation: metric name and page URL length
    if (body.metric.length > 50 || body.page?.length > 500) {
      return NextResponse.json(
        { success: false, error: "Invalid metric format" },
        { status: 400 }
      );
    }

    // Log metrics in development
    if (process.env.NODE_ENV === "development") {
      logger.debug("Web Vital", {
        metric: body.metric,
        value: body.value,
        rating: body.rating,
        page: body.page,
      });
    }

    // In production, you would:
    // 1. Store in database for analysis
    // 2. Send to analytics service (e.g., Google Analytics, Datadog, New Relic)
    // 3. Aggregate for dashboards

    // Example: Store in MongoDB (commented out)
    /*
    const client = await clientPromise;
    const db = client.db('spend-tracker');

    await db.collection('web_vitals').insertOne({
      ...body,
      userAgent: request.headers.get('user-agent'),
      createdAt: new Date(),
    });
    */

    return NextResponse.json(
      { success: true, message: "Metric recorded" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to record metric" },
      { status: 500 }
    );
  }
}
