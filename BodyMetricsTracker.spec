# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path


icon_png = Path('src/body_metrics_tracker/assets/app_icon.png')
icon_ico = Path('src/body_metrics_tracker/assets/app_icon.ico')
icon_icns = Path('src/body_metrics_tracker/assets/app_icon.icns')

datas = []
if icon_png.exists():
    datas.append((str(icon_png), 'body_metrics_tracker/assets'))
if icon_ico.exists():
    datas.append((str(icon_ico), 'body_metrics_tracker/assets'))
if icon_icns.exists():
    datas.append((str(icon_icns), 'body_metrics_tracker/assets'))

a = Analysis(
    ['pyinstaller_entry.py'],
    pathex=['src'],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BodyMetricsTracker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(icon_ico) if icon_ico.exists() else None,
)

if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        a.binaries,
        a.datas,
        name='BodyMetricsTracker.app',
        icon=str(icon_icns) if icon_icns.exists() else None,
        bundle_identifier='com.bodymetricstracker.app',
    )
else:
    coll = COLLECT(
        exe,
        a.binaries,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name='BodyMetricsTracker',
    )
