// src/shared/schema.ts
export const factions = ['faction1', 'faction2'];
```

```typescript
// db/seeds/seed.ts
import { factions } from '../schema';

console.log(factions);
```

```typescript
// db/schema.ts
export const dbSchema = {};