import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb/mongo.module';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [MongoModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, BearerAuthGuard, JwtService],
})
export class AttemptsModule {}

