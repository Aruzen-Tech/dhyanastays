import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDirectionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @IsOptional()
  @IsNumber()
  gpsLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  landmarks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  transportOptions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  parkingInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nearestAirport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nearestStation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}
