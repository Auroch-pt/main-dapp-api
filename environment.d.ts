declare global {
    namespace NodeJS {
        interface ProcessEnv {
            HASURA_URI: string;
            NODE_ENV: "development" | "production";
            PORT?: string;
            JWT_SECRET: string;
            GITHUB_APP_ID: number;
            GITHUB_APP_PRIVATE_KEY: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
