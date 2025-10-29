# SimpleStore 使用示例

## React 示例

```tsx
// 在入口文件注册 allocator 和 gc
import { SimpleStore } from './simpleStore';
import { useState, useEffect } from 'react';

SimpleStore.register(
  useState,
  useEffect
);

// 创建全局 store
const countStore = new SimpleStore('count', 0);
const pageAId = Symbol("pageA");

// 在页面组件中使用
function Counter() {
  const [getCount, setCount] = SimpleStore.useStore(countStore, pageAId);
  return (
    <div>
      <span>{getCount()}</span>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

## Vue 示例

```ts
// 在入口文件注册 allocator 和 gc
import { SimpleStore } from './simpleStore';
import { ref, onUnmounted } from 'vue';

SimpleStore.register(
  ref,
  onUnmounted
);

// 创建全局 store
const countStore = new SimpleStore('count', 0);

// 在组件 setup 中使用
export default {
  setup() {
    const pageAId = Symbol("pageA");
    const [getCount, setCount] = SimpleStore.useStore(countStore, pageAId);
    return { count: getCount, inc: () => setCount((c) => c + 1) };
  }
};
```

---

更多高级用法请参考源码注释和 API。