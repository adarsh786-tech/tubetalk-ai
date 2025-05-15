/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";

export async function createVideoSummary(
  allChunks: Document[],
  llmModel: any,
  videoId: string
): Promise<string> {
  if (!allChunks || allChunks.length === 0)
    return "No transcript content available to summarize.";

  let sampledChunks: Document[] = [];
  const totalChunks = allChunks.length;

  if (totalChunks > 50) {
    sampledChunks = [
      ...allChunks.slice(0, 10),
      ...allChunks.slice(totalChunks / 2 - 5, totalChunks / 2 + 5),
      ...allChunks.slice(-10),
    ];
  } else {
    sampledChunks = allChunks;
  }

  const combinedContent = sampledChunks
    .map((chunk) => `[${chunk.metadata.timestamp}] ${chunk.pageContent}`)
    .join("\n");

  if (!combinedContent.trim()) {
    return "No transcript content available to summarize.";
  }

  const messages = [
    {
      role: "system",
      content:
        "Create a comprehensive summary of this YouTube video transcript.",
    },
    { role: "user", content: combinedContent },
  ];

  const res = await llmModel.invoke(messages);
  return res.content || "Unable to generate summary.";
}

export async function uploadInChunks(
  docs: Document[],
  embedder: any,
  batchSize: number,
  options: any
) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const embeddings = await embedder.embedDocuments(
      chunk.map((doc) => doc.pageContent)
    );

    const validDocs = chunk.filter(
      (_, index) =>
        Array.isArray(embeddings[index]) && embeddings[index].length === 768
    );

    if (validDocs.length > 0) {
      await QdrantVectorStore.fromDocuments(validDocs, embedder, options);
    }
  }
}

export async function processQuery(
  query: string,
  llmModel: any,
  systemPrompt: string
): Promise<string> {
  if (!query.trim()) return "Please provide a valid question about the video.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: query },
  ];

  const res = await llmModel.invoke(messages);
  return res.content || "No response generated.";
}

export async function getResponseForQuery(
  query: string,
  videoData: any,
  llmModel: any
): Promise<string> {
  if (!query.trim()) return "Please provide a valid question.";

  const retriever = await QdrantVectorStore.fromExistingCollection(
    videoData.embedder,
    {
      collectionName: `yt-${videoData.videoId}`,
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    }
  );

  const relevantChunks = await retriever.similaritySearch(query, 8);

  const chunksContent =
    relevantChunks.length > 0
      ? relevantChunks
          .map(
            (chunk) =>
              `[${chunk.metadata.timestamp || "Unknown"}] ${chunk.pageContent}`
          )
          .join("\n")
      : "No specific transcript sections found relevant to your query.";

  const systemPrompt = `You are a helpful AI Assistant for a YouTube video.

  If the user asks something that isn't covered in the transcript, feel free to answer from your general knowledge but also tell the user to keep the chat relevant to the video.

Video Summary:
${videoData.summary || "No summary available."}

Relevant Transcript Sections:
${chunksContent}

Instructions:
- Provide answers based on the transcript.
- Include timestamps if needed.
- Mention you don't know beyond the transcript.`;

  if (query.toLowerCase().includes("summary")) {
    return `Here's a summary of the video:\n\n${videoData.summary}`;
  }

  return await processQuery(query, llmModel, systemPrompt);
}
