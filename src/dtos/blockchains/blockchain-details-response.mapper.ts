import { Blockchain } from '../../models/blockchain.entity';
import { DocumentType } from '@typegoose/typegoose';
import { BlockchainDetailResponseDto } from './blockchain-details-response.dto';

export function mapBlockchainDetailResponse(
  blockchain: DocumentType<Blockchain>
): BlockchainDetailResponseDto {
  return {
    id: blockchain.id,
    blockchainId: blockchain.blockchainId,
    name: blockchain.name,
    chainId: blockchain.chainId,
    rpcUrl: blockchain.rpcUrl,
    contractAddress: blockchain.contractAddress,
    blockExplorer: blockchain.blockExplorer,
    nativeCurrency: blockchain.nativeCurrency,
    symbol: blockchain.symbol,
    decimals: blockchain.decimals,
    isActive: blockchain.isActive,
    scanEnabled: blockchain.scanEnabled,
    createdAt: blockchain.createdAt,
    updatedAt: blockchain.updatedAt,
  };
}
