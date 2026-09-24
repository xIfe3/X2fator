import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

const LOCAL_PHONE_PATTERN = /^0[789][01]\d{8}$/;

/**
 * Normalizes a Nigerian mobile number to the local 11-digit form
 * ("08012345678"), which is what Flutterwave's bill payments accept.
 * Users type numbers many ways — "8012345678" (no leading 0),
 * "+2348012345678", "234 801 234 5678" — so all of them map here.
 * Anything that can't be recognized is returned trimmed, unchanged, so
 * validation rejects it with a clear message.
 */
export function normalizeNigerianPhone(value: string): string {
  const digits = value.replace(/[\s\-().]/g, '');

  if (/^\+?234\d{10}$/.test(digits)) {
    return `0${digits.replace(/^\+?234/, '')}`;
  }
  if (/^[789]\d{9}$/.test(digits)) {
    return `0${digits}`;
  }
  return digits;
}

/**
 * Every form a normalized number may already be stored as — older rows
 * were saved as "+234..." before normalization existed, so uniqueness
 * checks must match both.
 */
export function nigerianPhoneVariants(localPhone: string): string[] {
  return [localPhone, `+234${localPhone.slice(1)}`, `234${localPhone.slice(1)}`];
}

/**
 * Normalizes then validates a Nigerian mobile number field. An empty
 * string becomes `null` so optional profile fields can be cleared.
 */
export function IsNigerianPhone() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      if (value.trim() === '') return null;
      return normalizeNigerianPhone(value);
    }),
    IsString(),
    Matches(LOCAL_PHONE_PATTERN, {
      message:
        'Enter a valid Nigerian phone number, e.g. 08012345678 or 8012345678',
    }),
  );
}
