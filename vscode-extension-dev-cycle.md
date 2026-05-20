# The VS Code Extension Development Cycle

## What You Built in Step 1

Step 1 used `yo code` to generate a scaffold. You pressed F5 and saw "Hello World." But you didn't write any of that code — a tool did. Step 2 is where you take ownership.

---

## The Two Files That Matter

A VS Code extension has two halves that must agree with each other:

### 1. `package.json` — The Declaration

```json
"contributes": {
  "commands": [
    {
      "command": "hello-zygote.helloWorld",
      "title": "Hello World"
    }
  ]
}
```

This tells VS Code: *"I offer a command. Its internal ID is `hello-zygote.helloWorld`. Show it to the user as 'Hello World' in the Command Palette."*

This is **registration only**. It does not define what happens when the command runs. Think of it as a menu item with no function attached yet.

### 2. `src/extension.ts` — The Implementation

```typescript
const disposable = vscode.commands.registerCommand(
  'hello-zygote.helloWorld',    // must match package.json exactly
  () => {
    vscode.window.showInformationMessage('Hello World from hello-zygote!');
  }
);
```

This tells VS Code: *"When someone triggers `hello-zygote.helloWorld`, run this function."*

### The Contract

| `package.json` | `extension.ts` | Result |
|---|---|---|
| Has command ID | Has matching `registerCommand` | Works |
| Has command ID | No matching `registerCommand` | Command appears but does nothing |
| No command ID | Has `registerCommand` | Command never appears in palette |
| IDs don't match | IDs don't match | Broken — silent failure |

**Key insight**: The command ID string (`hello-zygote.helloWorld`) is the bridge between declaration and implementation. If these two files disagree on that string, the extension silently fails.

---

## The Development Cycle

Every change you make to a VS Code extension follows this loop:

```
  ┌──────────────────────────────────────┐
  │                                      │
  │   1. EDIT                            │
  │   Change code in src/extension.ts    │
  │   (or package.json, HTML, etc.)      │
  │                                      │
  │               │                      │
  │               ▼                      │
  │                                      │
  │   2. RELOAD                          │
  │   Press Cmd+R in the Extension       │
  │   Development Host window            │
  │                                      │
  │   - TypeScript recompiles            │
  │   - Extension reloads with new code  │
  │   - No need to close/reopen          │
  │                                      │
  │               │                      │
  │               ▼                      │
  │                                      │
  │   3. TEST                            │
  │   Press Cmd+Shift+P, run your        │
  │   command, see the result            │
  │                                      │
  │               │                      │
  │               ▼                      │
  │                                      │
  │   4. OBSERVE                         │
  │   Did it work?                       │
  │   Yes → next change                  │
  │   No  → check Developer Tools        │
  │         (Help → Toggle Dev Tools)    │
  │                                      │
  │               │                      │
  │               ▼                      │
  │         Back to EDIT                 │
  │                                      │
  └──────────────────────────────────────┘
```

### When to use Cmd+R vs. Fn+F5

| Action | When to use |
|---|---|
| **Cmd+R** (reload) | You changed code inside `src/extension.ts` — logic, messages, behavior |
| **Fn+F5** (full restart) | You changed `package.json` — new commands, activation events, metadata |

**Why the difference**: `Cmd+R` reloads the extension code but keeps the same Extension Development Host. Changes to `package.json` require a full restart because VS Code reads that file only at launch.

---

## What "Step 2" Asks You To Do

### Exercise 1: Change the message

Open `src/extension.ts`, find this line:

```typescript
vscode.window.showInformationMessage('Hello World from hello-zygote!');
```

Change the string to anything — your name, a joke, a question. Save the file.

### Exercise 2: Reload

In the Extension Development Host window, press `Cmd+R`.

### Exercise 3: Test

Press `Cmd+Shift+P`, type `Hello World`, press Enter.

### Exercise 4: Verify

You should see your custom message in the bottom-right corner. If you do, you have proven:

- You know which file controls the behavior
- You know how to push a change into the running extension
- You know how to trigger and observe the result

This is the entire development cycle. Every feature in Zygote — webview, API calls, file reading — is built by repeating this loop.

---

## The Two Windows

When developing a VS Code extension, you always have two VS Code windows open:

```
┌─────────────────────────┐    ┌─────────────────────────┐
│  WINDOW 1               │    │  WINDOW 2               │
│  "Development Window"   │    │  "Extension Dev Host"   │
│                         │    │                         │
│  This is where you      │    │  This is where your     │
│  WRITE code.            │    │  extension RUNS.        │
│                         │    │                         │
│  - Edit extension.ts    │    │  - Cmd+Shift+P to       │
│  - Edit package.json    │    │    run commands          │
│  - See compiler errors  │    │  - See notifications    │
│  - Read terminal output │    │  - Test webviews        │
│                         │    │  - Open Dev Tools for   │
│  You press Fn+F5 here   │    │    debugging            │
│  to launch Window 2.    │    │                         │
│                         │    │  You press Cmd+R here   │
│                         │    │  to reload changes.     │
└─────────────────────────┘    └─────────────────────────┘
```

---

## The `activate()` Function

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Everything inside here runs ONCE when the extension first activates
  // "Activates" = the first time a user triggers one of your commands
}
```

VS Code does **not** run your extension at startup. It waits until the user actually needs it (lazy activation). This keeps VS Code fast even with many extensions installed.

`context` is your extension's lifetime manager. Anything you push into `context.subscriptions` gets automatically cleaned up when the extension deactivates. This prevents memory leaks.

---

## Summary

| Concept | What it means |
|---|---|
| `package.json` | Declares what your extension offers (commands, menus, settings) |
| `src/extension.ts` | Implements the behavior behind those declarations |
| Command ID | The string that connects declaration to implementation |
| `activate()` | Runs once when the extension is first needed |
| `context.subscriptions` | Automatic cleanup for event listeners and commands |
| Cmd+R | Reload extension code without restarting |
| Fn+F5 | Full restart (needed after package.json changes) |
| Cmd+Shift+P | Open Command Palette to run commands |
| Dev Tools | Your debugger when something goes wrong |

The development cycle is: **Edit → Reload → Test → Observe → Repeat.**

Master this loop. Everything else builds on top of it.
