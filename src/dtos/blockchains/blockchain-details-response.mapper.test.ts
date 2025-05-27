// mapBlockchainDetailResponse.test.ts
import { DocumentType } from '@typegoose/typegoose';
import { Blockchain } from '../../models/blockchain.entity';
import { mapBlockchainDetailResponse } from './blockchain-details-response.mapper';
import { BlockchainDetailResponseDto } from './blockchain-details-response.dto';

describe('mapBlockchainDetailResponse', () => {
  // Mock blockchain document with all required fields
  const mockBlockchainDocument = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    blockchainId: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/test-key',
    contractAddress: '0xa0b86a33e6776d021d14e6d3dfadeb99e2e92c1d',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    isActive: true,
    scanEnabled: true,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:35:00Z'),
  } as DocumentType<Blockchain>;

  it('should map all blockchain fields to BlockchainDetailResponseDto', () => {
    const result: BlockchainDetailResponseDto = mapBlockchainDetailResponse(mockBlockchainDocument);

    expect(result).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      blockchainId: 'ethereum',
      name: 'Ethereum Mainnet',
      chainId: 1,
      rpcUrl: 'https://mainnet.infura.io/v3/test-key',
      contractAddress: '0xa0b86a33e6776d021d14e6d3dfadeb99e2e92c1d',
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      isActive: true,
      scanEnabled: true,
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T10:35:00Z'),
    });
  });
});
