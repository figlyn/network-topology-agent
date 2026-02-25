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

## UX-007: Save Modal Visual Guidance

### TC-UX007-01: Save Instruction Visually Prominent (Desktop)

**Preconditions:**
- Widget loaded on desktop browser
- Diagram rendered

**Steps:**
1. Click Save button to open modal
2. Observe the save instruction text

**Expected Result:**
- Instruction "Right-click image to save" is visually prominent
- Text has visual emphasis (e.g., different color, icon, animation, or larger size)
- Instruction is not easily missed

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX007-02: Save Instruction Visually Prominent (Touch)

**Preconditions:**
- Widget loaded on touch device (or touch emulation)
- Diagram rendered

**Steps:**
1. Tap Save button to open modal
2. Observe the save instruction text

**Expected Result:**
- Instruction "Long-press image to save" is visually prominent
- Text has visual emphasis (e.g., different color, icon, animation, or larger size)
- Instruction is not easily missed

**Test Type:** Manual
**Agent:** Mobile Tester

---

### TC-UX007-03: Visual Emphasis in Light Mode

**Preconditions:**
- System set to light mode
- Widget loaded

**Steps:**
1. Click Save button
2. Observe instruction styling

**Expected Result:**
- Visual emphasis is clearly visible against light background
- Good contrast for readability
- Any animation/icon visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX007-04: Visual Emphasis in Dark Mode

**Preconditions:**
- System set to dark mode
- Widget loaded

**Steps:**
1. Click Save button
2. Observe instruction styling

**Expected Result:**
- Visual emphasis is clearly visible against dark background
- Good contrast for readability
- Any animation/icon visible

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX007-05: Animation Not Distracting

**Preconditions:**
- Widget loaded
- Save modal open

**Steps:**
1. Open save modal
2. Observe any animations for 10 seconds
3. Attempt to focus on the image

**Expected Result:**
- Any animation is subtle and non-distracting
- Animation does not cause motion sickness or eye strain
- User can focus on the image without distraction
- Animation may stop after initial attention is drawn

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX007-06: Instruction Includes Visual Icon

**Preconditions:**
- Widget loaded

**Steps:**
1. Open save modal
2. Look for icon near instruction text

**Expected Result:**
- Icon present that reinforces the action (e.g., mouse pointer icon for right-click, finger/hand icon for long-press)
- Icon is appropriately sized and positioned
- Icon matches light/dark mode

**Test Type:** Manual
**Agent:** Tester

---

### TC-UX007-07: Mobile Viewport Instruction Visibility

**Preconditions:**
- Widget loaded at 375px viewport
- Save modal open

**Steps:**
1. Tap Save button
2. Check instruction visibility without scrolling

**Expected Result:**
- Instruction fully visible within viewport
- Not cut off or requiring scroll to see
- Visual emphasis works at mobile size

**Test Type:** Manual
**Agent:** Mobile Tester

---

### TC-UX007-08: Instruction Text Accessible

**Preconditions:**
- Widget loaded
- Screen reader enabled (VoiceOver/NVDA)

**Steps:**
1. Open save modal
2. Navigate to instruction with screen reader

**Expected Result:**
- Screen reader announces instruction text
- Any icons have appropriate alt text or aria-label
- User understands the required action

**Test Type:** Manual
**Agent:** Accessibility

---

## Test Execution Log

| Test ID | Date | Agent | Result | Notes |
|---------|------|-------|--------|-------|
| _example_ | 2026-02-23 | Tester | PASS | Worked as expected |

---

## BUG-001: Diagram Renders Twice

### TC-BUG001-01: Single Render on Initial Load

**Preconditions:**
- Fresh ChatGPT conversation with connector attached
- DevTools Console open with "Preserve log" enabled

**Steps:**
1. Send a prompt asking for a network topology diagram
2. Observe the canvas element during loading
3. Count how many times the SVG diagram appears/flashes

**Expected Result:**
- Diagram renders exactly once after loading completes
- No visible flashing or duplicate diagram display
- Console shows single "renderSVG complete" message (when DEBUG=true)

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG001-02: Single Render After tool-result Event

**Preconditions:**
- Widget loaded in ChatGPT
- DevTools Console open

**Steps:**
1. Add console log to track render calls: `window.renderCount = 0;` and patch renderSVG
2. Generate a topology diagram
3. After diagram displays, check `window.renderCount`

**Expected Result:**
- renderCount should be 1-2 maximum (initial + tool-result)
- No continuous re-rendering after diagram stabilizes

**Test Type:** Automated
**Agent:** Tester

