import { readFileSync, writeFileSync } from 'fs';

const jsonl = readFileSync('/Users/vedangvaidya/.claude/projects/-Users-vedangvaidya-Desktop-Omega-Life-CareRoster/971ac280-1b15-4d7d-bb03-fb0cbd7b5060.jsonl', 'utf-8');
const lines = jsonl.trim().split('\n').map(l => JSON.parse(l));

let md = '# CareRoster — Raw Chat Export\n';
md += '**Date:** 2026-04-08\n';
md += '**Session ID:** 971ac280-1b15-4d7d-bb03-fb0cbd7b5060\n\n---\n\n';

for (const msg of lines) {
  const role = msg.role || msg.type || 'system';
  
  if (role === 'user') {
    md += '## User\n\n';
    if (typeof msg.content === 'string') {
      md += msg.content + '\n\n';
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') {
          md += block.text + '\n\n';
        } else if (block.type === 'tool_result') {
          // skip large tool results
          md += `*[Tool result for: ${block.tool_use_id || 'unknown'}]*\n\n`;
        }
      }
    }
    md += '---\n\n';
  } else if (role === 'assistant') {
    md += '## Assistant\n\n';
    if (typeof msg.content === 'string') {
      md += msg.content + '\n\n';
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          md += block.text + '\n\n';
        } else if (block.type === 'tool_use') {
          const name = block.name || 'unknown_tool';
          const input = block.input || {};
          if (name === 'Bash') {
            md += `**\`Bash\`**: \`${(input.command || '').slice(0, 200)}\`\n\n`;
          } else if (name === 'Read') {
            md += `**\`Read\`**: \`${input.file_path || ''}\`\n\n`;
          } else if (name === 'Write') {
            md += `**\`Write\`**: \`${input.file_path || ''}\`\n\n`;
          } else if (name === 'Edit') {
            md += `**\`Edit\`**: \`${input.file_path || ''}\`\n\n`;
          } else if (name === 'Grep') {
            md += `**\`Grep\`**: pattern=\`${input.pattern || ''}\` path=\`${input.path || ''}\`\n\n`;
          } else if (name === 'Glob') {
            md += `**\`Glob\`**: \`${input.pattern || ''}\`\n\n`;
          } else if (name === 'Agent') {
            md += `**\`Agent\`** (${input.subagent_type || 'general'}): ${input.description || ''}\n\n`;
          } else {
            md += `**\`${name}\`**\n\n`;
          }
        }
      }
    }
    md += '---\n\n';
  }
}

writeFileSync('docs/session-2026-04-08-raw-chat.md', md);
console.log('Written:', md.length, 'chars');
