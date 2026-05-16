import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('zygote.is.a.dream', () => {
    const panel = vscode.window.createWebviewPanel(
      'zygotePanel',
      'Zygote',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(
      async message => {
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
  <input id="prompt" placeholder="Ask Claude..." style="width: 300px; padding: 8px;">
  <button id="btn">Send</button>
  <button id="readBtn">Open File</button>
  <div id="reply" style="margin-top: 20px; white-space: pre-wrap;"></div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btn').addEventListener('click', () => {
      const text = document.getElementById('prompt').value;
      vscode.postMessage({ text });
      document.getElementById('reply').textContent = 'Thinking...';
    });
    document.getElementById('readBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'readFile' });
      document.getElementById('reply').textContent = 'Reading...';
    });
    window.addEventListener('message', event => {
      if (event.data.type === 'reply') {
        document.getElementById('reply').textContent = event.data.text;
      }
    });
  </script>
</body>
</html>`;
}

export function deactivate() {}
