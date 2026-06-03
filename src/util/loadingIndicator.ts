import * as vscode from "vscode";

// Animated muted ghost-text spinner shown at the cursor while a completion is
// being generated. The inline completion API has no built-in loading state, so
// we render it as an `after` text decoration and animate it with a timer.
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_MS = 90;

export class LoadingIndicator implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private timer: ReturnType<typeof setInterval> | undefined;
  private editor: vscode.TextEditor | undefined;
  private position: vscode.Position | undefined;
  private frame = 0;
  private generation = 0;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor("editorGhostText.foreground"),
        fontStyle: "italic",
      },
    });
  }

  // Starts the spinner at the given position. Returns a generation id; pass it
  // to stop() so a stale stop() can't clear a newer spinner.
  start(editor: vscode.TextEditor, position: vscode.Position): number {
    this.clearTimer();
    this.editor = editor;
    this.position = position;
    this.frame = 0;
    const gen = ++this.generation;

    this.render();
    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % FRAMES.length;
      this.render();
    }, FRAME_MS);

    return gen;
  }

  stop(generation?: number): void {
    if (generation !== undefined && generation !== this.generation) {
      return;
    }
    this.clearTimer();
    this.editor?.setDecorations(this.decorationType, []);
    this.editor = undefined;
    this.position = undefined;
  }

  dispose(): void {
    this.stop();
    this.decorationType.dispose();
  }

  private render(): void {
    if (!this.editor || !this.position) {
      return;
    }
    this.editor.setDecorations(this.decorationType, [
      {
        range: new vscode.Range(this.position, this.position),
        renderOptions: {
          after: { contentText: ` ${FRAMES[this.frame]}` },
        },
      },
    ]);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
