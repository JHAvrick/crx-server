import { Request } from "express";

interface CRXServerOptions {
    port: number,
    extensionDir: string,
    publicDir: string,
    privateKey?: string,
    onRequest?: (req: Request) => void,
    ngrok?: {
        //https://www.npmjs.com/package/ngrok#options
        authtoken?: string,
        [key: string]: any
    },
}

interface CRXServerApi {
    start: (skipCRXPack: boolean) => Promise<string>,
    stop: () => Promise<void>,
    update: (version: string | 'major' | 'minor' | 'patch') => Promise<void>,
    onRequest: (callback: (req: Request) => void) => void,
    getUpdateUrl: () => string,
    getExtensionUrl: () => string,
    getExtensionId: () => string,
}

export default function CRXServer(opts: CRXServerOptions) : CRXServerApi;