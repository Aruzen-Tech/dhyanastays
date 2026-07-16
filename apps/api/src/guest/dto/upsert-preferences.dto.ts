import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'ayurvedic',
  'jain',
  'raw',
  'no-preference',
];

export const WELLNESS_OPTIONS = [
  'yoga',
  'meditation',
  'ayurveda',
  'detox',
  'sound-healing',
  'breathwork',
  'nature-therapy',
  'spa',
];

export class UpsertPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryNeeds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wellnessInterests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  accessibility?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ground-floor', 'quiet-corner', 'garden-view', 'no-preference'])
  roomPreference?: string;

  @IsOptional()
  @IsString()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['early-morning', 'afternoon', 'evening'])
  arrivalPreference?: string;

  @IsOptional()
  @IsObject()
  emergencyContact?: { name: string; phone: string; relation: string };

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
