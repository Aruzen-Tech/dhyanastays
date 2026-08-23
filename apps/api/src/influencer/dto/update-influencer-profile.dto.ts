import { ApplyInfluencerProfileDto } from './apply-influencer-profile.dto';

/**
 * Same editable field set as ApplyInfluencerProfileDto — deliberately does
 * NOT extend it with extra fields. verificationStatus/adminComments are
 * intentionally absent: an influencer can never self-approve or edit their
 * own verification state (see InfluencerService.updateMyProfile).
 */
export class UpdateInfluencerProfileDto extends ApplyInfluencerProfileDto {}
