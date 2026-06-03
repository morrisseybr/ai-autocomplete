import { ClaudeAgentProvider } from "./claudeAgentProvider";
import type { CompletionProvider } from "./types";

export interface ProviderSettings {
  provider: string;
  claudeModel: string;
  claudeDisableThinking: boolean;
  onLog?: (message: string) => void;
}

// Picks a provider implementation from settings. Today only "claude" exists;
// new backends register here without touching the rest of the extension.
export function createProvider(settings: ProviderSettings): CompletionProvider {
  switch (settings.provider) {
    case "claude":
    default:
      return new ClaudeAgentProvider({
        model: settings.claudeModel,
        disableThinking: settings.claudeDisableThinking,
        onLog: settings.onLog,
      });
  }
}
