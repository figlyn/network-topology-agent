# Test Cases

Detailed test cases for issues in BACKLOG.md. Test cases must be defined BEFORE implementation begins.

## Test Case Format

```markdown
### TC-[ISSUE-ID]-[NUMBER]: [Test Name]

**Preconditions:**
- [Required state before test]

**Steps:**
1. [Action 1]
2. [Action 2]

**Expected Result:**
[What should happen]

**Test Type:** Manual / Automated / Both
**Agent:** Tester / Mobile Tester / Accessibility
```

---

## UX-001: No Undo/Redo Support

### TC-UX001-01: Undo Drag Operation

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node to new position
2. Press Cmd+Z (Mac) or Ctrl+Z (Windows)

**Expected Result:**
Node returns to original position

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX001-02: Undo Text Edit

**Preconditions:**
- Widget loaded with diagram

**Steps:**
1. Double-click a node label
2. Change text to "Modified Label"
3. Press Enter to save
4. Press Cmd+Z

**Expected Result:**
Label reverts to original text

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX001-03: Redo After Undo

**Preconditions:**
- Performed TC-UX001-01 or TC-UX001-02

**Steps:**
1. After undo, press Cmd+Shift+Z (or Cmd+Y)

**Expected Result:**
Change is reapplied

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX001-04: Multiple Undo Steps

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag node A to new position
2. Drag node B to new position
3. Edit label of node C
4. Press Cmd+Z three times

**Expected Result:**
All three changes undone in reverse order

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX001-05: Undo History Survives Mode Toggle

**Preconditions:**
- Widget loaded, edit mode enabled
- Made several edits

**Steps:**
1. Toggle edit mode OFF
2. Toggle edit mode ON
3. Press Cmd+Z

**Expected Result:**
Previous edits can still be undone

**Test Type:** Manual
**Agent:** Tester

---

## UX-002: No Keyboard Shortcuts

### TC-UX002-01: Save Shortcut (Mac)

**Preconditions:**
- Widget loaded with diagram
- macOS system

**Steps:**
1. Press Cmd+S

**Expected Result:**
Save modal appears with diagram image

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX002-02: Save Shortcut (Windows)

**Preconditions:**
- Widget loaded with diagram
- Windows system

**Steps:**
1. Press Ctrl+S

**Expected Result:**
Save modal appears with diagram image

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX002-03: Zoom Shortcuts

**Preconditions:**
- Widget loaded with diagram

**Steps:**
1. Note current zoom level
2. Press Cmd+= (or Cmd++)
3. Press Cmd+-

**Expected Result:**
- Step 2: Zoom increases
- Step 3: Zoom decreases

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX002-04: Escape Exits Edit Mode

**Preconditions:**
- Widget loaded, edit mode enabled

**Steps:**
1. Press Escape

**Expected Result:**
Edit mode disabled, button shows "Edit" not "Editing"

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX002-05: Escape Cancels Text Input

**Preconditions:**
- Double-clicked on label, input field visible

**Steps:**
1. Type new text
2. Press Escape (without Enter)

**Expected Result:**
- Input closes
- Original label unchanged

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX002-06: Shortcuts Don't Conflict with Browser

**Preconditions:**
- Widget loaded in ChatGPT

**Steps:**
1. Press Cmd+S
2. Observe browser behavior

**Expected Result:**
- Widget save modal appears
- Browser save dialog does NOT appear (preventDefault worked)

**Test Type:** Manual
**Agent:** Tester

---

## UX-003: No Zoom Level Indicator

### TC-UX003-01: Zoom Level Displays

**Preconditions:**
- Widget loaded

**Steps:**
1. Look at toolbar zoom controls

**Expected Result:**
Zoom percentage visible (e.g., "100%")

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX003-02: Zoom Level Updates

**Preconditions:**
- Widget loaded at 100%

**Steps:**
1. Click zoom in button
2. Check displayed percentage
3. Click zoom out button twice
4. Check displayed percentage

**Expected Result:**
- After step 1: Shows ~115%
- After step 3: Shows ~85%

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX003-03: Zoom Level Bounds

**Preconditions:**
- Widget loaded

**Steps:**
1. Click zoom in repeatedly until max
2. Note displayed percentage
3. Click zoom out repeatedly until min
4. Note displayed percentage

**Expected Result:**
- Max: 180%
- Min: 70%

**Test Type:** Manual
**Agent:** Tester

---

## MOB-001: No Touch Drag Support

### TC-MOB001-01: Touch Drag Moves Node

**Preconditions:**
- Widget loaded on touch device
- Edit mode enabled

**Steps:**
1. Touch and hold a node
2. Drag finger to new position
3. Release

**Expected Result:**
Node moves to new position

**Test Type:** Manual
**Agent:** Mobile Tester

---

### TC-MOB001-02: Touch Drag on iOS Safari

**Preconditions:**
- iPhone or iPad with Safari
- Widget loaded, edit mode on

