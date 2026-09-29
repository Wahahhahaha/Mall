export interface Vx {
  id: string;
  x: number;
  y: number;
}

export interface EdgeDatum {
  id: string;
  from: string;
  to: string;
}

type NodeId = string;

interface PQNode {
  id: NodeId;
  priority: number;
}

class MinHeap {
  values: PQNode[] = [];

  enqueue(id: NodeId, priority: number) {
    this.values.push({ id, priority });
    this.bubbleUp();
  }

  private bubbleUp() {
    let idx = this.values.length - 1;
    const el = this.values[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.values[parentIdx];
      if (el.priority >= parent.priority) break;
      this.values[parentIdx] = el;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  dequeue(): PQNode {
    const min = this.values[0];
    const end = this.values.pop();
    if (this.values.length > 0 && end) {
      this.values[0] = end;
      this.sinkDown();
    }
    return min;
  }

  private sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const el = this.values[0];
    for (;;) {
      const leftIdx = 2 * idx + 1;
      const rightIdx = 2 * idx + 2;
      let left: PQNode | undefined;
      let right: PQNode | undefined;
      let swap: number | null = null;
      if (leftIdx < length) {
        left = this.values[leftIdx];
        if (left.priority < el.priority) swap = leftIdx;
      }
      if (rightIdx < length) {
        right = this.values[rightIdx];
        if (
          (swap === null && right.priority < el.priority) ||
          (swap !== null && left !== undefined && right.priority < left.priority)
        ) {
          swap = rightIdx;
        }
      }
      if (swap === null) break;
      this.values[idx] = this.values[swap];
      this.values[swap] = el;
      idx = swap;
    }
  }

  get length() {
    return this.values.length;
  }
}

export class Graph {
  private adj: Record<NodeId, { id: NodeId; weight: number }[]> = {};

  addVertex(id: NodeId) {
    if (!this.adj[id]) this.adj[id] = [];
  }

  addEdge(a: NodeId, b: NodeId, weight = 1) {
    this.addVertex(a);
    this.addVertex(b);
    this.adj[a].push({ id: b, weight });
    this.adj[b].push({ id: a, weight });
  }

  shortestPath(start: NodeId, finish: NodeId): NodeId[] {
    if (start === finish) return [start, finish];
    const heap = new MinHeap();
    const dist: Record<NodeId, number> = {};
    const prev: Record<NodeId, NodeId> = {};
    const seen = new Set<NodeId>();

    for (const v of Object.keys(this.adj)) {
      dist[v] = Infinity;
    }
    dist[start] = 0;
    heap.enqueue(start, 0);

    while (heap.length) {
      const { id: smallest } = heap.dequeue();
      if (smallest === finish) {
        const path: NodeId[] = [];
        let cur: NodeId | undefined = finish;
        while (cur !== undefined) {
          path.push(cur);
          cur = prev[cur];
        }
        path.reverse();
        return path;
      }
      if (seen.has(smallest)) continue;
      seen.add(smallest);

      for (const next of this.adj[smallest] ?? []) {
        const candidate = dist[smallest] + next.weight;
        if (candidate < dist[next.id]) {
          dist[next.id] = candidate;
          prev[next.id] = smallest;
          heap.enqueue(next.id, candidate);
        }
      }
    }
    return [];
  }
}
