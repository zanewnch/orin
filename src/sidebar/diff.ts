import type { HostTextDocumentContentProvider } from "../host";
import type { Uri } from "../host";

// Scheme for the permission-card diff preview's virtual documents. Backing the
// before/after sides with a read-only content provider (rather than untitled
// scratch buffers) means the diff tab never goes "dirty", so closing it doesn't
// prompt to save (issue #21). The path keeps the real filename so VS Code infers
// the language for syntax highlighting.
export const GROK_DIFF_SCHEME = "grok-diff";

/**
 * Read-only content provider for the diff-preview virtual documents. Content is
 * stored per-URI and served verbatim; the documents are never editable or dirty,
 * so the diff tab closes without a save prompt. Host-registered via
 * {@link Host.registerTextDocumentContentProvider}.
 */
export class GrokDiffContentProvider implements HostTextDocumentContentProvider {
  private readonly contents = new Map<string, string>();
  provideTextDocumentContent(uri: Uri): string {
    return this.contents.get(uri.toString()) ?? "";
  }
  set(uri: Uri, content: string): void {
    this.contents.set(uri.toString(), content);
  }
  delete(...uris: Uri[]): void {
    for (const uri of uris) this.contents.delete(uri.toString());
  }
}
