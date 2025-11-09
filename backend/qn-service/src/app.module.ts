import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuestionsModule } from './questions/questions.module';
import { AttemptsModule } from './attempts/attempts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QuestionsModule,
    AttemptsModule,
  ],
})
export class AppModule {}
