
const path = require('path');
const ngrok = require('ngrok');
const express = require('express');
const app = express();

const defaults = Object.freeze({
    port: 9000,
    publicDir: null,
    ngrok: {
        //https://www.npmjs.com/package/ngrok#options
    },
})

const deployCRX = (opts = {}) => {
    opts = Object.assign({}, defaults, opts);

    return new Promise((resolve, reject) => {
        //One endpoint for our update.xml
        app.get('/update.xml', (req, res) => {
            res.contentType('application/xml');
            res.sendFile(path.resolve(opts.publicDir, 'update.xml'));
        });

        //And one for the actual crx
        app.get('/extension', (req, res) => {
            res.setHeader('content-type', 'application/x-chrome-extension');
            res.sendFile(path.resolve(opts.publicDir, 'extension.crx'));
        });

        const server = app.listen(opts.port, async () => {
            try {

                const url = await ngrok.connect({ ...opts.ngrok, port: opts.port });

                //Generate a function to stop both express and ngrok
                const stop = () => {
                    return new Promise((resolve, reject) => {
                        server.close(async () => {
                            await ngrok.disconnect();
                            await ngrok.kill();
                            resolve();
                        });
                    
                    })
                }

                resolve([url, stop]);
            } catch (error){
                console.warn(error);
                reject(error);
            }
        });
    });
}

module.exports = deployCRX;