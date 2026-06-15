const path = require('path');
const fs = require('fs');

const PLIST_NAME = 'GoogleService-Info.plist';

function getProjectRoot(context) {
    return context.opts.cordova?.project?.root || context.opts.projectRoot;
}

function getAppName(projectRoot) {
    const configPath = path.join(projectRoot, 'config.xml');
    const xml = fs.readFileSync(configPath, 'utf8');
    const match = xml.match(/<name(?:\s[^>]*)?>([^<]+)<\/name>/);

    if (!match) {
        throw new Error('cordova-plugin-firebase-analytics: не удалось определить имя приложения из config.xml.');
    }

    return match[1].trim();
}

function getGoogleServiceInfoCandidates(projectRoot, appName) {
    const candidates = [
        path.join(projectRoot, 'platforms', 'ios', appName, PLIST_NAME),
        path.join(projectRoot, 'resources', PLIST_NAME),
        path.join(projectRoot, PLIST_NAME),
    ];

    const configPath = path.join(projectRoot, 'config.xml');
    if (!fs.existsSync(configPath)) {
        return [...new Set(candidates)];
    }

    const xml = fs.readFileSync(configPath, 'utf8');
    const resourceFileRegex = /<resource-file\b([^>]*)\/?>/gi;
    let match;

    while ((match = resourceFileRegex.exec(xml)) !== null) {
        const attrs = match[1];
        const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
        const targetMatch = attrs.match(/\btarget=["']([^"']+)["']/i);

        if (!srcMatch || !targetMatch) {
            continue;
        }

        if (!targetMatch[1].includes(PLIST_NAME)) {
            continue;
        }

        candidates.push(path.resolve(projectRoot, srcMatch[1]));
    }

    return [...new Set(candidates)];
}

function validateGoogleServiceInfoPlist(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasGoogleAppId = /<key>GOOGLE_APP_ID<\/key>\s*<string>[^<]+<\/string>/.test(content);

    if (!hasGoogleAppId) {
        throw new Error(
            `cordova-plugin-firebase-analytics: файл ${filePath} не содержит обязательный ключ GOOGLE_APP_ID.`
        );
    }
}

module.exports = function (context) {
    const projectRoot = getProjectRoot(context);
    const iosPlatformPath = path.join(projectRoot, 'platforms', 'ios');

    if (!fs.existsSync(iosPlatformPath)) {
        return;
    }

    const appName = getAppName(projectRoot);
    const candidates = getGoogleServiceInfoCandidates(projectRoot, appName);

    let foundPath = null;

    for (const candidate of candidates) {
        if (!fs.existsSync(candidate)) {
            continue;
        }

        validateGoogleServiceInfoPlist(candidate);
        foundPath = candidate;
        break;
    }

    if (!foundPath) {
        const pathsList = candidates.map((candidate) => `  - ${candidate}`).join('\n');
        const message = [
            'cordova-plugin-firebase-analytics: GoogleService-Info.plist absent.',
            '',
            'download GoogleService-Info.plist from Firebase Console',
            'add into config.xml, for example:',
            '  <platform name="ios">',
            '    <resource-file src="resources/GoogleService-Info.plist" target="GoogleService-Info.plist" />',
            '  </platform>',
            '',
            '',
            pathsList,
        ].join('\n');

        console.error(message);
        throw new Error(message);
    }

    console.log(`cordova-plugin-firebase-analytics: найден ${PLIST_NAME}: ${foundPath}`);
};
