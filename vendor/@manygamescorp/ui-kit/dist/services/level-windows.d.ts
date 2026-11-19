import { type FeatureProps } from '../features/shared.js';
import { type PopupKind, type ViewNode } from '../core.js';
export interface PauseProps extends FeatureProps {
    readonly title?: string;
    readonly subtitle?: string;
    readonly sound?: boolean;
    readonly music?: boolean;
}
export declare const pause: Readonly<{
    view: (p: PauseProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: PauseProps): void;
    update(container: HTMLElement, props: PauseProps): void;
    unmount(container: HTMLElement): void;
}>;
export interface GoalTarget {
    readonly label: string;
    readonly value?: number;
    readonly target?: number;
}
export interface GoalHowTo {
    readonly icon: 'move' | 'lines' | 'booster';
    readonly text: string;
}
export interface LevelGoalProps extends FeatureProps {
    readonly title?: string;
    readonly score?: number;
    readonly seconds?: number;
    readonly goal?: string;
    readonly targets?: readonly GoalTarget[];
    readonly howTo?: readonly GoalHowTo[];
    readonly timerPaused?: boolean;
    readonly art?: string;
}
export declare const levelGoal: Readonly<{
    view: (p: LevelGoalProps) => ViewNode;
    presentation?: "fullscreen";
    popupKind?: PopupKind;
    mount(container: HTMLElement, props: LevelGoalProps): void;
    update(container: HTMLElement, props: LevelGoalProps): void;
    unmount(container: HTMLElement): void;
}>;
export declare const LEVEL_WINDOWS: Readonly<{
    readonly pause: Readonly<{
        view: (p: PauseProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: PauseProps): void;
        update(container: HTMLElement, props: PauseProps): void;
        unmount(container: HTMLElement): void;
    }>;
    readonly help: Readonly<{
        view: (p: LevelGoalProps) => ViewNode;
        presentation?: "fullscreen";
        popupKind?: PopupKind;
        mount(container: HTMLElement, props: LevelGoalProps): void;
        update(container: HTMLElement, props: LevelGoalProps): void;
        unmount(container: HTMLElement): void;
    }>;
}>;
//# sourceMappingURL=level-windows.d.ts.map