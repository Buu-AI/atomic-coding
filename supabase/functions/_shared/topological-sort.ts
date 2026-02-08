/**
 * Topological sort using DFS (Kahn's algorithm variant).
 * Returns atom names ordered so dependencies come before dependents.
 * Throws on cycle detection.
 */
export function topologicalSort(
  atoms: { name: string }[],
  dependencies: { atom_name: string; depends_on: string }[],
): string[] {
  // Build adjacency list: atom_name -> [depends_on...]
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize all atoms
  for (const atom of atoms) {
    graph.set(atom.name, []);
    inDegree.set(atom.name, 0);
  }

  // Build edges: depends_on -> atom_name (dependency must come first)
  for (const dep of dependencies) {
    // depends_on must be processed BEFORE atom_name
    if (!graph.has(dep.depends_on)) continue; // skip if dependency atom not found
    graph.get(dep.depends_on)!.push(dep.atom_name);
    inDegree.set(dep.atom_name, (inDegree.get(dep.atom_name) || 0) + 1);
  }

  // Kahn's algorithm: start with nodes that have no dependencies
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of graph.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== atoms.length) {
    const remaining = atoms
      .filter((a) => !sorted.includes(a.name))
      .map((a) => a.name);
    throw new Error(
      `Cycle detected in dependency graph. Involved atoms: ${remaining.join(", ")}`,
    );
  }

  return sorted;
}
