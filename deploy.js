const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx');
const ngrok = require('ngrok');
const express = require('express');
const app = express();

//Increment a semver string
function incrementVersion(sem, ver) {
    let split = ver.split('.');
    let version = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        version[i] = parseInt(split[i]);
        if (isNaN(version[i])) version[i] = 0;
    }

    switch (sem) {
        case 'major':
            version[0] = version[0] + 1;
            version[1] = version[2] = 0;
            break;
        case 'minor':
            version[1] = version[1] + 1;
            version[2] = 0;
            break;
        case 'patch':
            version[2] = version[2] + 1;
            break;
    }
    return version.join('.');
}

/**
 * Pack a CRX from a directory containing an extension.
 * 
 * @param {string} extensionDir - The directory containing the extension files
 * @param {string} outputDir - The directory to output the packed CRX and `update.xml`
 * @param {string} updateUrl - The URL where the `update.xml` and CRX will be hosted
 * @param {string} version - A version for use in the `manifest.json` `and update.xml`. 
 * If none is provided, the version will be extracted from the `update.xml` and incremented, 
 * or otherwise from the `manifest.json`.
 */
const packCRX = async (extensionDir, outputDir, updateUrl, version) => {
    console.log(`Packing CRX from ${extensionDir} directory...`);

    //Ensure our output directory exists and create it if not.
    fs.mkdirSync(outputDir, { recursive: true });

    //If no explicit version was provided, extract the version from the update.xml file and 
    //increment, or otherwise from the manifest.
    if (!version) {
        try {
            let updateXml = fs.readFileSync(path.resolve(outputDir, 'update.xml'), 'utf-8');
            let regex = /<updatecheck[^>]*version='(.*?)'/;

            //If we found a version, increment it.
            version = updateXml.match(regex)?.[1];
            if (version) {
                version = incrementVersion('patch', version);
            }
        } catch (error) {
            //Probably there is no update.xml file, so we'll just use the manifest version.
        }
    }

    //Temporarily update our manifest to include our dev update_url and our next version.
    let manifest = JSON.parse(fs.readFileSync(path.resolve(extensionDir, 'manifest.json'), 'utf-8'));
    let modified = Object.assign({}, manifest);
    modified.version = version ?? incrementVersion('patch', manifest.version);
    modified.update_url = `${updateUrl}/update.xml`;

    //Write our new manifest
    fs.writeFileSync(path.resolve(extensionDir, 'manifest.json'), JSON.stringify(modified, null, '\t'), 'utf-8');

    //Pack our CRX
    const crx = new ChromeExtension({
        codebase: `${updateUrl}/extension.crx`,
        privateKey: fs.readFileSync(path.resolve(extensionDir, 'key.pem'))
    });

    try {
        await crx.load(extensionDir);
        const crxBuffer = await crx.pack();
        const updateXML = crx.generateUpdateXML();

        fs.writeFileSync(path.resolve(outputDir, 'update.xml'), updateXML);
        fs.writeFileSync(path.resolve(outputDir, 'extension.crx'), crxBuffer);
        fs.writeFileSync(path.resolve(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'), 'utf-8');
    } catch (error) {
        console.warn(error);
    }
}

const deployCRX = (extensionDir, publicDir, port = 9000, ngrokAuthToken) => {

    //One endpoint for our update.xml
    app.get('/update.xml', (req, res) => {
        res.contentType('application/xml');
        res.sendFile(path.resolve(publicDir, 'update.xml'));
    });

    //And one for the actual crx
    app.get('/extension', (req, res) => {
        res.setHeader('content-type', 'application/x-chrome-extension');
        res.sendFile(path.resolve(publicDir, 'extension.crx'));
    });

    app.listen(port, async () => {
        console.log(`Listening on port ${port}...`);
        try {

            if (ngrokAuthToken){
                await ngrok.authtoken(ngrokAuthToken);
            }

            const url = await ngrok.connect(port);
            await packCRX(extensionDir, publicDir, url);
            console.log(`${url}/update.xml`);

        } catch (error){
            console.warn(error);
        }
    });

}

module.exports = {
    packCRX,
    deployCRX
}