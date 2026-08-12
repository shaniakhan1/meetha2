import { describe, expect, it } from "vitest";
import { portableAssetUrl } from "../client/src/lib/portableAssetUrl";

describe("portableAssetUrl", () => {
  it("routes legacy CloudFront assets through the portable storage proxy", () => {
    const source = "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/template-irish-goodbye-ktzNEA3LBpMXoScC2CgPoj.webp";
    expect(portableAssetUrl(source)).toBe(
      "/manus-storage/external/aHR0cHM6Ly9kMnhzeHBoOGtweGowZi5jbG91ZGZyb250Lm5ldC8zMTA1MTk2NjMzODA2NDcyNzcvVzlocDNveFNuUll4NVdIQ1N1bjM5VS90ZW1wbGF0ZS1pcmlzaC1nb29kYnllLWt0ek5FQTNMQnBNWG9TY0MyQ2dQb2oud2VicA",
    );
  });

  it("leaves already portable relative paths unchanged", () => {
    expect(portableAssetUrl("/manus-storage/template-bill-please_7eacca04.jpg")).toBe(
      "/manus-storage/template-bill-please_7eacca04.jpg",
    );
  });
});
