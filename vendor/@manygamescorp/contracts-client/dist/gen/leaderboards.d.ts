export interface paths {
    "/v1/leaderboards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List leaderboard metadata and localization keys */
        get: operations["listLeaderboards"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alias scope: Page (alias of regional/global) */
        get: operations["getAliasPage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alias scope: Around (alias of regional/global) */
        get: operations["getAliasAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alias scope: MyAround (alias of regional/global) */
        get: operations["getAliasMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/clans/{clanId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clan scope: Page */
        get: operations["getClanPage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/clans/{clanId}/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clan scope: Around */
        get: operations["getClanAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/clans/{clanId}/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clan scope: MyAround */
        get: operations["getClanMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/clans/{clanId}/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clan scope: Rank */
        get: operations["getClanRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/clans/{clanId}/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clan scope: MyRank */
        get: operations["getClanMyRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alias scope: Rank (alias of regional/global) */
        get: operations["getAliasRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Alias scope: MyRank (alias of regional/global) */
        get: operations["getAliasMyRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regional scope: Page */
        get: operations["getRegionalPage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/{country}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Country scope: Page */
        get: operations["getCountryPage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/{country}/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Country scope: Around */
        get: operations["getCountryAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/{country}/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Country scope: MyAround */
        get: operations["getCountryMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/{country}/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Country scope: Rank */
        get: operations["getCountryRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/{country}/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Country scope: MyRank */
        get: operations["getCountryMyRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regional scope: Around */
        get: operations["getRegionalAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regional scope: MyAround */
        get: operations["getRegionalMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/global": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global scope: Page */
        get: operations["getGlobalPage"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/global/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global scope: Around */
        get: operations["getGlobalAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/global/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global scope: MyAround */
        get: operations["getGlobalMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/global/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global scope: Rank */
        get: operations["getGlobalRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/global/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global scope: MyRank */
        get: operations["getGlobalMyRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regional scope: Rank */
        get: operations["getRegionalRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/regional/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Regional scope: MyRank */
        get: operations["getRegionalMyRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/{leaderboardKey}/scores/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Write the caller's score (D7 clientAuthoritative application, leaderboard without sources)
         * @description Optional `Idempotency-Key` header: UUID v4/v7, canonical lower case (E58); required when the leaderboard sets integrity.requireIdempotencyKey. Without the application clientAuthoritative flag, or for a leaderboard with sources, the route is a plain 404.
         */
        post: operations["submitMyScore"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/boards/{boardId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Board page by boardId */
        get: operations["getBoard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/boards/{boardId}/around/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Entries around another member (read only) */
        get: operations["getAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/boards/{boardId}/around/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Entries around the caller */
        get: operations["getMyAround"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/boards/{boardId}/ranks/{target}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Another member's rank on the board (read only) */
        get: operations["getRank"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/leaderboards/boards/{boardId}/ranks/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** The caller's rank on the board */
        get: operations["getMyRank"];
        put?: never;
        post?: never;
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
    listLeaderboards: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from this listing; 1..128 characters, ordered by leaderboardKey. */
                cursor?: string;
                /** @description Maximum definitions per page: canonical decimal 1..100; default 20. */
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Leaderboard definitions of the authenticated application, including disabled, scheduled and ended definitions. */
                        items: {
                            /** @description Whether the leaderboard accepts results when its time window is active. */
                            enabled: boolean;
                            /** @description End of the leaderboard as ISO-8601 UTC; null means no end bound. */
                            endsAt: string | null;
                            /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                            leaderboardKey: string;
                            /** @description Scopes supported by this leaderboard: regional and/or clan. */
                            scopes: ("regional" | "clan")[];
                            /** @description Start of the leaderboard as ISO-8601 UTC; null means no start bound. */
                            startsAt: string | null;
                            /**
                             * @description Time-window status: scheduled, active or ended; independent of enabled.
                             * @enum {string}
                             */
                            status: "scheduled" | "active" | "ended";
                            /** @description Localization key returned unchanged; the SDK translates it using localization and displays this value if missing. */
                            title: string;
                        }[];
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED: invalid limit, cursor or unknown query parameter */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAliasPage: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAliasAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAliasMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClanPage: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Clan identifier; clan reads are currently unavailable and return LEADERBOARDS_SCOPE_INVALID. */
                clanId: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClanAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Clan identifier; clan reads are currently unavailable and return LEADERBOARDS_SCOPE_INVALID. */
                clanId: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClanMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Clan identifier; clan reads are currently unavailable and return LEADERBOARDS_SCOPE_INVALID. */
                clanId: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClanRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Clan identifier; clan reads are currently unavailable and return LEADERBOARDS_SCOPE_INVALID. */
                clanId: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getClanMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Clan identifier; clan reads are currently unavailable and return LEADERBOARDS_SCOPE_INVALID. */
                clanId: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAliasRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAliasMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRegionalPage: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCountryPage: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Country code: ISO 3166-1 alpha-2, two ASCII letters; global selects the global board. */
                country: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCountryAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Country code: ISO 3166-1 alpha-2, two ASCII letters; global selects the global board. */
                country: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCountryMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Country code: ISO 3166-1 alpha-2, two ASCII letters; global selects the global board. */
                country: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCountryRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Country code: ISO 3166-1 alpha-2, two ASCII letters; global selects the global board. */
                country: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCountryMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Country code: ISO 3166-1 alpha-2, two ASCII letters; global selects the global board. */
                country: string;
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRegionalAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRegionalMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getGlobalPage: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getGlobalAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getGlobalMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getGlobalRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getGlobalMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRegionalRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRegionalMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID (including clan until LBS-30) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: board unavailable after concurrent deletion */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UPSTREAM_UNAVAILABLE */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    submitMyScore: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                leaderboardKey: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Stable result identifier: 1–128 printable ASCII characters without spaces (0x21–0x7e); reuse for a retry. */
                    eventId: string;
                    /**
                     * Format: date-time
                     * @description Time of the game result as ISO-8601 UTC timestamp.
                     */
                    occurredAt: string;
                    /** @description Integer score change in leaderboard units; supply exactly one of scoreDelta and scoreValue. */
                    scoreDelta?: number;
                    /** @description Integer absolute score in leaderboard units; supply exactly one of scoreDelta and scoreValue; use scoreValue for best mode. */
                    scoreValue?: number;
                };
            };
        };
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    /** @description true on a replay of the same key */
                    "Idempotency-Replayed"?: "true";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Per-board outcomes for the submitted result; inspect every entry for an error. */
                        boards: {
                            /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                            boardId: string;
                            /** @description True when eventId was already processed for this board. */
                            deduplicated?: boolean;
                            /** @description Error for this board; other board outcomes may be successful. */
                            error?: {
                                /** @description Machine-readable error code; see the client error catalog. */
                                code: string;
                            };
                            /** @description One-based position on the board; null means the player has no score. */
                            rank?: number | null;
                            /**
                             * @description Board scope: regional or clan.
                             * @enum {string}
                             */
                            scope: "regional" | "clan";
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score?: number;
                            /** @description True when this submission changed the stored score. */
                            updated?: boolean;
                            /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                            value: string;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED, INVALID_SCORE_VALUE, INVALID_EVENT_ID, INVALID_REQUEST_ID, CLIENT_TS_SKEW, INVALID_LEADERBOARD_KEY, LEADERBOARDS_SCOPE_INVALID */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description NOT_FOUND: non-D7 application or leaderboard with sources */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description IDEMPOTENCY_KEY_CONFLICT: the same Idempotency-Key with another body; LEADERBOARD_NOT_STARTED: occurredAt before startsAt */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description PAYLOAD_TOO_LARGE: JSON body exceeds the HTTP parser limit */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_POLICY_VIOLATION */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    /** @description Positive whole seconds until retry */
                    "Retry-After"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getBoard: {
        parameters: {
            query?: {
                /** @description Opaque nextCursor from the preceding response, 1–256 characters; keep the same board and order. */
                cursor?: string;
                /** @description Maximum entries per page; bounds and default are supplied by deployment configuration and exposed in this schema. */
                limit?: number;
                /** @description Entry order: desc or asc; default desc. */
                order?: "desc" | "asc";
            };
            header?: never;
            path: {
                /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                boardId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description End of the board: the leaderboard endsAt as ISO-8601 UTC timestamp; null means no end. */
                        expiresAt: string | null;
                        /** @description Entries in this page; empty array for an empty board. */
                        items: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Leaderboard key: 1–64 lowercase ASCII letters, digits, underscores or hyphens; boards, definitions, presets, source-catalog, scores, init and me are reserved. */
                        leaderboardKey: string;
                        /** @description Current player rank and score; both null when the player has no score. */
                        me: {
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number | null;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number | null;
                        };
                        /** @description Opaque cursor for the next page; null means there is no next page. */
                        nextCursor: string | null;
                        /**
                         * @description Entry order: desc or asc; default desc.
                         * @enum {string}
                         */
                        order: "desc" | "asc";
                        /**
                         * @description Board scope: regional or clan.
                         * @enum {string}
                         */
                        scope: "regional" | "clan";
                        /** @description Response timestamp as ISO-8601 UTC. */
                        serverTime: string;
                        /** @description Total number of players with a score on this board; nonnegative integer. */
                        total: number;
                        /** @description Scope value: global or lowercase ISO country code for regional; clan identifier for clan. */
                        value: string;
                    };
                };
            };
            /** @description VALIDATION_FAILED: path or query outside the schema, unknown parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: no such board in the application of the JWT */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED: the board is past expiresAt */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                boardId: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED: path or query outside the schema, unknown parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: no such board in the application of the JWT */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED: the board is past expiresAt */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getMyAround: {
        parameters: {
            query?: {
                /** @description Maximum entries above the selected player; bounds and default are exposed in this schema. */
                above?: number;
                /** @description Maximum entries below the selected player; bounds and default are exposed in this schema. */
                below?: number;
            };
            header?: never;
            path: {
                /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                boardId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Entries around the selected player; empty array when the player has no score. */
                        entries: {
                            /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                            gid: number;
                            /** @description One-based position on the board; null means the player has no score. */
                            rank: number;
                            /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                            score: number;
                        }[];
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED: path or query outside the schema, unknown parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: no such board in the application of the JWT */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED: the board is past expiresAt */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                boardId: string;
                /** @description Player gid as a canonical positive decimal integer, at most 9007199254740991; no leading zeros or encoded spelling. */
                target: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED: path or query outside the schema, unknown parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: no such board in the application of the JWT */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED: the board is past expiresAt */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getMyRank: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                boardId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Response 200 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description Board identifier: RFC UUID, obtained from the application board catalog or a board response. */
                        boardId: string;
                        /** @description Player identifier: positive safe integer, at most 9007199254740991. */
                        gid: number;
                        /** @description One-based position on the board; null means the player has no score. */
                        rank: number | null;
                        /** @description Integer score in the units defined by the leaderboard; null means the player has no score. */
                        score: number | null;
                    };
                };
            };
            /** @description VALIDATION_FAILED: path or query outside the schema, unknown parameters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description UNAUTHORIZED: no or invalid player JWT */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARD_NOT_FOUND: no such board in the application of the JWT */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description LEADERBOARDS_BOARD_EXPIRED: the board is past expiresAt */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description RATE_LIMITED */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
//# sourceMappingURL=leaderboards.d.ts.map