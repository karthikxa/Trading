with open('dist/assets/index-DN7Wwj6D.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace light mode accent
css = css.replace('--accent:#2962ff;--accent-text:#fff;', '--accent:#131722;--accent-text:#fff;')
# Replace dark mode accent
css = css.replace('--accent:#2962ff', '--accent:#f0f3fa')

# Replace direct color definitions with monochrome
css = css.replace('var(--accent,#2962ff)', 'var(--accent,#131722)')
css = css.replace('#2962ff', 'var(--accent,#131722)')

reset_rule = """
.ind-info,.toolbar button.ind-info,.toolbar .ind-info,.heatmap-panel .ind-info,.wfo-label .ind-info{background:transparent !important;color:var(--text-dim) !important;border:none !important;border-radius:0 !important;padding:0 !important;margin:0 0 0 4px !important;min-width:0 !important;min-height:0 !important;width:auto !important;height:auto !important;display:inline-flex !important;align-items:center !important;cursor:help !important;box-shadow:none !important;}
.ind-info svg,.toolbar button.ind-info svg,.toolbar .ind-info svg,.heatmap-panel .ind-info svg{fill:none !important;stroke:currentColor !important;stroke-width:1.6 !important;width:13px !important;height:13px !important;}
.ind-info:hover,.toolbar button.ind-info:hover,.toolbar .ind-info:hover,.heatmap-panel .ind-info:hover{background:transparent !important;color:var(--text) !important;}
[data-theme="light"] .seg button.seg-on,[data-theme="light"] .heatmap-seg button.seg-on{background:#131722 !important;color:#fff !important;}
:root:not([data-theme="light"]) .seg button.seg-on,:root:not([data-theme="light"]) .heatmap-seg button.seg-on{background:#f0f3fa !important;color:#131722 !important;}
"""

if '.heatmap-panel .ind-info' not in css:
    css += reset_rule

with open('dist/assets/index-DN7Wwj6D.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated dist/assets/index-DN7Wwj6D.css successfully.')
