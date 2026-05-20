# Phase 1 — Technical Onboarding Checklist

> **Goal**: Run 5 working demos in 10 hours. After this, you have all the technical primitives Zygote needs.
>
> **Where this lives**: This file belongs in `~/projects/zygote-notes/`, NOT in the main zygote repository. Phase 1 is learning scaffolding — keep it out of the product repo.

---

## Setup before you start

- [ ] Confirm Node.js installed and ≥ 18: `node --version`
- [ ] Confirm npm works: `npm --version`
- [ ] VS Code installed and `code` command available in terminal
- [ ] You have an Anthropic API key (starts with `sk-ant-`)
- [ ] Make a working directory: `mkdir -p ~/projects && cd ~/projects`

---

## Day 1 — 5 hours total

### Step 1 — Hello World Extension (0:00–0:45)

**Install scaffolding tool:**

```bash
npm install -g yo generator-code
```

**Generate the project:**

```bash
mkdir -p ~/projects/zygote-learning && cd ~/projects/zygote-learning
yo code
```

When prompted:
- Extension type: **New Extension (TypeScript)**
- Name: `hello-zygote`
- Identifier: (press enter for default)
- Description: anything
- Initialize git: **Yes**
- Bundle with webpack: **No**
- Package manager: **npm**

**Run it:**

```bash
cd hello-zygote
code .
```

Then press **F5** inside VS Code. A new window (Extension Development Host) opens.

In that new window: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Win/Linux), type `Hello World`, press Enter.

- [ ] **PASS criterion**: A notification appears saying "Hello World from hello-zygote!"

**If stuck**: Screenshot the error and ask Claude Code. Most common issue is Node version.

---

### Step 2 — Understand what you generated (0:45–1:15)

Read only these two files:

1. `package.json` — find the `"contributes"` field, see how `commands` are registered
2. `src/extension.ts` — see how `activate()` binds commands to functions

**Modify and verify:**

- [ ] Change the hello world message in `src/extension.ts` to something custom
- [ ] Save the file
- [ ] In the Extension Development Host window, press `Cmd+R` / `Ctrl+R` to reload
- [ ] Run the command again, see your custom message

**Why this matters**: You now understand the edit → reload → test loop. This is your entire development cycle.

---

### Step 3 — Webview + reverse messaging (1:15–2:30)

**Decision: NO React in Phase 1.** Use plain HTML webview. React's build pipeline is the #1 time sink for new extension developers. You'll add React in Week 2.

**Replace `src/extension.ts` completely with:**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('hello-zygote.helloWorld', () => {
    const panel = vscode.window.createWebviewPanel(
      'zygotePanel',
      'Zygote',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(
      message => {
        vscode.window.showInformationMessage(`Got from webview: ${message.text}`);
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <style>
    body { font-family: sans-serif; padding: 20px; }
    button { padding: 10px 20px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Zygote Day 1</h2>
  <button id="btn">Send message to extension</button>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btn').addEventListener('click', () => {
      vscode.postMessage({ text: 'Hello from webview!' });
    });
  </script>
</body>
</html>`;
}

export function deactivate() {}
```

Press F5, run `Hello World` command.

- [ ] **PASS criterion**: A webview panel opens on the right with a button. Clicking the button shows a notification "Got from webview: Hello from webview!"

**If stuck**: In the Extension Development Host, `Help → Toggle Developer Tools` to see the webview console. CSP errors are the most common.

**Why this matters**: You just built Zygote's core data path: **webview → extension host**. Every Week 1-6 feature is a variation of this single action.

---

### Step 4 — Add Claude API (2:30–3:30)

**Install the SDK:**

```bash
# Make sure you are in the hello-zygote directory
npm install @anthropic-ai/sdk
```

**Set API key in the same terminal that will run VS Code:**

```bash
# Mac / Linux
export ANTHROPIC_API_KEY=sk-ant-...

# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

⚠️ This must be in the same terminal session you launch `code .` from. Otherwise VS Code won't see the variable.

**Update `src/extension.ts`** — add the import at the top:

```typescript
import Anthropic from '@anthropic-ai/sdk';
```

**Replace `onDidReceiveMessage` with:**

```typescript
panel.webview.onDidReceiveMessage(
  async message => {
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message.text }]
    });
    
    const reply = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'No text response';
    
    panel.webview.postMessage({ type: 'reply', text: reply });
  },
  undefined,
  context.subscriptions
);
```

**Update the HTML** in `getWebviewContent()` — replace the body:

```html
<body>
  <h2>Zygote Day 1</h2>
  <input id="prompt" placeholder="Ask Claude..." style="width: 300px; padding: 8px;">
  <button id="btn">Send</button>
  <div id="reply" style="margin-top: 20px; white-space: pre-wrap;"></div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btn').addEventListener('click', () => {
      const text = document.getElementById('prompt').value;
      vscode.postMessage({ text });
      document.getElementById('reply').textContent = 'Thinking...';
    });
    window.addEventListener('message', event => {
      if (event.data.type === 'reply') {
        document.getElementById('reply').textContent = event.data.text;
      }
    });
  </script>
