const fs=require('fs');
const content = fs.readFileSync('content.html', 'utf8');
let h = fs.readFileSync('template.html', 'utf8');
const model = fs.readFileSync('model.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const results = fs.readFileSync('results.json', 'utf8');

// Wrap model.js in IIFE to avoid variable conflicts
const modelWrapped = `(function(){\n${model}\n})();`;

// Wrap app.js in IIFE too
const appWrapped = `(function(){\n${app}\n})();`;

h = h.replace('<!--CONTENT-->', content)
     .replace('/*MODEL*/', modelWrapped)
     .replace('/*RESULTS*/', results)
     .replace('/*APP*/', appWrapped);
fs.writeFileSync('report.html', h, 'utf8');
console.log('written report.html', Math.round(h.length / 1024) + 'KB');