**Steps:**
1. Attempt to drag a node with finger

**Expected Result:**
Node moves smoothly without page scroll

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

### TC-MOB001-03: Touch Drag on Android Chrome

**Preconditions:**
- Android device with Chrome
- Widget loaded, edit mode on

**Steps:**
1. Attempt to drag a node with finger

**Expected Result:**
Node moves smoothly without page scroll

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

### TC-MOB001-04: Touch Scroll Still Works

**Preconditions:**
- Widget loaded, edit mode OFF
- Diagram larger than viewport

**Steps:**
1. Swipe to scroll the diagram

**Expected Result:**
Canvas scrolls normally (drag only in edit mode)

**Test Type:** Manual
**Agent:** Mobile Tester

---

## MOB-002: Toolbar Buttons Below 44px

### TC-MOB002-01: Button Height Check

**Preconditions:**
- Widget loaded at 375px viewport

**Steps:**
1. Measure toolbar button heights via DevTools or:
```javascript
document.querySelectorAll('.toolbar button').forEach(b =>
  console.log(b.textContent, b.offsetHeight))
```

**Expected Result:**
All buttons ≥ 44px height

**Test Type:** Automated
**Agent:** Mobile Tester

---

### TC-MOB002-02: Button Tap Accuracy

**Preconditions:**
- Widget loaded on phone (375px)

**Steps:**
1. Tap Edit button with thumb
2. Tap Zoom + button
3. Tap Save button

**Expected Result:**
All taps register on first attempt (no mis-taps)

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

## MOB-003: Save Modal Not Touch-Friendly

### TC-MOB003-01: Touch Hint Displayed

**Preconditions:**
- Touch device detected
- Widget loaded

**Steps:**
1. Tap Save button
2. Read modal text

**Expected Result:**
Shows "Long-press to save" (not "right-click")

**Test Type:** Manual
**Agent:** Mobile Tester

---

### TC-MOB003-02: Long-Press Triggers Save Menu

**Preconditions:**
- Save modal open on touch device

**Steps:**
1. Long-press on the image in modal

**Expected Result:**
Native context menu appears with "Save Image" option

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

### TC-MOB003-03: Desktop Shows Right-Click Hint

**Preconditions:**
- Desktop browser (non-touch)

**Steps:**
1. Click Save button
2. Read modal hint

**Expected Result:**
Shows "Right-click to save" or similar desktop instruction

**Test Type:** Manual
**Agent:** Tester

---

## A11Y-001: SVG Lacks Accessible Name

### TC-A11Y001-01: SVG Has Role and Label

**Preconditions:**
- Widget loaded with diagram

**Steps:**
1. Inspect SVG element in DevTools
2. Check for `role` attribute
3. Check for `aria-label` attribute

**Expected Result:**
- `role="img"` present
- `aria-label` contains diagram title

**Test Type:** Automated
**Agent:** Accessibility

---

### TC-A11Y001-02: SVG Has Title Element

**Preconditions:**
- Widget loaded

**Steps:**
1. Inspect SVG in DevTools
2. Look for `<title>` child element

**Expected Result:**
`<title>` element contains diagram title

**Test Type:** Automated
**Agent:** Accessibility

---

### TC-A11Y001-03: VoiceOver Announces Diagram

**Preconditions:**
- macOS with VoiceOver enabled
- Widget loaded

**Steps:**
1. Navigate to SVG with VoiceOver (VO+Arrow)

**Expected Result:**
VoiceOver announces: "Network diagram: [title], image"

**Test Type:** Manual
**Agent:** Accessibility

---

## UX-004: Nodes Can Be Dragged Off-Screen

### TC-UX004-01: Drag Node to Left Edge

**Preconditions:**
- Widget loaded with diagram containing multiple nodes
- Edit mode enabled

**Steps:**
1. Identify a node near the center of the canvas
2. Drag the node toward the left edge of the SVG
3. Continue dragging past where the left boundary should be

**Expected Result:**
- Node stops at the left edge boundary
- Node does not disappear or move outside visible area
- Node remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-02: Drag Node to Right Edge

**Preconditions:**
- Widget loaded with diagram containing multiple nodes
- Edit mode enabled

**Steps:**
1. Identify a node near the center of the canvas
2. Drag the node toward the right edge of the SVG
3. Continue dragging past where the right boundary should be

**Expected Result:**
- Node stops at the right edge boundary
- Node does not disappear or move outside visible area
- Node remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-03: Drag Node to Top Edge

**Preconditions:**
- Widget loaded with diagram containing multiple nodes
- Edit mode enabled

**Steps:**
1. Identify a node near the center of the canvas
2. Drag the node toward the top edge of the SVG
3. Continue dragging past where the top boundary should be

**Expected Result:**
- Node stops at the top edge boundary
- Node does not disappear or move outside visible area
- Node remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-04: Drag Node to Bottom Edge

