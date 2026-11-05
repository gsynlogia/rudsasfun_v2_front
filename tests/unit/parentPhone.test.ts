import { describe, expect, it } from 'vitest';

import { fullParentPhone } from '@/lib/utils/parentPhone';

describe('fullParentPhone', () => {
  it('łączy kierunkowy z numerem', () => {
    expect(fullParentPhone({ phone: '+48', phoneNumber: '500600700' })).toBe('+48 500600700');
  });

  it('pomija puste części i spacje', () => {
    expect(fullParentPhone({ phone: ' +48 ', phoneNumber: ' 500600700 ' })).toBe('+48 500600700');
    expect(fullParentPhone({ phone: '', phoneNumber: '500600700' })).toBe('500600700');
  });

  it('bez numeru zostaje kierunkowy, jak dotąd', () => {
    expect(fullParentPhone({ phone: '+48', phoneNumber: '' })).toBe('+48');
    expect(fullParentPhone({ phone: null, phoneNumber: undefined })).toBe('+48');
  });
});
