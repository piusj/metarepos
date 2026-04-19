export function metaCodeWorkspace(name, repoNames) {
    const workspace = {
        folders: [
            { name, path: "." },
            ...repoNames.map((n) => ({ name: n, path: `repos/${n}` })),
        ],
        settings: {
            "files.exclude": { "repos": true },
            "search.exclude": { "repos": true },
            "files.watcherExclude": { "**/repos/**": true },
            "git.autoRepositoryDetection": "subFolders",
            "git.repositoryScanMaxDepth": 5,
            "git.scanRepositories": [".worktrees"],
        },
    };
    return JSON.stringify(workspace, null, 2) + "\n";
}
