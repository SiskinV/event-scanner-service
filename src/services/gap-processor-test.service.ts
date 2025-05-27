// test/gap-processor-test.ts
import { RedisService } from './redis.service';
import { GapProcessor } from './gap-processor.service';

async function testGapProcessor() {
  console.log('🧪 Testing Gap Processor...');

  const chainId = 137;
  let blocksScanned: string[] = [];

  try {
    // Test Redis connection first
    const isConnected = await RedisService.testConnection();
    if (!isConnected) {
      throw new Error('Redis connection failed');
    }

    // Clear any existing gaps
    await RedisService.clearAllGaps(chainId);

    // Create gap processor with custom scan function
    const gapProcessor = new GapProcessor({
      chainId,
      chunkSize: 100, // Small chunks for testing
      processInterval: 1000, // 1 second for testing
      onScanBlocks: async (fromBlock: number, toBlock: number) => {
        // Track what blocks we've scanned
        blocksScanned.push(`${fromBlock}-${toBlock}`);
        console.log(`  📡 Scanned blocks ${fromBlock}-${toBlock}`);
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
      },
    });

    // Add some test gaps
    console.log('\n=== Adding Test Gaps ===');
    await gapProcessor.addGap(10000, 10499); // 500 blocks
    await gapProcessor.addGap(11000, 11199); // 200 blocks
    await gapProcessor.addGap(12000, 12099); // 100 blocks

    // Check initial status
    let status = await gapProcessor.getStatus();
    console.log(
      `\n📊 Initial status: ${status.gapStats.pending} pending gaps, ${status.gapStats.totalBlocksRemaining} blocks`
    );

    // Start the processor
    console.log('\n=== Starting Gap Processor ===');
    gapProcessor.start();

    // Let it run for a few seconds
    console.log('⏳ Letting processor run for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check progress
    status = await gapProcessor.getStatus();
    console.log(
      `\n📈 After 5 seconds: ${status.gapStats.pending} pending, ${status.gapStats.processing} processing`
    );
    console.log(`   Blocks scanned: ${blocksScanned.join(', ')}`);

    // Let it run a bit more to complete some gaps
    console.log('\n⏳ Running for 5 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Final status
    status = await gapProcessor.getStatus();
    console.log(
      `\n📊 Final status: ${status.gapStats.pending} pending, ${status.gapStats.totalBlocksRemaining} blocks remaining`
    );
    console.log(`   Total chunks scanned: ${blocksScanned.length}`);
    console.log(`   Blocks scanned: ${blocksScanned.join(', ')}`);

    // Stop the processor
    gapProcessor.stop();

    // Test manual processing
    console.log('\n=== Testing Manual Processing ===');
    if (status.gapStats.pending > 0) {
      console.log('Manually processing next chunk...');
      await gapProcessor.processNow();

      const finalStatus = await gapProcessor.getStatus();
      console.log(`After manual process: ${finalStatus.gapStats.pending} pending`);
    }

    console.log('\n✅ Gap processor test completed!');
  } catch (error) {
    console.error('❌ Gap processor test failed:', error);
  } finally {
    // Clean up
    await RedisService.clearAllGaps(chainId);
    await RedisService.disconnect();
  }
}

// Run the test
testGapProcessor();
