import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Read doc.txt from public folder
    const filePath = path.join(process.cwd(), "public", "doc.txt");
    const content = fs.readFileSync(filePath, "utf-8");

    // Split by paragraphs (double newlines)
    const chunks = content
      .split("\n\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    // Clear existing documents (optional)
    await supabase.from("documents").delete().neq("id", 0);

    // Process each chunk
    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      await supabase.from("documents").insert({
        content: chunk,
        metadata: { source: "doc.txt" },
        embedding: embeddingRes.data[0].embedding,
      });
    }

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
