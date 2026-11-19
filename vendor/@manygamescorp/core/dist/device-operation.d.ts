type DeviceFunction = (...args: never[]) => unknown;
type Invocation = (receiver: unknown, args: unknown[], scopes: readonly AbortSignal[]) => unknown;
export declare function registerDeviceOperation<T extends DeviceFunction>(fn: T, invoke: Invocation): T;
export declare const hasDeviceOperation: (fn: DeviceFunction) => boolean;
export declare function invokeDeviceOperation(fn: DeviceFunction, receiver: unknown, args: unknown[], scopes: readonly AbortSignal[]): unknown;
export declare function deviceOperation<T extends (...args: never[]) => unknown>(run: (scopes: readonly AbortSignal[], ...args: Parameters<T>) => ReturnType<T>): T;
export declare function operationSignal(lifetime: AbortSignal, scopes: readonly AbortSignal[]): AbortSignal;
export declare function checkOperation(signal: AbortSignal): void;
export declare function waitDeviceOperation<T>(promise: Promise<T>, signal: AbortSignal): Promise<T>;
export {};
//# sourceMappingURL=device-operation.d.ts.map