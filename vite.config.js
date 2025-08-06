import { defineConfig } from 'vite';
import shopify from 'vite-plugin-shopify';
import cleanup from '@by-association-only/vite-plugin-shopify-clean';
import fs from 'fs-extra';
import path from 'path';

// ===== AUTO-CREATE THEMING STRUCTURE =====
const rootDir = process.cwd();
const themingDir = path.join(rootDir, 'theming');
const jsDir = path.join(themingDir, 'js');
const scssDir = path.join(themingDir, 'scss');

// Ensure directories exist
fs.ensureDirSync(jsDir);
fs.ensureDirSync(scssDir);

// Create default files if missing
const defaultFiles = [
    { path: path.join(jsDir, 'main.js'), content: '// Main JS file' },
    { path: path.join(scssDir, 'styles.scss'), content: '/* Main SCSS file */' },
    { path: path.join(scssDir, '_variables.scss'), content: '$primary-color: lightblue;' }
];
defaultFiles.forEach(file => {
    if (!fs.existsSync(file.path)) {
        fs.outputFileSync(file.path, file.content);
    }
});

// ===== GET FILES RECURSIVELY =====
const getFilesRecursively = (dir, extensions) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath, extensions));
        } else if (extensions.some(ext => file.name.endsWith(ext))) {
            results.push(fullPath);
        }
    });
    return results;
};

// Get all JS and SCSS files
const jsFiles = getFilesRecursively(jsDir, ['.js']);
const scssFiles = getFilesRecursively(scssDir, ['.scss']);

// Convert file paths into Rollup input format
const inputFiles = {
    ...Object.fromEntries(
        jsFiles.map(file => [
            path.relative(jsDir, file).replace(/\\/g, '-').replace('.js', ''),
            file
        ])
    ),
    ...Object.fromEntries(
        scssFiles.map(file => [
            path.relative(scssDir, file).replace(/\\/g, '-').replace('.scss', '.css'),
            file
        ])
    )
};

// ===== VITE CONFIG =====
export default defineConfig({
    plugins: [
        cleanup(),
        shopify({
            tunnel: false,
            additionalEntrypoints: [
                'theming/js/**/*.js',
                'theming/scss/**/*.scss'
            ]
        }),
        {
            name: 'rename-assets',
            writeBundle() {
                const assetsDir = path.resolve(rootDir, 'assets');
                if (!fs.existsSync(assetsDir)) return;
                const files = fs.readdirSync(assetsDir);
                files.forEach(file => {
                    if (file.includes('other-')) {
                        const oldPath = path.join(assetsDir, file);
                        const newPath = path.join(assetsDir, file.replace('other-', ''));
                        fs.renameSync(oldPath, newPath);
                        console.log(`Renamed: ${oldPath} -> ${newPath}`);
                    }
                });
            }
        }
    ],
    publicDir: false,
    build: {
        emptyOutDir: false,
        manifest: "manifest.json",
        sourcemap: true,
        rollupOptions: {
            input: inputFiles,
            preserveEntrySignatures: 'strict',
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                dir: 'assets'
            },
            plugins: [
                {
                    name: 'debug-rollup',
                    buildStart() {
                        console.log("✅ Rollup is processing these input files:", Object.keys(inputFiles).length);
                    }
                }
            ]
        }
    },
    resolve: {
        alias: {
            '@js': jsDir,
            '@scss': scssDir
        }
    },
    server: {
        cors: {
            origin: [
                /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
                'https://auroracirc.com/'
            ]
        }
    }
});
