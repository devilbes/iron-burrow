export interface paths {
    "/v1": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Client plane smoke route (not a business endpoint). */
        get: operations["status"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm the code: upgrade the guest, or switch / log in to the found account.
         * @description Public. `code` is six digits; old SDKs may send it as a number (left-padded to six). A repeat after success is `AUTH_CODE_INVALID` (the code is burnt). No session is revoked (E28). After a signin with `linkTicket` the ticket is used up first, then the provider is linked to the found account, or the guest/new account is created with the email and the link at once (`linked[]`, ID-R-43). Optional audience=portal returns a 30-day account JWT (aud portal, no gid) after the same account proof; no Origin binding.
         */
        post: operations["authCode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/init": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Guest, re-entry, grace reissue, device restore or social login (ID-R-07).
         * @description Public. `appId` is the numeric application id from the game `platform.json`: the game token is issued for it with no application lookup, and a `tk` is exchanged only for its own `appId`. A repeat with the same `did`/`deviceKey`/`tk` answers the same `uid`/`gid`. `aid` is accepted and ignored (ID-R-08); `et` and `pr` go together.
         */
        post: operations["authInit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Delete the current session (`sid` of the token); other sessions live (E28).
         * @description Optional deviceKey deactivates this account on this installation in the token app. Repeating it answers 200. Token exchange remains allowed (D-NOREVOKE).
         */
        post: operations["authLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/me/links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Link a provider to the current account (ID-R-31).
         * @description Re-linking the same identity answers 200 again, so a retry is safe.
         */
        post: operations["authLinkProvider"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/me/links/{provider}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Unlink a provider from the current account (ID-R-31). */
        delete: operations["authUnlinkProvider"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oauth/attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["facebookOAuthAttempt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oauth/callback/facebook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["facebookOAuthCallback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oauth/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["facebookOAuthComplete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oauth/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Public client ids of the enabled login providers (ID-R-06).
         * @description Public, no parameters. A disabled provider is absent; a platform without a configured id is absent. Only public identifiers.
         */
        get: operations["authOAuthConfig"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/oauth/start/{attemptId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["facebookOAuthStart"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/portal/exchange": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange a reusable portal account token for an app-scoped game JWT.
         * @description The body idToken must be a valid account JWT (aud portal, no gid) with a live parent session; `appId` (from the game `platform.json`) is the scope of the issued game JWT, with no application lookup. No Origin binding. Repeated exchange reuses the app-scoped profile. Responses use Cache-Control: no-store; rate limits include Retry-After.
         */
        post: operations["authPortalExchange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/portal/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke the portal parent session.
         * @description Accepts a portal Bearer token without Origin binding. Prevents later ID verification, renewal and exchanges. Downstream offline JWT verifiers retain validity until expiry. Responses use Cache-Control: no-store.
         */
        post: operations["authPortalLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/signin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a sign-in code to an email (phone while `ID_PHONE_ENABLED`).
         * @description Public; notifications delivery requires a valid `tk` of this app. Exactly one of `email` and `phone`; `email` is normalized with trim + lower case. Optional Idempotency-Key (UUID) replays the same response for 24 hours without another mail order. `linkTicket` (from `init` `emailRequired`) goes with `email` and the `did` it was issued to; it is checked before any mail and stays usable for resends until the code confirms it (ID-R-43).
         */
        post: operations["authSignin"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/devices/me/push": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Register or remove a push token for this device in the authenticated app.
         * @description deviceKey proves the installation; token=null removes its push token. A LoginSession is optional. Other apps and accounts are unaffected.
         */
        put: operations["registerMyPushDevice"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/games": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Published active games; no test, disabled or archived apps. Cursor pages cover the whole catalog. */
        get: operations["getPublicGames"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/account": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Global account nickname, full email and sign-in methods. Private; no email mutation. */
        get: operations["getMyAccount"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Replace both privacy preferences of the authenticated account. No other account selector. */
        patch: operations["updateMyAccount"];
        trace?: never;
    };
    "/v1/me/account/nickname": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change the global nickname once; identical repeats return the stored result. */
        post: operations["changeMyNickname"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/account/nickname/availability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read-only check whether a nickname is free for this account, with up to 3 free variants when taken.
         * @description Never changes the nickname or spends nicknameChangesRemaining. The account's own nickname (any casing) is available; another owner is never revealed. Not a reservation: a later change can still answer ACCOUNT_NICKNAME_TAKEN.
         */
        get: operations["checkMyNicknameAvailability"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/account/nickname/suggestion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate a currently free nickname (not a reservation). */
        post: operations["suggestMyNickname"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/games": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * All published active games, marked with the authenticated account membership.
         * @description The account's profiles first (lastLoginAt DESC), then every other published game by the last complete month MAU (DESC, then appId ASC); MAU itself is not returned. Default limit 10. `nextCursor` is opaque and freezes this order for 24 hours: pages never repeat a game; an expired or altered cursor is VALIDATION_FAILED (start again without it).
         */
        get: operations["getMyGames"];
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
    schemas: {
        AuthCodeRequest: {
            appId: number;
            /** @enum {string} */
            audience?: "portal";
            code: string;
            /** @default 3 */
            os?: 1 | 2 | 3;
            /** Format: uuid */
            rid: string;
            tk?: string;
        };
        /** @description Confirmed code: upgrade, switch or login (spec §4.2). */
        AuthCodeResponse: {
            account: {
                /** @description Recorded app login, Unix seconds; 24h write throttle. */
                lastLoginAt: number;
                /** @description Game profile registration, Unix seconds. */
                registeredAt: number;
            };
            /** @enum {boolean} */
            an: false;
            /** @description Token expiry, unix seconds (kept for old SDKs). */
            at: number;
            /** @description The found account already had a profile in this app (ID-R-19). */
            conflict: boolean;
            /**
             * Format: date-time
             * @description Token expiry, ISO-8601 UTC.
             */
            expiresAt: string;
            /** @description Country (ISO 3166-1 alpha-2) from the trusted ingress, else the account country; `""` if unknown. */
            geo: string;
            /** @description Country (ISO 3166-1 alpha-2) at registration in this app (profile `regCountry`, never changes); `""` if unknown. */
            geoReg: string;
            /** @description Game profile id in this app. */
            gid: number;
            guestGid: number | null;
            /** @description Game JWT, or a 30-day account JWT (aud portal, no gid) when requested. */
            jwt: string;
            /** @description Only after a signin with `linkTicket` (ID-R-43): the provider now linked to the account. */
            linked?: components["schemas"]["LinkProvider"][];
            /** @description `null` until attribution is connected. */
            mc: string | null;
            migrated: boolean;
            /** @description `null` until attribution is connected. */
            ms: string | null;
            /**
             * Format: date-time
             * @description Account registration time, ISO-8601 UTC.
             */
            reg: string;
            targetGid: number | null;
            /** @description Account id. */
            uid: number;
            /** @enum {string} */
            upgradeType: "upgrade" | "migrate" | "switch" | "login";
        };
        AuthInitRequest: {
            aid?: string;
            appId: number;
            deviceKey?: string;
            did: string;
            et?: string;
            ln: string;
            nonce?: string;
            os: 1 | 2 | 3;
            /** @enum {string} */
            pr?: "google" | "apple" | "facebook";
            tk?: string;
        };
        /** @description Signed-in session (ID-R-07…13, ID-R-27…30). */
        AuthInitResponse: {
            account: {
                /** @description Recorded app login, Unix seconds; 24h write throttle. */
                lastLoginAt: number;
                /** @description Game profile registration, Unix seconds. */
                registeredAt: number;
            };
            /** @description True while the account is anonymous (guest). */
            an: boolean;
            /** @description Token expiry, unix seconds (kept for old SDKs). */
            at: number;
            /**
             * @description Social login only: the provider account already had a profile in this app (ID-R-19).
             * @enum {boolean}
             */
            conflict?: true;
            /** @description Issued only when a guest is created or moved off the legacy `did` login (ID-R-10, ID-R-12). */
            deviceKey?: string;
            /**
             * Format: date-time
             * @description Token expiry, ISO-8601 UTC.
             */
            expiresAt: string;
            /** @description Country (ISO 3166-1 alpha-2) from the trusted ingress, else the account country; `""` if unknown. */
            geo: string;
            /** @description Country (ISO 3166-1 alpha-2) at registration in this app (profile `regCountry`, never changes); `""` if unknown. */
            geoReg: string;
            /** @description Game profile id in this app. */
            gid: number;
            /** @description With `conflict`: the guest profile, kept with the guest uid. */
            guestGid?: number;
            /** @description Game JWT (EdDSA); send as `Authorization: Bearer`. */
            jwt: string;
            /** @description `null` until attribution is connected. */
            mc: string | null;
            /** @description `null` until attribution is connected. */
            ms: string | null;
            /**
             * Format: date-time
             * @description Account registration time, ISO-8601 UTC.
             */
            reg: string;
            /**
             * @description How the account was found (SDK telemetry).
             * @enum {string}
             */
            restoredBy: "social" | "token" | "grace" | "device_key" | "device_id" | "new_guest";
            /** @description With `conflict`: the profile signed in to. */
            targetGid?: number;
            /** @description Account id. */
            uid: number;
        };
        AuthInitResult: components["schemas"]["AuthInitResponse"] | components["schemas"]["EmailRequiredResponse"];
        AuthSigninRequest: {
            appId: number;
            child?: boolean;
            did?: string;
            email?: string;
            linkTicket?: string;
            ln: string;
            os: 1 | 2 | 3;
            phone?: string;
            tk?: string;
        };
        /** @description Same answer whether or not an account owns the contact (no enumeration). */
        AuthSigninResponse: {
            /**
             * Format: date-time
             * @description Code expiry, ISO-8601 UTC.
             */
            expiresAt: string;
            /**
             * Format: uuid
             * @description Code request id; pass it to `POST /v1/auth/code`.
             */
            rid: string;
        };
        ChangeNicknameRequest: {
            nickname: string;
        };
        /** @description Social login with no link and no provider-verified email (ID-R-43): nothing was written, no token; the current session stays. */
        EmailRequiredResponse: {
            /** @enum {boolean} */
            emailRequired: true;
            /** @description Opaque, one-time, 15 minutes; bound to the app, the provider identity and this `did`. Pass it with `email` and `did` to `POST /v1/auth/signin`. */
            linkTicket: string;
            provider: components["schemas"]["LinkProvider"];
        };
        ErrorBody: {
            code: string;
            details: {
                [key: string]: unknown;
            } | null;
            msg: string;
            rid: string;
        };
        FacebookAttemptRequest: {
            /** @enum {string} */
            mode: "signin" | "link";
            /** @enum {string} */
            provider: "facebook";
            redirectUri?: string;
        };
        FacebookAttemptResponse: {
            attemptId: string;
            /** Format: uri */
            authorizationUrl: string;
            /** Format: date-time */
            expiresAt: string;
            /** @enum {string} */
            provider: "facebook";
            /** Format: uri */
            redirectUri: string;
        };
        FacebookCallbackResponse: Record<string, never>;
        FacebookCompleteRequest: {
            attemptId: string;
        };
        FacebookCompleteResponse: components["schemas"]["AuthInitResponse"] | components["schemas"]["LinksResponse"] | {
            /** @enum {boolean} */
            pending: true;
        };
        /** @enum {string} */
        LinkProvider: "google" | "apple" | "facebook";
        LinkRequest: {
            et: string;
            nonce?: string;
            /** @enum {string} */
            pr: "google" | "apple" | "facebook";
        };
        /** @description Providers linked to the current account. */
        LinksResponse: {
            /** @description True while no email, phone or provider is left. */
            an: boolean;
            providers: components["schemas"]["LinkProvider"][];
        };
        LogoutRequest: {
            deviceKey?: string;
        };
        /** @description Always `{}`. */
        LogoutResponse: Record<string, never>;
        MyAccountResponse: {
            crossFeatures: boolean;
            email: string | null;
            nickname: string;
            nicknameChangesRemaining: number;
            privacy: {
                friendRequests: boolean;
                showOnline: boolean;
            };
            signInMethods: ("email" | "phone" | "google" | "apple" | "facebook")[];
        };
        MyGamesResponse: {
            items: {
                appId: number;
                /** Format: date-time */
                firstLoginAt: string | null;
                gid: number | null;
                iconKey: string | null;
                /** Format: date-time */
                lastLoginAt: string | null;
                links: {
                    /** Format: uri */
                    appStore: string | null;
                    /** Format: uri */
                    googlePlay: string | null;
                    /** Format: uri */
                    web: string | null;
                };
                name: string;
                playing: boolean;
                /** @enum {string} */
                status: "active";
            }[];
            nextCursor: string | null;
        };
        NicknameAvailabilityResponse: {
            available: boolean;
            nickname: string;
            suggestions: string[];
        };
        NicknameResponse: {
            nickname: string;
            nicknameChangesRemaining: number;
        };
        NicknameSuggestionResponse: {
            nickname: string;
        };
        /** @description Public client ids of the enabled login providers (global for the installation); no secrets. */
        OAuthConfigResponse: {
            apple?: {
                serviceId?: string;
            };
            facebook?: {
                appId: string;
            };
            google?: {
                clientIds: {
                    android?: string;
                    ios?: string;
                    web?: string;
                };
            };
        };
        PortalExchangeRequest: {
            appId: number;
            did: string;
            idToken: string;
            ln: string;
        };
        PortalExchangeResponse: {
            /** @enum {boolean} */
            an: false;
            deviceKey: string;
            /**
             * Format: date-time
             * @description Token expiry, ISO-8601 UTC.
             */
            expiresAt: string;
            /** @description Country (ISO 3166-1 alpha-2) from the trusted ingress, else the account country; `""` if unknown. */
            geo: string;
            /** @description Game profile id in this app. */
            gid: number;
            /** @description Game JWT (EdDSA); send as `Authorization: Bearer`. */
            jwt: string;
            /** @enum {string} */
            restoredBy: "portal";
            /** @description Account id. */
            uid: number;
        };
        PrivacyResponse: {
            privacy: {
                friendRequests: boolean;
                showOnline: boolean;
            };
        };
        PublicGamesResponse: {
            items: {
                appId: number;
                iconKey: string | null;
                links: {
                    /** Format: uri */
                    appStore: string | null;
                    /** Format: uri */
                    googlePlay: string | null;
                    /** Format: uri */
                    web: string | null;
                };
                name: string;
                /** @enum {string} */
                status: "active";
            }[];
            nextCursor: string | null;
        };
        PushRegistrationRequest: {
            appVersion?: string;
            deviceKey: string;
            locale?: string;
            /** @enum {string} */
            permission: "granted" | "denied";
            /** @enum {string} */
            platform: "ios" | "android" | "web";
            /** @enum {string} */
            provider: "fcm" | "apns";
            timezone?: string;
            token: string | null;
        };
        StatusResponse: {
            /** @enum {string} */
            plane: "client";
            /** @enum {string} */
            service: "id";
        };
        UpdateAccountRequest: {
            privacy: {
                friendRequests: boolean;
                showOnline: boolean;
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
    status: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatusResponse"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authCode: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthCodeRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthCodeResponse"];
                };
            };
            /** @description `VALIDATION_FAILED`, `AUTH_CODE_INVALID`, `AUTH_CODE_EXPIRED`, `AUTH_CODE_ATTEMPTS_EXCEEDED`, `AUTH_LINK_TICKET_INVALID`, `AUTH_LINK_TICKET_EXPIRED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_CONTACT_CONFLICT`, `AUTH_LINK_CONFLICT` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_CONTACT_CONFLICT",
                     *       "details": null,
                     *       "msg": "AUTH_CONTACT_CONFLICT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authInit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthInitRequest"];
            };
        };
        responses: {
            /** @description Signed in, or `emailRequired` for a social login without a link and a verified email. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthInitResult"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED`, `AUTH_PROVIDER_TOKEN_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authLogout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["LogoutRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authLinkProvider: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LinkRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LinksResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED`, `AUTH_PROVIDER_TOKEN_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_EMAIL_UNVERIFIED` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_EMAIL_UNVERIFIED",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_EMAIL_UNVERIFIED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_LINK_CONFLICT` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_LINK_CONFLICT",
                     *       "details": null,
                     *       "msg": "AUTH_LINK_CONFLICT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authUnlinkProvider: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                provider: components["schemas"]["LinkProvider"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LinksResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_LAST_SIGNIN_METHOD` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_LAST_SIGNIN_METHOD",
                     *       "details": null,
                     *       "msg": "AUTH_LAST_SIGNIN_METHOD",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    facebookOAuthAttempt: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FacebookAttemptRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FacebookAttemptResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `IDEMPOTENCY_KEY_CONFLICT`, `IDEMPOTENCY_IN_PROGRESS` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "details": null,
                     *       "msg": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    facebookOAuthCallback: {
        parameters: {
            query: {
                code?: string;
                error?: string;
                error_description?: string;
                error_reason?: string;
                state: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FacebookCallbackResponse"];
                };
            };
            /** @description `AUTH_PROVIDER_TOKEN_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_TOKEN_INVALID",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_TOKEN_INVALID",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    facebookOAuthComplete: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FacebookCompleteRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FacebookCompleteResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED`, `AUTH_PROVIDER_TOKEN_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_EMAIL_UNVERIFIED` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_EMAIL_UNVERIFIED",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_EMAIL_UNVERIFIED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `IDEMPOTENCY_KEY_CONFLICT`, `AUTH_LINK_CONFLICT` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "details": null,
                     *       "msg": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_PROVIDER_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authOAuthConfig: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OAuthConfigResponse"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    facebookOAuthStart: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                attemptId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Browser-bound redirect to Facebook; HttpOnly Secure SameSite=Lax cookie. */
            302: {
                headers: {
                    Location?: string;
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authPortalExchange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PortalExchangeRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PortalExchangeResponse"];
                };
            };
            /** @description `BAD_REQUEST` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "BAD_REQUEST",
                     *       "details": null,
                     *       "msg": "BAD_REQUEST",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_INVALID",
                     *       "details": null,
                     *       "msg": "AUTH_INVALID",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `ACCOUNT_DEVICE_LIMIT` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "ACCOUNT_DEVICE_LIMIT",
                     *       "details": null,
                     *       "msg": "ACCOUNT_DEVICE_LIMIT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authPortalLogout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponse"];
                };
            };
            /** @description `AUTH_INVALID` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_INVALID",
                     *       "details": null,
                     *       "msg": "AUTH_INVALID",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    authSignin: {
        parameters: {
            query?: never;
            header?: {
                "Idempotency-Key"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AuthSigninRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSigninResponse"];
                };
            };
            /** @description `VALIDATION_FAILED`, `AUTH_PHONE_DISABLED`, `AUTH_LINK_TICKET_INVALID`, `AUTH_LINK_TICKET_EXPIRED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `IDEMPOTENCY_KEY_CONFLICT`, `IDEMPOTENCY_IN_PROGRESS` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "details": null,
                     *       "msg": "IDEMPOTENCY_KEY_CONFLICT",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `AUTH_DELIVERY_UNAVAILABLE`, `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "AUTH_DELIVERY_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "AUTH_DELIVERY_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    registerMyPushDevice: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PushRegistrationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LogoutResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `FORBIDDEN` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "FORBIDDEN",
                     *       "details": null,
                     *       "msg": "FORBIDDEN",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    getPublicGames: {
        parameters: {
            query?: {
                after?: string;
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicGamesResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    getMyAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MyAccountResponse"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    updateMyAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateAccountRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    changeMyNickname: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeNicknameRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NicknameResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `ACCOUNT_NICKNAME_TAKEN`, `ACCOUNT_NICKNAME_LIMIT` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "ACCOUNT_NICKNAME_TAKEN",
                     *       "details": null,
                     *       "msg": "ACCOUNT_NICKNAME_TAKEN",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    checkMyNicknameAvailability: {
        parameters: {
            query: {
                nickname: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NicknameAvailabilityResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    suggestMyNickname: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NicknameSuggestionResponse"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `RATE_LIMITED` */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "RATE_LIMITED",
                     *       "details": null,
                     *       "msg": "RATE_LIMITED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
    getMyGames: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MyGamesResponse"];
                };
            };
            /** @description `VALIDATION_FAILED` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "VALIDATION_FAILED",
                     *       "details": null,
                     *       "msg": "VALIDATION_FAILED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UNAUTHORIZED` */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UNAUTHORIZED",
                     *       "details": null,
                     *       "msg": "UNAUTHORIZED",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `NOT_FOUND` */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "NOT_FOUND",
                     *       "details": null,
                     *       "msg": "NOT_FOUND",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `INTERNAL` */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "INTERNAL",
                     *       "details": null,
                     *       "msg": "INTERNAL",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
            /** @description `UPSTREAM_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "UPSTREAM_UNAVAILABLE",
                     *       "details": null,
                     *       "msg": "UPSTREAM_UNAVAILABLE",
                     *       "rid": "req-example-001"
                     *     }
                     */
                    "application/json": components["schemas"]["ErrorBody"];
                };
            };
        };
    };
}
//# sourceMappingURL=id.d.ts.map