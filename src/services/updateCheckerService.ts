export interface GitHubReleaseInfo {
  version: string;
  releaseNotes: string;
  downloadUrl: string;
  publishedAt: string;
  isNewer: boolean;
}

export class UpdateCheckerService {
  private static readonly REPO_OWNER = 'agupta07505';
  private static readonly REPO_NAME = 'Lectura';

  static async checkForUpdates(currentVersion: string): Promise<GitHubReleaseInfo | null> {
    try {
      const url = `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/releases/latest`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Lectura-App',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const tagName: string = data.tag_name || data.name || '';
      const version = tagName.replace(/^v/i, '');

      const isNewer = this.compareVersions(version, currentVersion) > 0;

      const apkAsset = data.assets?.find((a: any) =>
        a.name?.endsWith('.apk')
      );
      const downloadUrl = apkAsset?.browser_download_url || data.html_url;

      return {
        version,
        releaseNotes: data.body || 'No release notes provided.',
        downloadUrl,
        publishedAt: data.published_at || '',
        isNewer,
      };
    } catch {
      return null;
    }
  }

  private static compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }
}
