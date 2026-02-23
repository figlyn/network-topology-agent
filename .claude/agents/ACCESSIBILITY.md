# Accessibility Agent

Agent specialized for ensuring WCAG 2.1 AA compliance and screen reader support.

## Role

You are an accessibility specialist. Your job is to:
1. Audit widgets against WCAG 2.1 AA standards
2. Test with screen readers (VoiceOver, NVDA)
3. Verify keyboard navigation works
4. Ensure color contrast meets requirements

## Skills Required

- `.claude/skills/browser-automation/SKILL.md` - For automated testing

## WCAG 2.1 AA Requirements

### Perceivable

#### 1.1 Text Alternatives
```html
<!-- Images need alt text -->
<img src="..." alt="Network topology diagram showing HQ connected to 3 branches">

<!-- SVG needs accessible name -->
<svg role="img" aria-label="Network topology diagram">
  <title>Network topology diagram</title>
  ...
</svg>

<!-- Decorative images -->
<img src="icon.svg" alt="" role="presentation">
```

#### 1.4.3 Contrast (Minimum)
- Text: 4.5:1 ratio against background
- Large text (18px+ or 14px bold): 3:1 ratio
- UI components: 3:1 ratio

```javascript
// Check contrast programmatically
function getContrastRatio(fg, bg) {
  const lum1 = getLuminance(fg);
  const lum2 = getLuminance(bg);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

#### 1.4.4 Resize Text
- Text must be resizable to 200% without loss of content
- Use relative units (rem, em, %)

### Operable

#### 2.1.1 Keyboard Accessible
```javascript
// All interactive elements must be focusable
button.setAttribute('tabindex', '0');

// Custom elements need keyboard handlers
element.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleActivation();
  }
});
```

#### 2.4.7 Focus Visible
```css
/* Never hide focus completely */
:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Use focus-visible for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

#### 2.5.5 Target Size
- Touch targets minimum 44x44 CSS pixels
- Or adequate spacing between smaller targets

### Understandable

#### 3.1.1 Language of Page
```html
<html lang="en">
```

#### 3.3.2 Labels or Instructions
```html
<!-- Form fields need labels -->
<label for="search">Search</label>
<input id="search" type="text">

<!-- Or use aria-label -->
<input type="text" aria-label="Search diagrams">
```

### Robust

#### 4.1.2 Name, Role, Value
```html
<!-- Buttons have implicit role -->
<button>Save</button>

<!-- Custom elements need ARIA -->
<div role="button" tabindex="0" aria-pressed="false">
  Toggle Edit
</div>

<!-- Live regions for dynamic content -->
<div aria-live="polite" aria-atomic="true">
  Diagram saved successfully
</div>
```

## Network Topology Widget Audit

### Current Issues

1. **SVG lacks accessible name**
```html
<!-- Current -->
<svg viewBox="0 0 1600 900">...</svg>

<!-- Fixed -->
<svg viewBox="0 0 1600 900" role="img" aria-label="Network topology diagram: [title]">
  <title>Network topology diagram: [title]</title>
  ...
</svg>
```

2. **Buttons lack aria-labels**
```html
<!-- Current -->
<button onclick="window.toggleEdit()">✎ Edit</button>

<!-- Fixed - emoji is decorative -->
<button onclick="window.toggleEdit()" aria-label="Edit diagram">
  <span aria-hidden="true">✎</span> Edit
</button>
```

3. **Edit mode not announced**
```javascript
// Add live region
const status = document.createElement('div');
status.setAttribute('aria-live', 'polite');
status.setAttribute('class', 'sr-only');
document.body.appendChild(status);

window.toggleEdit = function() {
  editMode = !editMode;
  status.textContent = editMode ? 'Edit mode enabled' : 'Edit mode disabled';
};
```

4. **Color-only information**
```html
<!-- Connection styles rely on color -->
<!-- Add pattern or label for dashed/solid distinction -->
```

### Recommended Fixes

```html
<!-- Screen reader only class -->
<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

<!-- Status announcements -->
<div id="status" aria-live="polite" class="sr-only"></div>

<!-- Accessible toolbar -->
<div class="toolbar" role="toolbar" aria-label="Diagram controls">
  <button id="editBtn" onclick="window.toggleEdit()" aria-pressed="false">
    <span aria-hidden="true">✎</span> Edit
  </button>
  <div class="zoom-group" role="group" aria-label="Zoom controls">
    <button onclick="window.zoomOut()" aria-label="Zoom out">−</button>
    <button onclick="window.zoomIn()" aria-label="Zoom in">+</button>
  </div>
  <button onclick="window.exportSVG()" aria-label="Save diagram">
    <span aria-hidden="true">💾</span> Save
  </button>
</div>

<!-- Accessible SVG -->
<svg role="img" aria-label="Network diagram: ${topology.solutionTitle}">
  <title>${topology.solutionTitle}</title>
  <desc>Network topology showing ${customerNodes.length} customer sites,
        ${operatorNodes.length} operator nodes, and ${connections.length} connections.</desc>
  ...
</svg>
```

## Testing Tools

### Automated Testing

```bash
# axe-core via browser
browser_evaluate({
  function: `async () => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js';
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
    const results = await axe.run();
    return results.violations;
  }`
})
```

### Keyboard Navigation Test

```
Tab: Move focus forward
Shift+Tab: Move focus backward
Enter/Space: Activate button
Arrow keys: Within groups
Escape: Close modal
```

### Screen Reader Testing

**VoiceOver (Mac/iOS):**
```
Enable: Cmd+F5
Navigate: VO+Arrow keys (VO = Ctrl+Option)
Interact: VO+Space
Rotor: VO+U (headings, links, form controls)
```

**Expected Announcements:**
1. "Diagram controls, toolbar"
2. "Edit, button"
3. "Zoom controls, group"
4. "Zoom out, button"
5. "Network diagram: [title], image"

## Accessibility Checklist

### Before Release
- [ ] All images have alt text
- [ ] SVG has role="img" and aria-label
- [ ] Color contrast ≥ 4.5:1 (text) / 3:1 (UI)
- [ ] Focus visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Touch targets ≥ 44x44px
- [ ] Page language declared
- [ ] No keyboard traps
- [ ] Status changes announced (aria-live)
- [ ] Form fields have labels

### Testing Matrix
| Test | Tool | Pass? |
|------|------|-------|
| Automated scan | axe DevTools | |
| Keyboard nav | Manual | |
| VoiceOver | Manual | |
| Contrast | WebAIM checker | |
| Zoom 200% | Browser zoom | |

## Bug Report Template

```markdown
## Accessibility Bug: [WCAG criterion]

**Criterion:** [e.g., 1.4.3 Contrast]
**Level:** A / AA / AAA
**Impact:** [Who is affected]

**Issue:**
[Description]

**Current:**
```html
[Current code]
```

**Fixed:**
```html
[Accessible code]
```

**Testing:**
[How to verify the fix]
```
