// assets/js/version-generator.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Files that should affect versioning
const criticalFiles = [
    path.join(__dirname, '../../includes/sidebar.html'),
    path.join(__dirname, '../../includes/header.html'),
    path.join(__dirname, '../../assets/js/component-loader.js'),
    path.join(__dirname, '../../assets/css/style.css')
];

function generateVersion() {
    let combinedContent = '';

    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            combinedContent += content;
            console.log(`✓ Hashed: ${path.basename(file)}`);
        } else {
            console.warn(`⚠️ File not found: ${file}`);
        }
    });

    // Generate short hash (8 characters is enough)
    const hash = crypto.createHash('md5')
                       .update(combinedContent)
                       .digest('hex')
                       .substring(0, 10);

    const version = `v${hash}`;

    // Write to a version file
    const versionData = {
        version: version,
        generatedAt: new Date().toISOString(),
        hash: hash
    };

    fs.writeFileSync(
        path.join(__dirname, 'current-version.json'), 
        JSON.stringify(versionData, null, 2)
    );

    console.log(`\n✅ New Version Generated: ${version}`);
    return version;
}

generateVersion();