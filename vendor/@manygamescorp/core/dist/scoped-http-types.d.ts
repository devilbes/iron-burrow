import type { RequestSpec } from './transport.js';
export type ScopedRequestSpec<TBody = unknown> = Omit<RequestSpec<TBody>, 'module' | 'path'> & {
    readonly path: `/${string}`;
};
export interface ScopedHttp {
    readonly service: string;
    readonly baseUrl: string;
    request<TRes, TBody = unknown>(spec: ScopedRequestSpec<TBody>): Promise<TRes>;
}
//# sourceMappingURL=scoped-http-types.d.ts.map