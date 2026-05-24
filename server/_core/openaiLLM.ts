/**
 * OpenAI GPT-4o helper for Meetha hook and caption generation.
 * Replaces the Manus built-in Forge LLM.
 */
import OpenAI from "openai";
import { ENV } from "./env";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!ENV.openAiApiKey) throw new Error("OPENAI_API_KEY is not configured");
    _client = new OpenAI({ apiKey: ENV.openAiApiKey });
  }
  return _client;
}

export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIOptions = {
  messages: OpenAIMessage[];
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
};

export async function invokeLLMOpenAI(options: OpenAIOptions): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: options.messages,
    ...(options.response_format ? { response_format: options.response_format as any } : {}),
  });

  return {
    choices: response.choices.map((c) => ({
      message: { content: c.message.content ?? "" },
    })),
  };
}
