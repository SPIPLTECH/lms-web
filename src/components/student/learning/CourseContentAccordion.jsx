"use client";

/**
 * Percentage pill for a Module / Lesson / Topic row.
 *
 * Reads the backend roll-up only. A node with no tracked items renders
 * nothing at all rather than "0%", which would read as the student having
 * failed to start something that does not exist yet.
 */
export function NodeBadge({ progress, nodeId, node: nodeProp }) {
  const indexNode = nodeId && progress?.nodes?.get ? progress.nodes.get(nodeId) : (progress?.nodes && nodeId ? progress.nodes[nodeId] : null);
  const node = indexNode || nodeProp;

  const percent = typeof indexNode?.progressPercent === 'number'
    ? indexNode.progressPercent
    : (typeof nodeProp?.progressPercent === 'number' ? nodeProp.progressPercent : (typeof node?.progressPercent === 'number' ? node.progressPercent : null));

  if (percent === null || percent === undefined) return null;

  const totalItems = indexNode?.totalItems ?? nodeProp?.totalItems ?? node?.totalItems ?? 0;
  const completedItems = indexNode?.completedItems ?? nodeProp?.completedItems ?? node?.completedItems ?? 0;
  const applicable = indexNode?.applicable ?? nodeProp?.applicable ?? node?.applicable;

  if (applicable === false && totalItems === 0) return null;

  const completed = indexNode?.completed ?? nodeProp?.completed ?? node?.completed ?? (percent === 100);

  // Skipped after passing this node's qualifying test. It reads as its own
  // state rather than as a percentage: the student didn't work through 40% of
  // it, they were exempted from all of it, and showing "40%" would suggest
  // unfinished business where there is none.
  const qualified = indexNode?.qualified ?? nodeProp?.qualified ?? node?.qualified ?? false;

  if (qualified) {
    return (
      <span
        className="shrink-0 rounded border border-violet-500/40 bg-violet-500/15 px-1.5 py-0.5 text-[11px] font-black text-violet-600 dark:text-violet-400"
        title="Qualified to skip — you passed the qualifying test for this content"
      >
        Qualified
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 text-[11px] font-black tabular-nums px-1.5 py-0.5 rounded border ${
        completed
          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
          : "bg-background border-border text-muted-foreground"
      }`}
      title={`${completedItems} of ${totalItems} items complete`}
    >
      {percent}%
    </span>
  );
}
