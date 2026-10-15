import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

// Rechaza con 400 un id mal formado; sin esto Mongoose lanza CastError y sale como 500.
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) throw new BadRequestException(`"${value}" no es un ObjectId válido`);
    return value;
  }
}
