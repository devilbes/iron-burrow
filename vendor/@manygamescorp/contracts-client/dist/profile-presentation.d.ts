/** Explicit optional UI capability; profile data works without this provider. */
export declare const PROFILE_PRESENTATION = "profile.presentation@1";
export interface ProfilePresentationHandle {
    readonly active: boolean;
    update(level: number): void;
    dispose(): void;
}
export interface ProfilePresentation {
    attach(): ProfilePresentationHandle;
}
//# sourceMappingURL=profile-presentation.d.ts.map