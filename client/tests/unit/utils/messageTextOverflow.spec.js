import { describe, expect, it } from 'vitest';
import {
  elementHasVerticalOverflow,
  getCollapsedMaxHeight,
  measureTextOverflow,
  MESSAGE_TEXT_FONT_SIZE_PX,
  MESSAGE_TEXT_LINE_HEIGHT,
  MESSAGE_TEXT_VERTICAL_PADDING_PX,
} from '@/utils/messageTextOverflow.js';

describe('getCollapsedMaxHeight', () => {
  it('calculates height from font metrics and line count', () => {
    expect(getCollapsedMaxHeight(5)).toBe(
      MESSAGE_TEXT_FONT_SIZE_PX * MESSAGE_TEXT_LINE_HEIGHT * 5 +
        MESSAGE_TEXT_VERTICAL_PADDING_PX
    );
  });
});

describe('elementHasVerticalOverflow', () => {
  it('returns false when scrollHeight equals clientHeight', () => {
    const el = { scrollHeight: 100, clientHeight: 100 };
    expect(elementHasVerticalOverflow(el)).toBe(false);
  });

  it('returns true when scrollHeight exceeds clientHeight', () => {
    const el = { scrollHeight: 150, clientHeight: 80 };
    expect(elementHasVerticalOverflow(el)).toBe(true);
  });

  it('returns false for null element', () => {
    expect(elementHasVerticalOverflow(null)).toBe(false);
  });
});

describe('measureTextOverflow', () => {
  it('temporarily applies max-height while measuring', () => {
    const el = {
      style: {},
      scrollHeight: 200,
      clientHeight: 80,
    };

    expect(measureTextOverflow(el, 5)).toBe(true);
    expect(el.style.maxHeight).toBe('');
    expect(el.style.overflow).toBe('');
  });

  it('returns false when content fits within collapsed height', () => {
    const el = {
      style: {},
      scrollHeight: 80,
      clientHeight: 80,
    };

    expect(measureTextOverflow(el, 5)).toBe(false);
  });
});
