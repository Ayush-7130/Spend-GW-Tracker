import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { invalidateCache } from "@/lib/cache";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories: string[];
  groupId?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withGroupAuth(
    async (req: NextRequest, context: GroupRequestContext) => {
      try {
        const { group } = context;
        const body = await req.json(); // FIX: Use req instead of request
        const { name, description, subcategories = [] } = body;

        if (!name || !description) {
          return NextResponse.json(
            { success: false, error: "Name and description are required" },
            { status: 400 }
          );
        }

        // Validate ID format
        if (!id || typeof id !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid category ID" },
            { status: 400 }
          );
        }

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        const result = await db.collection<Category>("categories").updateOne(
          { _id: id, groupId: group._id },
          {
            $set: {
              name,
              description,
              subcategories,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return NextResponse.json(
            { success: false, error: "Category not found" },
            { status: 404 }
          );
        }

        // Invalidate category cache
        invalidateCache.category();

        return NextResponse.json({
          success: true,
          message: "Category updated successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to update category" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withGroupAuth(
    async (req: NextRequest, context: GroupRequestContext) => {
      try {
        const { group } = context;
        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Categories use string IDs, not ObjectIds
        if (!id || typeof id !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid category ID" },
            { status: 400 }
          );
        }

        // Check if category is in use within this group
        const expensesUsingCategory = await db
          .collection("expenses")
          .countDocuments({
            category: id,
            groupId: group._id,
          });

        if (expensesUsingCategory > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot delete category. It is used in ${expensesUsingCategory} expense(s).`,
            },
            { status: 400 }
          );
        }

        const result = await db
          .collection<Category>("categories")
          .deleteOne({ _id: id, groupId: group._id });
        if (result.deletedCount === 0) {
          return NextResponse.json(
            { success: false, error: "Category not found" },
            { status: 404 }
          );
        }

        // Invalidate category cache
        invalidateCache.category();

        return NextResponse.json({
          success: true,
          message: "Category deleted successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to delete category" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}
