import os
import json

export_dir = "export"
files = [f for f in os.listdir(export_dir) if f.endswith(".json")]
converted_count = 0

for file in files:
    file_path = os.path.join(export_dir, file)
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"Error parsing {file}: {e}")
            continue

    base_name = file.replace(".json", "")
    md_content = f"# {base_name} Data Export\n\n"

    if not isinstance(data, list):
        md_content += f"```json\n{json.dumps(data, indent=2)}\n```\n"
    else:
        md_content += f"**Total records:** {len(data)}\n\n"
        
        if len(data) > 0:
            keys = set()
            for item in data:
                if isinstance(item, dict):
                    keys.update(item.keys())
            
            columns = list(keys)
            
            # Header
            md_content += "| " + " | ".join(columns) + " |\n"
            md_content += "| " + " | ".join(["---"] * len(columns)) + " |\n"
            
            # Rows
            for item in data:
                if not isinstance(item, dict):
                    md_content += f"| {str(item)} |\n"
                    continue
                
                row = []
                for col in columns:
                    val = item.get(col)
                    if val is None:
                        row.append("")
                    elif isinstance(val, (dict, list)):
                        row.append(json.dumps(val).replace("|", "\\|"))
                    else:
                        str_val = str(val).replace("|", "\\|").replace("\n", "<br>")
                        if len(str_val) > 500:
                            str_val = str_val[:500] + "..."
                        row.append(str_val)
                
                md_content += "| " + " | ".join(row) + " |\n"
        else:
            md_content += "*No records found in this file.*\n"

    out_path = os.path.join(export_dir, f"{base_name}.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    
    converted_count += 1

print(f"Successfully converted {converted_count} JSON files to Markdown.")
