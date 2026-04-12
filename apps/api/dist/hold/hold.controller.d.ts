import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldService } from './hold.service';
export declare class HoldController {
    private readonly holdService;
    constructor(holdService: HoldService);
    create(user: RequestUser, dto: CreateHoldDto): Promise<any>;
}
