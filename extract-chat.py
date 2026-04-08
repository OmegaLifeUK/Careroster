import json, sys

INPUT = '/Users/vedangvaidya/.claude/projects/-Users-vedangvaidya-Desktop-Omega-Life-CareRoster/971ac280-1b15-4d7d-bb03-fb0cbd7b5060.jsonl'
OUTPUT = '/Users/vedangvaidya/Desktop/Omega Life/CareRoster/docs/session-2026-04-08-raw-chat.md'

with open(INPUT) as f:
    lines = [json.loads(l) for l in f]

md = '# CareRoster — Full Raw Chat Export\n'
md += '**Date:** 2026-04-08  \n'
md += '**Session ID:** 971ac280-1b15-4d7d-bb03-fb0cbd7b5060  \n\n---\n\n'

def extract_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get('type') == 'text':
                parts.append(block.get('text', ''))
            elif block.get('type') == 'tool_use':
                name = block.get('name', '?')
                inp = block.get('input', {})
                if name == 'Bash':
                    cmd = inp.get('command', '')
                    parts.append(f'\n**`Bash`**:\n```bash\n{cmd}\n```\n')
                elif name == 'Read':
                    parts.append(f'\n**`Read`**: `{inp.get("file_path", "")}`\n')
                elif name == 'Write':
                    fp = inp.get("file_path", "")
                    content_preview = (inp.get("content", ""))[:500]
                    parts.append(f'\n**`Write`**: `{fp}`\n```\n{content_preview}...\n```\n')
                elif name == 'Edit':
                    fp = inp.get("file_path", "")
                    old = inp.get("old_string", "")[:200]
                    new = inp.get("new_string", "")[:200]
                    parts.append(f'\n**`Edit`**: `{fp}`\nOld: `{old}`\nNew: `{new}`\n')
                elif name == 'Grep':
                    parts.append(f'\n**`Grep`**: pattern=`{inp.get("pattern", "")}` path=`{inp.get("path", "")}`\n')
                elif name == 'Glob':
                    parts.append(f'\n**`Glob`**: `{inp.get("pattern", "")}`\n')
                elif name == 'Agent':
                    desc = inp.get('description', '')
                    prompt_text = inp.get('prompt', '')[:500]
                    stype = inp.get('subagent_type', 'general')
                    parts.append(f'\n**`Agent`** ({stype}): {desc}\n> {prompt_text}...\n')
                else:
                    parts.append(f'\n**`{name}`**\n')
            elif block.get('type') == 'tool_result':
                content_val = block.get('content', '')
                if isinstance(content_val, str):
                    trimmed = content_val[:1000]
                    if len(content_val) > 1000:
                        trimmed += '\n... [truncated]'
                    parts.append(f'\n*Tool result:*\n```\n{trimmed}\n```\n')
                elif isinstance(content_val, list):
                    for sub in content_val:
                        if isinstance(sub, dict) and sub.get('type') == 'text':
                            txt = sub.get('text', '')[:1000]
                            if len(sub.get('text', '')) > 1000:
                                txt += '\n... [truncated]'
                            parts.append(f'\n*Tool result:*\n```\n{txt}\n```\n')
        return '\n'.join(parts)
    return str(content)

for entry in lines:
    t = entry.get('type')
    
    if t == 'user':
        msg = entry.get('message', {})
        if isinstance(msg, dict):
            content = msg.get('content', '')
            text = extract_text(content)
        elif isinstance(msg, str):
            text = msg
        else:
            continue
        
        # skip system-reminder-only messages
        stripped = text.strip()
        if stripped.startswith('<system-reminder>') and '</system-reminder>' in stripped:
            remainder = stripped[stripped.rindex('</system-reminder>')+len('</system-reminder>'):].strip()
            if not remainder:
                continue
        if stripped.startswith('<local-command-caveat>') and not any(c in stripped for c in ['base44', 'larvel', 'laravel', 'phase', 'delete']):
            continue
            
        if text.strip():
            md += f'## 👤 User\n\n{text.strip()}\n\n---\n\n'
    
    elif t == 'assistant':
        msg = entry.get('message', {})
        if isinstance(msg, dict):
            content = msg.get('content', '')
            text = extract_text(content)
        else:
            continue
        if text.strip():
            md += f'## 🤖 Assistant\n\n{text.strip()}\n\n---\n\n'
    
    elif t == 'system':
        subtype = entry.get('subtype', '')
        content = entry.get('content', '')
        if 'tool_result' in subtype or not content:
            continue

with open(OUTPUT, 'w') as f:
    f.write(md)

print(f'Written: {len(md):,} chars to {OUTPUT}')
