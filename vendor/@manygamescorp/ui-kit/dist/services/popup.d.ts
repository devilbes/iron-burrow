import { type FeatureProps } from '../features/shared.js';
import { type StandardAction } from './error.js';
import { type PartySlotsSpec } from './game-widgets.js';
import type { ViewNode } from '../core.js';
export type PopupBlock = {
    readonly kind: 'text';
    readonly text: string;
    readonly muted?: boolean;
} | {
    readonly kind: 'image';
    readonly key: string;
    readonly alt?: string;
} | {
    readonly kind: 'rewards';
    readonly items: readonly {
        readonly name: string;
        readonly quantity: number;
        readonly icon?: string;
    }[];
    readonly label?: string;
} | {
    readonly kind: 'list';
    readonly items: readonly PopupListItem[];
};
export type PopupListItem = string | {
    readonly text: string;
    readonly icon?: string;
};
export interface PopupHeader {
    readonly imageKey?: string;
    readonly icon?: string;
    readonly stars?: number;
    readonly alt?: string;
    readonly party?: PartySlotsSpec;
}
export interface PopupProps extends FeatureProps {
    readonly title: string;
    readonly variant?: string;
    readonly header?: PopupHeader;
    readonly content?: readonly PopupBlock[];
    readonly actions?: readonly StandardAction[];
    readonly closable?: boolean;
    readonly masthead?: string;
    readonly issueLine?: string;
    readonly footnote?: string;
    readonly layout?: 'auto' | 'landscape';
}
export declare function popupView(p: PopupProps): ViewNode;
export declare const popup: import("../core.js").KitComponent<PopupProps>;
export interface ConfirmProps extends FeatureProps {
    readonly title?: string;
    readonly free?: boolean;
    readonly subject: string;
    readonly details?: string;
    readonly price?: string;
    readonly icon?: string;
    readonly imageKey?: string;
    readonly confirmLabel?: string;
    readonly cancelLabel?: string;
}
export declare function confirmView(p: ConfirmProps): ViewNode;
export declare const confirm: import("../core.js").KitComponent<ConfirmProps>;
//# sourceMappingURL=popup.d.ts.map