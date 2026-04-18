export function metaRootMd(name) {
    return `# Meta-Repo Root Marker

This file exists solely as a marker to identify the root of the ${name} meta-repo. Shell scripts and commands walk up the directory tree looking for this file to determine the meta-repo root path.

Nothing reads the contents of this file.
`;
}
