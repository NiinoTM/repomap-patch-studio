import type { ContextSelectionItem } from "../types/contextSelectionItem";
import { getContextItemKey } from "../types/contextSelectionItem";
import { parseContextItem } from "./contextParser";

/**
 * ContextSelectionSet provides a Set<string>-compatible collection of canonical
 * selection keys while maintaining an internal map of strongly-typed ContextSelectionItem
 * models to prevent repetitive regex parsing across UI consumers.
 */
export class ContextSelectionSet implements Set<string> {
  private map = new Map<string, ContextSelectionItem>();

  constructor(
    initial?:
      | (ContextSelectionItem | string)[]
      | Set<string>
      | ContextSelectionSet
      | Iterable<string>,
  ) {
    if (initial) {
      if (initial instanceof ContextSelectionSet) {
        for (const item of initial.getItems()) {
          this.map.set(getContextItemKey(item), item);
        }
      } else {
        for (const entry of initial) {
          this.add(entry);
        }
      }
    }
  }

  get size(): number {
    return this.map.size;
  }

  has(keyOrPath: string): boolean {
    if (this.map.has(keyOrPath)) return true;
    for (const item of this.map.values()) {
      if (item.path === keyOrPath) return true;
    }
    return false;
  }

  hasExact(key: string): boolean {
    return this.map.has(key);
  }

  getItem(key: string): ContextSelectionItem | undefined {
    return this.map.get(key);
  }

  getItems(): ContextSelectionItem[] {
    return Array.from(this.map.values());
  }

  add(entry: ContextSelectionItem | string): this {
    const item = parseContextItem(entry);
    if (item) {
      this.map.set(getContextItemKey(item), item);
    }
    return this;
  }

  delete(keyOrPath: string): boolean {
    if (this.map.has(keyOrPath)) {
      return this.map.delete(keyOrPath);
    }
    let removed = false;
    for (const [key, item] of Array.from(this.map.entries())) {
      if (item.path === keyOrPath) {
        this.map.delete(key);
        removed = true;
      }
    }
    return removed;
  }

  clear(): void {
    this.map.clear();
  }

  forEach(
    callbackfn: (value: string, value2: string, set: Set<string>) => void,
    thisArg?: unknown,
  ): void {
    for (const key of this.map.keys()) {
      callbackfn.call(thisArg, key, key, this);
    }
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  values(): IterableIterator<string> {
    return this.map.keys();
  }

  entries(): IterableIterator<[string, string]> {
    const keys = Array.from(this.map.keys());
    let index = 0;
    return {
      [Symbol.iterator]() {
        return this;
      },
      next(): IteratorResult<[string, string]> {
        if (index < keys.length) {
          const val = keys[index++];
          return { value: [val, val], done: false };
        }
        return { value: undefined as unknown as [string, string], done: true };
      },
    };
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.map.keys();
  }

  get [Symbol.toStringTag](): string {
    return "ContextSelectionSet";
  }
}