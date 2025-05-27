import { mapEventResponse } from './event-response.mapper';
import { DocumentType } from '@typegoose/typegoose';

describe('mapEventResponse', () => {
  const mockDate = new Date('2024-01-15T10:30:00.000Z');

  describe('successful mapping', () => {
    it('should map all required fields correctly', () => {
      const mockEvent: DocumentType<any> = {
        _id: '0xe165726003c42edde42615ce591e25665a6a40a4',
        integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
        token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        integratorFeeHex: '0xde0b6b3a7640000',
        lifiFeeHex: '0x6f05b59d3b20000',
        blockNumber: 45123456,
        transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        logIndex: 2,
        chainId: 137,
        blockTimestamp: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapEventResponse(mockEvent);

      expect(result).toEqual({
        id: '0xe165726003c42edde42615ce591e25665a6a40a4',
        integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
        token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        integratorFeeHex: '0xde0b6b3a7640000',
        lifiFeeHex: '0x6f05b59d3b20000',
        blockNumber: 45123456,
        transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        logIndex: 2,
        chainId: 137,
        blockTimestamp: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('should handle optional fields when they are undefined', () => {
      const mockEvent: DocumentType<any> = {
        _id: '0xe165726003c42edde42615ce591e25665a6a40a4',
        integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
        token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        blockNumber: 45123456,
        transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        logIndex: 2,
        chainId: 137,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapEventResponse(mockEvent);

      expect(result).toEqual({
        id: '0xe165726003c42edde42615ce591e25665a6a40a4',
        integrator: '0xe165726003c42edde42615ce591e25665a6a40a4',
        token: '0xa0b86a33e6770c4c8abf8a8c0b55e0d1e0f0c0b0',
        integratorFee: '1000000000000000000',
        lifiFee: '500000000000000000',
        integratorFeeHex: undefined,
        lifiFeeHex: undefined,
        blockNumber: 45123456,
        transactionHash: '0xabc123def456789012345678901234567890abcdef123456789012345678901234',
        logIndex: 2,
        chainId: 137,
        blockTimestamp: undefined,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });
  });
});
