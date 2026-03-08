import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { invalidateCache } from "@/lib/cache";
import { ObjectId } from "mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Category {
  _id: ObjectId | string;
  name: string;
  description: string;
  subcategories: Array<{ name: string; description: string }>;
  groupId?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const client = await clientPromise;
      const db = client.db("spend-tracker");

      const categories = await db
        .collection<Category>("categories")
        .find({ groupId: group._id })
        .toArray();

      // FIX M66: Serialize to explicit DTO to avoid ObjectId/Date serialization issues
      const serializedCategories = categories.map((cat: any) => ({
        _id: cat._id.toString(),
        name: cat.name,
        description: cat.description || "",
        subcategories: cat.subcategories || [],
        icon: cat.icon,
        color: cat.color,
        groupId: cat.groupId?.toString(),
        createdAt:
          cat.createdAt instanceof Date
            ? cat.createdAt.toISOString()
            : cat.createdAt,
        updatedAt:
          cat.updatedAt instanceof Date
            ? cat.updatedAt.toISOString()
            : cat.updatedAt,
      }));

      const response = NextResponse.json({
        success: true,
        data: serializedCategories,
      });

      // Prevent any caching
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");

      return response;
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to fetch categories" },
        { status: 500 }
      );
    }
  }
);

export const POST = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const body = await request.json();
      const { name, description, subcategories = [] } = body;

      if (!name || !description) {
        return NextResponse.json(
          { success: false, error: "Name and description are required" },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // FIX NEW-2: Create unique compound index to prevent race conditions
      // This prevents duplicate category names within the same group
      // Index creation is idempotent - safe to call multiple times
      try {
        await db.collection<Category>("categories").createIndex(
          { name: 1, groupId: 1 },
          {
            unique: true,
            collation: { locale: "en", strength: 2 }, // Case-insensitive uniqueness
            background: true, // Non-blocking index creation
          }
        );
      } catch {
        // Index might already exist - ignore error
        // Production note: Run this in database setup script instead
      }

      // FIX C10: Use ObjectId instead of user-provided string for _id
      // This prevents collision risks and improves database performance

      const category = {
        _id: new ObjectId(), // Generate proper ObjectId
        name,
        description,
        subcategories,
        groupId: group._id,
        createdAt: new Date(),
      };

      // FIX NEW-2: Use try-catch to handle duplicate key errors from unique index
      try {
        await db.collection<Category>("categories").insertOne(category);
      } catch (insertError: any) {
        // Check if error is duplicate key (code 11000)
        if (insertError.code === 11000) {
          return NextResponse.json(
            {
              success: false,
              error: "A category with this name already exists in this group",
            },
            { status: 409 }
          );
        }
        throw insertError; // Re-throw other errors
      }

      // Invalidate category cache
      invalidateCache.category();

      // Return serialized category
      return NextResponse.json({
        success: true,
        data: {
          _id: category._id.toString(),
          name: category.name,
          description: category.description,
          subcategories: category.subcategories,
          groupId: category.groupId.toString(),
          createdAt: category.createdAt.toISOString(),
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to create category" },
        { status: 500 }
      );
    }
  }
);
