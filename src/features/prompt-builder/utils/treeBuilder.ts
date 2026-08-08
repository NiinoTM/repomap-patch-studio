export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  allFiles: string[];
}

export function buildFileTree(files: string[], searchQuery: string = ""): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    isFolder: true,
    children: [],
    allFiles: [],
  };

  const filteredFiles = files.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  filteredFiles.forEach((filePath) => {
    const parts = filePath.split("/");
    let current = root;
    current.allFiles.push(filePath);

    let currentPath = "";
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: [],
          allFiles: [],
        };
        current.children.push(child);
      }

      if (!isLast) {
        child.allFiles.push(filePath);
      }

      current = child;
    });
  });

  const sortNodes = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });
    node.children.forEach(sortNodes);
  };
  sortNodes(root);

  return root;
}