const path = require('path');
const fs = require('fs');
const plist = require('plist');
const { ConfigParser } = require('cordova-common');
module.exports = function (context) {
    let projectRoot = context.opts.cordova.project ? context.opts.cordova.project.root : context.opts.projectRoot;
    let configParser = new ConfigParser(path.join(projectRoot, 'config.xml'));
    let appName = configParser.name();
    let candidates = [
        path.join(projectRoot, 'platforms/ios/App/App-Info.plist'),
        path.join(projectRoot, 'platforms/ios/' + appName + '/' + appName + '-Info.plist'),
        path.join(projectRoot, 'platforms/ios/' + appName + '/' + appName + '-info.plist'),
    ];
    let infoPlistPath = candidates.find(p => fs.existsSync(p));
    if (!infoPlistPath) { console.warn('firebase-analytics: Info.plist not found'); return; }
    let obj = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'));
    let enableAppTracking = configParser.getPlatformPreference("EnableAppTrackingTransparencyPrompt", "ios");
    if(enableAppTracking == "true" || enableAppTracking == ""){
        let userTrackingDescription = configParser.getPlatformPreference("USER_TRACKING_DESCRIPTION_IOS", "ios");
        if(userTrackingDescription != ""){ obj['NSUserTrackingUsageDescription'] = userTrackingDescription; }
    } else if(enableAppTracking == "false"){ delete obj['NSUserTrackingUsageDescription']; }
    let collectionEnabled = configParser.getGlobalPreference("ANALYTICS_COLLECTION_ENABLED");
    if (collectionEnabled.toLowerCase() == 'false') { obj['FIREBASE_ANALYTICS_COLLECTION_ENABLED'] = false; }
    fs.writeFileSync(infoPlistPath, plist.build(obj));
};
