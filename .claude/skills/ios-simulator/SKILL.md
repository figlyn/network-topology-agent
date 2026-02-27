# iOS Simulator Testing Skill

Automate iOS Simulator interactions for testing mobile widgets and apps.

## Prerequisites

iOS Simulator MCP must be registered. The following tools become available:

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `mcp__ios-simulator__get_booted_sim_id` | Get the UDID of the currently booted simulator |
| `mcp__ios-simulator__open_simulator` | Opens the iOS Simulator application |
| `mcp__ios-simulator__ui_describe_all` | Get accessibility tree for entire screen |
| `mcp__ios-simulator__ui_describe_point` | Get element at specific x,y coordinates |
| `mcp__ios-simulator__ui_tap` | Tap at x,y coordinates |
| `mcp__ios-simulator__ui_type` | Type text into focused field |
| `mcp__ios-simulator__ui_swipe` | Swipe from start to end coordinates |
| `mcp__ios-simulator__ui_view` | Get compressed screenshot of current view |
| `mcp__ios-simulator__screenshot` | Take full screenshot and save to file |
| `mcp__ios-simulator__record_video` | Record video of simulator |
| `mcp__ios-simulator__stop_recording` | Stop video recording |
| `mcp__ios-simulator__install_app` | Install .app or .ipa bundle |
| `mcp__ios-simulator__launch_app` | Launch app by bundle ID |

## Common Workflows

### Test ChatGPT App Widget

```
1. open_simulator
2. get_booted_sim_id → store UDID
3. launch_app with bundle_id "com.openai.chat"
4. ui_describe_all to see screen structure
5. ui_tap on new chat button
6. ui_type to enter prompt
7. Wait for widget to render
8. screenshot to capture result
```

### Navigate ChatGPT iOS App

```javascript
// Common UI element coordinates (iPhone 15 Pro, 393×852)
const elements = {
  newChat: { x: 350, y: 60 },      // Top right + button
  textInput: { x: 196, y: 780 },   // Bottom message input
  sendButton: { x: 360, y: 780 },  // Send arrow
  moreMenu: { x: 40, y: 60 },      // Top left hamburger
};
```

### Swipe Gestures

```
// Swipe up to scroll down
ui_swipe(x_start=196, y_start=600, x_end=196, y_end=200, duration="0.3")

// Swipe left to go back
ui_swipe(x_start=50, y_start=400, x_end=350, y_end=400, duration="0.2")
```

### Long Press (for save gesture)

```
// Long press to save image
ui_tap(x=196, y=400, duration="1.0")
```

## Testing Network Topology Widget

### Verify Widget Renders

```
1. launch_app(bundle_id="com.openai.chat")
2. Navigate to chat with Network Gramm connector
3. ui_type("Create a simple network with 3 nodes")
4. Wait for response
5. ui_describe_all to check for widget elements
6. screenshot(output_path="widget-test.png")
```

### Test Save Functionality

```
1. Render a topology widget
2. ui_tap on Save button (find coordinates via ui_describe_all)
3. Wait for modal
4. ui_tap with duration="1.5" on image (long-press)
5. Verify iOS save sheet appears
6. screenshot to document
```

### Test Touch Interactions

```
1. Render topology widget
2. Enter edit mode (tap Edit button)
3. Drag a node:
   - ui_tap at node position
   - ui_swipe from node to new position
4. Verify node moved
5. screenshot
```

## Device Profiles

| Device | Width | Height | Scale |
|--------|-------|--------|-------|
| iPhone SE (3rd) | 375 | 667 | 2x |
| iPhone 15 | 393 | 852 | 3x |
| iPhone 15 Pro Max | 430 | 932 | 3x |
| iPad (10th) | 820 | 1180 | 2x |
| iPad Pro 12.9" | 1024 | 1366 | 2x |

## Tips

- **Use `ui_describe_all` first** - Get accessibility tree before tapping
- **Long press** - Set `duration="1.0"` or higher for long press gestures
- **Wait for renders** - ChatGPT widgets may take 2-5 seconds to render
- **Screenshot often** - Document each step for debugging
- **Video recording** - Use for complex interaction sequences

## Limitations

- **No text selection** - Cannot select/copy text from simulator
- **UDID required** - Some tools need explicit UDID if multiple simulators
- **Coordinates vary** - Different devices have different screen sizes
- **App state** - May need to log in to ChatGPT manually first

## Integration with Agents

| Agent | Use Case |
|-------|----------|
| Mobile Tester | Primary user of this skill |
| Touch Interaction | Test gestures and drag behaviors |
| Share Integration | Test save/share functionality |
| Accessibility | Verify VoiceOver and accessibility labels |

## Example Test Session

```bash
# 1. Get simulator ID
mcp__ios-simulator__get_booted_sim_id

# 2. Launch ChatGPT
mcp__ios-simulator__launch_app(bundle_id="com.openai.chat")

# 3. Wait and describe screen
mcp__ios-simulator__ui_describe_all

# 4. Take screenshot
mcp__ios-simulator__screenshot(output_path="chatgpt-ios-test.png")
```
