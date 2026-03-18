#!/usr/bin/env node
// Script to generate placeholder PWA icons
// Run: node scripts/generate-icons.js
// For production, replace with real icon files

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#f97316');
  gradient.addColorStop(1, '#c2410c');
  ctx.fillStyle = gradient;
  
  // Rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Emoji / text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💪', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outputDir, `icon-${size}.png`), buffer);
  console.log(`✅ icon-${size}.png`);
});

// Apple touch icon
const canvas = createCanvas(180, 180);
const ctx = canvas.getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 180, 180);
gradient.addColorStop(0, '#f97316');
gradient.addColorStop(1, '#c2410c');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 180, 180);
ctx.fillStyle = 'white';
ctx.font = 'bold 90px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('💪', 90, 90);
fs.writeFileSync(path.join(outputDir, 'apple-touch-icon.png'), canvas.toBuffer('image/png'));
console.log('✅ apple-touch-icon.png');
console.log('All icons generated!');
