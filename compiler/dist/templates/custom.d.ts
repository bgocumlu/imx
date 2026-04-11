export interface FeatureModule {
    name: string;
    description: string;
    requires?: string[];
    includes: string[];
    appStateCppFields: string;
    appStateCppHeaders: string[];
    appStateTsFields: string;
    callbacks: string;
    tsxWindow: string;
    extraFiles: Record<string, string>;
    dataFields?: string[];
}
export declare const FEATURES: FeatureModule[];
export declare function generateCombined(featureNames: string[], projectDir: string, projectName: string): void;
