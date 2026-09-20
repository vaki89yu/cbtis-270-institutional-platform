import sharp from "sharp";
import { writeFileSync } from "node:fs";

const svg = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b91f3"/>
      <stop offset="100%" stop-color="#17295a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 110}" fill="url(#g)"/>
  <g transform="translate(${pad ? 56 : 0} ${pad ? 56 : 0}) scale(${pad ? 0.78 : 1})">
    <path d="M256 60 96 116v150c0 96 68 160 160 184 92-24 160-88 160-184V116L256 60Z" fill="none" stroke="#bfe0fd" stroke-width="18" stroke-linejoin="round"/>
    <path d="M176 300V204l80-48 80 48v96" fill="none" stroke="#dbeefe" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="256" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="#ffffff">270</text>
    <rect x="196" y="330" width="120" height="16" rx="8" fill="#93cdfc"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg(192, false))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(512, false))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(svg(512, true))).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
console.log("icons ok");
