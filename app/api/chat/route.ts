import { openai as openaiClient } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "edge";

async function getContext(query: string) {
  const embeddingRes = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const { data } = await supabase.rpc("match_documents", {
    query_embedding: embeddingRes.data[0].embedding,
    match_threshold: 0.5,
    match_count: 5,
  });

  return data?.map((d: any) => d.content).join("\n\n") || "";
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1].content;

  const context = await getContext(lastMessage);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: `You are a helpful customer support assistant. Use this context to answer questions:

${context || "No relevant information found."}

Be concise and friendly.`,
      },
      ...messages,
    ],
  });

  return result.toTextStreamResponse();
}
