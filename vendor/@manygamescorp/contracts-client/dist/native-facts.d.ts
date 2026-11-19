/** Configs-owned ISO 3166-1 alpha-2 country domain, uppercase only. */
export declare const COUNTRY_CODES: readonly string[];
/** Filter keys include `$`; catalog/FactRegistry names do not. Data only: kit owns evaluation. */
export declare const NATIVE_FACT_PARAMETERS: Readonly<{
    $v: Readonly<{
        readonly type: "version";
    }>;
    '$app.version': Readonly<{
        readonly type: "version";
    }>;
    '$account.registeredAt': Readonly<{
        readonly type: "date";
    }>;
    '$account.lastLoginAt': Readonly<{
        readonly type: "date";
    }>;
    $country: Readonly<{
        readonly type: "enum";
        readonly values: readonly string[];
    }>;
    $os: Readonly<{
        readonly type: "enum";
        readonly values: readonly string[];
    }>;
    '$device.os': Readonly<{
        readonly type: "string";
    }>;
}>;
//# sourceMappingURL=native-facts.d.ts.map