import { describe, expect, it } from '@jest/globals';

import { de } from '../strings/de';
import { en } from '../strings/en';
import { es } from '../strings/es';
import { fr } from '../strings/fr';
import { hi } from '../strings/hi';
import { ja } from '../strings/ja';
import { ko } from '../strings/ko';
import { pt } from '../strings/pt';
import { ru } from '../strings/ru';
import { zhHans } from '../strings/zhHans';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translations', () => {
  const all = { de, es, fr, hi, ja, ko, pt, ru, zhHans };
  for (const [name, dict] of Object.entries(all)) {
    it(`${name} has every key with the same placeholders`, () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect([key, placeholders(dict[key])]).toEqual([key, placeholders(en[key])]);
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    });
  }
});
