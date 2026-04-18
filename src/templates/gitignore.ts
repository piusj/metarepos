export function gitignoreContent(): string {
  return `# Nested repos have their own git history
repos/*
!repos/.gitkeep

# Worktrees are local working state
.worktrees/
`;
}