</body>
```

Press F5, type a question, click Send.

- [ ] **PASS criterion**: Claude's response appears in the webview.

**Common errors:**
- "Cannot find module" → `npm install` did not complete, rerun it
- API key error → `echo $ANTHROPIC_API_KEY` must show your key in the launching terminal
- Model name error → try `claude-sonnet-4-5` if 4-6 is not yet GA

**Why this matters**: You now have **webview ↔ extension ↔ Claude API**. The complete data path for Zygote is functional. Everything in Week 1-6 builds on this triangle.

---

### Step 5 — File read (3:30–4:30)

**Add file reading to extension** — in `onDidReceiveMessage`, before the Claude API call, add:

```typescript
if (message.type === 'readFile') {
  const fileUris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Read File',
  });

  if (!fileUris || fileUris.length === 0) {
    return;
  }

  const content = await vscode.workspace.fs.readFile(fileUris[0]);
  const text = new TextDecoder().decode(content);

  panel.webview.postMessage({ type: 'reply', text });
  return;
}
```

**Add a button in the HTML:**

```html
<button id="readBtn">Open File</button>
```

And in the script:

```javascript
document.getElementById('readBtn').addEventListener('click', () => {
  vscode.postMessage({ type: 'readFile' });
});
```

**Test**: Run the command, click "Open File". A system file picker opens — you can browse to any file on your machine (Desktop, Documents, anywhere). Pick any text file.

- [ ] **PASS criterion**: The file's content appears in the webview.

**Why this matters**: You can now read the workspace. Writing uses the same API (`fs.writeFile`), and VS Code auto-reloads open files.

---

### Step 6 — Day 1 wrap (4:30–5:00)

```bash
cd ~/projects/zygote-learning/hello-zygote
git add .
git commit -m "Day 1: zygote.is.a.dream — webview + claude api + file read"
```

**Stop coding for the day**. Phase 1 has a built-in two-day rhythm for a reason — your brain needs to consolidate.

---

## Day 2 — 5 hours total

### Step 7 — Read webview docs deeply (0:00–1:30)

Open `https://code.visualstudio.com/api/extension-guides/webview` and **read the whole thing carefully**.

While reading, look at your Day 1 code and identify things you "got right but didn't understand":

- [ ] Why do you call `acquireVsCodeApi()`? What does it return?
- [ ] What does `default-src 'none'` mean in CSP?
- [ ] Why did `'unsafe-inline'` make it work? What's the production-safe alternative?
- [ ] How does `panel.webview.postMessage` on the extension side connect to `window.addEventListener('message', ...)` on the webview side?

**No demo output for this step**. This is the moment of converting "it works" into "I know why it works."

---

### Step 8 — File write + watch editor live-update (1:30–3:00)

**Add a new message handler:**

