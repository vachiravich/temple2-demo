import subprocess
import json
import os

print("Exporting latest data and images from MySQL Database (via PHP API)...")
try:
    # Run api_get_data.php to get full fresh JSON from MySQL database
    out = subprocess.check_output(['php', 'api_get_data.php'])
    data = json.loads(out.decode('utf-8'))

    # Write data.json
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Successfully updated data.json")

    # Write data.js
    js_content = 'window.SANGHA_DATA_FALLBACK = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';'
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Successfully updated data.js")

    print(f"\nDone! Exported {len(data['monks'])} monks records (including profile photos).")
    print("Now you can run: git add . && git commit -m 'Update photos' && git push")

except Exception as e:
    print("Error during export:", e)
