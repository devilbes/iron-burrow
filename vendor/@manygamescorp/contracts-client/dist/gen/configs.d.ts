export interface paths {
    "/v1/assets/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Public file of an app (E12/E13): `key` = `{appId}/{path}`.
         * @description No JWT. Served only for an enabled app, an active file with `public=true` under one of the app allowlisted prefixes; anything else (unknown app, prefix, file, any `%`-escape in `key`) is the same 404.
         */
        get: operations["PublicAssetsController_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/configs/fetch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Configs by scope/keys with the saved init context (implicit init when it is missing).
         * @description Without `scopes` returns implicitly fetched client-visible scopes. Config records are inline; the config snapshot is limited to 16 MiB of UTF-8 JSON (413 PAYLOAD_TOO_LARGE above it). configsURL is reserved.
         */
        post: operations["ConfigsClientController_fetch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/configs/init": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Player context (sticky A/B assignment) and, on request, raw configs; segments are computed by the SDK (E96).
         * @description `appId`/`gid` from the JWT; body `segment`/`ab*` are not accepted. Safe to repeat (E32); `Idempotency-Key` is ignored. `ab`/`abg`/`abExp` are null and `abs` is empty outside running tests. Selected config records are inline; the config snapshot is limited to 16 MiB of UTF-8 JSON.
         */
        post: operations["ConfigsClientController_init"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AbState: {
            ab: string;
            abExp: number | null;
            abg: string;
        };
        ConfigsPayload: {
            configs: {
                [key: string]: {
                    [key: string]: {
                        conditionals: {
                            contentHash?: string;
                            data?: unknown;
                            enabled?: boolean;
                            filters: {
                                [key: string]: unknown;
                            };
                            label?: string;
                            /** @enum {string} */
                            mode?: "merge" | "replace";
                            /** @enum {string} */
                            side: "server" | "client";
                        }[];
                        /** @enum {string} */
                        conditionalsMode: "merge" | "replace";
                        contentHash?: string;
                        data?: unknown;
                        filters?: {
                            [key: string]: unknown;
                        };
                        maxVersion?: string | null;
                        minVersion?: string | null;
                        priority: number;
                        version: number;
                    };
                };
            };
            configsURL?: {
                [key: string]: {
                    /** Format: date-time */
                    expiresAt: string;
                    sha256: string;
                    /** Format: uri */
                    url: string;
                    version: number;
                };
            };
            /** Format: date-time */
            ts: string;
            version: {
                [key: string]: number;
            };
        };
        ConfigURL: {
            /** Format: date-time */
            expiresAt: string;
            sha256: string;
            /** Format: uri */
            url: string;
            version: number;
        };
        ErrorBody: {
            code: string;
            details: {
                [key: string]: unknown;
            } | null;
            msg: string;
            rid: string;
        };
        FetchRequest: {
            keys?: string[];
            scope?: string[];
            scopes?: string[];
            values?: {
                [key: string]: (string | null) | number | boolean;
            };
        };
        FetchResponse: {
            configs: {
                [key: string]: {
                    [key: string]: {
                        conditionals: {
                            contentHash?: string;
                            data?: unknown;
                            enabled?: boolean;
                            filters: {
                                [key: string]: unknown;
                            };
                            label?: string;
                            /** @enum {string} */
                            mode?: "merge" | "replace";
                            /** @enum {string} */
                            side: "server" | "client";
                        }[];
                        /** @enum {string} */
                        conditionalsMode: "merge" | "replace";
                        contentHash?: string;
                        data?: unknown;
                        filters?: {
                            [key: string]: unknown;
                        };
                        maxVersion?: string | null;
                        minVersion?: string | null;
                        priority: number;
                        version: number;
                    };
                };
            };
            configsURL?: {
                [key: string]: {
                    /** Format: date-time */
                    expiresAt: string;
                    sha256: string;
                    /** Format: uri */
                    url: string;
                    version: number;
                };
            };
            /** Format: date-time */
            ts: string;
            version: {
                [key: string]: number;
            };
        };
        InitRequest: {
            keys?: string[];
            scopes?: string[];
            values?: {
                [key: string]: (string | null) | number | boolean;
            };
        };
        InitResponse: {
            ab?: string | null;
            abExp?: number | null;
            abg?: string | null;
            abs?: {
                ab: string;
                abExp: number | null;
                abg: string;
            }[];
            configs: {
                [key: string]: {
                    [key: string]: {
                        conditionals: {
                            contentHash?: string;
                            data?: unknown;
                            enabled?: boolean;
                            filters: {
                                [key: string]: unknown;
                            };
                            label?: string;
                            /** @enum {string} */
                            mode?: "merge" | "replace";
                            /** @enum {string} */
                            side: "server" | "client";
                        }[];
                        /** @enum {string} */
                        conditionalsMode: "merge" | "replace";
                        contentHash?: string;
                        data?: unknown;
                        filters?: {
                            [key: string]: unknown;
                        };
                        maxVersion?: string | null;
                        minVersion?: string | null;
                        priority: number;
                        version: number;
                    };
                };
            };
            configsURL?: {
                [key: string]: {
                    /** Format: date-time */
                    expiresAt: string;
                    sha256: string;
                    /** Format: uri */
                    url: string;
                    version: number;
                };
            };
            maxVersion?: string | null;
            minVersion?: string | null;
            /** Format: date-time */
            ts: string;
            version: {
                [key: string]: number;
            };
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    PublicAssetsController_get: {
        parameters: {
            query?: {
                /** @description `1` → `Content-Disposition: attachment`. */
                download?: "1";
            };
            header?: {
                /** @description ETag of a previous response → 304 when unchanged. */
                "If-None-Match"?: string;
                /** @description One range `bytes=a-b`, `a-` or `-n` → 206; outside the file → 416; several ranges → full 200. */
                Range?: string;
                /** @description Request id for tracing; generated by the server when absent. */
                "X-Req-Id"?: string;
            };
            path: {
                /** @description `{appId}/{path}`, may contain `/`; read from the raw URL, no percent-escapes. */
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description File body. */
            200: {
                headers: {
                    /** @description `*`: the file is public and served without credentials. */
                    "Access-Control-Allow-Origin"?: string;
                    /** @description `public, max-age=31536000, immutable` for a versioned path, otherwise `public, max-age=300`. */
                    "Cache-Control"?: string;
                    /** @description `inline`; `attachment` with `?download=1` and for `image/svg+xml`. */
                    "Content-Disposition"?: string;
                    /** @description Stored type (checked by magic bytes). */
                    "Content-Type"?: string;
                    /** @description `cross-origin`. */
                    "Cross-Origin-Resource-Policy"?: string;
                    /** @description sha256 of the file. */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "*/*": string;
                };
            };
            /** @description Requested byte range. */
            206: {
                headers: {
                    /** @description `*`: the file is public and served without credentials. */
                    "Access-Control-Allow-Origin"?: string;
                    /** @description `public, max-age=31536000, immutable` for a versioned path, otherwise `public, max-age=300`. */
                    "Cache-Control"?: string;
                    /** @description `inline`; `attachment` with `?download=1` and for `image/svg+xml`. */
                    "Content-Disposition"?: string;
                    /** @description `bytes a-b/size`. */
                    "Content-Range"?: string;
                    /** @description Stored type (checked by magic bytes). */
                    "Content-Type"?: string;
                    /** @description `cross-origin`. */
                    "Cross-Origin-Resource-Policy"?: string;
                    /** @description sha256 of the file. */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "*/*": string;
                };
            };
            /** @description Not modified: `If-None-Match` matches the current ETag; no body. */
            304: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not found. */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "Not found.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Range outside the file. */
            416: {
                headers: {
                    /** @description `*`: the file is public and served without credentials. */
                    "Access-Control-Allow-Origin"?: string;
                    /** @description `bytes *\/size`. */
                    "Content-Range"?: string;
                    /** @description `cross-origin`. */
                    "Cross-Origin-Resource-Policy"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unexpected error; no stack or internal message. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "Unexpected error; no stack or internal message.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    ConfigsClientController_fetch: {
        parameters: {
            query?: never;
            header: {
                /** @description ETag of a previous response → 304 when unchanged. */
                "If-None-Match"?: string;
                /** @description Client version X.Y.Z; missing or malformed → 400 CONFIGS_VERSION_REQUIRED. */
                "X-App-V": string;
                /** @description Logs only; targeting uses `os` from the JWT. */
                "X-OS"?: string;
                /** @description Request id for tracing; generated by the server when absent. */
                "X-Req-Id"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FetchRequest"];
            };
        };
        responses: {
            /** @description Configs payload. */
            200: {
                headers: {
                    /** @description `private, no-cache`. */
                    "Cache-Control"?: string;
                    /** @description Tag of this payload for the next `If-None-Match`. */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FetchResponse"];
                };
            };
            /** @description Not modified: `If-None-Match` matches the current ETag; no body. */
            304: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Body fails validation (strict fields, `values` limits, scope/key format), or no valid client version → CONFIGS_VERSION_REQUIRED. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": {
                     *         "issues": [
                     *           {
                     *             "message": "Invalid string",
                     *             "path": [
                     *               "scopes",
                     *               0
                     *             ]
                     *           }
                     *         ]
                     *       },
                     *       "msg": "Body fails validation (strict fields, `values` limits, scope/key format), or no valid client version → CONFIGS_VERSION_REQUIRED.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description No player JWT, invalid signature or expiry, no `gid`, or a panel token. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "No player JWT, invalid signature or expiry, no `gid`, or a panel token.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `values` exceed the configured byte limit, or the inline config snapshot exceeds 16 MiB of UTF-8 JSON. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "PAYLOAD_TOO_LARGE",
                     *       "details": {
                     *         "limitBytes": 4096
                     *       },
                     *       "msg": "`values` exceed the configured byte limit, or the inline config snapshot exceeds 16 MiB of UTF-8 JSON.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Per appId+gid rate limit exceeded. */
            429: {
                headers: {
                    /** @description Seconds until the rate-limit window resets. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "Per appId+gid rate limit exceeded.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Unexpected error; no stack or internal message. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "Unexpected error; no stack or internal message.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Object storage failed to store or sign a large config. */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "Object storage failed to store or sign a large config.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    ConfigsClientController_init: {
        parameters: {
            query?: never;
            header: {
                /** @description Client version X.Y.Z; missing or malformed → 400 CONFIGS_VERSION_REQUIRED. */
                "X-App-V": string;
                /** @description Logs only; targeting uses `os` from the JWT. */
                "X-OS"?: string;
                /** @description Request id for tracing; generated by the server when absent. */
                "X-Req-Id"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InitRequest"];
            };
        };
        responses: {
            /** @description Context and requested configs. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InitResponse"];
                };
            };
            /** @description Body fails validation (strict fields, `values` limits, scope/key format), or no valid client version → CONFIGS_VERSION_REQUIRED. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": {
                     *         "issues": [
                     *           {
                     *             "message": "Invalid string",
                     *             "path": [
                     *               "scopes",
                     *               0
                     *             ]
                     *           }
                     *         ]
                     *       },
                     *       "msg": "Body fails validation (strict fields, `values` limits, scope/key format), or no valid client version → CONFIGS_VERSION_REQUIRED.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description No player JWT, invalid signature or expiry, no `gid`, or a panel token. */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "No player JWT, invalid signature or expiry, no `gid`, or a panel token.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `values` exceed the configured byte limit, or the inline config snapshot exceeds 16 MiB of UTF-8 JSON. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "PAYLOAD_TOO_LARGE",
                     *       "details": {
                     *         "limitBytes": 4096
                     *       },
                     *       "msg": "`values` exceed the configured byte limit, or the inline config snapshot exceeds 16 MiB of UTF-8 JSON.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Per appId+gid rate limit exceeded. */
            429: {
                headers: {
                    /** @description Seconds until the rate-limit window resets. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "Per appId+gid rate limit exceeded.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description Unexpected error; no stack or internal message. */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "Unexpected error; no stack or internal message.",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
}
//# sourceMappingURL=configs.d.ts.map