import { prop, getModelForClass, modelOptions, index } from '@typegoose/typegoose';

// Define indexes at the class level
@index({ chainId: 1, transactionHash: 1, logIndex: 1 }, { unique: true })
@index({ integrator: 1 }) // Single field index for integrator queries
@index({ integrator: 1, blockNumber: -1 }) // Compound index for integrator + block order (most important)
@index({ integrator: 1, token: 1 }) // Compound index for integrator + token queries
@index({ timestamp: -1 }) // Index for time-based queries (secondary to block number)
@modelOptions({
  schemaOptions: {
    collection: 'fee_collection_event',
    timestamps: true,
  },
})
export class FeeCollectionEvent {
  @prop({ required: true })
  integrator!: string;

  @prop({ required: true })
  token!: string;

  @prop({ required: true })
  integratorFee!: string;

  @prop({ required: true })
  lifiFee!: string;

  @prop({ required: false })
  integratorFeeHex?: string;

  @prop({ required: false })
  lifiFeeHex?: string;

  @prop({ required: true })
  blockNumber!: number;

  @prop({ required: true })
  transactionHash!: string;

  @prop({ required: true })
  logIndex!: number;

  @prop({ required: true })
  chainId!: number;

  @prop()
  blockTimestamp?: Date;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const FeeCollectionEventModel = getModelForClass(FeeCollectionEvent);
