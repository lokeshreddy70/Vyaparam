import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { sanitizeValue } from "../utils/sanitization.util";

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return sanitizeValue(value);
  }
}
