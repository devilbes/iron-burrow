import { type FeatureProps } from '../features/shared.js';
export interface AnnouncementProps extends FeatureProps {
    readonly notice?: {
        readonly kind: 'announcement' | 'maintenance' | 'update';
        readonly title: string;
        readonly text: string;
        readonly imageKey?: string;
        readonly linkUrl?: string;
        readonly required?: boolean;
        readonly startsAt?: string;
        readonly endsAt?: string;
    };
}
export declare const announcementView: (p: AnnouncementProps) => import("../view-types.js").ViewNode;
export declare const announcement: import("../core.js").KitComponent<AnnouncementProps>;
//# sourceMappingURL=announcement.d.ts.map