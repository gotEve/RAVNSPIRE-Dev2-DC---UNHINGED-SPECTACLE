const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionTracker {
    constructor() {
        this.buildInfo = this.generateBuildInfo();
    }

    /**
     * Generate comprehensive build information
     */
    generateBuildInfo() {
        const buildInfo = {
            timestamp: new Date().toISOString(),
            buildDate: new Date().toLocaleDateString(),
            buildTime: new Date().toLocaleTimeString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Get package.json information
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageData = fs.readFileSync(packagePath, 'utf8');
            const packageInfo = JSON.parse(packageData);
            
            buildInfo.package = {
                name: packageInfo.name,
                version: packageInfo.version,
                description: packageInfo.description,
                author: packageInfo.author,
                license: packageInfo.license
            };
        } catch (error) {
            console.error('Error reading package.json:', error);
            buildInfo.package = { error: 'Package information unavailable' };
        }

        // Get git information
        try {
            buildInfo.git = {
                commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
                shortCommit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
                branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
                lastCommit: execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim(),
                lastCommitMessage: execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim(),
                lastCommitAuthor: execSync('git log -1 --format=%an', { encoding: 'utf8' }).trim(),
                totalCommits: execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim()
            };
        } catch (error) {
            console.error('Error getting git information:', error);
            buildInfo.git = { error: 'Git information unavailable' };
        }

        // Get system information
        buildInfo.system = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            environment: process.env.NODE_ENV || 'development',
            pid: process.pid,
            cwd: process.cwd()
        };

        // Get deployment information
        buildInfo.deployment = {
            deployedAt: new Date().toISOString(),
            deployedBy: process.env.USER || process.env.USERNAME || 'unknown',
            deploymentMethod: process.env.DEPLOYMENT_METHOD || 'manual',
            serverHost: process.env.SERVER_HOST || 'unknown',
            databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured'
        };

        return buildInfo;
    }

    /**
     * Get formatted version string
     */
    getVersionString() {
        const { package: pkg, git } = this.buildInfo;
        const version = pkg.version || 'unknown';
        const commit = git.shortCommit || 'unknown';
        const branch = git.branch || 'unknown';
        
        return `${pkg.name} v${version} (${branch}@${commit})`;
    }

    /**
     * Get build timestamp
     */
    getBuildTimestamp() {
        return this.buildInfo.timestamp;
    }

    /**
     * Get all build information
     */
    getAllBuildInfo() {
        return this.buildInfo;
    }

    /**
     * Get git commit information
     */
    getGitInfo() {
        return this.buildInfo.git;
    }

    /**
     * Get package information
     */
    getPackageInfo() {
        return this.buildInfo.package;
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        return this.buildInfo.system;
    }

    /**
     * Get deployment information
     */
    getDeploymentInfo() {
        return this.buildInfo.deployment;
    }

    /**
     * Check if running in production
     */
    isProduction() {
        return this.buildInfo.system.environment === 'production';
    }

    /**
     * Get uptime information
     */
    getUptimeInfo() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        return {
            totalSeconds: uptime,
            formatted: `${hours}h ${minutes}m ${seconds}s`,
            startedAt: new Date(Date.now() - (uptime * 1000)).toISOString()
        };
    }

    /**
     * Get memory usage information
     */
    getMemoryInfo() {
        const memory = process.memoryUsage();
        return {
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
            rss: Math.round(memory.rss / 1024 / 1024),
            external: Math.round(memory.external / 1024 / 1024),
            arrayBuffers: Math.round(memory.arrayBuffers / 1024 / 1024)
        };
    }

    /**
     * Get feature status
     */
    getFeatureStatus() {
        return {
            factionSystem: '✅ Active',
            marriageFamily: '✅ Active',
            residentialPlots: '✅ Active',
            guildDistrict: '✅ Active',
            arenaCrucible: '✅ Active',
            resourceEconomy: '✅ Active',
            globalStats: '✅ Active',
            enhancedAntiCheat: '✅ Active',
            loreSystem: '✅ Active',
            achievementSystem: '✅ Active',
            totalFeatures: 10,
            activeFeatures: 10
        };
    }

    /**
     * Generate version report for troubleshooting
     */
    generateTroubleshootingReport() {
        const uptime = this.getUptimeInfo();
        const memory = this.getMemoryInfo();
        const features = this.getFeatureStatus();
        
        return {
            version: this.getVersionString(),
            buildTimestamp: this.getBuildTimestamp(),
            uptime: uptime.formatted,
            memoryUsage: `${memory.heapUsed}MB / ${memory.heapTotal}MB`,
            environment: this.buildInfo.system.environment,
            features: features,
            git: this.buildInfo.git,
            system: this.buildInfo.system
        };
    }
}

module.exports = new VersionTracker();
