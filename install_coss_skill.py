import urllib.request
import json
import os

headers = {'User-Agent': 'Python'}
req = urllib.request.Request('https://api.github.com/repos/cosscom/coss/git/trees/main?recursive=1', headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

targets = [
    r'c:\Users\A\Documents\Projects\Openbots\.agents\skills',
    r'C:\Users\A\.gemini\config\skills'
]

skill_blobs = [item for item in data.get('tree', []) if item['path'].startswith('apps/ui/skills/') and item['type'] == 'blob']
print(f'Downloading {len(skill_blobs)} files...')

for item in skill_blobs:
    rel_path = item['path'].replace('apps/ui/skills/', '')
    raw_url = 'https://raw.githubusercontent.com/cosscom/coss/main/' + item['path']
    try:
        file_req = urllib.request.Request(raw_url, headers=headers)
        with urllib.request.urlopen(file_req) as f_resp:
            content = f_resp.read()
            
        for target in targets:
            dest = os.path.join(target, rel_path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'wb') as f:
                f.write(content)
        print(f'Installed: {rel_path}')
    except Exception as e:
        print(f'Failed {rel_path}: {e}')
        
print('All skill files installed successfully!')