---

### TC-BUG001-03: No Duplicate Render on Theme Change

**Preconditions:**
- Widget loaded with complete diagram
- System in light mode

**Steps:**
1. Note current diagram state
2. Switch system to dark mode
3. Observe diagram re-render

**Expected Result:**
- Diagram re-renders exactly once for theme change
- No flicker or double appearance
- Colors update smoothly

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG001-04: No Duplicate Render During Streaming

**Preconditions:**
- DevTools Console open
- Network throttling enabled (Slow 3G)

**Steps:**
1. Generate a complex topology (many nodes)
2. Observe loading states during streaming
3. Watch for diagram appearing/disappearing

**Expected Result:**
- Loading messages shown during streaming
- Diagram appears ONCE when complete
- No partial diagram followed by complete diagram

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG001-05: Throttled Render Prevents Duplicate Display

**Preconditions:**
- Widget code with DEBUG=true
- Console open

**Steps:**
1. Generate topology
2. Rapidly trigger events that would cause re-render (e.g., theme toggle)
3. Check console for render timing

**Expected Result:**
- Renders are throttled to max 1 per 100ms
- pendingRender mechanism prevents duplicate renders
- Console shows throttling working correctly

**Test Type:** Automated
**Agent:** Tester

---

## PERF-001: Rendering Too Slow

### TC-PERF001-01: Initial Render Time Measurement

**Preconditions:**
- Widget loaded
- DevTools Performance panel open

**Steps:**
1. Clear performance recordings
2. Generate a topology with 10 nodes and 8 connections
3. Start performance recording before render
4. Measure time from renderSVG() start to canvas.innerHTML assignment

**Expected Result:**
- Initial render completes in < 100ms for 10-node diagram
- No visible delay after data arrives

**Test Type:** Automated
**Agent:** Tester

---

### TC-PERF001-02: Drag Performance During Edit

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled
- Performance panel recording

**Steps:**
1. Start performance recording
2. Drag a node smoothly across the canvas for 2 seconds
3. Stop recording
4. Analyze frame rate

**Expected Result:**
- Frame rate stays above 30fps during drag
- No visible lag or stutter
- renderSVG() calls are throttled during drag

**Test Type:** Manual
**Agent:** Tester

---

### TC-PERF001-03: Complex Topology Render Time

**Preconditions:**
- DevTools Console with timing

**Steps:**
1. Generate maximum complexity topology:
   - 10 customer nodes
   - 10 operator nodes
   - 10 external nodes
   - 30 connections
2. Measure total render time

**Expected Result:**
- Complete render in < 500ms
- Loading states visible during generation
- Final diagram responsive immediately

**Test Type:** Automated
**Agent:** Tester

---

### TC-PERF001-04: Zoom Operation Performance

**Preconditions:**
- Widget loaded with diagram

**Steps:**
1. Click zoom in button 5 times rapidly
2. Observe responsiveness

**Expected Result:**
- Each zoom completes quickly
- No cumulative lag
- Zoom indicator updates smoothly

**Test Type:** Manual
**Agent:** Tester

---

### TC-PERF001-05: Layout Computation Time

**Preconditions:**
- Console with timing hooks

**Steps:**
1. Add timing to computeLayout() function
2. Render topology
3. Measure layout computation duration

**Expected Result:**
- computeLayout() completes in < 10ms
- No redundant layout calculations
- Caching of layout results where appropriate

**Test Type:** Automated
**Agent:** Tester

---

### TC-PERF001-06: Memory Usage During Extended Use

**Preconditions:**
- DevTools Memory panel
- Widget loaded

**Steps:**
1. Take initial heap snapshot
2. Perform 20 drag operations
3. Perform 10 zoom operations
4. Take second heap snapshot
5. Compare memory usage

**Expected Result:**
- Memory growth < 5MB after operations
- No significant memory leaks
- undoStack properly limited to 50 entries

**Test Type:** Automated
**Agent:** Tester

---

### TC-PERF001-07: Mobile Performance (375px viewport)

**Preconditions:**
- DevTools mobile emulation (iPhone 12, 375px)
- CPU throttling 4x slowdown

**Steps:**
1. Load widget with medium topology (7 nodes)
2. Measure render time
3. Test drag responsiveness

**Expected Result:**
- Render time < 200ms on throttled CPU
- Touch drag remains smooth
- No janky animations

**Test Type:** Manual
**Agent:** Mobile Tester

---

## BUG-002: Icons Jumping During Edits

### TC-BUG002-01: Node Position Stable on Edit Mode Toggle

