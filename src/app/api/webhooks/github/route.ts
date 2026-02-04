import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST /api/webhooks/github - receive push events
export async function POST(request: NextRequest) {
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");

  // Only handle push events
  if (event !== "push") {
    return NextResponse.json({ message: "Event ignored" }, { status: 200 });
  }

  const payload = await request.text();
  let body: {
    ref: string;
    repository: { id: number; full_name: string };
    head_commit: {
      id: string;
      message: string;
      author: { name: string };
      timestamp: string;
    } | null;
    commits: { added: string[]; modified: string[]; removed: string[] }[];
  };

  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Find the repo by GitHub repo ID
  const { data: repo } = await serviceClient
    .from("repos")
    .select("id, user_id, full_name, default_branch, webhook_secret")
    .eq("github_repo_id", body.repository.id)
    .maybeSingle();

  // Verify signature (use empty string if no repo to prevent timing attacks)
  // Return same response for missing repo or bad signature to prevent enumeration
  if (!repo || !verifySignature(payload, signature, repo.webhook_secret)) {
    if (!repo) {
      console.log(`Webhook received for unknown repo: ${body.repository.full_name}`);
    } else {
      console.error(`Invalid webhook signature for ${repo.full_name}`);
    }
    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  }

  // Only process pushes to the default branch
  const branch = body.ref.replace("refs/heads/", "");
  if (branch !== repo.default_branch) {
    console.log(`Push to non-default branch ${branch}, ignoring`);
    return NextResponse.json({ message: "Non-default branch ignored" }, { status: 200 });
  }

  // Extract commit info
  const headCommit = body.head_commit;
  if (!headCommit) {
    return NextResponse.json({ message: "No head commit" }, { status: 200 });
  }

  // Collect changed files from all commits
  const changedFiles = new Set<string>();
  for (const commit of body.commits) {
    commit.added.forEach(f => changedFiles.add(f));
    commit.modified.forEach(f => changedFiles.add(f));
    commit.removed.forEach(f => changedFiles.add(f));
  }

  // Create deploy record
  const { data: deploy, error } = await serviceClient
    .from("deploys")
    .insert({
      repo_id: repo.id,
      commit_sha: headCommit.id,
      commit_message: headCommit.message.slice(0, 500), // Truncate long messages
      commit_author: headCommit.author.name,
      commit_timestamp: headCommit.timestamp,
      changed_files: Array.from(changedFiles),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // Handle duplicate webhook (unique constraint violation on repo_id + commit_sha)
    if (error.code === "23505") {
      console.log(`Duplicate webhook for ${repo.full_name} commit ${headCommit.id.slice(0, 7)}, ignoring`);
      return NextResponse.json({ message: "Duplicate ignored" }, { status: 200 });
    }
    console.error("Failed to create deploy record:", error);
    return NextResponse.json({ error: "Failed to record deploy" }, { status: 500 });
  }

  console.log(`Deploy recorded: ${deploy.id} for ${repo.full_name} (${headCommit.id.slice(0, 7)})`);

  // Trigger Inngest event to handle auto-scan
  await inngest.send({
    name: "deploy/detected",
    data: {
      deployId: deploy.id,
      repoId: repo.id,
      userId: repo.user_id,
      commitSha: headCommit.id,
      fullName: repo.full_name,
    },
  });

  return NextResponse.json({
    message: "Deploy recorded",
    deployId: deploy.id,
    deliveryId,
  });
}
