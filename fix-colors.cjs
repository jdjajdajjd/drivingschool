const fs = require('fs');

const replacements = [
  [/product-primary-soft/g, 'accent-soft'],
  [/product-primary-border/g, 'accent-border'],
  [/product-success-soft/g, 'success-soft'],
  [/product-success-border/g, 'success-border'],
  [/product-error-soft/g, 'error-soft'],
  [/product-error-border/g, 'error-border'],
  [/product-warning-soft/g, 'warning-soft'],
  [/product-warning-border/g, 'warning-border'],
  [/product-info-soft/g, 'info-soft'],
  [/product-info-border/g, 'info-border'],
  [/product-purple/g, 'warm-warm'],
  [/product-primary\b/g, 'accent'],
  [/product-success\b/g, 'success'],
  [/product-error\b/g, 'error'],
  [/product-warning\b/g, 'warning'],
  [/product-info\b/g, 'info'],
  [/product-bg\b/g, 'warm-base'],
  [/product-card\b/g, 'warm-surface'],
  [/product-border-strong/g, 'warm-border-strong'],
  [/product-border\b/g, 'warm-border'],
  [/product-secondary\b/g, 'warm-secondary'],
  [/product-main\b/g, 'warm-main'],
  [/product-muted\b/g, 'warm-muted2'],
  [/product-alt\b/g, 'warm-muted'],
  [/text-product-/g, 'text-warm-'],
  [/bg-product-/g, 'bg-warm-'],
  [/border-product-/g, 'border-warm-'],
  [/ring-product-/g, 'ring-warm-'],
];

const dirs = ['src/pages', 'src/components'];

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;
  for (const [pattern, replacement] of replacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  }
  // handle ink-* patterns
  const inkPattern = /ink-(\d+)/g;
  const newContent = content.replace(inkPattern, (match, n) => `warm-${n}`);
  if (newContent !== content) {
    changed = true;
    content = newContent;
  }
  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Updated:', filepath);
  }
}

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = d + '/' + f;
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        walk(p);
      } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        processFile(p);
      }
    }
  }
  walk(dir);
}
console.log('Done!');
