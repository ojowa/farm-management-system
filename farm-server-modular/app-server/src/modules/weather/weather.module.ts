import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';

/**
 * Weather is a read-only integration feature (Open-Meteo). It previously
 * lived on the gateway process; now it is an ordinary bounded context with
 * no persistence of its own.
 */
@Module({
  controllers: [WeatherController],
})
export class WeatherModule {}