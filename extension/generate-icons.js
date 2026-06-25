// Run with: node generate-icons.js
const fs = require('fs');

// Base64 encoded minimal purple square PNG for each size
// Use the same SVG as the main app logo converted to PNG
const { createCanvas } = require('canvas');

[16, 32, 48, 128].forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Purple rounded background
  ctx.fillStyle = '#7C6DFA';
  ctx.beginPath();
  const r = size * 0.2;
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  
  // White play triangle
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size * 0.22);
  ctx.lineTo(size * 0.25, size * 0.78);
  ctx.lineTo(size * 0.72, size * 0.5);
  ctx.closePath();
  ctx.fill();
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
});