```typescript
if (message.type === 'writeFile') {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;
  
  const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const existing = await vscode.workspace.fs.readFile(fileUri);
  const newContent = new TextDecoder().decode(existing) + `\n\nTimestamp: ${new Date().toISOString()}`;
  
  await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(newContent));
  panel.webview.postMessage({ type: 'reply', text: 'Written.' });
  return;
}
```

**Add button:**

```html
<button id="writeBtn">Append timestamp to README</button>
```

Test setup:
- In Extension Development Host, open the README.md so it's visible in the editor
- Click your webview button

- [ ] **PASS criterion**: You **watch the README file update live in the editor**, no manual reload required.

**Why this matters**: This is the foundational mechanism for the Zygote demo video — "agent edits code, you watch it change in real time."

---

### Step 9 — Initialize the real Zygote project (3:00–4:30)

**Close `hello-zygote`** in VS Code. Its job is done. Keep it as a reference.

```bash
cd ~/projects
yo code
```

This time answer:
- Name: `zygote`
- Identifier: `zygote`
- Description: `A tree-based working surface for AI coding agents.`
- (other answers same as Step 1)

**Build the directory structure from SPEC §7.7:**

```bash
cd zygote
mkdir -p src/webview src/state src/agent src/shared
touch src/state/tree.ts src/state/persistence.ts src/state/snapshots.ts
touch src/agent/claude.ts src/agent/tools.ts src/agent/runner.ts
touch src/shared/types.ts
touch src/webview/ZygotePanel.ts src/webview/html.ts
```

**Copy SPEC.md and PLAN.md into the new repo:**

```bash
# Adjust paths to wherever you have these files
cp ~/projects/zygote-spec/SPEC.md ~/projects/zygote/SPEC.md
cp ~/projects/zygote-spec/zygote-plan.md ~/projects/zygote/PLAN.md
```

**Copy the TypeScript types from SPEC §7.2 into `src/shared/types.ts`** — just paste, don't write code yet.

**Add `.zygote/` and `node_modules/` to .gitignore.**

**Commit:**

```bash
git add .
git commit -m "Day 2: zygote project scaffold ready for Week 1"
```

⚠️ **Do not start writing Week 1 code today.** The scaffold is enough. Today's job is to set the stage.

---

### Step 10 — Reflection log (4:30–5:00)

In `~/projects/zygote-notes/dev-log.md` (create it), write:

```markdown
# Zygote Dev Log

## Phase 1 — completed [DATE]

### What I built
- [bullet list of the 5 demos]

### Longest bug I hit
- [description of one specific stuck moment + how you got out]

### What surprised me
- [one thing that was harder than expected, or easier]

### First question I want to solve in Week 1
- [the most concrete technical question for tomorrow]
```

Close the laptop. Phase 1 done.

---

## Phase 1 Completion Criteria

- [ ] All 5 demos in `hello-zygote/` run successfully via F5
- [ ] `~/projects/zygote/` exists with full directory scaffold
- [ ] `src/shared/types.ts` contains the TypeScript types from SPEC §7.2
- [ ] First entry written in `dev-log.md`
- [ ] Phase 1 took roughly 10 hours, not 20 (if it took 20+, write down why)

If all checked, **proceed to Week 1**. Open `PLAN.md` in the zygote repo and read the Week 1 section.

---

## Anti-Patterns to Watch

⚠️ **Spending more than 10 hours on Phase 1** — means you're rabbit-holing on theory. Stop reading docs, start running demos.

⚠️ **Adding React in Day 1** — explicitly forbidden. React goes into zygote in Week 2 once you understand the extension primitives.

⚠️ **Trying to make hello-zygote "production quality"** — it's a sandbox. Make it work, then move on. Don't refactor it.

⚠️ **Skipping Step 7 (the "deep read")** — you'll pay for this in Week 1 with debug time. The 90 minutes of deep reading saves 5+ hours later.

⚠️ **Treating Phase 1 as one giant session** — the two-day structure is intentional. Do not try to power through all 10 hours in one day.

---

## After Phase 1

Open `~/projects/zygote/PLAN.md` and read the Week 1 section. That is your next focus.

Phase 1 is now an artifact of history. Do not return to this file.
