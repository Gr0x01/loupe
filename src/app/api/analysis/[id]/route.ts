import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // If this is a re-scan, include parent's structured_output for comparison view
  let parent_structured_output = null;
  if (data.parent_analysis_id) {
    const { data: parent } = await supabase
      .from("analyses")
      .select("structured_output")
      .eq("id", data.parent_analysis_id)
      .single();
    parent_structured_output = parent?.structured_output ?? null;
  }

  return NextResponse.json({ ...data, parent_structured_output });
}
