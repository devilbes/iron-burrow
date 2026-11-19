/** JSON Schema resource is also published as ./platform.schema.json. */
export declare const PLATFORM_CONFIG_SCHEMA: {
    $schema: string;
    title: string;
    description: string;
    type: string;
    additionalProperties: boolean;
    required: string[];
    properties: {
        schemaVersion: {
            const: number;
            description: string;
        };
        appId: {
            type: string;
            minimum: number;
            maximum: number;
            description: string;
        };
        store: {
            type: string;
            description: string;
            pattern: string;
        };
        environment: {
            enum: string[];
            description: string;
        };
        endpoints: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                api: {
                    type: string;
                    format: string;
                    maxLength: number;
                    pattern: string;
                    description: string;
                };
                realtime: {
                    type: string;
                    format: string;
                    maxLength: number;
                    pattern: string;
                    description: string;
                };
            };
            description: string;
        };
        cdn: {
            type: string;
            format: string;
            maxLength: number;
            pattern: string;
            description: string;
        };
        platform: {
            enum: string[];
            description: string;
        };
        orientation: {
            enum: string[];
            description: string;
        };
        sdk: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                package: {
                    $ref: string;
                    description: string;
                };
                version: {
                    $ref: string;
                    description: string;
                };
                adapter: {
                    $ref: string;
                    description: string;
                };
                modules: {
                    type: string;
                    items: {
                        $ref: string;
                    };
                    description: string;
                };
                modulesRevision: {
                    type: string;
                    minimum: number;
                    description: string;
                };
                overrides: {
                    type: string;
                    additionalProperties: boolean;
                    required: string[];
                    properties: {
                        scope: {
                            const: string;
                        };
                    };
                };
            };
            description: string;
        };
        uiKit: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                package: {
                    $ref: string;
                    description: string;
                };
                version: {
                    $ref: string;
                    description: string;
                };
                skin: {
                    $ref: string;
                    description: string;
                };
            };
            description: string;
        };
        buildKit: {
            $ref: string;
            description: string;
        };
        loginProviders: {
            $ref: string;
            description: string;
        };
        moduleConfig: {
            type: string;
            maxProperties: number;
            additionalProperties: boolean;
            description: string;
        };
        assets: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                cdnBase: {
                    type: string;
                    format: string;
                    maxLength: number;
                    pattern: string;
                    description: string;
                };
                allowedHosts: {
                    type: string;
                    maxItems: number;
                    items: {
                        type: string;
                        maxLength: number;
                        pattern: string;
                    };
                    description: string;
                };
            };
        };
        android: {
            $ref: string;
            description: string;
        };
        clientAuthoritative: {
            type: string;
            description: string;
        };
        gameType: {
            enum: string[];
            description: string;
        };
    };
    $defs: {
        buildFields: {
            required: string[];
        };
        packageName: {
            type: string;
            minLength: number;
            pattern: string;
            description: string;
        };
        exactVersion: {
            type: string;
            description: string;
            pattern: string;
        };
        packageVersion: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                package: {
                    $ref: string;
                    description: string;
                };
                version: {
                    $ref: string;
                    description: string;
                };
            };
            description: string;
        };
        module: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    type: string;
                    minLength: number;
                    description: string;
                };
                package: {
                    $ref: string;
                    description: string;
                };
                version: {
                    $ref: string;
                    description: string;
                };
                load: {
                    enum: string[];
                    description: string;
                };
                source: {
                    enum: string[];
                    description: string;
                };
                settings: {
                    type: string;
                    description: string;
                };
                onEvent: {
                    type: string;
                    maxLength: number;
                    pattern: string;
                };
                onRoute: {
                    type: string;
                    minLength: number;
                    maxLength: number;
                    pattern: string;
                };
            };
            description: string;
            oneOf: ({
                properties: {
                    load: {
                        enum: string[];
                        const?: never;
                    };
                };
                not: {
                    anyOf: {
                        required: string[];
                    }[];
                    required?: never;
                };
                required?: never;
            } | {
                properties: {
                    load: {
                        const: string;
                        enum?: never;
                    };
                };
                required: string[];
                not: {
                    required: string[];
                    anyOf?: never;
                };
            })[];
        };
        publicLoginProviders: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                version: {
                    type: string;
                    pattern: string;
                    description: string;
                };
                google: {
                    type: string;
                    additionalProperties: boolean;
                    required: string[];
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                        };
                        webClientId: {
                            type: string[];
                            minLength: number;
                            maxLength: number;
                            pattern: string;
                            description: string;
                        };
                        androidClientId: {
                            type: string[];
                            minLength: number;
                            maxLength: number;
                            pattern: string;
                            description: string;
                        };
                    };
                    description: string;
                };
                facebook: {
                    type: string;
                    additionalProperties: boolean;
                    required: string[];
                    properties: {
                        enabled: {
                            type: string;
                            description: string;
                        };
                        appId: {
                            type: string[];
                            pattern: string;
                            description: string;
                        };
                        redirectUris: {
                            type: string;
                            maxItems: number;
                            uniqueItems: boolean;
                            items: {
                                type: string;
                                maxLength: number;
                                pattern: string;
                                description: string;
                            };
                            description: string;
                        };
                    };
                    description: string;
                };
            };
            description: string;
        };
        android: {
            type: string;
            additionalProperties: boolean;
            properties: {
                minSdk: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                targetSdk: {
                    type: string;
                    minimum: number;
                    maximum: number;
                };
                plugins: {
                    type: string;
                    maxItems: number;
                    items: {
                        $ref: string;
                    };
                };
                permissions: {
                    type: string;
                    maxItems: number;
                    uniqueItems: boolean;
                    items: {
                        type: string;
                        maxLength: number;
                        pattern: string;
                    };
                };
                preferences: {
                    type: string;
                    maxProperties: number;
                    propertyNames: {
                        type: string;
                        minLength: number;
                        maxLength: number;
                        pattern: string;
                    };
                    additionalProperties: {
                        type: string;
                        maxLength: number;
                    };
                };
                defaultBuildType: {
                    enum: string[];
                };
            };
        };
        androidPlugin: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                id: {
                    $ref: string;
                };
                version: {
                    $ref: string;
                };
                source: {
                    type: string;
                    pattern: string;
                };
                variables: {
                    type: string;
                    maxProperties: number;
                    propertyNames: {
                        type: string;
                        minLength: number;
                        maxLength: number;
                        pattern: string;
                    };
                    additionalProperties: {
                        type: string;
                        maxLength: number;
                    };
                };
            };
        };
    };
    dependentSchemas: {
        schemaVersion: {
            $ref: string;
        };
        environment: {
            $ref: string;
        };
        platform: {
            $ref: string;
        };
        orientation: {
            $ref: string;
        };
        sdk: {
            $ref: string;
        };
        uiKit: {
            $ref: string;
        };
        buildKit: {
            $ref: string;
        };
    };
    not: {
        required: string[];
    };
};
export type PlatformEnvironment = 'local' | 'dev' | 'test' | 'prod';
/** Build snapshot from panel metadata; runtime availability always comes from authenticated id. */
export interface PublicLoginProviders {
    /** Version of the provider configuration. */
    readonly version: string;
    /** Google sign-in settings. */
    readonly google: {
        /** True if Google sign-in is enabled for the app. */
        readonly enabled: boolean;
        /** OAuth client id for Web; null if not set. */
        readonly webClientId: string | null;
        /** OAuth client id for Android; null if not set. */
        readonly androidClientId: string | null;
    };
    /** Facebook sign-in settings. */
    readonly facebook: {
        /** True if Facebook sign-in is enabled for the app. */
        readonly enabled: boolean;
        /** Facebook application id; null if not set. */
        readonly appId: string | null;
        /** Allowed OAuth callback URIs; pass one as `redirectUri`. */
        readonly redirectUris: readonly string[];
    };
}
export interface PlatformConfig {
    /** Required environment public app-assets base (E136), separate from module delivery cdn. */
    readonly assets: {
        readonly cdnBase: string;
        readonly allowedHosts?: readonly string[];
    };
    readonly loginProviders?: PublicLoginProviders;
    /** Data-only module settings, passed to the corresponding module context. */
    readonly moduleConfig?: Readonly<Record<string, unknown>>;
    /** Numeric application ID for initial auth and usage attribution; game JWTs authorize access. */
    readonly appId: number;
    /** Build-time D7 setting; auth responses cannot change this value. */
    readonly clientAuthoritative?: boolean;
    /** Game execution model selected when the platform build is produced. */
    readonly gameType?: 'server' | 'client' | 'offline';
    /** Store of the build: the filter fact `$store` (E96). */
    readonly store?: string;
    /** Environment of the build's API: fakes (test stores, mediators) never run in `prod`. */
    readonly environment?: PlatformEnvironment;
    readonly endpoints: {
        readonly api: string;
        readonly realtime?: string;
    };
    readonly cdn: string;
}
//# sourceMappingURL=platform-config.d.ts.map