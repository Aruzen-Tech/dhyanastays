import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request body for `POST /itineraries/:id/messages` — guest asks the AI to
 * refine the itinerary in natural language ("make day 3 less intense",
 * "add a cooking class on day 5"). The AI may reply text-only or include a
 * structured patch that mutates `Itinerary.days`.
 */
export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}
