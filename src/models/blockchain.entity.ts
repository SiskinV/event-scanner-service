import { getModelForClass, prop, index, pre, modelOptions } from '@typegoose/typegoose';
import { v4 as uuidv4 } from 'uuid';

@pre<Blockchain>('save', function () {
  if (!this.chainId) {
    throw new Error('All blockchains must have chainId');
  }
  if (this.scanEnabled && !this.contractAddress) {
    throw new Error('Blockchains with scanning enabled must have contractAddress');
  }
})
@index({ blockchainId: 1 })
@index({ chainId: 1 }, { unique: true })
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: 'blockchains',
  },
})
export class Blockchain {
  @prop({
    required: true,
    unique: true,
    default: () => uuidv4(),
  })
  public id!: string;

  @prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  public blockchainId!: string;

  @prop({ required: true })
  public name!: string;

  @prop({
    required: true,
    unique: true,
  })
  public chainId!: number;

  @prop({ required: true })
  public rpcUrl!: string;

  @prop({ required: false })
  public contractAddress!: string;

  @prop({ required: true })
  public blockExplorer!: string;

  @prop({ required: true })
  public nativeCurrency!: string;

  @prop({
    required: true,
    uppercase: true,
  })
  public symbol!: string;

  @prop({
    required: true,
    default: 18,
  })
  public decimals!: number;

  @prop({
    required: true,
    default: true,
  })
  public isActive!: boolean;

  @prop({
    required: true,
    default: false,
  })
  public scanEnabled!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const BlockchainModel = getModelForClass(Blockchain);
