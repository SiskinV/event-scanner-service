import { Blockchain } from '../../models/blockchain.entity';
import { DocumentType } from '@typegoose/typegoose';
import { BlockchainResponseDto } from './get-all-blockchains-response.dto';

export function mapBlockchainResponse(blockchain: DocumentType<Blockchain>): BlockchainResponseDto {
  return {
    id: blockchain.id,
    blockchainId: blockchain.blockchainId,
    rpcUrl: blockchain.rpcUrl,
    name: blockchain.name,
    chainId: blockchain.chainId,
    symbol: blockchain.symbol,
    nativeCurrency: blockchain.nativeCurrency,
    blockExplorer: blockchain.blockExplorer,
    isActive: blockchain.isActive,
    scanEnabled: blockchain.scanEnabled,
  };
}
