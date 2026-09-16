import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  async hash(password: string) {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }
}
