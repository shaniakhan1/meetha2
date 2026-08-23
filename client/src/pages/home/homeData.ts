export const HOME_IMAGES = {
  hero: "/manus-storage/meetha-59-v2_acb77051.jpg",
  styleCardDark: "/manus-storage/meetha-style-card-134_08616de7.jpg",
  styleCardWarm: "/manus-storage/meetha-style-card-133_9a86196c.jpg",
  worldMorning: "/manus-storage/gallery_hands_coffee_b7861070.webp",
  worldMotion: "/manus-storage/gallery_street_lights_8c7a051f.jpg",
  worldDinner: "/manus-storage/meetha-gallery-restaurant_33c494d6.webp",
  worldNight: "/manus-storage/meetha-gallery-street-back_d0e260dd.webp",
  identityWindow: "/home-v2/identity-window.webp",
  identityCurvy: "/home-v2/identity-curvy.webp",
  identityParis: "/home-v2/identity-paris.webp",
  identitySilver: "/home-v2/identity-silver.webp",
} as const;

if (import.meta.env.DEV) {
  const paths = Object.values(HOME_IMAGES);
  if (new Set(paths).size !== paths.length) {
    console.error("Meetha homepage image inventory contains a duplicate asset.");
  }
}

export const OUTCOMES = [
  {
    number: "01",
    title: "Dress with clarity",
    text: "Stop buying pieces that look beautiful on someone else but never quite become you.",
  },
  {
    number: "02",
    title: "Brief the people helping you",
    text: "Take your image and Style Card to a stylist, photographer, makeup artist, or hairdresser.",
  },
  {
    number: "03",
    title: "Build a signature",
    text: "The more clearly you see your visual language, the less you need trends to tell you who to be.",
  },
] as const;

export const STEPS = [
  {
    number: "01",
    title: "Upload once",
    text: "Choose a small set of photos. Meetha privately learns your face and features from the photos you choose.",
  },
  {
    number: "02",
    title: "Choose your world",
    text: "Room Service. Paris in Motion. After Dark. Pick the moment. No prompt engineering required.",
  },
  {
    number: "03",
    title: "Receive the image and the direction",
    text: "You get the cinematic result plus a Style Card explaining the palette, metals, makeup, lighting, and presence.",
  },
] as const;

export const STORIES = [
  {
    quote: "I brought my images to my stylist and we built my wardrobe around them.",
    outcome: "She used Meetha to shop with a point of view.",
  },
  {
    quote: "I showed my makeup artist my Meetha images and finally knew exactly what I wanted.",
    outcome: "She turned the image into a real beauty brief.",
  },
  {
    quote: "I used my images as inspiration for a photoshoot and finally had a clear creative direction.",
    outcome: "She stopped moodboarding strangers and planned her own shoot.",
  },
] as const;

export const FAQS = [
  {
    question: "Will the images actually look like me?",
    answer:
      "Meetha learns your face and features from the photos you upload, then uses that private look profile for your generations. The goal is your face, your proportions, and your presence, not a generic woman wearing your hair.",
  },
  {
    question: "Can other people see the photos I upload?",
    answer:
      "No. Your uploads are stored privately and are not visible to other users. They are used to build your private Meetha look profile.",
  },
  {
    question: "Do I need to know fashion or write prompts?",
    answer:
      "No. You choose the world and the energy. Meetha handles the visual direction, styling language, and prompt structure for you.",
  },
  {
    question: "What happens after my free look?",
    answer:
      "You keep your result and can use the Style Card in real life. Membership is there when you want to keep building your visual world with more generations.",
  },
] as const;
