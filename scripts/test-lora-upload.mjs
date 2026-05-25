/**
 * Quick test to hit the local LoRA upload endpoint and see the real error.
 * Run: node scripts/test-lora-upload.mjs
 */
import fs from "fs";
import FormData from "form-data";

const BASE = "http://localhost:3000";

async function testWithNoAuth() {
  const form = new FormData();
  for (let i = 0; i < 6; i++) {
    form.append("photos", fs.createReadStream("/tmp/test_photo.jpg"), `photo_${i}.jpg`);
  }
  const res = await fetch(BASE + "/api/lora/upload", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });
  const body = await res.text();
  console.log("No-auth test:", res.status, body.substring(0, 200));
}

async function testWithBadAuth() {
  const form = new FormData();
  for (let i = 0; i < 6; i++) {
    form.append("photos", fs.createReadStream("/tmp/test_photo.jpg"), `photo_${i}.jpg`);
  }
  const res = await fetch(BASE + "/api/lora/upload", {
    method: "POST",
    body: form,
    headers: { ...form.getHeaders(), cookie: "app_session_id=INVALID" },
  });
  const body = await res.text();
  console.log("Bad-auth test:", res.status, body.substring(0, 200));
}

console.log("Testing LoRA upload endpoint...\n");
await testWithNoAuth();
await testWithBadAuth();
