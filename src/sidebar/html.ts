import type { HostWebview } from "../host";
import { Uri } from "../host";
import { isCloudEnvironment } from "../remote/remote-frames";

export interface ChatHtmlOpts {
  webview: HostWebview;
  extensionUri: Uri;
  canSwitchWorkspaceFolder: boolean;
  thinkingHidden: boolean;
  chatFontScale: number;
}

export function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

export function renderChatHtml(opts: ChatHtmlOpts): string {
    const webview = opts.webview;
    const nonce = getNonce();
    // Join under extensionUri so remote hosts keep vscode-remote:// (Uri.file
    // on extensionPath.fsPath would point the webview at a missing local path).
    const mediaUri = (file: string) =>
      webview.asWebviewUri(Uri.joinPath(opts.extensionUri, "media", file));
    const resourceUri = (file: string) =>
      webview.asWebviewUri(Uri.joinPath(opts.extensionUri, "resources", file));

    // Desktop multi-folder: host ships the rail mount. VS Code never does —
    // absence of `#projects-rail` is the property that keeps the extension's
    // chat column free of an in-panel rail (the projects view is a separate
    // primary-side-bar webview). A `repos` frame still arrives for clear-all.
    // Chrome mirrors AFK Pilot: brand + panel toggle, search, scroll, footer
    // theme toggle (no account avatar). chat.js only empties #rail-scroll.
    const railMark = opts.canSwitchWorkspaceFolder
      ? resourceUri("grok-icon.svg")
      : "";
    const railMount = opts.canSwitchWorkspaceFolder
      ? `
  <aside id="projects-rail" class="projects-rail" aria-label="Projects">
    <div class="rail-top">
      <span class="rail-brand" title="Grok Build Desktop">
        <span class="mark" style="--rail-mark:url('${railMark}')" aria-hidden="true"></span>
        <span class="wordmark"><b>Grok</b> <span class="dim">Build</span></span>
      </span>
      <button id="desk-rail-toggle" class="rail-icon-btn" type="button" title="Hide projects" aria-label="Hide projects" aria-expanded="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>
    </div>
    <div class="rail-search-wrap">
      <span class="rail-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      </span>
      <input id="rail-search" class="rail-search" type="search" placeholder="Filter projects…" autocomplete="off" spellcheck="false" aria-label="Filter projects" />
    </div>
    <div id="rail-scroll" class="rail-scroll"></div>
    <div class="rail-foot">
      <div class="rail-user" aria-hidden="true"></div>
      <button id="rail-gear-btn" class="rail-icon-btn" type="button" title="Settings" aria-label="Settings" hidden></button>
      <button id="desk-theme-toggle" class="rail-icon-btn" type="button" title="Toggle theme" aria-label="Toggle light and dark theme">
        <svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>
        <svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5z"/></svg>
      </button>
    </div>
  </aside>`
      : "";
    const openMain = opts.canSwitchWorkspaceFolder ? `<div class="app-main">` : "";
    const closeMain = opts.canSwitchWorkspaceFolder ? `</div>` : "";
    // Files shell is in the first HTML frame so desktop never paints the
    // panel-less column and then upgrades. Inject reuses this node.
    const fileShellOpen = opts.canSwitchWorkspaceFolder
      ? `<div id="desk-ft-shell" class="desk-ft-shell"><div class="desk-ft-chat">`
      : "";
    const fileShellClose = opts.canSwitchWorkspaceFolder ? `</div></div>` : "";
    const deskLayoutClass = opts.canSwitchWorkspaceFolder ? " has-rail desk-with-ft" : "";
    const firstFrameLayout = opts.canSwitchWorkspaceFolder
      ? `
  body.desk.has-rail { display: flex; flex-direction: row; align-items: stretch; }
  body.desk.has-rail #projects-rail { width: var(--rail-width, 260px); flex-shrink: 0; height: 100%; display: flex; flex-direction: column; }
  body.desk.has-rail .app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  body.desk.has-rail .desk-ft-shell { display: flex; flex: 1 1 auto; flex-direction: row; min-width: 0; min-height: 0; height: 100%; }
  body.desk.has-rail .desk-ft-chat { display: flex; flex: 1 1 auto; flex-direction: column; min-width: 0; min-height: 0; height: 100%; overflow: hidden; }`
      : "";
    // The shared file-panel asset is desktop-only in this generated document.
    // Remote browsers load it from the relay's own web/chat.html; VS Code gets
    // neither the tag nor the bytes, making the no-file-panel decision structural.
    const filePanelStyle = opts.canSwitchWorkspaceFolder
      ? `<link rel="stylesheet" href="${mediaUri("file-panel.css")}" />`
      : "";
    // The highlighter rides the same gate and MUST precede the panel: the panel
    // reads `GrokSyntaxHighlight` at render time, and a missing global there
    // silently degrades every file to plain text rather than failing loudly.
    const filePanelScript = opts.canSwitchWorkspaceFolder
      ? `<script nonce="${nonce}" src="${mediaUri("syntax-highlight.js")}"></script>\n` +
        `  <script nonce="${nonce}" src="${mediaUri("file-panel.js")}"></script>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource} data:; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<style>
  /* Critical pre-stylesheet paint. VS Code serves chat.css through its webview
     service worker, which can cold-start a beat after the HTML renders — that
     gap otherwise flashes the welcome screen unstyled on a white background.
     Paint the theme background immediately and hold the welcome invisible;
     chat.css re-reveals it (visibility: visible on .welcome). */
  html, body { background: var(--vscode-sideBar-background, var(--vscode-editor-background)); }
  body { color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
  .welcome { visibility: hidden; }
${firstFrameLayout}
</style>
<link rel="stylesheet" href="${mediaUri("chat.css")}" />
<link rel="stylesheet" href="${mediaUri("settings.css")}" />
${filePanelStyle}
</head>
<body class="desk${deskLayoutClass}${opts.thinkingHidden ? " thinking-hidden" : ""}" style="--chat-zoom: ${opts.chatFontScale}">
${opts.canSwitchWorkspaceFolder ? `<script nonce="${nonce}">try{if(localStorage.getItem("desk-rail-open")==="0")document.body.classList.add("desk-rail-collapsed")}catch(e){}</script>` : ""}
${railMount}
${openMain}
  <header class="top-bar">
    <div id="session-tabs" class="session-tabs" role="tablist" aria-label="Open conversations">
      <div id="session-name-chip" class="session-name-chip" hidden>
        <button id="session-name-label" class="session-name-label" type="button"></button>
        <!-- Which project this conversation belongs to. History went
             multi-workspace, so the open conversation is no longer necessarily
             from the folder VS Code has open, and the name alone stopped saying
             where you are. Same treatment the rail gives its cross-project rows. -->
        <span id="session-name-repo" class="session-name-repo" hidden></span>
        <button id="session-name-edit" class="session-name-edit icon-btn" type="button" hidden></button>
      </div>
    </div>
    <button id="repo-btn" class="repo-chip" type="button" title="Choose repository"></button>
    <button id="remote-btn" class="icon-btn remote-btn" title="Continue remotely" hidden></button>
    <button id="history-btn" class="icon-btn" title="Session history"></button>
    <button id="new-btn" class="icon-btn" title="New session"></button>
    ${opts.canSwitchWorkspaceFolder ? `<div id="session-head-actions"></div>` : ""}
    ${opts.canSwitchWorkspaceFolder ? "" : `<div id="vscode-session-actions"></div>`}
    <div id="repo-popover" class="toolbar-popover repo-popover" hidden></div>
    <div id="history-popover" class="toolbar-popover history-popover" hidden></div>
  </header>
${fileShellOpen}
  <main id="messages" class="messages">
    <div class="welcome" id="welcome">
      <span class="welcome-mark" role="img" aria-label="Grok" style="--welcome-mark:url('${resourceUri("grok-icon.svg")}')"></span>
      <h2>${isCloudEnvironment() ? "AFK Pilot (Cloud)" : "Grok Build (Community)"}</h2>
      <p class="welcome-byline muted">by Paweł Huryn (<a href="https://www.productcompass.pm/" class="muted-link">The Product Compass</a>)</p>
      <p id="welcome-version" class="muted welcome-status-busy"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Starting</span></p>
      <div id="welcome-onboarding"></div>
    </div>
  </main>

  <footer class="composer">
    <button id="scroll-bottom-btn" class="scroll-bottom-btn" type="button" title="Scroll to bottom"></button>
    <div id="composer-context-bar" class="composer-context-bar" hidden>
      <button id="context-files-btn" class="context-files-btn" type="button"></button>
      <button id="review-btn" class="review-btn" type="button" title="Review files">Review</button>
    </div>
    <div class="composer-card">
      <div id="attachments" class="attachments"></div>
      <div class="composer-input-wrap">
        <div id="input-highlight" class="input-highlight" aria-hidden="true" dir="auto"></div>
        <textarea id="input" placeholder="Plan, Build, / for skills, @ for context" rows="2" dir="auto"></textarea>
      </div>
      <div class="composer-toolbar">
        <div class="toolbar-left">
          <button id="mode-btn" class="toolbar-btn" title="Pick mode"></button>
          <button id="model-btn" class="toolbar-btn" title="Pick model"></button>
          <button id="gear-btn" class="icon-btn" title="Settings"></button>
          <div id="chips"></div>
        </div>
        <div class="toolbar-right">
          <div class="context-donut" id="donut" title="Context usage">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" fill="none" stroke="var(--vscode-editorWidget-border,#444)" stroke-width="3"/>
              <circle id="donut-arc" cx="8" cy="8" r="6" fill="none" stroke="var(--vscode-charts-green,#4ec9b0)" stroke-width="3" stroke-dasharray="0 999" transform="rotate(-90 8 8)"/>
            </svg>
            <span id="donut-label" class="small muted">0%</span>
          </div>
          <button id="add-btn" class="icon-btn" title="Add context"></button>
          <button id="mic-btn" class="mic-btn icon-btn" title="Voice control"></button>
          <button id="send-btn" class="send"></button>
        </div>
      </div>
    </div>
    <div id="mode-popover" class="toolbar-popover" hidden></div>
    <div id="gear-popover" class="toolbar-popover gear-popover" hidden></div>
    <div id="add-popover" class="toolbar-popover" hidden></div>
    <div id="context-popover" class="toolbar-popover" hidden></div>
    <div id="slash-popover" class="slash-popover" hidden></div>
    <div id="mention-popover" class="slash-popover mention-popover" hidden></div>
  </footer>
${fileShellClose}
${closeMain}

  <script nonce="${nonce}">
    // Configure MathJax before its bundle loads. We drive typesetting manually
    // via MathJax.tex2svg (startup.typeset:false), so it never scans the page.
    // svg.fontCache:'local' makes each equation's SVG embed its own glyph paths
    // (self-contained — required for the upcoming SVG/PNG export). enableMenu:false
    // drops the right-click menu (its assets would need network/CSP exceptions).
    // enableAssistiveMml:false is critical: by default MathJax appends a hidden
    // <mjx-assistive-mml> MathML copy of every equation, normally hidden by CSS
    // that MathJax injects when it manages the page. We drive it manually via
    // tex2svg + outerHTML, so that hiding CSS isn't applied and Chromium renders
    // the MathML natively — a visible *second* copy of every equation.
    window.MathJax = {
      tex: { processEnvironments: true, processRefs: true },
      svg: { fontCache: "local" },
      options: { enableMenu: false, enableAssistiveMml: false },
      startup: { typeset: false }
    };
  </script>
  <script nonce="${nonce}" src="${mediaUri("mathjax/tex-svg-full.js")}"></script>
  <script nonce="${nonce}" src="${mediaUri("mermaid/mermaid.min.js")}"></script>
  <script nonce="${nonce}" src="${mediaUri("webview-helpers.js")}"></script>
  <script nonce="${nonce}" src="${mediaUri("settings.js")}"></script>
  ${filePanelScript}
  <script nonce="${nonce}" src="${mediaUri("chat.js")}"></script>
</body>
</html>`;
  }
