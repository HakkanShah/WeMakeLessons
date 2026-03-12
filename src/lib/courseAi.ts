import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
] as const;

const REQUEST_TIMEOUT_MS = 25000;
const REQUEST_RETRY_DELAY_MS = 450;

function stripCodeFence(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    return cleaned.trim();
}

function extractJsonPayload(text: string): string {
    const cleaned = stripCodeFence(text);

    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            const candidate = cleaned.slice(firstBrace, lastBrace + 1).trim();
            JSON.parse(candidate);
            return candidate;
        }
    }

    throw new Error("Model response did not contain valid JSON.");
}

export function hasCourseAiAccess(): boolean {
    return API_KEYS.length > 0;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (timeoutMs <= 0) {
        return promise;
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error("Gemini response timed out."));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}

export async function generateStructuredJson<T>(prompt: string): Promise<T> {
    if (!hasCourseAiAccess()) {
        throw new Error("GEMINI_API_KEY is missing.");
    }

    let lastError: Error | null = null;

    for (const [apiKeyIndex, apiKey] of API_KEYS.entries()) {
        const client = new GoogleGenerativeAI(apiKey);

        for (const [modelIndex, modelName] of MODELS.entries()) {
            try {
                const model = client.getGenerativeModel({ model: modelName });
                const result = await withTimeout(
                    model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.35,
                            topP: 0.9,
                        },
                    }),
                    REQUEST_TIMEOUT_MS,
                );
                const response = await result.response;
                const payload = extractJsonPayload(response.text());
                return JSON.parse(payload) as T;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error("Unknown model generation error.");

                const hasMoreModels = modelIndex < MODELS.length - 1;
                const hasMoreKeys = apiKeyIndex < API_KEYS.length - 1;
                if (hasMoreModels || hasMoreKeys) {
                    await delay(REQUEST_RETRY_DELAY_MS);
                }
            }
        }
    }

    throw lastError || new Error("No model output was produced.");
}
