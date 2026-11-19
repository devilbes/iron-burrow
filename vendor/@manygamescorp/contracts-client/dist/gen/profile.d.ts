export interface paths {
    "/v1/game-states/{gid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GameStateClientController_public"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/game-states/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GameStateClientController_me"];
        /** @description Full replace; If-Match: "<version>" ("0" for the first save) and Idempotency-Key (16–64 chars) is required */
        put: operations["GameStateClientController_put"];
        post?: never;
        /** @description clear(); optional If-Match: "<version>"; Idempotency-Key (16–64 chars) is required */
        delete: operations["GameStateClientController_clear"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/player-data/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PlayerDataClientController_all"];
        /** @description Merge keys atomically; Idempotency-Key (16–64 chars) is required */
        put: operations["PlayerDataClientController_put"];
        post?: never;
        /** @description Idempotency-Key (16–64 chars) is required */
        delete: operations["PlayerDataClientController_removeMany"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/player-data/me/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PlayerDataClientController_one"];
        put?: never;
        post?: never;
        /** @description Idempotency-Key (16–64 chars) is required */
        delete: operations["PlayerDataClientController_remove"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/player-data/me/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["PlayerDataClientController_query"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profiles/{gid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProfileClientController_public"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profiles/{gid}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProfileClientController_publicSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profiles/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Own profile; empty game name defaults to the current ManyPlay ID nickname. If-None-Match uses the opaque representation ETag (including derived nickname and schema projection), with weak comparison, lists and *. Write If-Match remains "<version>" from body.version. */
        get: operations["ProfileClientController_me"];
        /** @description Replace the client-writable part; If-Match: "<version>" is required */
        put: operations["ProfileClientController_replace"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Merge Patch; optional If-Match: "<version>" */
        patch: operations["ProfileClientController_patch"];
        trace?: never;
    };
    "/v1/profiles/me/fields/{path}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProfileClientController_field"];
        /** @description Optional If-Match: "<version>" */
        put: operations["ProfileClientController_setField"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profiles/me/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ProfileClientController_summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/profiles/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Public projections, ≤ 100 gids; duplicates collapse */
        post: operations["ProfileClientController_query"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    GameStateClientController_public: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description publicData of the player */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        gid: number;
                        publicData: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        updatedAt: string | null;
                        version: number;
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    GameStateClientController_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own save; version 0 when absent */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        data: {
                            [key: string]: unknown;
                        };
                        publicData: {
                            [key: string]: unknown;
                        } | null;
                        /** @description updatedAt in Unix seconds; deprecated */
                        ts: number | null;
                        /** Format: date-time */
                        updatedAt: string | null;
                        /** @description 0 — no save yet */
                        version: number;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    GameStateClientController_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description ≤ 1 MiB */
                    data: {
                        [key: string]: unknown;
                    };
                    /** @description ≤ 8 KiB */
                    publicData?: {
                        [key: string]: unknown;
                    } | null;
                };
            };
        };
        responses: {
            /** @description Write result */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        ts: number;
                        /** Format: date-time */
                        updatedAt: string;
                        version: number;
                    };
                };
            };
            /** @description VALIDATION_FAILED, IDEMPOTENCY_KEY_REQUIRED, PROFILE_GAME_STATE_VERSION_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description GAME_STATE_VERSION_CONFLICT, IDEMPOTENCY_KEY_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PAYLOAD_TOO_LARGE */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_GAME_STATE_LIMIT_EXCEEDED */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    GameStateClientController_clear: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Write result */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        ts: number;
                        /** Format: date-time */
                        updatedAt: string;
                        version: number;
                    };
                };
            };
            /** @description VALIDATION_FAILED, IDEMPOTENCY_KEY_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description GAME_STATE_VERSION_CONFLICT, IDEMPOTENCY_KEY_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_all: {
        parameters: {
            query?: {
                scope?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description All keys in the scope; {} and updatedAt null when empty */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Key ^[A-Za-z0-9:_-]{1,128}$ → JSON value */
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        updatedAt: string | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description 1–50 keys, merged into the stored document */
                    data: {
                        [key: string]: unknown;
                    };
                    /** @description KV namespace; global (reserved) when omitted */
                    scope?: string;
                };
            };
        };
        responses: {
            /** @description Written keys */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Key ^[A-Za-z0-9:_-]{1,128}$ → JSON value */
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        updatedAt: string | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, PROFILE_PLAYER_DATA_KEY_INVALID, IDEMPOTENCY_KEY_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description IDEMPOTENCY_KEY_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PAYLOAD_TOO_LARGE */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_PLAYER_DATA_VALUE_INVALID, PROFILE_PLAYER_DATA_LIMIT_EXCEEDED */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_removeMany: {
        parameters: {
            query: {
                keys: string;
                scope?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; absent keys too */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description VALIDATION_FAILED, PROFILE_PLAYER_DATA_KEY_INVALID, IDEMPOTENCY_KEY_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description IDEMPOTENCY_KEY_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_one: {
        parameters: {
            query?: {
                scope?: string;
            };
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The key in the scope */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Key ^[A-Za-z0-9:_-]{1,128}$ → JSON value */
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        updatedAt: string | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, PROFILE_PLAYER_DATA_KEY_INVALID */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_PLAYER_DATA_KEY_NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_remove: {
        parameters: {
            query?: {
                scope?: string;
            };
            header?: never;
            path: {
                key: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; absent keys too */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description VALIDATION_FAILED, PROFILE_PLAYER_DATA_KEY_INVALID, IDEMPOTENCY_KEY_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description IDEMPOTENCY_KEY_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    PlayerDataClientController_query: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    keys: string[];
                    /** @description KV namespace; global (reserved) when omitted */
                    scope?: string;
                };
            };
        };
        responses: {
            /** @description Existing keys only */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Key ^[A-Za-z0-9:_-]{1,128}$ → JSON value */
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        updatedAt: string | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, PROFILE_PLAYER_DATA_KEY_INVALID */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_public: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Public projection */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        country: string | null;
                        friendsCount: number;
                        gamesPlayed: number;
                        gamesWon: number;
                        gid: number;
                        highestScore: number;
                        level: number;
                        locale: string;
                        name: string;
                        referralCode: string;
                        score: number;
                        totalScore: number;
                        /** Format: date-time */
                        updatedAt: string;
                        winRate: number;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_publicSummary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Public summary */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        gid: number;
                        level: number;
                        name: string;
                        score: number;
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description NOT_FOUND */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Profile */
            200: {
                headers: {
                    /** @description Opaque weak profile representation tag: W/"profile-<sha256>"; use body.version for write If-Match */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        coins: number;
                        country: string | null;
                        /** Format: date-time */
                        createdAt: string;
                        friendsCount: number;
                        gamesPlayed: number;
                        gamesWon: number;
                        gid: number;
                        highestScore: number;
                        level: number;
                        locale: string;
                        name: string;
                        /** @enum {string} */
                        nameModeration: "none" | "pending" | "approved" | "rejected";
                        referralCode: string;
                        score: number;
                        totalScore: number;
                        /** Format: date-time */
                        updatedAt: string;
                        version: number;
                        winRate: number;
                        xp: number;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Not modified: the selected profile representation matches If-None-Match */
            304: {
                headers: {
                    /** @description Opaque weak profile representation tag: W/"profile-<sha256>"; use body.version for write If-Match */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_replace: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    avatar?: string | null;
                    country?: string | null;
                    locale?: string;
                    name?: string;
                } & {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            /** @description Profile */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        coins: number;
                        country: string | null;
                        /** Format: date-time */
                        createdAt: string;
                        friendsCount: number;
                        gamesPlayed: number;
                        gamesWon: number;
                        gid: number;
                        highestScore: number;
                        level: number;
                        locale: string;
                        name: string;
                        /** @enum {string} */
                        nameModeration: "none" | "pending" | "approved" | "rejected";
                        referralCode: string;
                        score: number;
                        totalScore: number;
                        /** Format: date-time */
                        updatedAt: string;
                        version: number;
                        winRate: number;
                        xp: number;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description VALIDATION_FAILED, PROFILE_VERSION_REQUIRED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_FIELD_READ_ONLY */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_VERSION_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PAYLOAD_TOO_LARGE */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_LIMIT_EXCEEDED, PROFILE_SCHEMA_VIOLATION */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    avatar?: string | null;
                    country?: string | null;
                    locale?: string;
                    name?: string;
                } & {
                    [key: string]: unknown;
                };
            };
        };
        responses: {
            /** @description Profile */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        coins: number;
                        country: string | null;
                        /** Format: date-time */
                        createdAt: string;
                        friendsCount: number;
                        gamesPlayed: number;
                        gamesWon: number;
                        gid: number;
                        highestScore: number;
                        level: number;
                        locale: string;
                        name: string;
                        /** @enum {string} */
                        nameModeration: "none" | "pending" | "approved" | "rejected";
                        referralCode: string;
                        score: number;
                        totalScore: number;
                        /** Format: date-time */
                        updatedAt: string;
                        version: number;
                        winRate: number;
                        xp: number;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_FIELD_READ_ONLY */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_VERSION_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PAYLOAD_TOO_LARGE */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_LIMIT_EXCEEDED, PROFILE_SCHEMA_VIOLATION */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_field: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                path: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Value at the path (null when absent) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        path: string;
                        value: unknown;
                        version: number;
                    };
                };
            };
            /** @description PROFILE_PATH_INVALID */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_setField: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                path: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    value: unknown;
                };
            };
        };
        responses: {
            /** @description Written value */
            200: {
                headers: {
                    /** @description Quoted document version: "<version>" */
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        path: string;
                        /** Format: date-time */
                        updatedAt: string;
                        value: unknown;
                        version: number;
                    };
                };
            };
            /** @description VALIDATION_FAILED, PROFILE_PATH_INVALID */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_FIELD_READ_ONLY */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_VERSION_CONFLICT */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PAYLOAD_TOO_LARGE */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description PROFILE_LIMIT_EXCEEDED, PROFILE_SCHEMA_VIOLATION */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_summary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own summary */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        avatar: string | null;
                        gid: number;
                        level: number;
                        name: string;
                        score: number;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
    ProfileClientController_query: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    gids: number[];
                };
            };
        };
        responses: {
            /** @description Found public profiles */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Found gids of the token appId only, order not guaranteed */
                        items: ({
                            avatar: string | null;
                            country: string | null;
                            friendsCount: number;
                            gamesPlayed: number;
                            gamesWon: number;
                            gid: number;
                            highestScore: number;
                            level: number;
                            locale: string;
                            name: string;
                            referralCode: string;
                            score: number;
                            totalScore: number;
                            /** Format: date-time */
                            updatedAt: string;
                            winRate: number;
                        } & {
                            [key: string]: unknown;
                        })[];
                    };
                };
            };
            /** @description VALIDATION_FAILED */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UNAUTHORIZED */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Seconds until the limit resets */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        code: string;
                        details: {
                            [key: string]: unknown;
                        } | null;
                        msg: string;
                        rid: string;
                    };
                };
            };
        };
    };
}
//# sourceMappingURL=profile.d.ts.map