"""Build a store ZIP from an explicit runtime allowlist, excluding local trial config."""
from pathlib import Path
import json, zipfile
root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'manifest.json').read_text())['version']
output = root / 'dist' / f'tab-volume-manager-{version}.zip'
output.parent.mkdir(exist_ok=True)
files = ['manifest.json', 'popup.html', 'popup.js', 'style.css', 'background.js', 'content.js', 'stereo.js', 'offscreen.js', 'offscreen.html']
files += [str(p.relative_to(root)) for p in (root / 'icons').glob('*.png')]
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in files:
        data = (root / name).read_bytes()
        if name in ['popup.js', 'background.js']:
            text = data.decode()
            start = text.index('// Unpacked development only.')
            end = text.index('})();', start) + len('})();')
            data = (text[:start] + 'const trialDevelopmentConfig = Promise.resolve(null);' + text[end:]).encode()
            assert b'127.0.0.1' not in data and b'trial.local.json' not in data
        z.writestr(name, data)
print(output)
