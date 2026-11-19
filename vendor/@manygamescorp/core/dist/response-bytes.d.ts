export interface ByteResponse {
    readonly headers: {
        get(name: string): string | null;
    };
    readonly body: ReadableStream<Uint8Array> | null;
}
export declare function readResponseBytes(response: ByteResponse, limit: number, signal: AbortSignal, tooLarge: () => never): Promise<Uint8Array>;
//# sourceMappingURL=response-bytes.d.ts.map