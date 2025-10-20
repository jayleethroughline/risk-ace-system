import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// GET all playbook entries
export async function GET() {
  try {
    const entries = await db
      .select()
      .from(playbook)
      .orderBy(desc(playbook.helpful_count));

    return NextResponse.json({ playbook: entries });
  } catch (error) {
    console.error('Error fetching playbook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playbook' },
      { status: 500 }
    );
  }
}

// POST - Create a new playbook entry
export async function POST(req: Request) {
  try {
    const { section, content } = await req.json();

    if (!section || !content) {
      return NextResponse.json(
        { error: 'Section and content are required' },
        { status: 400 }
      );
    }

    // Generate a unique ID
    const bullet_id = `${section}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const inserted = await db
      .insert(playbook)
      .values({
        bullet_id,
        section,
        content,
        helpful_count: 0,
        harmful_count: 0,
      })
      .returning();

    return NextResponse.json({ entry: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating playbook entry:', error);
    return NextResponse.json(
      { error: 'Failed to create playbook entry' },
      { status: 500 }
    );
  }
}

// PUT - Update a playbook entry
export async function PUT(req: Request) {
  try {
    const { bullet_id, section, content, helpful_count, harmful_count } =
      await req.json();

    if (!bullet_id) {
      return NextResponse.json(
        { error: 'bullet_id is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (section !== undefined) updates.section = section;
    if (content !== undefined) updates.content = content;
    if (helpful_count !== undefined) updates.helpful_count = helpful_count;
    if (harmful_count !== undefined) updates.harmful_count = harmful_count;
    updates.last_updated = new Date();

    const updated = await db
      .update(playbook)
      .set(updates)
      .where(eq(playbook.bullet_id, bullet_id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Playbook entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ entry: updated[0] });
  } catch (error) {
    console.error('Error updating playbook entry:', error);
    return NextResponse.json(
      { error: 'Failed to update playbook entry' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a playbook entry
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bullet_id = searchParams.get('bullet_id');

    if (!bullet_id) {
      return NextResponse.json(
        { error: 'bullet_id is required' },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(playbook)
      .where(eq(playbook.bullet_id, bullet_id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Playbook entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting playbook entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete playbook entry' },
      { status: 500 }
    );
  }
}
