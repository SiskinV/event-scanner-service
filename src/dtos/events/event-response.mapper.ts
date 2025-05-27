import { FeeCollectionEvent } from '../../models/fee-collection-event.entity';
import { EventResponseDto } from './event.dto';
import { DocumentType } from '@typegoose/typegoose';

export function mapEventResponse(event: DocumentType<FeeCollectionEvent>): EventResponseDto {
  return {
    id: event._id.toString(),
    integrator: event.integrator,
    token: event.token,
    integratorFee: event.integratorFee,
    lifiFee: event.lifiFee,
    integratorFeeHex: event.integratorFeeHex,
    lifiFeeHex: event.lifiFeeHex,
    blockNumber: event.blockNumber,
    transactionHash: event.transactionHash,
    logIndex: event.logIndex,
    chainId: event.chainId,
    blockTimestamp: event.blockTimestamp,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}
