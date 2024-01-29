const fs = require('fs');
const path = require('path');
const CRXServer = require('../index');
const ngrokConfig = require('./ngrok.config');
const { expect, test, afterAll } = require('@jest/globals');
const { execSync } = require("child_process");

//generate a .pem key file for our test extension
if (!fs.existsSync('./test/extension/key.pem')) {
    execSync("crx keygen ./test/extension");
}

const xmlVersionMatch = (xml, version) => {
    const regex = /<updatecheck[^>]*version='(.*?)'/;
    const xmlVersion = xml.match(regex)?.[1];
    return xmlVersion === version;
}

/**
 * Before running this test, you need to:
 *  - Generate a .pem keyfile and place it in the extension directory.
 *  - Create a `ngrok.config.js` in the test directory to pass ngrok config for this test. Don't check this file into source control.
 */
const crxServer = CRXServer({
    extensionDir: path.resolve(__dirname, 'extension'),
    publicDir: path.resolve(__dirname, 'public'),
    port: 8080,
    ngrok: ngrokConfig
});

// afterAll(() => {
//     crxServer.stop();
// });

describe('CRXServer', () => {
    test('CRXServer.start() - CRX server starts without error and endpoints are available', async () => {

        //start the server
        const baseUrl = await crxServer.start();
        console.log(`${baseUrl}/update.xml`);
        console.log(`${baseUrl}/extension`);
        console.log(`Extension ID: ${crxServer.getExtensionId()}`);
        
        expect(baseUrl).toBeTruthy();

        //check we can get the update.xml
        let updateXml = await fetch(`${baseUrl}/update.xml`);
        expect(updateXml.ok).toBe(true);

        //check we can get the extension.crx
        const extensionCrx = await fetch(`${baseUrl}/extension`);
        expect(extensionCrx.ok).toBe(true);
    });

    test('CRXServer.update(<explicit version>) - update.xml is generated with new explicit version', async () => {
        /**
         * This took hours to figure out, but since we're writing to the manifest.json and then `crx` is requiring 
         * it again, we need to reset the module cache so that it will re-read the manifest.json file. `crx` handles
         * this be clearing require.cache, but jest has it's own module system that needs to be reset for this
         * to work.
         */
        jest.resetModules();
        
        //get our existing update url
        const url = crxServer.getUpdateUrl();

        //update our version
        await crxServer.update('3.0.5');

        //check we can get the update.xml
        updateXml = await fetch(url);
        updateXml = await updateXml.text();

        expect(xmlVersionMatch(updateXml, '3.0.5')).toBe(true);
    });

    test('CRXServer.update("patch") - update.xml is generated with new patch version', async () => {
        jest.resetModules();

        const url = crxServer.getUpdateUrl();

        //update our version
        await crxServer.update('patch');

        //check we can get the update.xml
        updateXml = await fetch(url);
        updateXml = await updateXml.text();

        expect(xmlVersionMatch(updateXml, '3.0.6')).toBe(true);
    });

    
    test('CRXServer.onRequest - onRequest callback is triggered on request to either endpoint', (done) => {
        jest.resetModules();

        let reqCount = 0;
        crxServer.onRequest((req) => {
            expect(req.url).toMatch(/update.xml|extension/);
            reqCount++;
            if (reqCount === 2) {
                done();
            }
        })

        fetch(crxServer.getUpdateUrl());
        fetch(crxServer.getExtensionUrl());
    });
})