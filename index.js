const packCRX = require('./src/pack-crx');
const deployCRX = require('./src/deploy-crx');

const defaults = Object.freeze({
    port: 9000,
    extensionDir: null,
    publicDir: null,
    privateKeyPath: null,
    ngrok: {
        //https://www.npmjs.com/package/ngrok#options
    },
})

/**
 * Pack a CRX and serve from a local server. Update the CRX dynamically without killing the server.
 * 
 * @param {object} opts - the options object
 * @param {string} opts.extensionDir - The directory containing the extension files
 * @param {string} opts.publicDir - The directory to output the packed CRX and `update.xml`
 * @param {string} opts.port - The port to serve the CRX on
 * @param {string} opts.ngrok - ngrok.connect() options, which can be found here: https://www.npmjs.com/package/ngrok#options
 * Note that the port option will be overridden by the port specified in the opts object.
 *  
 * @returns 
 */
const CRXServer = (opts = {}) => {
    opts = Object.assign({}, defaults, opts);

    if (!opts.extensionDir || !opts.publicDir) {
        throw new Error('You must specify an extension directory ("extensionDir") and public directory ("publicDir").');
    }

    let baseUrl = null, stop = null;
    const getUpdateUrl = () =>  `${baseUrl}/update.xml`;
    return {
        /**
         * To be called after server is already active. Calling `update()` will repack the extension and
         * create a new `update.xml` file.
         * 
         * @param {string} version - The extension version. Options are `major`, `minor`, or `patch` or any other semver string
         * to manually specify the version. If the version is left blank, the current version set in the manifest will be used.
         * Note that if the version does not change, Chrome will not pull updates for the extension when polling.
         */
        update: (version) => packCRX({ ...opts, baseUrl, version }),
        /**
         * Start the local server. This will also perform the initial packing of the CRX and create the `update.xml` file.
         * Optionally, you can pass `true` to skip the initial packing of the CRX, which you might want to do if you've 
         * already packed the CRX and just want to start the server.
         * 
         * @param {boolean} skipCRXPack - Whether to skip the initial packing of the CRX. Defaults to `false`.
         */
        start: async (skipCRXPack = false) => {
            [baseUrl, stop] = await deployCRX(opts);
            if (!skipCRXPack) {
                await packCRX({ ...opts, updateUrl: getUpdateUrl() });
            }
            return baseUrl;
        },
        /**
         * Kill the local server.
         */
        stop: () => stop?.(),
        getUpdateUrl
    }
}

module.exports = CRXServer;