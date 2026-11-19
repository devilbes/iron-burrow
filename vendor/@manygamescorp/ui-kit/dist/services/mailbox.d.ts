import { type FeatureProps } from '../features/shared.js';
export interface MailboxEntry {
    readonly id: string;
    readonly kind: 'gift' | 'message';
    readonly title?: string;
    readonly text?: string;
    readonly at: string;
    readonly dateLabel?: string;
    readonly read: boolean;
}
export interface MailboxProps extends FeatureProps {
    readonly entries: readonly MailboxEntry[];
    readonly unread: number;
}
export declare const mailboxView: (p: MailboxProps) => import("../view-types.js").ViewNode;
export declare const mailbox: import("../core.js").KitComponent<MailboxProps>;
//# sourceMappingURL=mailbox.d.ts.map