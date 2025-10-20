import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agentLog } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const runId = url.searchParams.get('run_id');
    const epochNumber = url.searchParams.get('epoch_number');
    const agentType = url.searchParams.get('agent_type');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    if (!runId) {
      return NextResponse.json(
        { error: 'Missing run_id parameter' },
        { status: 400 }
      );
    }

    const run_id = parseInt(runId, 10);

    // Build query conditions
    let query = db
      .select()
      .from(agentLog)
      .where(eq(agentLog.run_id, run_id))
      .orderBy(desc(agentLog.timestamp))
      .limit(limit);

    // Apply filters if provided
    const logs = await query;

    // Filter in-memory for optional parameters
    let filteredLogs = logs;

    if (epochNumber) {
      const epoch = parseInt(epochNumber, 10);
      filteredLogs = filteredLogs.filter((log) => log.epoch_number === epoch);
    }

    if (agentType) {
      filteredLogs = filteredLogs.filter((log) => log.agent_type === agentType);
    }

    return NextResponse.json({
      run_id,
      total_logs: filteredLogs.length,
      filters: {
        epoch_number: epochNumber ? parseInt(epochNumber, 10) : null,
        agent_type: agentType || null,
      },
      logs: filteredLogs.map((log) => ({
        log_id: log.log_id,
        epoch_number: log.epoch_number,
        agent_type: log.agent_type,
        system_prompt: log.system_prompt,
        input_summary: log.input_summary,
        output_summary: log.output_summary,
        details: log.details,
        timestamp: log.timestamp,
      })),
    });
  } catch (error) {
    console.error('Error getting training logs:', error);
    return NextResponse.json(
      { error: 'Failed to get training logs' },
      { status: 500 }
    );
  }
}
