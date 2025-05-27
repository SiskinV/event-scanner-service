import mongoose from 'mongoose';
import { EventScannerService } from '../services/event-scanner.service';
import { FeeCollectionEventModel } from '../models/fee-collection-event.entity';
import { BlockchainService } from '../services/blockchain.service';

/**
 * Script to scan historical events for a specific block range
 * Usage: npm run scan -- --from=61500000  --to=65500000
 */
async function scanHistorical() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(3);
    const fromBlock = parseInt(
      args.find(arg => arg.startsWith('--from='))?.split('=')[1] || '61500000'
    );
    const toBlock = parseInt(
      args.find(arg => arg.startsWith('--to='))?.split('=')[1] || '71914930'
    );
    const chainId = args.find(arg => arg.startsWith('--chainId='))?.split('=')[1] || '137';

    console.log(`Starting historical scan from block ${fromBlock} to ${toBlock}`);

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifi-fees');
    console.log('Connected to MongoDB');

    const blockchain = await BlockchainService.getByChainId(Number(chainId));

    // Initialize scanner
    const scanner = new EventScannerService(
      blockchain.chainId,
      blockchain.rpcUrl,
      blockchain.contractAddress
    );

    // Check current state
    const existingEvents = await FeeCollectionEventModel.countDocuments({
      blockNumber: { $gte: fromBlock, $lte: toBlock },
    });
    console.log(`Found ${existingEvents} existing events in this range`);

    // Scan in chunks to avoid RPC limits
    const CHUNK_SIZE = 2000;
    let currentFrom = fromBlock;

    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + CHUNK_SIZE - 1, toBlock);

      console.log(`\nScanning chunk: ${currentFrom} to ${currentTo}`);
      await scanner.scanBlockRange(currentFrom, currentTo);

      currentFrom = currentTo + 1;

      // Small delay to avoid overwhelming RPC
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final count
    const finalCount = await FeeCollectionEventModel.countDocuments({
      blockNumber: { $gte: fromBlock, $lte: toBlock },
    });

    console.log(`\n✅ Historical scan completed!`);
    console.log(`Total events in range: ${finalCount}`);
    console.log(`New events added: ${finalCount - existingEvents}`);
  } catch (error) {
    console.error('❌ Historical scan failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

scanHistorical();
