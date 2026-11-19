import { type PreviewErrorCode, type PreviewMessage } from './protocol.js';
export interface PreviewIssue {
    readonly code: PreviewErrorCode;
    readonly moduleId?: string;
}
export interface PreviewEngine {
    apply(message: PreviewMessage): readonly PreviewIssue[];
    dispose(): void;
}
export declare function createPreviewEngine(container: HTMLElement, pageOrigin: string): PreviewEngine;
//# sourceMappingURL=engine.d.ts.map