import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(req: Request) {
  const admin = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  
  if (admin && auth !== admin) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get recent skim events for revenue tracking
    const events = await prisma.txEvent.findMany({ 
      where: { action: "skim" }, 
      orderBy: { ts: "desc" }, 
      take: 500 
    });

    // Calculate revenue totals
    let totalFlatSol = 0;
    let totalSkimBp = 0;
    let totalSkimA = 0;
    let totalSkimB = 0;
    let eventCount = 0;

    // Process each event to calculate totals
    events.forEach(event => {
      if (event.flatSol) {
        totalFlatSol += event.flatSol;
      }
      if (event.skimBp) {
        totalSkimBp += event.skimBp;
      }
      if (event.skimA) {
        totalSkimA += parseFloat(event.skimA) || 0;
      }
      if (event.skimB) {
        totalSkimB += parseFloat(event.skimB) || 0;
      }
      eventCount++;
    });

    // Calculate average skim basis points
    const avgSkimBp = eventCount > 0 ? totalSkimBp / eventCount : 0;

    // Group by mint for per-token analysis
    const mintSummary = events.reduce((acc, event) => {
      if (event.mint) {
        if (!acc[event.mint]) {
          acc[event.mint] = {
            mint: event.mint,
            count: 0,
            totalFlatSol: 0,
            totalSkimA: 0,
            totalSkimB: 0
          };
        }
        
        acc[event.mint].count++;
        if (event.flatSol) acc[event.mint].totalFlatSol += event.flatSol;
        if (event.skimA) acc[event.mint].totalSkimA += parseFloat(event.skimA) || 0;
        if (event.skimB) acc[event.mint].totalSkimB += parseFloat(event.skimB) || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by count
    const mintSummaryArray = Object.values(mintSummary).sort((a: any, b: any) => b.count - a.count);

    return new NextResponse(JSON.stringify({
      summary: {
        totalEvents: eventCount,
        totalFlatSol: parseFloat(totalFlatSol.toFixed(6)),
        avgSkimBp: parseFloat(avgSkimBp.toFixed(2)),
        totalSkimA: parseFloat(totalSkimA.toFixed(6)),
        totalSkimB: parseFloat(totalSkimB.toFixed(6))
      },
      byMint: mintSummaryArray,
      recentEvents: events.slice(0, 50), // Return most recent 50 for detailed view
      totalEvents: events.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
