import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportDir = path.join(__dirname, 'export');
const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.json'));

let convertedCount = 0;

for (const file of files) {
  const filePath = path.join(exportDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const baseName = file.replace('.json', '');
  let md = `# ${baseName} Data Export\n\n`;
  
  if (!Array.isArray(data)) {
    // Some files might be single objects
    md += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
  } else {
    md += `**Total records:** ${data.length}\n\n`;
    
    if (data.length > 0) {
      // Find all unique keys across all objects to ensure we don't miss columns
      const keys = new Set();
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(k => keys.add(k));
        }
      });
      const columns = Array.from(keys);
      
      // Markdown Table Header
      md += `| ${columns.join(' | ')} |\n`;
      md += `| ${columns.map(() => '---').join(' | ')} |\n`;
      
      // Markdown Table Rows
      data.forEach(item => {
        if (typeof item !== 'object' || item === null) {
            // handle arrays of primitives if any
            md += `| ${String(item)} |\n`;
            return;
        }

        const row = columns.map(col => {
          let val = item[col];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            return JSON.stringify(val).replace(/\|/g, '\\|');
          }
          let strVal = String(val);
          // Escape markdown table characters
          strVal = strVal.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
          // Cap very long strings to keep table readable
          if (strVal.length > 500) {
            strVal = strVal.substring(0, 500) + '...';
          }
          return strVal;
        });
        md += `| ${row.join(' | ')} |\n`;
      });
    } else {
      md += `*No records found in this file.*\n`;
    }
  }
  
  fs.writeFileSync(path.join(exportDir, `${baseName}.md`), md);
  convertedCount++;
}

console.log(`Successfully converted ${convertedCount} JSON files to Markdown.`);
