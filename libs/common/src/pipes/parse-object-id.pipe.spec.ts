import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('devuelve el id si es un ObjectId válido', () => {
    expect(pipe.transform('6710c0ffee0000000000abcd')).toBe('6710c0ffee0000000000abcd');
  });

  it.each(['123', 'no-es-un-id', ''])('responde 400 con "%s"', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
