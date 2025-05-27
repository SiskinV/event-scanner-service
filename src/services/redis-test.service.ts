import { RedisService } from '../services/redis.service';

async function testRedis() {
  console.log('🧪 Testing Redis connection and basic functionality...');

  try {
    // Test connection
    const isConnected = await RedisService.testConnection();
    if (!isConnected) {
      throw new Error('Redis connection failed');
    }

    const chainId = 137;

    // Test basic last block functionality
    console.log('\n=== Testing Basic Last Block ===');
    await RedisService.setLastProcessedBlock(chainId, 12345);
    const lastBlock = await RedisService.getLastProcessedBlock(chainId);
    console.log(`✅ Set block: 12345, Retrieved: ${lastBlock}`);

    if (lastBlock !== 12345) {
      throw new Error('Block number mismatch!');
    }

    // Test gap management
    console.log('\n=== Testing Gap Management ===');

    // Clear any existing gaps first
    await RedisService.clearAllGaps(chainId);

    // Create test gaps
    const gap1 = await RedisService.addGap(chainId, 10001, 15000);
    const gap2 = await RedisService.addGap(chainId, 15501, 16000);
    const gap3 = await RedisService.addGap(chainId, 16501, 17000);

    console.log(`Created gaps: ${gap1}, ${gap2}, ${gap3}`);

    // Check all gaps
    const allGaps = await RedisService.getGaps(chainId);
    console.log(`\n📊 Total gaps created: ${allGaps.length}`);
    allGaps.forEach(gap => {
      console.log(
        `  - Gap ${gap.id}: blocks ${gap.startBlock}-${gap.endBlock} (${gap.totalBlocks} blocks) - ${gap.status}`
      );
    });

    // Test getting next gap
    const nextGap = await RedisService.getNextPendingGap(chainId);
    if (nextGap) {
      console.log(
        `\n📋 Next gap to process: ${nextGap.id} (${nextGap.startBlock}-${nextGap.endBlock})`
      );

      // Test processing workflow
      await RedisService.markGapAsProcessing(chainId, nextGap.id);
      console.log(`✅ Marked gap as processing`);

      // Test progress update
      await RedisService.updateGapProgress(chainId, nextGap.id, 12000);
      console.log(`✅ Updated gap progress to block 12000`);

      // Test completion
      await RedisService.markGapAsCompleted(chainId, nextGap.id);
      console.log(`✅ Marked gap as completed`);
    }

    // Check gap statistics
    const stats = await RedisService.getGapStats(chainId);
    console.log(
      `\n📈 Gap Stats: ${stats.pending} pending, ${stats.processing} processing, ${stats.totalBlocksRemaining} blocks remaining`
    );

    console.log('\n✅ All Redis tests passed!');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
  } finally {
    // Clean up
    await RedisService.clearAllGaps(137);
    await RedisService.disconnect();
  }
}

// Run the test
testRedis();
