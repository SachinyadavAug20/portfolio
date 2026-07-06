import type { BlogPost } from "./types";

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  slug?: string;
  title?: string;
  date?: string;
  children?: TreeNode[];
}

export function buildTree(posts: BlogPost[]): TreeNode {
  const root: TreeNode = { name: "root", type: "folder", children: [] };

  for (const post of posts) {
    const segments = post.dir ? post.dir.split("/").filter(Boolean) : [];
    let current = root;

    for (const segment of segments) {
      let child = current.children?.find(
        (c) => c.type === "folder" && c.name === segment,
      );
      if (!child) {
        child = { name: segment, type: "folder", children: [] };
        current.children = current.children || [];
        current.children.push(child);
      }
      current = child;
    }

    current.children = current.children || [];
    current.children.push({
      name: post.slug,
      type: "file",
      slug: post.slug,
      title: post.title,
      date: post.date,
    });
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}

export function getFolderAtPath(
  tree: TreeNode,
  path: string,
): TreeNode | undefined {
  if (!path) return tree;
  const segments = path.split("/").filter(Boolean);
  let current: TreeNode | undefined = tree;

  for (const seg of segments) {
    current = current?.children?.find(
      (c) => c.type === "folder" && c.name === seg,
    );
    if (!current) return undefined;
  }
  return current;
}
