export function metaCodeWorkspace(name: string, repoNames: string[]): string {
  const workspace = {
    folders: [
      { name, path: "." },
      ...repoNames.map((n) => ({ name: n, path: `repos/${n}` })),
    ],
    settings: {
      "files.exclude": { "repos": true },
      "search.exclude": { "repos": true },
      "files.watcherExclude": { "**/repos/**": true },
    },
  };
  return JSON.stringify(workspace, null, 2) + "\n";
}