**Preconditions:**
- Widget loaded with diagram
- Note exact position of a node

**Steps:**
1. Click Edit button to enable edit mode
2. Observe node positions
3. Click Edit button to disable edit mode
4. Observe node positions

**Expected Result:**
- Nodes remain in exact same position
- No visual jump or shift
- Only edit mode indicators change (selection rectangles)

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-02: Node Position Stable on Drag Start

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Position mouse over a node
2. Press mouse button down (without moving)
3. Observe node position

**Expected Result:**
- Node does not move on mousedown
- Node stays in place until actual drag movement
- No jump to different position

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-03: Node Position Stable on Drag End

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled
- Node dragged to new position

**Steps:**
1. Drag a node to a new position
2. Release mouse button
3. Observe final node position

**Expected Result:**
- Node stays at the exact position where released
- No snap-back or jump
- Position persists after mouse release

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-04: Connected Nodes Stay Stable During Peer Drag

**Preconditions:**
- Widget with nodes connected by lines
- Edit mode enabled

**Steps:**
1. Identify two connected nodes (A and B)
2. Drag node A to new position
3. Observe node B's position

**Expected Result:**
- Node B remains in its original position
- Only the connection line between A and B updates
- Node B does not jump or shift

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-05: Node Stable on Text Label Edit

**Preconditions:**
- Widget loaded with diagram

**Steps:**
1. Double-click on a node's label
2. Observe node position while input appears
3. Type new text
4. Press Enter
5. Observe node position after save

**Expected Result:**
- Node stays in place during entire edit process
- Text input appears near label without moving node
- After save, node remains in same position

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-06: Node Stable During Zoom Operations

**Preconditions:**
- Widget loaded with diagram
- Note exact relative positions of nodes

**Steps:**
1. Click zoom in button
2. Observe node positions relative to each other
3. Click zoom out button
4. Observe node positions

**Expected Result:**
- Nodes maintain their relative positions
- No jumping between zoom levels
- Layout scales uniformly

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-07: Touch Drag Position Accuracy

**Preconditions:**
- Touch device or touch emulation
- Widget loaded, edit mode enabled

**Steps:**
1. Touch and hold a node
2. Drag finger to new position
3. Observe node follows finger precisely
4. Release touch

**Expected Result:**
- Node center stays under finger during drag
- No offset or jump when touch starts
- Final position matches where finger released

**Test Type:** Manual (Device)
**Agent:** Mobile Tester

---

### TC-BUG002-08: Node Stable After Undo/Redo

**Preconditions:**
- Widget loaded with diagram
- Edit mode enabled

**Steps:**
1. Note original position of node A
2. Drag node A to new position
3. Press Cmd+Z to undo
4. Observe node position
5. Press Cmd+Shift+Z to redo
6. Observe node position

**Expected Result:**
- Undo returns node to exact original position
- Redo returns node to exact dragged position
- No intermediate jumps or flicker

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-09: Position Calculation with Scale Factor

**Preconditions:**
- Widget loaded at non-default zoom (e.g., 150%)
- Edit mode enabled

**Steps:**
1. Drag a node at 150% zoom
2. Note: mouse position should correctly translate to SVG coordinates

**Expected Result:**
- Node follows mouse cursor accurately at any zoom level
- No scale-related offset in position
- getScreenCTM() transformation works correctly

**Test Type:** Manual
**Agent:** Tester

---

### TC-BUG002-10: Overrides Persist Correctly

**Preconditions:**
- Widget loaded, edit mode enabled
- DevTools Console open

**Steps:**
1. Drag node "hq" to new position
2. In console, check `overrides.hq`
3. Toggle edit mode off and on
4. Check `overrides.hq` again
5. Re-render (e.g., change zoom)
6. Check node position

**Expected Result:**
- overrides object stores dx, dy values
- Overrides persist across edit mode toggles
- Overrides correctly applied on re-render

**Test Type:** Automated
**Agent:** Tester

---

### TC-BUG002-11: getPos() Returns Consistent Values

**Preconditions:**
- Console access to widget functions

**Steps:**
1. Call getPos() for a node multiple times
2. Compare returned values

**Expected Result:**
- Same node returns identical position each call
- No floating-point drift
- Position consistent between renders

**Test Type:** Automated
**Agent:** Tester

---

## Adding New Test Cases

1. Create test case in appropriate issue section
2. Use format: `TC-[ISSUE]-[NUMBER]`
3. Include preconditions, steps, expected result
4. Specify test type and responsible agent
5. Update BACKLOG.md status to `ready` when complete