**Preconditions:**
- Widget loaded with diagram containing multiple nodes
- Edit mode enabled

**Steps:**
1. Identify a node near the center of the canvas
2. Drag the node toward the bottom edge of the SVG
3. Continue dragging past where the bottom boundary should be

**Expected Result:**
- Node stops at the bottom edge boundary
- Node does not disappear or move outside visible area
- Node remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-05: Drag Node to Top-Left Corner

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node diagonally toward the top-left corner
2. Continue dragging past where the corner boundaries should be

**Expected Result:**
- Node stops at both the top and left boundaries simultaneously
- Node is positioned at the corner but remains fully visible
- Node does not clip or disappear

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-06: Drag Node to Top-Right Corner

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node diagonally toward the top-right corner
2. Continue dragging past where the corner boundaries should be

**Expected Result:**
- Node stops at both the top and right boundaries simultaneously
- Node is positioned at the corner but remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-07: Drag Node to Bottom-Left Corner

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node diagonally toward the bottom-left corner
2. Continue dragging past where the corner boundaries should be

**Expected Result:**
- Node stops at both the bottom and left boundaries simultaneously
- Node is positioned at the corner but remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-08: Drag Node to Bottom-Right Corner

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node diagonally toward the bottom-right corner
2. Continue dragging past where the corner boundaries should be

**Expected Result:**
- Node stops at both the bottom and right boundaries simultaneously
- Node is positioned at the corner but remains fully visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-09: Visual Feedback at Boundary

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node toward any edge
2. Observe visual feedback as node approaches boundary
3. Continue dragging and observe when node stops

**Expected Result:**
- Clear visual indication when node reaches boundary (e.g., cursor change, subtle highlight, resistance effect)
- User can perceive that boundary has been reached
- Feedback is noticeable but not distracting

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-10: Node Positioning at Exact Edge

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Drag a node to the left edge
2. Release the node
3. Verify node position is at or very close to the edge
4. Verify node label is still visible

**Expected Result:**
- Node can be positioned precisely at the edge
- Node and its label remain fully visible
- No overlap with zone boundaries that obscures the node

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-11: Boundary Check with Zoomed View

**Preconditions:**
- Widget loaded with diagram
- Zoom level changed (e.g., 150%)
- Edit mode enabled

**Steps:**
1. Zoom in to 150%
2. Drag a node toward any edge
3. Try to drag past the boundary

**Expected Result:**
- Boundary checking works correctly at zoomed level
- Node stops at the boundary regardless of zoom level
- Boundaries scale appropriately with viewBox

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-12: Boundary Check with Touch Drag (Mobile)

**Preconditions:**
- Widget loaded on touch device
- Edit mode enabled

**Steps:**
1. Touch and drag a node toward the edge
2. Continue dragging past where the boundary should be

**Expected Result:**
- Node stops at the boundary on touch devices
- Boundary enforcement works the same as mouse drag

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

### TC-UX004-13: Connections Update When Node at Boundary

**Preconditions:**
- Widget loaded with diagram
- Node has connections to other nodes
- Edit mode enabled

**Steps:**
1. Drag a connected node to the edge boundary
2. Observe the connection lines

**Expected Result:**
- Connection lines update correctly to the bounded position
- No connection lines extend outside the visible canvas
- Connections remain visually correct

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX004-14: Undo Restores Position from Boundary

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled
- Undo functionality available (UX-001)

**Steps:**
1. Note a node's original position (center of canvas)
2. Drag the node to an edge boundary
3. Press Cmd+Z (or Ctrl+Z on Windows)

**Expected Result:**
- Node returns to its original position
- Undo works correctly for boundary-limited positions

**Test Type:** Manual
**Agent:** Tester

---

## A11Y-002: Buttons Lack ARIA Labels

### TC-A11Y002-01: Edit Button Accessible

**Preconditions:**
- Widget loaded

**Steps:**
1. Inspect Edit button
2. Check `aria-label` attribute

**Expected Result:**
`aria-label="Edit diagram"` or similar descriptive label

**Test Type:** Automated
**Agent:** Accessibility

---

### TC-A11Y002-02: Screen Reader Button Announcements

**Preconditions:**
- VoiceOver or NVDA enabled

**Steps:**
1. Tab through toolbar buttons
2. Note announcements

**Expected Result:**
Each button announces its purpose:
- "Edit diagram, button"
- "Zoom out, button"
- "Zoom in, button"
- "Save diagram, button"

**Test Type:** Manual
**Agent:** Accessibility

---

## Test Execution Log

| Test ID | Date | Agent | Result | Notes |
|---------|------|-------|--------|-------|
| _example_ | 2026-02-23 | Tester | PASS | Worked as expected |

---

## Adding New Test Cases

1. Create test case in appropriate issue section
2. Use format: `TC-[ISSUE]-[NUMBER]`
3. Include preconditions, steps, expected result
4. Specify test type and responsible agent
5. Update BACKLOG.md status to `ready` when complete
