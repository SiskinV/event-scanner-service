import { Request, Response, NextFunction } from 'express';
import { BlockchainService } from '../services/blockchain.service';
import { ValidationError } from '../common/errors';
import {
  CreateBlockchainRequestDto,
  mapBlockchainDetailResponse,
  mapBlockchainResponse,
  ToggleBlockchainRequestDto,
  ToggleScanningRequestDto,
} from '../dtos/blockchains';

export class BlockchainController {
  async getAllBlockchains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blockchains = await BlockchainService.getAll();

      res.json({
        success: true,
        message: 'All blockchains retrieved successfully',
        data: {
          blockchains: blockchains.map(b => mapBlockchainResponse(b)),
          total: blockchains.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlockchainById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Blockchain ID is required');
      }

      const blockchain = await BlockchainService.getByBlockchainId(id);

      res.json({
        success: true,
        message: 'Blockchain retrieved successfully',
        data: mapBlockchainDetailResponse(blockchain),
      });
    } catch (error) {
      next(error);
    }
  }

  async addBlockchain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        blockchainId,
        name,
        chainId,
        rpcUrl,
        contractAddress,
        blockExplorer,
        nativeCurrency,
        symbol,
        decimals,
        isActive = true,
        scanEnabled = false,
      }: CreateBlockchainRequestDto = req.body;

      if (
        !blockchainId ||
        !name ||
        !rpcUrl ||
        !blockExplorer ||
        !nativeCurrency ||
        !symbol ||
        !chainId
      ) {
        throw new ValidationError(
          'Missing required fields: blockchainId, name, rpcUrl, blockExplorer, nativeCurrency, symbol, chainId'
        );
      }

      console.log(`Adding new blockchain: ${name} (${blockchainId})`);

      const blockchain = await BlockchainService.create({
        blockchainId: blockchainId.toLowerCase().trim(),
        name: name.trim(),
        chainId,
        rpcUrl: rpcUrl.trim(),
        contractAddress: contractAddress?.trim(),
        blockExplorer: blockExplorer.trim(),
        nativeCurrency: nativeCurrency.trim(),
        symbol: symbol.toUpperCase().trim(),
        decimals,
        isActive,
        scanEnabled,
      });

      console.log(`Blockchain added successfully: ${blockchain.name}`);

      res.status(201).json({
        success: true,
        message: `Blockchain ${blockchain.name} added successfully`,
        data: mapBlockchainDetailResponse(blockchain),
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleBlockchain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive }: ToggleBlockchainRequestDto = req.body;

      // @ToDo vs maybe use validation here so we can have unified error responses
      // if (!id) {
      //   throw new ValidationError('Blockchain ID is required');
      // }
      //
      // if (typeof isActive !== 'boolean') {
      //   throw new ValidationError('isActive must be a boolean');
      // }

      console.log(`${isActive ? 'Enabling' : 'Disabling'} blockchain: ${id}`);

      const blockchain = await BlockchainService.toggleActive(id, isActive);

      console.log(
        `Blockchain ${blockchain.name} ${isActive ? 'enabled' : 'disabled'} successfully`
      );

      res.json({
        success: true,
        message: `Blockchain ${isActive ? 'enabled' : 'disabled'} successfully`,
        data: {
          id: blockchain.id,
          blockchainId: blockchain.blockchainId,
          name: blockchain.name,
          isActive: blockchain.isActive,
          updatedAt: blockchain.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleScanning(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { scanEnabled }: ToggleScanningRequestDto = req.body;

      // @ToDo vs think of returning this and removing that stuff from router...
      // if (!id) {
      //   throw new ValidationError('Blockchain ID is required');
      // }
      //
      // if (typeof scanEnabled !== 'boolean') {
      //   throw new ValidationError('scanEnabled must be a boolean');
      // }

      console.log(`${scanEnabled ? 'Enabling' : 'Disabling'} scanning for blockchain: ${id}`);

      const blockchain = await BlockchainService.toggleScanning(id, scanEnabled);

      console.log(`Scanning ${scanEnabled ? 'enabled' : 'disabled'} for ${blockchain.name}`);

      res.json({
        success: true,
        message: `Scanning ${scanEnabled ? 'enabled' : 'disabled'} for ${blockchain.name}`,
        data: {
          id: blockchain.id,
          blockchainId: blockchain.blockchainId,
          name: blockchain.name,
          scanEnabled: blockchain.scanEnabled,
          updatedAt: blockchain.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBlockchain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Blockchain ID is required');
      }

      console.log(`Deleting blockchain: ${id}`);

      const blockchain = await BlockchainService.deleteById(id);

      console.log(`Blockchain ${blockchain.name} deleted successfully`);

      res.json({
        success: true,
        message: `Blockchain ${blockchain.name} deleted successfully`,
        data: {
          id: blockchain.id,
          blockchainId: blockchain.blockchainId,
          name: blockchain.name,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
