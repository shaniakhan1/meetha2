/**
 * Tests for V64 LoRA training cost reduction changes:
 * 1. Duplicate training job guard (returns 409 if lora_status === 'training')
 * 2. Learning rate set to 0.0001 in falLoraTraining.ts
 * 3. Combined vision LLM call (extractVisualDescriptors) replaces two separate calls
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const loraUploadSrc = readFileSync(
  path.resolve(__dirname, "loraUpload.ts"),
  "utf-8"
);

const falLoraTrainingSrc = readFileSync(
  path.resolve(__dirname, "_core/falLoraTraining.ts"),
  "utf-8"
);

describe("V64 LoRA cost reduction", () => {
  it("loraUpload.ts contains the duplicate training job guard", () => {
    expect(loraUploadSrc).toContain('lora_status === "training"');
    expect(loraUploadSrc).toContain("409");
    expect(loraUploadSrc).toContain("A training job is already in progress");
  });

  it("falLoraTraining.ts uses learning_rate of 0.0001 (not 0.0002)", () => {
    expect(falLoraTrainingSrc).toContain("learning_rate: 0.0001");
    expect(falLoraTrainingSrc).not.toContain("learning_rate: 0.0002");
  });

  it("loraUpload.ts uses the combined extractVisualDescriptors function", () => {
    expect(loraUploadSrc).toContain("extractVisualDescriptors");
    // Old separate functions should be gone
    expect(loraUploadSrc).not.toContain("extractPhysicalDescriptors");
    expect(loraUploadSrc).not.toContain("extractBodyDescriptor");
  });

  it("extractVisualDescriptors makes a single LLM call returning both physical and body fields", () => {
    // The combined function should request JSON with both fields
    expect(loraUploadSrc).toContain('"physical"');
    expect(loraUploadSrc).toContain('"body"');
    // Should only have one invokeLLM call (not two)
    const llmCallCount = (loraUploadSrc.match(/invokeLLM\(/g) ?? []).length;
    expect(llmCallCount).toBe(1);
  });
});
