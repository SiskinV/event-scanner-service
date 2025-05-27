import { BlockchainModel, Blockchain } from '../models/blockchain.entity';
import {
  BlockchainAlreadyExists,
  BlockchainDisabled,
  BlockchainNotFound,
  ScanEnabledError,
  ValidationError,
} from '../common/errors/index';
import { DocumentType } from '@typegoose/typegoose';

export class BlockchainService {
  // memory cache
  private static blockchainIdCache: Map<string, DocumentType<Blockchain>> = new Map();
  private static chainIdCache: Map<number, DocumentType<Blockchain>> = new Map();
  private static cacheExpiry: number = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getByBlockchainId(blockchainId: string): Promise<DocumentType<Blockchain>> {
    await this.refreshCacheIfNeeded();

    const blockchain = this.blockchainIdCache.get(blockchainId.toLowerCase());
    if (!blockchain) {
      throw new BlockchainNotFound(blockchainId);
    }

    if (!blockchain.isActive) {
      throw new BlockchainDisabled(blockchain.blockchainId);
    }

    return blockchain;
  }

  static async getByChainId(chainId: number): Promise<DocumentType<Blockchain>> {
    await this.refreshCacheIfNeeded();

    const blockchain = this.chainIdCache.get(chainId);
    if (!blockchain) {
      throw new BlockchainNotFound(undefined, chainId);
    }

    if (!blockchain.isActive) {
      throw new BlockchainDisabled(blockchain.blockchainId);
    }

    return blockchain;
  }

  static async getAll(): Promise<DocumentType<Blockchain>[]> {
    await this.refreshCacheIfNeeded();

    return Array.from(this.blockchainIdCache.values())
      .filter(b => b.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getScanEnabled(): Promise<DocumentType<Blockchain>[]> {
    const allBlockchains = await this.getAll();
    return allBlockchains.filter(b => b.scanEnabled);
  }

  static async toggleActive(
    blockchainId: string,
    isActive: boolean
  ): Promise<DocumentType<Blockchain>> {
    const blockchain = await BlockchainModel.findOne({ blockchainId });
    if (!blockchain) {
      throw new BlockchainNotFound(blockchainId);
    }

    blockchain.isActive = isActive;
    await blockchain.save();

    this.clearCache();
    return blockchain;
  }

  static async toggleScanning(
    blockchainId: string,
    scanEnabled: boolean
  ): Promise<DocumentType<Blockchain>> {
    const blockchain = await BlockchainModel.findOne({ blockchainId });
    if (!blockchain) {
      throw new BlockchainNotFound(blockchainId);
    }

    // Validation: Can't enable scanning if blockchain is not active
    if (scanEnabled && !blockchain.isActive) {
      throw new BlockchainDisabled(blockchainId);
    }

    // Validation: EVM chains need contract address for scanning
    if (scanEnabled && !blockchain.contractAddress) {
      throw new ValidationError(
        `Cannot enable scanning: contract address is required for EVM blockchains`
      );
    }

    blockchain.scanEnabled = scanEnabled;
    await blockchain.save();

    this.clearCache();
    return blockchain;
  }

  static async create(blockchainData: Partial<Blockchain>): Promise<DocumentType<Blockchain>> {
    if (blockchainData.chainId) {
      const existingChain = await BlockchainModel.findOne({
        chainId: blockchainData.chainId,
      });

      if (existingChain) {
        throw new BlockchainAlreadyExists(blockchainData.chainId);
      }
    }

    const blockchain = new BlockchainModel(blockchainData);
    await blockchain.save();

    this.clearCache();
    return blockchain;
  }

  static async deleteById(blockchainId: string): Promise<DocumentType<Blockchain>> {
    const blockchain = await BlockchainModel.findOne({ blockchainId });
    if (!blockchain) {
      throw new BlockchainNotFound(blockchainId);
    }

    if (blockchain.scanEnabled) {
      throw new ScanEnabledError();
    }

    await BlockchainModel.deleteOne({ blockchainId });

    this.clearCache();
    return blockchain;
  }

  private static async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();

    if (this.blockchainIdCache.size === 0 || now > this.cacheExpiry) {
      await this.loadCache();
    }
  }

  private static async loadCache(): Promise<void> {
    const blockchains = await BlockchainModel.find({});

    // Clear all caches
    this.blockchainIdCache.clear();
    this.chainIdCache.clear();

    // Populate all caches
    blockchains.forEach(blockchain => {
      this.blockchainIdCache.set(blockchain.blockchainId, blockchain);

      if (blockchain.chainId) {
        this.chainIdCache.set(blockchain.chainId, blockchain);
      }
    });

    this.cacheExpiry = Date.now() + this.CACHE_TTL;
    console.log(`📦 Loaded ${blockchains.length} blockchains into cache`);
  }

  static clearCache(): void {
    this.blockchainIdCache.clear();
    this.chainIdCache.clear();
    this.cacheExpiry = 0;
  }
}
