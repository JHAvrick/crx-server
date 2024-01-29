# CRXServer

CRXServer allows you to quickly package a browser extension as a CRX and host it to a public URL, which can then be used to deploy your extension for rapid testing or prototyping purposes. CRXServer uses [ngrok](https://www.npmjs.com/package/ngrok) internally, so you may need to procure a (free) auth token.

`npm install --save-dev crx-server`

## Basic Example

```js
const crxServer = CRXServer({
    extensionDir: path.resolve(__dirname, 'extension'),
    publicDir: path.resolve(__dirname, 'public'),
    port: 8080,
    ngrok: {
        authtoken: '<auth token>', // your authtoken from ngrok.com
    }
});

(async () => {
    await crxServer.start(); //Start the server

    //Get the public `/update.xml` endpoint URL - this is used for deployment
    let url = crxServer.getUpdateUrl() 

    //Update the underlying package to reflect any changes
    await crxServer.update('patch');
})();

```

# API

### new CRXServer({ ...options })

Create a new CRXServer. Multiple servers can be created at the same time provided they use different ports.

```js
const crxServer = CRXServer({
    /**
     * The directory of your unpacked extension 
     */
    extensionDir: path.resolve(__dirname, 'extension'),
    /**
     * The directory to output the CRX and `update.xml`
     */
    publicDir: path.resolve(__dirname, 'public'),
    /**
     * If your key file is not the extension directory, you'll need to 
     * pass its location here.
     */
    privateKey: path.resolve(__dirname, 'path' 'key.pem'),
    /**
     * Port to run the server on.
     */
    port: 8080,
    /**
     * ngrok.connect() options. All you need here is the authtoken, but you can provide
     * other options as necessary. 
     */
    ngrok: {
        authtoken: '<auth token>', // your authtoken from ngrok.com
        //...{ https://www.npmjs.com/package/ngrok#options } 
    }
});
```

## CRXServer.start(skipCRXPack = false)

Calling `start()` will create a local `express` server with two endpoints:

 - `/update.xml` - Provides `update.xml`, which contains metadata about the extension, including its current version and the location of its endpoint
 - `/extension` - Provides the actual extension CRX

An `ngrok` tunnel will be created automatically for the server on the given port (default 9000).

```js
/**
 * Start server normally
 */
await crxServer.start();
/**
 * Start server but skip CRX packing.
 */
await crxServer.start(true); 
```

If you have a static domain and/or are starting the server again after having called `stop()`, you could potentially skip packing the CRX. Generally it won't matter.

## CRXServer.stop()
Stops the server and closes the `ngrok` connection.

```js
await crxServer.stop();
```

## CRXServer.update()
This method can be called once the server has started in order to pack the extension again. This is extremely useful for pushing out rapid updates for testing on target browsers or devices. The existing endpoints will simply deliver the updated files, assuming your server is started.

```js
/**
 * You'll probably want to increment or set the extension version. To increment
 * you can pass in one of 'major', 'minor', or 'patch'.
 */
await crxServer.update('patch'); 
/**
 * To set, you can simply pass in a version string such as '1.0.1'.
 */
await crxServer.update('1.0.1'); 
```

Note that these versions have no affect on your actual `manifest.json` and need not reflect your extensions actual versioning since we're only concerned with testing here. Your extension will not be updated on target browser unless the version specified by the `update.xml` endpoint is higher than the version already installed. 

The `update.xml` endpoint is polled every few hours, so you'll likely want to manually refresh extensions (`chrome://extensions/` --> Update) on the target device after calling `update()`.


## CRXServer.getUpdateUrl()
Get the public URL for the endpoint delivering the `update.xml`. If deploying through, say, Google Workspace, this is the URL you would use.

```js
let url = crxServer.update('patch'); 
```

## CRXServer.getExtensionId()
Get the extension ID generated on the most recent call to either `start()` or `update()`.

```js
let url = crxServer.getExtensionId(); 
```

# Run Tests
Before running tests you'll want to add your ngrok config (if not already configured via CLI). Create a file called `ngrok.config.js` in the `test` directory and simply export an object w/ an `authtoken` property:

```js
module.exports = {
  authtoken: '<auth token>', // your authtoken from ngrok.com
}
```

Then you can simply `npm run test`.