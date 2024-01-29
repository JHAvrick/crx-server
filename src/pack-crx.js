const fs = require('fs');
const path = require('path');
const ChromeExtension = require('crx');

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

const defaults = Object.freeze({
    extensionDir: null,
    publicDir: null,
    privateKeyPath: null,
    baseUrl: null,
    version: null
})

const isEmpty = (str) => (!str || str.length === 0);
const sem = ['major', 'minor', 'patch'];
const getNextVersion = (opts, manifest) => {
    if (isEmpty(opts.version)) return manifest.version;
    if (sem.includes(opts.version)) {
        let toIncrement = null;

        //See if there is already any update.xml file. If so, we'll increment that version.
        try {
            let updateXml = fs.readFileSync(path.resolve(opts.publicDir, 'update.xml'), 'utf-8');
            let regex = /<updatecheck[^>]*version='(.*?)'/;

            //If we found a version, increment it.
            toIncrement = updateXml.match(regex)?.[1];
        } catch (error) {
            toIncrement = manifest.version;
        }

        //Return the incremented version (if no version was provided, increment the patch version)
        return incrementVersion(opts.version ?? 'patch', toIncrement);
    }

    //Otherwise, just return the version that was provided.
    return opts.version;
}

const packCRX = async (opts = {}) => {
    opts = Object.assign({}, defaults, opts);

    //Ensure our output directory exists and create it if not.
    fs.mkdirSync(opts.publicDir, { recursive: true });

    //Temporarily update our manifest to include our dev update_url and our next version.
    let manifest = JSON.parse(fs.readFileSync(path.resolve(opts.extensionDir, 'manifest.json'), 'utf-8'));
    let modified = Object.assign({}, manifest);
    modified.version = getNextVersion(opts, manifest);
    modified.update_url = `${opts.baseUrl}/update.xml`;

    //Write our new manifest
    fs.writeFileSync(path.resolve(opts.extensionDir, 'manifest.json'), JSON.stringify(modified, null, '\t'), 'utf-8');

    //Pack our CRX
    const crx = new ChromeExtension({
        codebase: `${opts.baseUrl}/extension`,
        privateKey: fs.readFileSync(opts.privateKeyPath ?? path.resolve(opts.extensionDir, 'key.pem'))
    });


    try {
        await crx.load(opts.extensionDir);
        let crxBuffer = await crx.pack();
        let updateXML = crx.generateUpdateXML();

        fs.writeFileSync(path.resolve(opts.publicDir, 'update.xml'), updateXML);
        fs.writeFileSync(path.resolve(opts.publicDir, 'extension.crx'), crxBuffer);
        fs.writeFileSync(path.resolve(opts.extensionDir, 'manifest.json'), JSON.stringify(manifest, null, '\t'), 'utf-8');
    } catch (error) {
        console.warn(error);
    }
}

module.exports = packCRX;