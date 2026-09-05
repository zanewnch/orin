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
  <nav id="desk-activity-bar" class="desk-activity-bar" role="tablist" aria-label="Activity bar">
    <button id="desk-activity-projects" class="desk-activity-btn active" role="tab" type="button" title="Projects" aria-label="Projects" aria-controls="projects-rail" aria-selected="true" aria-pressed="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v9a1 1 0 0 1-1 1h-16a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"/></svg>
    </button>
    <button id="desk-activity-search" class="desk-activity-btn" role="tab" type="button" title="Search projects (Ctrl+Shift+F)" aria-label="Search projects (Ctrl+Shift+F)" aria-keyshortcuts="Control+Shift+F Meta+Shift+F" aria-controls="projects-rail" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
    </button>
    <button id="desk-activity-scm" class="desk-activity-btn" role="tab" type="button" title="Workspace files (Ctrl+Shift+E)" aria-label="Workspace files (Ctrl+Shift+E)" aria-keyshortcuts="Control+Shift+E Meta+Shift+E Control+Shift+G Meta+Shift+G" aria-controls="desk-ft-panel" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5h14v15H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
    </button>
    <button id="desk-activity-extensions" class="desk-activity-btn" role="tab" type="button" title="Extensions and settings (Ctrl+Shift+X)" aria-label="Extensions and settings (Ctrl+Shift+X)" aria-keyshortcuts="Control+Shift+X Meta+Shift+X" aria-controls="settings-overlay" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3.5h6v5h5.5v6H15v6H9v-6H3.5v-6H9z"/></svg>
    </button>
    <button id="desk-activity-history" class="desk-activity-btn" role="tab" type="button" title="Session history" aria-label="Session history" aria-controls="history-popover" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/></svg>
    </button>
    <button id="desk-activity-claude" class="desk-activity-btn" role="tab" type="button" title="Claude Code" aria-label="Claude Code" aria-controls="desk-workbench-agents" aria-selected="false">
      <span class="desk-activity-letter" aria-hidden="true">C</span>
    </button>
    <button id="desk-activity-service" class="desk-activity-btn" role="tab" type="button" title="Service" aria-label="Service" aria-controls="settings-overlay" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M5.9 5.9 8 8M16 16l2.1 2.1M18.1 5.9 16 8M8 16l-2.1 2.1"/><circle cx="12" cy="12" r="3.5"/></svg>
    </button>
    <span class="desk-activity-spacer" aria-hidden="true"></span>
    <button id="desk-activity-more" class="desk-activity-more" type="button" title="Additional Views" aria-label="Additional Views">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
    </button>
    <button id="desk-activity-settings" class="desk-activity-btn" role="tab" type="button" title="Settings" aria-label="Settings" aria-controls="settings-overlay" aria-selected="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>
    </button>
  </nav>
  <aside id="projects-rail" class="projects-rail" aria-label="Projects">
    <div class="rail-top">
      <span class="rail-brand" title="Orin Desktop">
        <span class="mark" style="--rail-mark:url('${railMark}')" aria-hidden="true"></span>
        <span class="wordmark"><b>Orin</b></span>
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
    const deskStatusBar = opts.canSwitchWorkspaceFolder
      ? `<div class="desk-status-bar" role="status" aria-label="Workspace status">
    <div class="desk-status-left"><span class="desk-status-item" title="Current branch">⑂ main</span><span class="desk-status-item" title="Sync status">↻</span><span class="desk-status-item" title="Problems">× 0</span></div>
    <div class="desk-status-right"><span id="desk-status-position" class="desk-status-item">Ln 1, Col 1</span><span class="desk-status-item">Spaces: 2</span><span class="desk-status-item">UTF-8</span><span class="desk-status-item desk-status-connected">● Connected</span></div>
  </div>`
      : "";
    const deskLayoutClass = opts.canSwitchWorkspaceFolder ? " has-rail desk-with-ft" : "";
    const firstFrameLayout = opts.canSwitchWorkspaceFolder
      ? `
  body.desk.has-rail { display: flex; flex-direction: row; align-items: stretch; }
  body.desk.has-rail #desk-activity-bar { width: 44px; flex: 0 0 44px; height: 100%; }
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
    ${opts.canSwitchWorkspaceFolder ? `<div class="desk-workbench-nav" role="toolbar" aria-label="Title actions">
      <button id="desk-workbench-sidebar" class="icon-btn desk-workbench-btn" type="button" title="Toggle primary sidebar (Ctrl+B)" aria-label="Toggle primary sidebar (Ctrl+B)" aria-keyshortcuts="Control+B Meta+B">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
      </button>
      <button id="desk-workbench-back" class="icon-btn desk-workbench-btn" type="button" title="Go back (Ctrl+Shift+Z)" aria-label="Go back (Ctrl+Shift+Z)" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
      </button>
      <button id="desk-workbench-forward" class="icon-btn desk-workbench-btn" type="button" title="Go forward (Alt+RightArrow)" aria-label="Go forward (Alt+RightArrow)" aria-keyshortcuts="Alt+ArrowRight" disabled>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
      <button id="desk-workbench-project" class="desk-workbench-project" type="button" title="orin" aria-label="orin">
        <span>orin</span>
      </button>
      <button id="desk-workbench-workspace" class="desk-workbench-workspace" type="button" title="Toggle workspace files" aria-label="Toggle workspace files" aria-keyshortcuts="Control+Shift+E Meta+Shift+E Alt+Q">
        <span class="desk-workbench-workspace-name">Workspace files</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <button id="desk-workbench-panel" class="icon-btn desk-workbench-btn desk-workbench-panel" type="button" role="checkbox" title="Toggle panel (Ctrl+J)" aria-label="Toggle panel (Ctrl+J)" aria-keyshortcuts="Control+J Meta+J" aria-checked="true" aria-pressed="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M4 15h16"/></svg>
      </button>
      <button id="desk-workbench-agents" class="icon-btn desk-workbench-btn" type="button" title="Toggle Agents (Ctrl+Alt+J)" aria-label="Toggle Agents (Ctrl+Alt+J)" aria-keyshortcuts="Control+Alt+J Meta+Alt+J" aria-pressed="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19.5c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/><path d="M4 8.5h2M18 8.5h2"/></svg>
      </button>
      <button id="desk-workbench-settings" class="icon-btn desk-workbench-btn" type="button" title="Open settings" aria-label="Open settings" aria-keyshortcuts="Control+K Control+S Meta+K Meta+S">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>
      </button>
      <button id="desk-workbench-agents-window" class="icon-btn desk-workbench-btn" type="button" title="Agents Window" aria-label="Agents Window" aria-keyshortcuts="Control+Alt+J Meta+Alt+J">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h5M8 17h8"/></svg>
      </button>
    </div>` : ""}
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
      <h2>${isCloudEnvironment() ? "AFK Pilot (Cloud)" : "Orin"}</h2>
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
          <button id="mode-btn" class="toolbar-btn composer-mode-chip" title="Pick mode" aria-haspopup="menu" aria-expanded="false"></button>
          <button id="model-btn" class="toolbar-btn composer-effort-chip" title="Switch model · Cycle effort" aria-haspopup="menu" aria-expanded="false"></button>
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
    <div id="mode-popover" class="toolbar-popover" role="menu" hidden></div>
    <div id="gear-popover" class="toolbar-popover gear-popover" role="dialog" aria-label="Chat settings" hidden></div>
    <div id="add-popover" class="toolbar-popover" hidden></div>
    <div id="context-popover" class="toolbar-popover" hidden></div>
    <div id="slash-popover" class="slash-popover" hidden></div>
    <div id="mention-popover" class="slash-popover mention-popover" hidden></div>
  </footer>
${fileShellClose}
${deskStatusBar}
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
