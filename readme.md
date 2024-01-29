# CRXServer

CRXServer allows you to quickly package a browser extension as a CRX and host it to a public URL, which can then be used to deploy your extension for testing purposes. CRXServer uses ngrok internally, so you may need to provide an auth token.

Basic Usage:

```js
const path = require('path');
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
     * Local port
     */
    port: 8080,
    /**
     * ngrok.connect() options
     */
    ngrok: {
        authtoken: '<auth token>', // your authtoken from ngrok.com
    }
});

(async () => {
    /**
     * Starting the server will pack your extension automatically
     */
    await crxServer.start();
    /**
     * Once started, this URL can be used to deploy your extension to devices or browsers via Google Workspace. 
     */
    console.log(crxServer.getUpdateUrl());
    /**
     * Once the server has started, you can ask it to repack your extension if you've made changes.
     * You'll want to increment the version so that the extension update services know to pull the changes.
     * You can pass a semver string here ('major', 'minor', 'patch') or provide an explicit version number.
     * 
     * The version in your actual manifest will not change.
     */
    await crxServer.update('patch');
})();

```

### Run Tests

Before running tests you'll want to add your ngrok config (if not already configured via CLI). Create a file called `ngrok.config.js` in the `test` directory and simply export an object w/ an `authtoken` property:

```js
module.exports = {
  authtoken: '<auth token>', // your authtoken from ngrok.com
}
```

You can also pass in any options for `ngrok.connect()`. [See docs here.](https://www.npmjs.com/package/ngrok#options).

