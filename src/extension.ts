import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

// VS Code calls this exported function when the extension activates
export function activate(context: vscode.ExtensionContext) {
  // Register a command — disposable so VS Code can clean it up on deactivation
  const disposable = vscode.commands.registerCommand('zygote.is.a.dream', () => {
    // Create the webview panel (this is our ONLY handle — lose it and we lose control)
    const panel = vscode.window.createWebviewPanel(
      'zygotePanel',       // internal type ID
      'Zygote',            // tab title shown to user
      vscode.ViewColumn.Beside, // open beside current editor
      { enableScripts: true }   // allow JS in webview (disabled by default for security)
    );

    // Set the frontend HTML
    panel.webview.html = getWebviewContent();

    // Listen for messages FROM the webview (webview -> extension)
    panel.webview.onDidReceiveMessage(
      async message => {
        // Route 1: File reading — opens system file picker
        if (message.type === 'readFile') {
          const fileUris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Read File',
          });

          if (!fileUris || fileUris.length === 0) {
            return;
          }

          // Read raw bytes, decode to text (only works for text files — binary files like PNG/PDF will be garbled)
          const content = await vscode.workspace.fs.readFile(fileUris[0]);
          const text = new TextDecoder().decode(content);

          // Send file content back TO the webview (extension -> webview)
          panel.webview.postMessage({ type: 'reply', text });
          return;
        }

        // Route 2: File writing — append timestamp to README.md in the open workspace
        // This is the foundation for "agent edits code, user watches it change live"
        if (message.type === 'writeFile') {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            panel.webview.postMessage({ type: 'reply', text: 'No workspace folder open. Use File → Open Folder first.' });
            return;
          }

          // Target README.md in the workspace root
          const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
          // Read existing content, append a timestamp
          const existing = await vscode.workspace.fs.readFile(fileUri);
          const newContent = new TextDecoder().decode(existing) + `\n\nTimestamp: ${new Date().toISOString()}`;

          // Write back — VS Code auto-refreshes any open editor showing this file (no manual reload)
          // Same API as readFile but in reverse: text -> bytes via TextEncoder
          await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(newContent));
          panel.webview.postMessage({ type: 'reply', text: 'Written.' });
          return;
        }

        // Route 3: Claude API — send user's text to Claude, return response
        const client = new Anthropic();

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: message.text }]
        });

        // response.content[0] can be 'text' or 'tool_use' — only extract text
        const reply = response.content[0].type === 'text'
          ? response.content[0].text
          : 'No text response';

        // Send Claude's reply back TO the webview (extension -> webview)
        panel.webview.postMessage({ type: 'reply', text: reply });
      },
      undefined,           // thisArg — not needed, placeholder
      context.subscriptions // auto-cleanup this listener on deactivation
    );
  });

  // Register the command for cleanup when extension deactivates
  context.subscriptions.push(disposable);
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <!-- CSP: block everything by default, allow inline scripts and styles
       'unsafe-inline' is fine for learning; production uses nonces instead -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <style>
    body { font-family: sans-serif; padding: 20px; }
    button { padding: 10px 20px; font-size: 14px; }
  </style>
</head>
<body>
  <h2>Zygote Day 1</h2>
  <input id="prompt" placeholder="Ask Claude..." style="width: 300px; padding: 8px;">
  <button id="btn">Send</button>
  <button id="readBtn">Open File</button>
  <button id="writeBtn">Append timestamp to README</button>
  <div id="reply" style="margin-top: 20px; white-space: pre-wrap;"></div>
  <script>
    // acquireVsCodeApi() can only be called ONCE — store and reuse
    const vscode = acquireVsCodeApi();

    // Send button: reads input text, sends to extension for Claude API
    document.getElementById('btn').addEventListener('click', () => {
      const text = document.getElementById('prompt').value;
      vscode.postMessage({ text });              // webview -> extension
      document.getElementById('reply').textContent = 'Thinking...';
    });

    // Open File button: asks extension to open file picker
    document.getElementById('readBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'readFile' });  // webview -> extension
      document.getElementById('reply').textContent = 'Reading...';
    });

    // Write button: asks extension to append timestamp to workspace README.md
    document.getElementById('writeBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'writeFile' }); // webview -> extension
      document.getElementById('reply').textContent = 'Writing...';
    });

    // Listen for messages FROM the extension (extension -> webview)
    window.addEventListener('message', event => {
      if (event.data.type === 'reply') {
        document.getElementById('reply').textContent = event.data.text;
      }
    });
  </script>
</body>
</html>`;
}

// Called when extension deactivates — cleanup happens via context.subscriptions
export function deactivate() {}
